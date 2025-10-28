# app/services/image_processing_service.py

import os
import json
import time
import base64
import hashlib
import logging
from typing import Dict, Any, Optional, Union, List
import asyncio
from datetime import datetime
import uuid
import re
from io import BytesIO
from PIL import Image

# Import the NEW Google Gen AI SDK
from google import genai
from google.genai import types

# Import our existing recipe models and text processor
from app.models import Recipe, RecipeResponse, RecipeBase
from app.services.text_processor import TextProcessor

# Import centralized AI configuration
from app.config import GEMINI_MODEL

# Define compatible resampling filter for Pillow versions
try:
    # Pillow >= 9.1.0
    RESAMPLE_FILTER = Image.Resampling.LANCZOS
except AttributeError:
    try:
        # Pillow < 9.1.0
        RESAMPLE_FILTER = Image.LANCZOS
    except AttributeError:
        # Very old Pillow versions
        RESAMPLE_FILTER = Image.ANTIALIAS


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
            self.supported_formats = {'JPEG', 'JPG', 'PNG', 'WEBP', 'GIF'}
            self.max_dimension = 2048  # Max width or height
            
            # Initialize text processor for multi-image consolidation
            self.text_processor = TextProcessor()
            
            self.logger.info("ImageProcessingService initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize ImageProcessingService: {str(e)}")
            self.available = False
    
    async def extract_recipe_from_image(
        self, 
        image_data: Union[str, bytes, List[str]], 
        options: Optional[Dict[str, Any]] = None
    ) -> RecipeResponse:
        """
        Extract structured recipe data from single or multiple images.
        
        Args:
            image_data: Base64 encoded image string, raw bytes, or list of base64 strings
            options: Optional processing parameters
            
        Returns:
            RecipeResponse object with extracted recipe and metadata
        """
        if not self.available:
            raise ValueError("ImageProcessingService is not available. Check API key configuration.")
            
        options = options or {}
        start_time = time.time()
        
        # Handle multiple images vs single image
        if isinstance(image_data, list):
            return await self._extract_recipe_from_multiple_images(image_data, options, start_time)
        else:
            return await self._extract_recipe_from_single_image(image_data, options, start_time)
    
    async def _extract_recipe_from_single_image(
        self, 
        image_data: Union[str, bytes], 
        options: Dict[str, Any],
        start_time: float
    ) -> RecipeResponse:
        """Extract recipe from a single image using Gemini Vision."""
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
                    max_output_tokens=options.get("max_tokens", 8192),  # Increased from 2048 to handle complex recipes
                    top_p=options.get("top_p", 0.8),
                    top_k=options.get("top_k", 40),
                    response_mime_type="application/json",
                    response_schema=RecipeBase,
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
                        model=GEMINI_MODEL,
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
    
    async def _extract_recipe_from_multiple_images(
        self, 
        image_data_list: List[str], 
        options: Dict[str, Any],
        start_time: float
    ) -> RecipeResponse:
        """Extract recipe from multiple images by consolidating OCR text."""
        self.logger.info(f"Processing {len(image_data_list)} images for multi-page recipe")
        
        # Extract text from each image
        extracted_texts = []
        for i, image_data in enumerate(image_data_list):
            try:
                text = await self._extract_text_from_image(image_data, options)
                if text.strip():
                    extracted_texts.append({
                        'page': i + 1,
                        'text': text
                    })
                    self.logger.info(f"Successfully extracted text from image {i+1}")
                else:
                    self.logger.warning(f"No text extracted from image {i+1}")
            except Exception as e:
                self.logger.warning(f"Failed to extract text from image {i+1}: {str(e)}")
                continue
        
        if not extracted_texts:
            # No text extracted from any image, create fallback
            fallback_result = self._create_image_fallback_result()
            recipe = self._convert_to_recipe_model(fallback_result)
            return RecipeResponse(
                recipe=recipe,
                confidence_score=0.1,
                processing_time=time.time() - start_time
            )
        
        # Consolidate all extracted text
        consolidated_text = self._consolidate_extracted_texts(extracted_texts)
        
        # Use TextProcessor to extract recipe from consolidated text
        self.logger.info("Processing consolidated text through TextProcessor")
        text_options = options.copy()
        text_options['source'] = 'multi-image'
        text_options['image_count'] = len(image_data_list)
        
        result = await self.text_processor.process_text(consolidated_text, text_options)
        
        # Adjust confidence score for multi-image processing
        original_confidence = result.confidence_score
        # Multi-image processing is generally more reliable due to more complete information
        adjusted_confidence = min(0.95, original_confidence * 1.1)
        result.confidence_score = adjusted_confidence
        
        # Update processing time
        result.processing_time = time.time() - start_time
        
        self.logger.info(f"Successfully processed multi-page recipe with confidence {adjusted_confidence:.2f}")
        return result
    
    async def _extract_text_from_image(
        self, 
        image_data: Union[str, bytes], 
        options: Dict[str, Any]
    ) -> str:
        """Extract text content from a single image using Gemini Vision (OCR only)."""
        # Process and validate image
        processed_image = await self._process_image(image_data, options)
        
        # Generate prompt for OCR-only extraction
        ocr_prompt = self._generate_ocr_prompt()
        
        # Retry logic for robustness
        max_retries = options.get("max_retries", 2)  # Fewer retries for OCR
        retry_delay = options.get("retry_delay", 1.0)
        
        for attempt in range(max_retries):
            try:
                self.logger.debug(f"OCR attempt {attempt + 1}/{max_retries}")
                
                # Configure generation parameters for text extraction
                config = types.GenerateContentConfig(
                    temperature=0.0,  # Very low temperature for OCR accuracy
                    max_output_tokens=4096,  # More tokens for longer recipes
                    top_p=0.8,
                    top_k=40
                )
                
                # Prepare content with image and OCR prompt
                content = [
                    types.Part(text=ocr_prompt),
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
                        model=GEMINI_MODEL,
                        contents=content,
                        config=config
                    )
                )
                
                # Return the extracted text
                extracted_text = response.text.strip()
                self.logger.debug(f"OCR extracted {len(extracted_text)} characters")
                return extracted_text
                
            except Exception as e:
                self.logger.warning(f"OCR attempt {attempt + 1} failed: {str(e)}")
                
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    # All retries failed
                    self.logger.error("All OCR attempts failed")
                    return ""
    
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
                image.thumbnail((self.max_dimension, self.max_dimension), RESAMPLE_FILTER)
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
    
    def _generate_ocr_prompt(self) -> str:
        """Generate a prompt optimized for OCR text extraction only."""
        return """
Please extract all text content from this image accurately. This appears to be a recipe or cookbook page.

EXTRACTION GUIDELINES:
- Extract ALL visible text exactly as it appears
- Maintain the original text structure and formatting
- Include ingredients lists, instructions, titles, and any other text
- Preserve Hebrew and English text accurately
- Include numbers, measurements, and cooking times
- Don't interpret or modify the text - just extract it faithfully
- If text is unclear, indicate with [unclear text] but extract what you can

OUTPUT FORMAT:
Provide the extracted text in a clean, readable format that preserves the original structure.
"""
    
    def _consolidate_extracted_texts(self, extracted_texts: List[Dict[str, Any]]) -> str:
        """Consolidate text from multiple images into a unified recipe text."""
        if not extracted_texts:
            return ""
        
        if len(extracted_texts) == 1:
            return extracted_texts[0]['text']
        
        # Sort by page number to ensure correct order
        sorted_texts = sorted(extracted_texts, key=lambda x: x['page'])
        
        # Start consolidation
        consolidated_parts = []
        
        # Add a header indicating this is a multi-page recipe
        consolidated_parts.append("MULTI-PAGE RECIPE (Consolidated from multiple images)")
        consolidated_parts.append("=" * 50)
        
        # Process each page
        for page_data in sorted_texts:
            page_num = page_data['page']
            text = page_data['text']
            
            # Clean up the text
            cleaned_text = self._clean_extracted_text(text)
            
            if cleaned_text.strip():
                consolidated_parts.append(f"\n--- PAGE {page_num} ---")
                consolidated_parts.append(cleaned_text)
        
        # Join all parts
        full_text = "\n".join(consolidated_parts)
        
        # Post-process the consolidated text
        return self._post_process_consolidated_text(full_text)
    
    def _clean_extracted_text(self, text: str) -> str:
        """Clean extracted text from a single image."""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        # Remove common OCR artifacts
        ocr_noise_patterns = [
            r'\[unclear text\]',
            r'page \d+',
            r'continued on next page',
            r'see page \d+',
            r'^page \d+$',
        ]
        
        for pattern in ocr_noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
        
        return text.strip()
    
    def _post_process_consolidated_text(self, text: str) -> str:
        """Post-process the consolidated text to remove duplicates and improve structure."""
        lines = text.split('\n')
        processed_lines = []
        seen_ingredients = set()
        seen_instructions = set()
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                processed_lines.append('')
                continue
            
            # Skip duplicate lines that are likely repeated across pages
            line_lower = line.lower()
            
            # Detect section headers
            if any(keyword in line_lower for keyword in ['ingredients', 'מרכיבים', 'חומרים']):
                current_section = 'ingredients'
                processed_lines.append(line)
                continue
            elif any(keyword in line_lower for keyword in ['instructions', 'הוראות', 'אופן הכנה', 'דרך הכנה']):
                current_section = 'instructions'
                processed_lines.append(line)
                continue
            elif line.startswith('---'):
                current_section = None
                processed_lines.append(line)
                continue
            
            # Handle ingredients deduplication
            if current_section == 'ingredients':
                # Simple ingredient deduplication based on main ingredient name
                ingredient_key = self._extract_ingredient_key(line)
                if ingredient_key and ingredient_key not in seen_ingredients:
                    seen_ingredients.add(ingredient_key)
                    processed_lines.append(line)
                elif not ingredient_key:  # Not an ingredient line
                    processed_lines.append(line)
            # Handle instructions deduplication
            elif current_section == 'instructions':
                # Simple instruction deduplication
                instruction_key = self._extract_instruction_key(line)
                if instruction_key and instruction_key not in seen_instructions:
                    seen_instructions.add(instruction_key)
                    processed_lines.append(line)
                elif not instruction_key:  # Not an instruction line
                    processed_lines.append(line)
            else:
                # Other content (titles, descriptions, etc.)
                processed_lines.append(line)
        
        return '\n'.join(processed_lines)
    
    def _extract_ingredient_key(self, line: str) -> Optional[str]:
        """Extract a key for ingredient deduplication."""
        line_lower = line.lower().strip()
        
        # Skip if it doesn't look like an ingredient
        if not line_lower or len(line_lower) < 3:
            return None
        
        # Simple patterns that suggest this is an ingredient line
        ingredient_indicators = [
            r'\d+.*?(?:cup|cups|tsp|tbsp|oz|lb|gram|kg|ml|liter)',  # English measurements
            r'\d+.*?(?:כוס|כוסות|כף|כפות|גרם|קילו|מ"ל|ליטר)',  # Hebrew measurements
            r'^\d+\s*[-.]',  # Numbered list
            r'^[-*•]\s*',  # Bulleted list
        ]
        
        is_ingredient = any(re.search(pattern, line_lower) for pattern in ingredient_indicators)
        
        if is_ingredient:
            # Extract the main ingredient name (rough heuristic)
            # Remove measurements and common words
            clean_line = re.sub(r'\d+[\d\s/.-]*(?:cup|cups|tsp|tbsp|oz|lb|gram|kg|ml|liter|כוס|כוסות|כף|כפות|גרם|קילו|מ"ל|ליטר)', '', line_lower)
            clean_line = re.sub(r'^[-*•\d\s.]+', '', clean_line)  # Remove list markers and numbers
            clean_line = clean_line.strip()
            
            # Take first few words as the key
            words = clean_line.split()[:3]  # First 3 words should be sufficient
            return ' '.join(words) if words else None
        
        return None
    
    def _extract_instruction_key(self, line: str) -> Optional[str]:
        """Extract a key for instruction deduplication."""
        line_lower = line.lower().strip()
        
        # Skip if it doesn't look like an instruction
        if not line_lower or len(line_lower) < 10:
            return None
        
        # Simple patterns that suggest this is an instruction line
        instruction_indicators = [
            r'^\d+\s*[-.]',  # Numbered steps
            r'^[-*•]\s*',  # Bulleted steps
            r'\b(?:mix|stir|add|cook|bake|heat|pour|chop|dice|slice)\b',  # English cooking verbs
            r'\b(?:לערבב|להוסיף|לבשל|לאפות|לחמם|לשפוך|לקצוץ|לחתוך)\b',  # Hebrew cooking verbs
        ]
        
        is_instruction = any(re.search(pattern, line_lower) for pattern in instruction_indicators)
        
        if is_instruction:
            # Remove step numbers and markers
            clean_line = re.sub(r'^[-*•\d\s.]+', '', line_lower)
            clean_line = clean_line.strip()
            
            # Take first few words as the key
            words = clean_line.split()[:5]  # First 5 words should be sufficient
            return ' '.join(words) if words else None
        
        return None
    
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
        time_fields = [result.get("prepTime"), result.get("cookTime")]
        time_count = sum(1 for t in time_fields if t is not None)
        confidence += time_count * 0.04
        
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
            "servings": None,
            "tags": ["image-extraction-failed"],
            "mainIngredient": None
        }