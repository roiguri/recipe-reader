from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, model_validator, computed_field
from datetime import datetime
from enum import Enum
import base64


class RecipeCategory(str, Enum):
    """Allowed recipe categories."""
    APPETIZERS = "appetizers"
    MAIN_COURSES = "main-courses"
    SIDE_DISHES = "side-dishes"
    SOUPS = "soups"
    STEWS = "stews"
    SALADS = "salads"
    DESSERTS = "desserts"
    BREAKFAST_BRUNCH = "breakfast&brunch"
    SNACKS = "snacks"
    BEVERAGES = "beverages"


class RecipeDifficulty(str, Enum):
    """Standardized recipe difficulty levels."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Ingredient(BaseModel):
    """
    Recipe ingredient with separate amount and unit fields.
    
    Examples:
    - item: "flour", amount: "2", unit: "cups"
    - item: "קמח", amount: "2", unit: "כוסות"  
    - item: "salt", amount: "1", unit: "tsp"
    - item: "eggs", amount: "3", unit: "units/יחידה" (for countable items)
    """
    item: str = Field(..., description="Name of the ingredient")
    amount: str = Field(..., description="Quantity number only (e.g., '2', '1/2', '250')")
    unit: str = Field(..., description="Unit of measurement (e.g., 'cups', 'grams', 'tbsp', 'קילוגרם', 'כוסות', 'גרם')")
    stage_id: Optional[int] = Field(None, description="ID of the stage this ingredient belongs to (if any)")


class Stage(BaseModel):
    """Model for a recipe stage."""
    title: str = Field(..., description="Title of the stage")
    instructions: List[str] = Field(..., description="List of instruction texts for this stage")


class ImageDetails(BaseModel):
    """Model for image details."""
    id: str = Field(..., description="Image identifier")
    access: str = Field("public", description="Access level for the image")
    compressed: Optional[str] = Field(None, description="Path to compressed version")
    full: Optional[str] = Field(None, description="Path to full version")
    isPrimary: bool = Field(False, description="Whether this is the primary image")
    uploadedAt: Optional[datetime] = Field(None, description="When the image was uploaded")
    uploadedBy: Optional[str] = Field(None, description="Who uploaded the image")


class RecipeBase(BaseModel):
    """Base model for recipe data."""
    name: str = Field(..., description="Recipe name/title")
    description: Optional[str] = Field(None, description="Recipe description")
    category: Optional[RecipeCategory] = Field(None, description="Recipe category")
    difficulty: Optional[RecipeDifficulty] = Field(None, description="Recipe difficulty level")
    prepTime: Optional[int] = Field(None, description="Preparation time in minutes")
    cookTime: Optional[int] = Field(None, description="Cooking time in minutes")
    servings: Optional[int] = Field(None, description="Number of servings")
    
    @computed_field
    @property
    def totalTime(self) -> Optional[int]:
        """Calculate total time from prep and cook times."""
        if self.prepTime is None and self.cookTime is None:
            return None
        return (self.prepTime or 0) + (self.cookTime or 0)
    
    # Either a list of stages or a flat list of instructions
    stages: Optional[List[Stage]] = Field(None, description="List of preparation stages")
    instructions: Optional[List[str]] = Field(None, description="Flat list of instructions (if not using stages)")
    
    ingredients: List[Ingredient] = Field([], description="List of ingredients")
    mainIngredient: Optional[str] = Field(None, description="Main ingredient")
    tags: List[str] = Field([], description="Recipe tags")
    
    images: Optional[List[ImageDetails]] = Field(None, description="Detailed image information")
    
    source_url: Optional[str] = Field(None, description="Original source URL")
    comments: Optional[str] = Field(None, description="User comments about the recipe")
    
    @model_validator(mode='after')
    def check_instructions_format(self) -> 'RecipeBase':
        """Validate that either stages or instructions are provided, but not both."""
        if self.stages is None and self.instructions is None:
            raise ValueError("Either 'stages' or 'instructions' must be provided")
        
        if self.stages is not None and self.instructions is not None:
            raise ValueError("Cannot provide both 'stages' and 'instructions'")
            
        return self


class RecipeCreate(RecipeBase):
    """Model for creating a new recipe."""
    pass


class RecipeInDB(RecipeBase):
    """Model representing a recipe as stored in the database."""
    id: str = Field(..., description="Unique recipe identifier")
    creationTime: datetime = Field(..., description="Creation timestamp")
    updatedAt: Optional[datetime] = Field(None, description="Last update timestamp")


class Recipe(RecipeInDB):
    """Model for recipe responses."""
    pass


class TextProcessRequest(BaseModel):
    """Request model for text processing endpoint."""
    text: str = Field(..., description="Recipe text to process")
    options: Optional[Dict[str, Any]] = Field({}, description="Processing options")


class UrlProcessRequest(BaseModel):
    """Request model for URL processing endpoint."""
    url: str = Field(..., description="Recipe URL to process", min_length=1)
    options: Optional[Dict[str, Any]] = Field({}, description="Processing options")
    
    @model_validator(mode='after')
    def validate_url_format(self) -> 'UrlProcessRequest':
        """Basic URL validation."""
        from urllib.parse import urlparse
        
        # Normalize URL
        url = self.url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
            self.url = url
        
        # Parse and validate
        try:
            parsed = urlparse(url)
            if not all([parsed.scheme in ['http', 'https'], parsed.netloc]):
                raise ValueError("Invalid URL format")
        except Exception:
            raise ValueError("Invalid URL format")
            
        return self


class ImageProcessRequest(BaseModel):
    """Request model for image processing endpoint. Supports single or multiple images."""
    image_data: Union[str, List[str]] = Field(..., description="Base64 encoded image data (single string or list of strings)")
    options: Optional[Dict[str, Any]] = Field({}, description="Processing options")
    
    @model_validator(mode='after')
    def validate_image_data(self) -> 'ImageProcessRequest':
        """Validate base64 image data for single or multiple images."""
        # Convert single image to list for unified processing
        images_to_validate = [self.image_data] if isinstance(self.image_data, str) else self.image_data
        
        if not images_to_validate:
            raise ValueError("At least one image is required")
        
        if len(images_to_validate) > 10:  # Reasonable limit
            raise ValueError("Maximum 10 images allowed per request")
        
        for i, image_data in enumerate(images_to_validate):
            try:
                # Handle data URL format
                if image_data.startswith('data:'):
                    header, encoded = image_data.split(',', 1)
                    # Validate mime type
                    if not any(img_type in header.lower() for img_type in ['image/jpeg', 'image/png', 'image/webp', 'image/gif']):
                        raise ValueError(f"Unsupported image format in image {i+1}")
                    # Try to decode
                    base64.b64decode(encoded)
                else:
                    # Direct base64 string
                    base64.b64decode(image_data)
            except ValueError as e:
                if "Unsupported image format" in str(e):
                    raise e
                raise ValueError(f"Invalid base64 image data in image {i+1}")
            except Exception:
                raise ValueError(f"Invalid base64 image data in image {i+1}")
            
        return self


class RecipeResponse(BaseModel):
    """Response model with a processed recipe."""
    recipe: Recipe
    confidence_score: float = Field(..., description="Confidence score of extraction (0-1)")
    processing_time: float = Field(..., description="Processing time in seconds")