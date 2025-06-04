from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, model_validator
from datetime import datetime


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


class Instruction(BaseModel):
    """Model for a single instruction step."""
    text: str = Field(..., description="Instruction text")


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
    category: Optional[str] = Field(None, description="Recipe category")
    difficulty: Optional[str] = Field(None, description="Recipe difficulty level")
    prepTime: Optional[int] = Field(None, description="Preparation time in minutes")
    cookTime: Optional[int] = Field(None, description="Cooking time in minutes")
    waitTime: Optional[int] = Field(None, description="Waiting time in minutes")
    totalTime: Optional[int] = Field(None, description="Total time in minutes")
    servings: Optional[int] = Field(None, description="Number of servings")
    
    # Either a list of stages or a flat list of instructions
    stages: Optional[List[Stage]] = Field(None, description="List of preparation stages")
    instructions: Optional[List[str]] = Field(None, description="Flat list of instructions (if not using stages)")
    
    ingredients: List[Ingredient] = Field([], description="List of ingredients")
    mainIngredient: Optional[str] = Field(None, description="Main ingredient")
    tags: List[str] = Field([], description="Recipe tags")
    
    image: Optional[str] = Field(None, description="Primary image identifier")
    images: Optional[List[ImageDetails]] = Field(None, description="Detailed image information")
    
    allowImageSuggestions: bool = Field(True, description="Whether image suggestions are allowed")
    approved: bool = Field(False, description="Whether the recipe is approved")
    
    source_url: Optional[str] = Field(None, description="Original source URL")
    
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


class RecipeResponse(BaseModel):
    """Response model with a processed recipe."""
    recipe: Recipe
    confidence_score: float = Field(..., description="Confidence score of extraction (0-1)")
    processing_time: float = Field(..., description="Processing time in seconds")