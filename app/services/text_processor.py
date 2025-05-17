import time
import uuid
from datetime import datetime
from typing import Dict, Any
from ..models.recipe import Recipe, RecipeResponse
from .gemini_service import GeminiService
import os
from dotenv import load_dotenv

load_dotenv()  # This will load variables from a .env file if present

class TextProcessor:
    """Service for processing text into structured recipe data using Gemini API."""
    
    def __init__(self):
        api_key = os.getenv("GOOGLE_AI_API_KEY")
        self.gemini_service = GeminiService(api_key=api_key)

    async def process_text(self, text: str, options: Dict[str, Any] = None) -> RecipeResponse:
        """
        Process recipe text and extract structured data using Gemini API.
        """
        if options is None:
            options = {}

        start_time = time.time()
        # Call GeminiService to extract the recipe
        response = await self.gemini_service.extract_recipe(text, options)
        # response is already a RecipeResponse
        return response
