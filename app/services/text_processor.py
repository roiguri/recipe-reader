from typing import Dict, Any
from app.models import RecipeResponse
from .gemini_service import GeminiService
import os

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

        # Enhanced preprocessing for URL-extracted content
        processed_text = self._preprocess_text(text, options)
        
        return await self.gemini_service.extract_recipe(processed_text, options)
    
    def _preprocess_text(self, text: str, options: Dict[str, Any]) -> str:
        """
        Preprocess text with special handling for URL-extracted content.
        """
        if not text:
            return text
        
        # Check if this is URL-extracted content
        extraction_method = options.get('extraction_method')
        source_url = options.get('source_url')
        
        # Basic text cleaning
        text = text.strip()
        
        # Enhanced cleaning for web-scraped content
        if extraction_method in ['css-selectors', 'full-text']:
            text = self._clean_web_content(text)
        
        # Add source URL context if available
        if source_url and extraction_method:
            text = f"Recipe source: {source_url}\nExtraction method: {extraction_method}\n\n{text}"
        
        return text
    
    def _clean_web_content(self, text: str) -> str:
        """
        Clean web-scraped content to improve recipe extraction.
        """
        import re
        
        # Remove excessive whitespace and line breaks
        text = re.sub(r'\n\s*\n', '\n\n', text)  # Multiple line breaks to double
        text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces/tabs to single space
        
        # Remove common web elements that might confuse the AI
        web_noise_patterns = [
            r'(advertisement|ads?)\s*',
            r'(subscribe|newsletter|email)\s+.*?(?=\n|\.|!|\?)',
            r'(follow us|social media|share)\s+.*?(?=\n|\.|!|\?)',
            r'(cookie policy|privacy policy)\s+.*?(?=\n|\.|!|\?)',
            r'(rating|rate this|stars?)\s*:?\s*\d*\s*[★☆]*',
            r'(print|save|bookmark)\s+(this\s+)?(recipe)',
            r'(jump to|skip to)\s+(recipe|instructions)',
            r'(calories|nutrition)\s*:?\s*\d+.*?(?=\n)',
            r'(prep time|cook time|total time)\s*:?\s*\d+\s*(min|minutes|hour|hours|hr|hrs)',
        ]
        
        for pattern in web_noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Hebrew web noise patterns
        hebrew_noise_patterns = [
            r'פרסומת',
            r'הירשמו\s+לניוזלטר',
            r'עקבו\s+אחרינו',
            r'שתפו\s+את\s+המתכון',
            r'דרגו\s+את\s+המתכון',
            r'הדפסו\s+את\s+המתכון',
        ]
        
        for pattern in hebrew_noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Clean up excessive spacing after removals
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        
        return text.strip()
