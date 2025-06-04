# app/services/gemini_service.py

import os
import json
import time
import hashlib
import logging
from typing import Dict, Any, Optional, List
import asyncio

# Import Google's Generative AI library
import google.generativeai as genai
from google.api_core.exceptions import GoogleAPIError

# Import our recipe models
from ..models.recipe import Recipe, Ingredient, Stage, RecipeResponse


class GeminiService:
    """Service for recipe extraction using Google's Gemini API."""
    
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
            
        # Configure the Gemini API
        genai.configure(api_key=self.api_key)
        
        # Get the Gemini Pro model
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Initialize cache
        self.cache = {}
        self.available = True
        self.recipe_schema = self._create_recipe_schema()
        
        self.logger.info("GeminiService initialized successfully with structured output schema")
    
    async def extract_recipe(self, text: str, options: Optional[Dict[str, Any]] = None) -> RecipeResponse:
        """
        Extract structured recipe data from text using Gemini.
        
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
                # If it's a RecipeResponse, return directly
                if isinstance(cached_result, RecipeResponse):
                    return cached_result
                # If it's a dict, convert to RecipeResponse
                if isinstance(cached_result, dict):
                    recipe = self._convert_to_recipe_model(cached_result)
                    confidence_score = cached_result.get("confidence_score", 0.9)
                    return RecipeResponse(
                        recipe=recipe,
                        confidence_score=confidence_score,
                        processing_time=0.0  # Cached, so no processing time
                    )
        
        # Preprocess text
        processed_text = self._preprocess_text(text)
        
        # Generate prompt
        prompt = self._generate_prompt(processed_text, options)
        
        # Call Gemini API
        try:
            generation_config = {
                "temperature": options.get("temperature", 0.2),
                "max_output_tokens": options.get("max_tokens", 1024),
                "top_p": options.get("top_p", 0.8),
                "top_k": options.get("top_k", 40),
            }
            
            # Convert the synchronous call to asynchronous using asyncio
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(**generation_config),
                )
            )
            
            # Parse response
            result = self._parse_response(response.text)
            
            # Calculate confidence score based on completeness
            confidence_score = self._calculate_confidence(result)
            
            # Convert to Recipe model
            recipe = self._convert_to_recipe_model(result)
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Cache the result if caching is enabled
            if use_cache:
                cache_key = self._generate_cache_key(text)
                # Store with confidence score for later retrieval
                result["confidence_score"] = confidence_score
                self.cache[cache_key] = result
            
            # Return RecipeResponse
            return RecipeResponse(
                recipe=recipe,
                confidence_score=confidence_score,
                processing_time=processing_time
            )
            
        except GoogleAPIError as e:
            self.logger.error(f"Google API error: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error in recipe extraction: {str(e)}")
            raise
    
    def _generate_prompt(self, text: str, options: Dict[str, Any]) -> str:
        """Generate a prompt for recipe extraction."""
        # Template can be customized or loaded from a file
        template = """
        Extract the complete recipe information from the following text. Analyze all details and return a valid JSON object with the following structure:

        {{
          "name": "Recipe title/name",
          "description": "Brief description if available",
          "ingredients": [
            {{"item": "ingredient name", "amount": "quantity as text", "unit": "measurement unit"}}
          ],
          "instructions": ["Step 1", "Step 2", "..."],
          "stages": [
            {{"title": "Stage name", "instructions": ["Step 1", "Step 2"]}}
          ],
          "prepTime": preparation time in minutes (number),
          "cookTime": cooking time in minutes (number),
          "totalTime": total time in minutes (number),
          "servings": number of servings (number),
          "tags": ["tag1", "tag2"]
        }}

        Important guidelines:
        1. Convert all times to minutes (e.g., "1 hour" = 60)
        2. For instructions, use either flat "instructions" array OR structured "stages" based on the recipe format, but include both fields in the JSON (set the unused one to null)
        3. Extract all ingredients with their amounts and units when possible
        4. For ingredients without specific amounts, use "to taste" or similar for the amount
        5. Ensure the JSON is valid and follows the exact structure above
        6. Make mainIngredient the most important ingredient or the base of the dish

        Recipe text:
        {text}

        ONLY respond with the JSON object and nothing else.
        """
        
        # If specialized format requested
        format_type = options.get("format_type")
        if format_type == "structured":
            # Emphasize structured output with stages
            template += "\nPrefer using 'stages' for organizing instructions into logical groups."
        elif format_type == "simple":
            # Emphasize flat instructions
            template += "\nPrefer using flat 'instructions' rather than 'stages' unless the recipe has very clear distinct sections."
        
        return template.format(text=text)
    
    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the AI response into structured data."""
        try:
            # Extract JSON from response
            response_text = response_text.strip()
            
            # Look for JSON object in the response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                result = json.loads(json_str)
                
                # Validate and normalize result
                return self._normalize_result(result)
            else:
                raise ValueError("No JSON object found in response")
                
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse JSON response: {str(e)}")
            self.logger.debug(f"Response text: {response_text}")
            raise
    
    def _normalize_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and validate the extracted recipe data."""
        # Ensure required fields exist
        if not result.get("name"):
            result["name"] = "Untitled Recipe"
            
        if not result.get("description"):
            result["description"] = f"Recipe for {result['name']}"
            
        # Ensure either instructions or stages exists and is properly formatted
        if "instructions" not in result or not result["instructions"]:
            result["instructions"] = None
            
        if "stages" not in result or not result["stages"]:
            result["stages"] = None
            
        # Ensure at least one of instructions or stages has content
        if not result["instructions"] and not result["stages"]:
            # Create a default instruction if none exists
            result["instructions"] = ["Follow recipe directions."]
            
        # Ensure ingredients exist
        if "ingredients" not in result or not result["ingredients"]:
            result["ingredients"] = []
            
        # Normalize time fields
        for time_field in ["prepTime", "cookTime", "totalTime"]:
            if time_field in result:
                # Ensure it's a number
                try:
                    result[time_field] = int(result[time_field])
                except (ValueError, TypeError):
                    result[time_field] = None
            else:
                result[time_field] = None
                
        # Ensure servings exists
        if "servings" not in result or not result["servings"]:
            result["servings"] = None
        else:
            # Ensure it's a number
            try:
                result["servings"] = int(result["servings"])
            except (ValueError, TypeError):
                result["servings"] = None
                
        # Ensure tags exist
        if "tags" not in result or not result["tags"]:
            result["tags"] = []
            
        # Add mainIngredient if not present
        if "mainIngredient" not in result or not result["mainIngredient"]:
            # Try to determine from first ingredient or tags
            if result["ingredients"] and len(result["ingredients"]) > 0:
                result["mainIngredient"] = result["ingredients"][0].get("item", "")
            elif result["tags"] and len(result["tags"]) > 0:
                result["mainIngredient"] = result["tags"][0]
            else:
                result["mainIngredient"] = None
                
        return result
    
    def _convert_to_recipe_model(self, data: Dict[str, Any]) -> Recipe:
        """Convert the extracted data to a Recipe model."""
        try:
            # Process ingredients
            ingredients = []
            for ing_data in data.get("ingredients", []):
                ingredients.append(Ingredient(
                    item=ing_data.get("item", ""),
                    amount=str(ing_data.get("amount", "")),
                    unit=ing_data.get("unit", "")
                ))
            
            # Generate a unique ID for the recipe
            import uuid
            recipe_id = str(uuid.uuid4())
            
            # Get current datetime
            from datetime import datetime
            current_time = datetime.now()
            
            # Create recipe base fields
            recipe_data = {
                "id": recipe_id,
                "name": data.get("name", "Untitled Recipe"),
                "description": data.get("description", ""),
                "prepTime": data.get("prepTime"),
                "cookTime": data.get("cookTime"),
                "totalTime": data.get("totalTime"),
                "servings": data.get("servings"),
                "ingredients": ingredients,
                "mainIngredient": data.get("mainIngredient"),
                "tags": data.get("tags", []),
                "creationTime": current_time,
                "approved": False,
                "allowImageSuggestions": True
            }
            
            # Set either instructions or stages
            if data.get("stages") and isinstance(data["stages"], list) and len(data["stages"]) > 0:
                stages = []
                for stage_data in data["stages"]:
                    # Validate stage data before creating Stage object
                    if isinstance(stage_data, dict) and "title" in stage_data and stage_data["title"]:
                        stages.append(Stage(
                            title=stage_data.get("title", ""),
                            instructions=stage_data.get("instructions", [])
                        ))
                
                # Only set stages if we successfully created at least one valid stage
                if stages:
                    recipe_data["stages"] = stages
                    recipe_data["instructions"] = None
                else:
                    # Fallback to instructions if stages couldn't be processed
                    recipe_data["instructions"] = data.get("instructions") or ["No instructions available"]
                    recipe_data["stages"] = None
            else:
                # Use instructions
                recipe_data["instructions"] = data.get("instructions") or ["No instructions available"]
                recipe_data["stages"] = None
            
            # Create and return Recipe object
            return Recipe(**recipe_data)
        
        except Exception as e:
            self.logger.error(f"Error converting to Recipe model: {str(e)}")
            # Create a minimal valid recipe in case of errors
            return Recipe(
                id=str(uuid.uuid4()),
                name=data.get("name", "Untitled Recipe"),
                instructions=["Error processing recipe details"],
                ingredients=[],
                creationTime=datetime.now()
            )
    
    def _preprocess_text(self, text: str) -> str:
        """Preprocess the recipe text for better AI processing."""
        # Remove excessive whitespace
        text = ' '.join(text.split())
        
        # Truncate if too long (Gemini has a maximum input length)
        max_length = 30000 
        if len(text) > max_length:
            self.logger.warning(f"Recipe text truncated from {len(text)} to {max_length} characters")
            text = text[:max_length]
        
        return text
    
    def _generate_cache_key(self, text: str) -> str:
        """Generate a cache key for the text."""
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """Calculate a confidence score for the extraction result."""
        # Start with a base score
        confidence = 0.7
        
        # Factors that increase confidence
        if result.get("name") and result["name"] != "Untitled Recipe":
            confidence += 0.05
            
        # More complete recipes have higher confidence
        ingredients_count = len(result.get("ingredients", []))
        if ingredients_count > 5:
            confidence += 0.05
        if ingredients_count > 10:
            confidence += 0.05
            
        # Having instructions increases confidence
        if result.get("instructions") and len(result["instructions"]) > 3:
            confidence += 0.05
        if result.get("stages") and len(result["stages"]) > 1:
            confidence += 0.05
            
        # Having time information increases confidence
        if result.get("prepTime") is not None:
            confidence += 0.025
        if result.get("cookTime") is not None:
            confidence += 0.025
        if result.get("totalTime") is not None:
            confidence += 0.025
            
        # Having servings increases confidence
        if result.get("servings") is not None:
            confidence += 0.025
            
        # Cap at 0.95 (we're never 100% confident in AI extraction)
        return min(0.95, confidence)
    
    def _create_recipe_schema(self) -> Dict[str, Any]:
        """Create JSON schema that matches our Recipe model."""
        return {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Recipe name or title"
                },
                "description": {
                    "type": "string",
                    "description": "Brief description of the recipe"
                },
                "ingredients": {
                    "type": "array",
                    "description": "List of ingredients with amounts",
                    "items": {
                        "type": "object",
                        "properties": {
                            "item": {
                                "type": "string",
                                "description": "Name of the ingredient"
                            },
                            "amount": {
                                "type": "string",
                                "description": "Amount/quantity as text"
                            },
                            "unit": {
                                "type": "string",
                                "description": "Unit of measurement (can be empty string)"
                            }
                        },
                        "required": ["item", "amount", "unit"]
                    },
                    "minItems": 1
                },
                "instructions": {
                    "type": ["array", "null"],
                    "description": "Flat list of cooking instructions (use this OR stages, not both)",
                    "items": {
                        "type": "string"
                    }
                },
                "stages": {
                    "type": ["array", "null"],
                    "description": "Structured stages for complex recipes (use this OR instructions, not both)",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "Name of this cooking stage"
                            },
                            "instructions": {
                                "type": "array",
                                "description": "Steps for this stage",
                                "items": {
                                    "type": "string"
                                }
                            }
                        },
                        "required": ["title", "instructions"]
                    }
                },
                "prepTime": {
                    "type": ["integer", "null"],
                    "description": "Preparation time in minutes"
                },
                "cookTime": {
                    "type": ["integer", "null"],
                    "description": "Cooking time in minutes"
                },
                "totalTime": {
                    "type": ["integer", "null"],
                    "description": "Total time in minutes"
                },
                "servings": {
                    "type": ["integer", "null"],
                    "description": "Number of servings"
                },
                "tags": {
                    "type": "array",
                    "description": "Recipe tags (cuisine, dietary, etc.)",
                    "items": {
                        "type": "string"
                    }
                },
                "mainIngredient": {
                    "type": ["string", "null"],
                    "description": "Primary or most important ingredient"
                }
            },
            "required": ["name", "ingredients"]
        }