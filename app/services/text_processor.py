import time
from typing import Dict, Any
from app.models import RecipeResponse
from .gemini_service import GeminiService
import os
from dotenv import load_dotenv

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

        return await self.gemini_service.extract_recipe(text.strip(), options)
