# app/services/gemini_service.py

import os
import json
import time
import hashlib
import logging
from typing import Dict, Any, Optional
import asyncio
from datetime import datetime
import uuid
import re

# Import the NEW Google Gen AI SDK
from google import genai
from google.genai import types

# Import our existing recipe models (no duplicates!)
from app.models import Recipe, Ingredient, Stage, RecipeResponse, RecipeBase

class GeminiService:
    """Service for recipe extraction using Google's new Gen AI SDK with structured output."""
    
    def __init__(self, api_key=None):
        """
        Initialize the Gemini service.
        
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
            
            self.logger.info("GeminiService initialized successfully with new Google Gen AI SDK")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize GeminiService: {str(e)}")
            self.available = False
    
    async def extract_recipe(self, text: str, options: Optional[Dict[str, Any]] = None) -> RecipeResponse:
        """
        Extract structured recipe data from text using Gemini with structured output.
        
        Args:
            text: Recipe text to process
            options: Optional processing parameters
            
        Returns:
            RecipeResponse object with extracted recipe and metadata
        """
        if not self.available:
            raise ValueError("GeminiService is not available. Check API key configuration.")
            
        options = options or {}
        start_time = time.time()
        
        # Check cache if enabled
        use_cache = options.get("use_cache", True)
        if use_cache:
            cache_key = self._generate_cache_key(text)
            cached_result = self.cache.get(cache_key)
            if cached_result:
                self.logger.info("Returning cached result")
                if isinstance(cached_result, RecipeResponse):
                    return cached_result
                # Convert cached dict to RecipeResponse
                if isinstance(cached_result, dict):
                    recipe = self._convert_to_recipe_model(cached_result)
                    confidence_score = cached_result.get("confidence_score", 0.9)
                    return RecipeResponse(
                        recipe=recipe,
                        confidence_score=confidence_score,
                        processing_time=0.0
                    )
        
        # Preprocess text
        processed_text = self._preprocess_text(text)
        
        # Generate prompt for structured extraction
        prompt = self._generate_structured_prompt(processed_text, options)
        
        # Retry logic for robustness
        max_retries = options.get("max_retries", 3)
        retry_delay = options.get("retry_delay", 1.0)
        last_error = None
        
        for attempt in range(max_retries):
            try:
                self.logger.info(f"Attempting structured extraction (attempt {attempt + 1}/{max_retries})")
                
                # Configure generation parameters
                config = types.GenerateContentConfig(
                    temperature=options.get("temperature", 0.1 + (attempt * 0.05)),
                    max_output_tokens=options.get("max_tokens", 2048),
                    top_p=options.get("top_p", 0.8),
                    top_k=options.get("top_k", 40),
                    response_mime_type="application/json",
                    response_schema=RecipeBase  # Use your existing model directly!
                )
                
                # Make the API call using the new SDK
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.client.models.generate_content(
                        model="gemini-1.5-flash",
                        contents=prompt,
                        config=config
                    )
                )
                
                # Parse the guaranteed-valid JSON response
                result_dict = json.loads(response.text)
                
                # Convert to your RecipeBase Pydantic model for validation
                extracted_recipe = RecipeBase(**result_dict)
                
                # Convert to dict for further processing
                result = extracted_recipe.model_dump()
                
                # Calculate confidence score
                confidence_score = self._calculate_confidence(result)
                
                # Convert to full Recipe model (adds id, timestamps, etc.)
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
                    cache_key = self._generate_cache_key(text)
                    result["confidence_score"] = confidence_score
                    self.cache[cache_key] = result
                
                self.logger.info(f"Successfully extracted recipe on attempt {attempt + 1}")
                return response_obj
                
            except Exception as e:
                last_error = e
                self.logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    self.logger.info(f"Retrying in {wait_time} seconds...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    # All retries failed, create fallback result
                    self.logger.error("All extraction attempts failed, creating fallback result")
                    fallback_result = self._create_fallback_result(processed_text)
                    recipe = self._convert_to_recipe_model(fallback_result)
                    return RecipeResponse(
                        recipe=recipe,
                        confidence_score=0.2,  # Low confidence for fallback
                        processing_time=time.time() - start_time
                    )
    
    def _generate_structured_prompt(self, text: str, options: Dict[str, Any]) -> str:
        """Generate a prompt optimized for structured output extraction."""
        
        # Detect if text contains Hebrew
        contains_hebrew = self._contains_hebrew(text)
        
        base_prompt = f"""
Extract complete recipe information from the following text. Focus on accuracy and completeness.

CRITICAL RULES:
- DO NOT invent or guess missing information
- If information is not clearly stated, use null/empty values
- For missing ingredients amounts: use "amount not specified" 
- For missing times: use null, do NOT estimate
- For missing servings: use null, do NOT guess
- For tags: only use terms that appear in the text or are clearly implied
- For difficulty/category: only if explicitly mentioned

EXTRACTION GUIDELINES:
- Convert time references to minutes only if explicitly stated
- Extract ingredients exactly as written - don't add units that aren't there
- Don't assume cooking methods not mentioned in the text

INGREDIENT EXTRACTION RULES:
- "1 ק\"ג פרגיות" → item: "פרגיות", amount: "1", unit: "ק\"ג"
- "2 כפות שמן" → item: "שמן", amount: "2", unit: "כפות" 
- "3 ביצים" → item: "ביצים", amount: "3", unit: "יחידה"
- "מלח לפי הטעם" → item: "מלח", amount: "לפי הטעם", unit: "ללא"
- "קמח (כ-2 כוסות)" → item: "קמח", amount: "כ-2", unit: "כוסות"
CRITICAL: Always separate the NUMBER from the UNIT into different fields!

WHAT TO DO WHEN DATA IS MISSING:
- Missing prep time → prepTime: null
- Missing cook time → cookTime: null  
- Missing servings → servings: null
- Missing ingredient amounts → amount: "not specified"
- Missing description → description: "No description provided"
- Missing category → category: null

STRUCTURE DECISION:
- Use "instructions" (set "stages" to null) for straightforward recipes
- Use "stages" (set "instructions" to null) only if recipe has distinct preparation phases
- Never use both instructions and stages together

"""

        if contains_hebrew:
            base_prompt += """
HEBREW TEXT HANDLING:
- Process Hebrew ingredients and instructions accurately
- Maintain original Hebrew names for ingredients when appropriate
- Convert Hebrew time expressions to minutes (דקות = minutes, שעות = hours)
- Preserve authentic cooking terminology

"""
        # Examples
        base_prompt += """
GOOD EXAMPLES:
Input: "Boil pasta for 10 minutes"
Output: prepTime: null, cookTime: 10, totalTime: null

Input: "Mix ingredients and bake"  
Output: prepTime: null, cookTime: null, totalTime: null

BAD EXAMPLES (DON'T DO THIS):
Input: "Mix ingredients and bake"
Output: prepTime: 15, cookTime: 30 (WRONG - these weren't specified!)
"""
        
        # Add format-specific guidance
        format_type = options.get("format_type")
        if format_type == "structured":
            base_prompt += "PREFERENCE: Use 'stages' to organize instructions into logical cooking phases.\n"
        elif format_type == "simple":
            base_prompt += "PREFERENCE: Use flat 'instructions' array for simple step-by-step directions.\n"

        base_prompt += f"""
RECIPE TEXT:
{text}

Extract the recipe information as a valid JSON object that matches the required schema.
"""
        
        return base_prompt
    
    def _convert_to_recipe_model(self, data: Dict[str, Any]) -> Recipe:
        """Convert the extracted data to a full Recipe model with ID and timestamps."""
        try:
            # The data is already validated by RecipeBase, so we just need to add
            # the additional fields required for the Recipe model
            
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
                name=data.get("name", "Recipe Processing Error"),
                instructions=["Error processing recipe details"],
                ingredients=[],
                creationTime=datetime.now()
            )
    
    def _preprocess_text(self, text: str) -> str:
        """Enhanced preprocessing for recipe text."""
        
        # Remove excessive whitespace
        text = ' '.join(text.split())
        
        # Remove common website navigation elements
        website_noise_patterns = [
            r'שמרו|שתפו|דרגו|לחצו כאן',  # Hebrew: save, share, rate, click here
            r'save|share|rate|click here|print recipe',  # English equivalents
            r'plus|minus|\+|\-',  # Navigation buttons
            r'כבר הכנתם\?|רוצים להגיב\?',  # Interactive elements
        ]
        
        for pattern in website_noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Clean up extra spaces after removal
        text = re.sub(r'\s+', ' ', text)
        
        # Truncate if too long (Gemini has a maximum input length)
        max_length = 30000 
        if len(text) > max_length:
            self.logger.warning(f"Recipe text truncated from {len(text)} to {max_length} characters")
            text = text[:max_length]
            # Try to cut at a reasonable boundary
            last_period = text.rfind('.')
            if last_period > max_length * 0.8:
                text = text[:last_period + 1]
        
        return text.strip()
    
    def _contains_hebrew(self, text: str) -> bool:
        """Check if text contains Hebrew characters."""
        hebrew_pattern = re.compile(r'[\u0590-\u05FF]')
        return bool(hebrew_pattern.search(text))
    
    def _generate_cache_key(self, text: str) -> str:
        """Generate a cache key for the text."""
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """Calculate a confidence score for the extraction result."""
        confidence = 0.8  # Higher base confidence for structured output
        
        # Factors that increase confidence
        if result.get("name") and result["name"] != "Untitled Recipe":
            confidence += 0.05
            
        # More complete recipes have higher confidence
        ingredients_count = len(result.get("ingredients", []))
        if ingredients_count >= 3:
            confidence += 0.05
        if ingredients_count >= 8:
            confidence += 0.05
            
        # Having instructions or stages increases confidence
        if result.get("instructions") and len(result["instructions"]) >= 3:
            confidence += 0.05
        if result.get("stages") and len(result["stages"]) >= 2:
            confidence += 0.1  # Stages indicate more complex, complete recipes
            
        # Having time information increases confidence
        time_fields = [result.get("prepTime"), result.get("cookTime"), result.get("totalTime")]
        time_count = sum(1 for t in time_fields if t is not None)
        confidence += time_count * 0.02
            
        # Having servings increases confidence
        if result.get("servings") is not None:
            confidence += 0.02
            
        # Having main ingredient increases confidence
        if result.get("mainIngredient"):
            confidence += 0.02
            
        # Having tags increases confidence
        if result.get("tags") and len(result["tags"]) > 0:
            confidence += 0.02
        
        # Cap at 0.98 (never 100% confident in AI extraction)
        return min(0.98, confidence)
    
    def _create_fallback_result(self, text: str) -> Dict[str, Any]:
        """Create a basic fallback result when all extraction attempts fail."""
        self.logger.warning("Creating fallback result due to extraction failure")
        
        # Try to extract at least the recipe name from the text
        name = "Recipe Extraction Failed"
        lines = text.split('\n')[:3]  # Check first few lines
        for line in lines:
            line = line.strip()
            if 3 < len(line) < 100 and not any(char.isdigit() for char in line[:10]):
                name = line
                break
        
        return {
            "name": name,
            "description": "Recipe extraction failed. Please try with cleaner text.",
            "ingredients": [],
            "instructions": ["Recipe processing failed. Please try again with simpler formatting."],
            "stages": None,
            "prepTime": None,
            "cookTime": None,
            "totalTime": None,
            "servings": None,
            "tags": ["extraction-failed"],
            "mainIngredient": None
        }