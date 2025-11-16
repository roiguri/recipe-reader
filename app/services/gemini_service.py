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

# JSON repair for handling malformed responses
try:
    from json_repair import repair_json
    JSON_REPAIR_AVAILABLE = True
except ImportError:
    JSON_REPAIR_AVAILABLE = False
    logging.getLogger(__name__).warning(
        "json-repair not available - install with: pip install json-repair"
    )

# Import our existing recipe models (no duplicates!)
from app.models import Recipe, RecipeResponse, RecipeBase, RecipeCategory

# Import centralized AI configuration
from app.config import GEMINI_MODEL

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
                # Gemini 2.5 Flash supports up to 65536 tokens - using 16384 for recipe extraction
                config = types.GenerateContentConfig(
                    temperature=options.get("temperature", 0.1 + (attempt * 0.05)),
                    max_output_tokens=options.get("max_tokens", 16384),
                    top_p=options.get("top_p", 0.8),
                    top_k=options.get("top_k", 40),
                    response_mime_type="application/json",
                    response_schema=RecipeBase,
                    thinking_config=types.ThinkingConfig(thinking_budget=0)  # Disable thinking to preserve output tokens
                )
                
                # Make the API call using the new SDK
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.client.models.generate_content(
                        model=GEMINI_MODEL,
                        contents=prompt,
                        config=config
                    )
                )

                # Debug: Log response structure if text is None
                if not response.text:
                    self.logger.warning(f"Response text is None. Response object: {response}")
                    self.logger.warning(f"Response dump: {response.model_dump()}")
                    raise ValueError("API returned empty response text")

                # Check for problematic finish reasons
                if hasattr(response, 'candidates') and response.candidates:
                    finish_reason = response.candidates[0].finish_reason

                    # Handle finish reasons using enum members (not strings)
                    if finish_reason == types.FinishReason.MAX_TOKENS:
                        self.logger.warning(f"Response truncated due to MAX_TOKENS")
                        raise ValueError(
                            f"Response truncated due to token limit. "
                            f"Consider increasing max_output_tokens beyond {config.max_output_tokens}"
                        )
                    elif finish_reason == types.FinishReason.SAFETY:
                        self.logger.error(f"Response blocked due to SAFETY filters")
                        raise ValueError(
                            f"Response blocked by safety filters. Recipe content may contain inappropriate material."
                        )
                    elif finish_reason == types.FinishReason.RECITATION:
                        self.logger.error(f"Response blocked due to RECITATION (copyrighted content)")
                        raise ValueError(
                            f"Response blocked due to recitation of copyrighted content."
                        )
                    elif finish_reason == types.FinishReason.PROHIBITED_CONTENT:
                        self.logger.error(f"Response blocked due to PROHIBITED_CONTENT")
                        raise ValueError(
                            f"Response blocked due to prohibited content policy."
                        )
                    elif finish_reason == types.FinishReason.SPII:
                        self.logger.error(f"Response blocked due to SPII (sensitive personal information)")
                        raise ValueError(
                            f"Response blocked due to sensitive personal information detection."
                        )
                    elif finish_reason == types.FinishReason.MALFORMED_FUNCTION_CALL:
                        self.logger.error(f"Response contained malformed function call")
                        raise ValueError(
                            f"Response contained malformed function call (should not occur with structured output)."
                        )
                    elif finish_reason != types.FinishReason.STOP:
                        # Log any other unexpected finish reasons
                        self.logger.warning(f"Unexpected finish reason: {finish_reason}")

                # Log token usage for monitoring
                if hasattr(response, 'usage_metadata') and response.usage_metadata:
                    usage = response.usage_metadata
                    self.logger.info(
                        f"Token usage - Input: {usage.prompt_token_count}, "
                        f"Output: {usage.candidates_token_count}, "
                        f"Total: {usage.total_token_count}"
                    )

                    # Warn if approaching token limit (>90% usage)
                    output_limit = config.max_output_tokens
                    if usage.candidates_token_count > 0.9 * output_limit:
                        self.logger.warning(
                            f"Output tokens ({usage.candidates_token_count}) near limit "
                            f"({output_limit}) - recipe may benefit from higher token limit"
                        )

                # Parse the guaranteed-valid JSON response
                try:
                    result_dict = json.loads(response.text)
                except json.JSONDecodeError as json_error:
                    # Attempt JSON repair if available
                    if JSON_REPAIR_AVAILABLE:
                        self.logger.warning(f"JSON decode failed: {str(json_error)}")
                        self.logger.info("Attempting JSON repair...")
                        try:
                            result_dict = repair_json(response.text)
                            self.logger.info("✓ JSON repair successful")
                        except Exception as repair_error:
                            self.logger.error(f"JSON repair failed: {str(repair_error)}")
                            raise json_error  # Re-raise original error
                    else:
                        # No repair available, log and re-raise
                        self.logger.error(
                            f"JSON parsing failed and json-repair not available. "
                            f"Error: {str(json_error)}"
                        )
                        raise

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
Extract complete recipe information from the following data. Focus on accuracy and completeness.

CRITICAL RULES:
- DO NOT invent or guess missing information
- If information is not clearly stated, use null/empty values
- For missing ingredient amounts: use "not specified"
- For missing times: use null, do NOT estimate
- For missing servings: use null, do NOT guess
- For tags: only use terms that appear in the text or are clearly implied
- Difficulty: ONLY "easy", "medium", or "hard" (or null if unclear)

TIME EXTRACTION:
- prepTime: Preparation work before cooking (chopping, mixing, etc.)
- cookTime: Total cooking time including baking, frying, waiting, resting, cooling
- DO NOT extract totalTime - it will be calculated automatically
- Include cooling/resting periods in cookTime, not as separate field

EXAMPLES:
Input: "Mix ingredients and bake for 30 minutes, then let cool for 15 minutes"
Output: prepTime: null, cookTime: 45 (30 baking + 15 cooling)

Input: "Prep vegetables for 15 minutes, cook for 20 minutes"
Output: prepTime: 15, cookTime: 20

Input: "Mix ingredients and bake" (times not specified)
Output: prepTime: null, cookTime: null

INGREDIENT EXTRACTION:
- Separate amounts from units: "2 cups flour" → item:"flour", amount:"2", unit:"cups"
- For "to taste": "Salt to taste" → item:"Salt", amount:"to taste", unit:null
- For countable items: "3 eggs" → item:"eggs", amount:"3", unit:"piece"
"""

        if contains_hebrew:
            base_prompt += """
HEBREW SUPPORT:
- Preserve Hebrew ingredient names and instructions
- Convert time units: דקות=minutes, שעות=hours (multiply by 60)
- Examples:
  * "1 ק\"ג פרגיות" → item:"פרגיות", amount:"1", unit:"ק\"ג"
  * "2 כפות שמן" → item:"שמן", amount:"2", unit:"כפות"
  * "מלח לפי הטעם" → item:"מלח", amount:"לפי הטעם", unit:null
"""

        base_prompt += """
STRUCTURE DECISION:
- Use "ingredients" + "instructions" for simple recipes (most common)
- Use "ingredient_stages" + "stages" only if recipe has distinct phases
- Examples for stages:
  * "For the dough: flour, water... For the filling: cheese, spinach..."
  * "Cake ingredients: ... Frosting ingredients: ..."
- Never use both flat and staged structures together

MISSING DATA HANDLING:
- Missing times → null
- Missing servings → null
- Missing ingredient amounts → "not specified"
- Missing description → "No description provided"
- Missing category → null
- Missing comments/notes → null
"""

        base_prompt += f"""
RECIPE DATA:
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
        """
        Enhanced preprocessing for recipe text with intelligent truncation.

        Handles large JSON-LD content by prioritizing critical sections:
        1. Recipe name and description (always preserved)
        2. Ingredients (essential)
        3. Instructions (essential)
        4. Times and metadata (nice to have)
        """

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

        # Intelligent truncation for very long content
        # With compact JSON-LD format, recipes should be much smaller (~1-2KB)
        # 20KB is generous and forces cleanup of bloated inputs
        max_length = 20000  # Optimized from 50000 for typical recipe content

        if len(text) > max_length:
            self.logger.warning(f"Recipe text truncated from {len(text)} to {max_length} characters")

            # Try to preserve critical sections intelligently
            truncated_text = self._smart_truncate(text, max_length)
            return truncated_text.strip()

        return text.strip()

    def _smart_truncate(self, text: str, max_length: int) -> str:
        """
        Intelligently truncate recipe text while preserving critical sections.

        Priority order:
        1. Recipe name/description (first 2000 chars)
        2. Ingredients section
        3. Instructions section
        4. Cut at sentence boundary
        """
        # Identify section markers
        ingredients_marker = None
        instructions_marker = None

        # Find ingredients section
        for pattern in [r'\bIngredients:\s*', r'\bמרכיבים:\s*']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                ingredients_marker = match.start()
                break

        # Find instructions section
        for pattern in [r'\bInstructions:\s*', r'\bהוראות:\s*', r'\bDirections:\s*']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                instructions_marker = match.start()
                break

        # Strategy 1: Preserve header + ingredients + instructions
        if ingredients_marker and instructions_marker:
            # Take everything up to max_length, but prioritize the recipe sections
            header = text[:min(ingredients_marker, 2000)]

            # Calculate remaining space
            remaining = max_length - len(header)

            # Try to fit ingredients and instructions
            ingredients_end = instructions_marker
            ingredients = text[ingredients_marker:ingredients_end]
            instructions = text[instructions_marker:min(len(text), instructions_marker + remaining)]

            # If ingredients + instructions fit, use them
            if len(ingredients) + len(instructions) <= remaining:
                truncated = header + " " + ingredients + " " + instructions
            else:
                # Prioritize ingredients, truncate instructions
                if len(ingredients) < remaining * 0.6:
                    instructions_budget = remaining - len(ingredients)
                    truncated = header + " " + ingredients + " " + instructions[:instructions_budget]
                else:
                    # Truncate both proportionally
                    ingredients_budget = int(remaining * 0.6)
                    instructions_budget = remaining - ingredients_budget
                    truncated = header + " " + ingredients[:ingredients_budget] + " " + instructions[:instructions_budget]
        else:
            # Strategy 2: Simple truncation with sentence boundary
            truncated = text[:max_length]
            # Try to cut at a sentence boundary
            last_period = truncated.rfind('.')
            if last_period > max_length * 0.8:
                truncated = truncated[:last_period + 1]

        self.logger.info(f"Smart truncation preserved {len(truncated)}/{len(text)} characters")
        return truncated
    
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
        # Handle both flat ingredients list and ingredient_stages
        ingredients = result.get("ingredients")
        ingredient_stages = result.get("ingredient_stages")

        # Calculate total ingredient count from either format
        ingredients_count = 0
        if ingredients:
            ingredients_count = len(ingredients)
        elif ingredient_stages:
            ingredients_count = sum(len(stage.get("ingredients", [])) for stage in ingredient_stages)

        if ingredients_count >= 3:
            confidence += 0.05
        if ingredients_count >= 8:
            confidence += 0.05

        # Having instructions or stages increases confidence
        instructions = result.get("instructions")
        if instructions and len(instructions) >= 3:
            confidence += 0.05

        stages = result.get("stages")
        if stages and len(stages) >= 2:
            confidence += 0.1  # Stages indicate more complex, complete recipes
            
        # Having time information increases confidence
        time_fields = [result.get("prepTime"), result.get("cookTime")]
        time_count = sum(1 for t in time_fields if t is not None)
        confidence += time_count * 0.03
            
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
            "ingredients": [
                {
                    "item": "Ingredient extraction failed",
                    "amount": "N/A",
                    "unit": "N/A"
                }
            ],
            "ingredient_stages": None,
            "instructions": ["Recipe processing failed. Please try again with simpler formatting."],
            "stages": None,
            "prepTime": None,
            "cookTime": None,
            "servings": None,
            "tags": ["extraction-failed"],
            "mainIngredient": None
        }