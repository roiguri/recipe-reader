# app/services/image_processing_service.py

import os
import json
import time
import base64
import hashlib
import logging
from typing import Dict, Any, Optional, Union
import asyncio
from datetime import datetime
import uuid
import re
from io import BytesIO
from PIL import Image

# Import the NEW Google Gen AI SDK
from google import genai
from google.genai import types

# Import our existing recipe models
from app.models import Recipe, Ingredient, Stage, RecipeResponse, RecipeBase


class ImageProcessingService:
    """Service for recipe extraction from images using Google's Gemini Vision API."""
    
    def __init__(self, api_key=None):
        """
        Initialize the Image Processing service.
        
        Args:
            api_key: Google AI API key (will use environment variable if None)
        """
        # Set up logging
        self.logger = logging.getLogger(__name__)
        
        # Try to get API key from parameter or environment
        self.api_key = api_key or os.environ.get("GOOGLE_AI_API_KEY")
        
        if not self.api_key:
            self.logger.warning("No API key provided. Service will be unavailable.")
            self.available = False
            return
            
        try:
            # Initialize the new Google Gen AI client
            self.client = genai.Client(api_key=self.api_key)
            
            # Initialize cache
            self.cache = {}
            self.available = True
            
            # Image processing settings
            self.max_image_size = 4 * 1024 * 1024  # 4MB
            self.supported_formats = {'JPEG', 'PNG', 'WEBP', 'GIF'}
            self.max_dimension = 2048  # Max width or height
            
            self.logger.info("ImageProcessingService initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize ImageProcessingService: {str(e)}")
            self.available = False
    
    async def extract_recipe_from_image(
        self, 
        image_data: Union[str, bytes], 
        options: Optional[Dict[str, Any]] = None
    ) -> RecipeResponse:
        """
        Extract structured recipe data from an image using Gemini Vision.
        
        Args:
            image_data: Base64 encoded image string or raw bytes
            options: Optional processing parameters
            
        Returns:
            RecipeResponse object with extracted recipe and metadata
        """
        if not self.available:
            raise ValueError("ImageProcessingService is not available. Check API key configuration.")
            
        options = options or {}
        start_time = time.time()
        
        # Process and validate image
        processed_image = await self._process_image(image_data, options)
        
        # Check cache if enabled
        use_cache = options.get("use_cache", True)
        if use_cache:
            cache_key = self._generate_image_cache_key(processed_image['data'])
            cached_result = self.cache.get(cache_key)
            if cached_result:
                self.logger.info("Returning cached result for image")
                if isinstance(cached_result, RecipeResponse):
                    return cached_result
                # Convert cached dict to RecipeResponse
                if isinstance(cached_result, dict):
                    recipe = self._convert_to_recipe_model(cached_result)
                    confidence_score = cached_result.get("confidence_score", 0.8)
                    return RecipeResponse(
                        recipe=recipe,
                        confidence_score=confidence_score,
                        processing_time=0.0
                    )
        
        # Generate prompt for image-based recipe extraction
        prompt = self._generate_image_extraction_prompt(options)
        
        # Retry logic for robustness
        max_retries = options.get("max_retries", 3)
        retry_delay = options.get("retry_delay", 2.0)
        last_error = None
        
        for attempt in range(max_retries):
            try:
                self.logger.info(f"Attempting image extraction (attempt {attempt + 1}/{max_retries})")
                
                # Configure generation parameters
                config = types.GenerateContentConfig(
                    temperature=options.get("temperature", 0.1 + (attempt * 0.05)),
                    max_output_tokens=options.get("max_tokens", 2048),
                    top_p=options.get("top_p", 0.8),
                    top_k=options.get("top_k", 40),
                    response_mime_type="application/json",
                    response_schema=RecipeBase
                )
                
                # Prepare content with image and text
                content = [
                    types.Part(text=prompt),
                    types.Part(
                        inline_data=types.Blob(
                            data=processed_image['data'],
                            mime_type=processed_image['mime_type']
                        )
                    )
                ]
                
                # Make the API call using Gemini Vision
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.client.models.generate_content(
                        model="gemini-1.5-pro",
                        contents=content,
                        config=config
                    )
                )
                
                # Parse the guaranteed-valid JSON response
                result_dict = json.loads(response.text)
                
                # Convert to RecipeBase Pydantic model for validation
                extracted_recipe = RecipeBase(**result_dict)
                
                # Convert to dict for further processing
                result = extracted_recipe.model_dump()
                
                # Calculate confidence score (lower for images due to OCR complexity)
                confidence_score = self._calculate_image_confidence(
                    result, 
                    processed_image['quality_score']
                )
                
                # Convert to full Recipe model
                recipe = self._convert_to_recipe_model(result)
                
                # Calculate processing time
                processing_time = time.time() - start_time
                
                # Create response object
                response_obj = RecipeResponse(
                    recipe=recipe,
                    confidence_score=confidence_score,
                    processing_time=processing_time
                )
                
                # Cache the result if caching is enabled
                if use_cache:
                    cache_key = self._generate_image_cache_key(processed_image['data'])
                    result["confidence_score"] = confidence_score
                    self.cache[cache_key] = result
                
                self.logger.info(f"Successfully extracted recipe from image on attempt {attempt + 1}")
                return response_obj
                
            except Exception as e:
                last_error = e
                self.logger.warning(f"Image extraction attempt {attempt + 1} failed: {str(e)}")
                
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    self.logger.info(f"Retrying in {wait_time} seconds...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    # All retries failed, create fallback result
                    self.logger.error("All image extraction attempts failed, creating fallback result")
                    fallback_result = self._create_image_fallback_result()
                    recipe = self._convert_to_recipe_model(fallback_result)
                    return RecipeResponse(
                        recipe=recipe,
                        confidence_score=0.1,  # Very low confidence for fallback
                        processing_time=time.time() - start_time
                    )
    
    async def _process_image(
        self, 
        image_data: Union[str, bytes], 
        options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process and validate image data."""
        try:
            # Handle base64 encoded images
            if isinstance(image_data, str):
                # Remove data URL prefix if present
                if image_data.startswith('data:'):
                    header, encoded = image_data.split(',', 1)
                    image_bytes = base64.b64decode(encoded)
                else:
                    image_bytes = base64.b64decode(image_data)
            else:
                image_bytes = image_data
            
            # Validate image size
            if len(image_bytes) > self.max_image_size:
                raise ValueError(f"Image too large: {len(image_bytes)} bytes (max: {self.max_image_size})")
            
            # Open and validate image with PIL
            image = Image.open(BytesIO(image_bytes))
            
            # Validate format
            if image.format not in self.supported_formats:
                raise ValueError(f"Unsupported image format: {image.format}")
            
            # Resize if too large
            original_size = image.size
            if max(image.size) > self.max_dimension:
                image.thumbnail((self.max_dimension, self.max_dimension), Image.Resampling.LANCZOS)
                self.logger.info(f"Resized image from {original_size} to {image.size}")
            
            # Convert to RGB if necessary (for JPEG compatibility)
            if image.mode in ('RGBA', 'P'):
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                rgb_image.paste(image, mask=image.split()[-1] if len(image.split()) > 3 else None)
                image = rgb_image
            
            # Save processed image to bytes
            output_buffer = BytesIO()
            image.save(output_buffer, format='JPEG', quality=85, optimize=True)
            processed_bytes = output_buffer.getvalue()
            
            # Calculate quality score based on image properties
            quality_score = self._calculate_image_quality(image, original_size)
            
            return {
                'data': processed_bytes,
                'mime_type': 'image/jpeg',
                'dimensions': image.size,
                'quality_score': quality_score
            }
            
        except Exception as e:
            self.logger.error(f"Image processing failed: {str(e)}")
            raise ValueError(f"Invalid image data: {str(e)}")
    
    def _calculate_image_quality(self, image: Image.Image, original_size: tuple) -> float:
        """Calculate a quality score for the image (0-1)."""
        quality = 0.5  # Base quality
        
        # Resolution factor
        width, height = image.size
        pixel_count = width * height
        
        if pixel_count >= 1000000:  # 1MP+
            quality += 0.2
        elif pixel_count >= 500000:  # 0.5MP+
            quality += 0.1
        elif pixel_count < 100000:  # Less than 0.1MP
            quality -= 0.2
        
        # Aspect ratio (recipe cards/pages are usually rectangular)
        aspect_ratio = max(width, height) / min(width, height)
        if 1.2 <= aspect_ratio <= 2.0:  # Good aspect ratio for documents
            quality += 0.1
        elif aspect_ratio > 3.0:  # Very wide/tall images are problematic
            quality -= 0.1
        
        # Size reduction penalty
        if image.size != original_size:
            reduction_factor = (image.size[0] * image.size[1]) / (original_size[0] * original_size[1])
            if reduction_factor < 0.5:  # Significant size reduction
                quality -= 0.1
        
        return max(0.1, min(1.0, quality))
    
    def _generate_image_extraction_prompt(self, options: Dict[str, Any]) -> str:
        """Generate a prompt optimized for image-based recipe extraction."""
        
        base_prompt = """
Analyze this image and extract complete recipe information. The image may contain:
- Recipe cards or cookbook pages
- Handwritten or printed recipes
- Recipe text in Hebrew or English
- Ingredient lists and cooking instructions

CRITICAL RULES:
- Extract ONLY information that is clearly visible in the image
- DO NOT invent or guess missing information
- If text is unclear or unreadable, use null/empty values
- For partially visible ingredients: extract what you can see clearly
- For missing amounts: use "amount not specified"
- For unclear cooking times: use null
- If the image doesn't contain a recipe, return a minimal valid response

IMAGE ANALYSIS GUIDELINES:
- Look for recipe titles at the top of the page
- Identify ingredient lists (usually bulleted or numbered)
- Find cooking instructions (step-by-step text)
- Check for cooking times, temperatures, and serving sizes
- Pay attention to both Hebrew and English text

HEBREW TEXT PROCESSING:
- Process Hebrew ingredients and instructions accurately
- Convert Hebrew measurements: כוסות=cups, כפות=tablespoons, ק"ג=kg
- Handle Hebrew time expressions: דקות=minutes, שעות=hours
- Preserve Hebrew ingredient names when appropriate

EXTRACTION PRIORITY:
1. Recipe name/title (usually largest text at top)
2. Ingredients list (look for bullets, dashes, or numbers)
3. Instructions (numbered steps or paragraph text)
4. Times and temperatures (numbers with time/temp units)
5. Servings (portions, מנות)

OCR CHALLENGES:
- If text is blurry or unclear, extract what you can confidently read
- For handwritten recipes, be extra careful with accuracy
- Skip information you cannot read clearly
- Use context clues to distinguish ingredients from instructions

STRUCTURE DECISION:
- Use "instructions" for simple step-by-step recipes
- Use "stages" only if the recipe clearly shows distinct preparation phases
- Never use both instructions and stages together

Extract the recipe information as a valid JSON object that matches the required schema.
"""
        
        # Add format-specific guidance
        format_type = options.get("format_type")
        if format_type == "structured":
            base_prompt += "\nPREFERENCE: If the recipe shows clear cooking phases, use 'stages' format.\n"
        elif format_type == "simple":
            base_prompt += "\nPREFERENCE: Use flat 'instructions' array for step-by-step directions.\n"
        
        return base_prompt
    
    def _convert_to_recipe_model(self, data: Dict[str, Any]) -> Recipe:
        """Convert the extracted data to a full Recipe model with ID and timestamps."""
        try:
            # Generate unique ID and timestamp
            recipe_id = str(uuid.uuid4())
            current_time = datetime.now()
            
            # Add the Recipe-specific fields to the existing data
            recipe_data = data.copy()
            recipe_data.update({
                "id": recipe_id,
                "creationTime": current_time
            })
            
            # Create and return Recipe object
            return Recipe(**recipe_data)
        
        except Exception as e:
            self.logger.error(f"Error converting to Recipe model: {str(e)}")
            # Create a minimal valid recipe in case of errors
            return Recipe(
                id=str(uuid.uuid4()),
                name=data.get("name", "Image Processing Error"),
                instructions=["Error processing recipe image"],
                ingredients=[],
                creationTime=datetime.now()
            )
    
    def _calculate_image_confidence(self, result: Dict[str, Any], image_quality: float) -> float:
        """Calculate confidence score for image-based extraction."""
        # Start with lower base confidence for images (OCR is less reliable)
        confidence = 0.6
        
        # Image quality significantly affects confidence
        confidence *= image_quality
        
        # Recipe completeness factors
        if result.get("name") and result["name"] != "Untitled Recipe":
            confidence += 0.05
            
        ingredients_count = len(result.get("ingredients", []))
        if ingredients_count >= 3:
            confidence += 0.1
        if ingredients_count >= 6:
            confidence += 0.05
            
        # Having instructions increases confidence
        if result.get("instructions") and len(result["instructions"]) >= 2:
            confidence += 0.1
        if result.get("stages") and len(result["stages"]) >= 2:
            confidence += 0.15
            
        # Time information from images is valuable
        time_fields = [result.get("prepTime"), result.get("cookTime"), result.get("totalTime")]
        time_count = sum(1 for t in time_fields if t is not None)
        confidence += time_count * 0.03
        
        # Cap at 0.9 (images are inherently less reliable than clean text)
        return min(0.9, max(0.1, confidence))
    
    def _generate_image_cache_key(self, image_bytes: bytes) -> str:
        """Generate a cache key for the image."""
        return hashlib.md5(image_bytes).hexdigest()
    
    def _create_image_fallback_result(self) -> Dict[str, Any]:
        """Create a basic fallback result when image extraction fails."""
        self.logger.warning("Creating fallback result due to image extraction failure")
        
        return {
            "name": "Image Processing Failed",
            "description": "Could not extract recipe from image. Please try with clearer image or convert to text.",
            "ingredients": [],
            "instructions": ["Image processing failed. Please try again with a clearer image."],
            "stages": None,
            "prepTime": None,
            "cookTime": None,
            "totalTime": None,
            "servings": None,
            "tags": ["image-extraction-failed"],
            "mainIngredient": None
        }