# tests/integration/test_text_processor.py
import pytest
import os
import sys
from unittest.mock import patch, MagicMock
import json
import uuid
from datetime import datetime

# Add the project root directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Import modules
from app.services.text_processor import TextProcessor
from app.models.recipe import RecipeResponse, Recipe, Ingredient, Stage

class MockResponse:
    """Mock Gemini API response"""
    def __init__(self, text):
        self.text = text

@pytest.mark.asyncio
async def test_text_processor_initialization():
    """Test that TextProcessor initializes correctly."""
    # Create a TextProcessor instance
    processor = TextProcessor()
    
    # Check that GeminiService was initialized
    assert processor.gemini_service is not None

@pytest.mark.asyncio
async def test_text_processor_hebrew_simple(hebrew_simple_recipe_text, gemini_hebrew_simple_response):
    """Test processing a simple Hebrew recipe."""
    # Create a TextProcessor instance
    processor = TextProcessor()
    
    # Create a valid Recipe instance from our fixture
    recipe_instance = processor.gemini_service._convert_to_recipe_model(gemini_hebrew_simple_response)
    
    # Mock the GeminiService's extract_recipe method
    with patch.object(processor.gemini_service, 'extract_recipe') as mock_extract:
        # Configure the mock to return our fixture-based response with a real Recipe object
        mock_extract.return_value = RecipeResponse(
            recipe=recipe_instance,
            confidence_score=0.9,
            processing_time=0.5
        )
        
        # Process the Hebrew recipe
        result = await processor.process_text(hebrew_simple_recipe_text)
        
        # Verify the mock was called with the correct text
        mock_extract.assert_called_once_with(hebrew_simple_recipe_text, {})
        
        # Verify the result
        assert result.recipe.name == "עוגיות שוקולד צ'יפס"
        assert len(result.recipe.ingredients) > 0
        assert result.recipe.ingredients[0].item == "קמח"
        assert result.confidence_score == 0.9

@pytest.mark.asyncio
async def test_text_processor_hebrew_complex(hebrew_complex_recipe_text, gemini_hebrew_complex_response):
    """Test processing a complex Hebrew recipe with stages."""
    # Create a TextProcessor instance
    processor = TextProcessor()
    
    # Create a valid Recipe instance from our fixture
    recipe_instance = processor.gemini_service._convert_to_recipe_model(gemini_hebrew_complex_response)
    
    # Mock the GeminiService's extract_recipe method
    with patch.object(processor.gemini_service, 'extract_recipe') as mock_extract:
        # Configure the mock to return our fixture-based response with a real Recipe object
        mock_extract.return_value = RecipeResponse(
            recipe=recipe_instance,
            confidence_score=0.95,
            processing_time=0.7
        )
        
        # Process the complex Hebrew recipe
        result = await processor.process_text(hebrew_complex_recipe_text)
        
        # Verify the mock was called with the correct text
        mock_extract.assert_called_once_with(hebrew_complex_recipe_text, {})
        
        # Verify the result
        assert result.recipe.name == "חומוס ביתי"
        assert result.recipe.stages is not None
        assert len(result.recipe.stages) > 0
        assert "הכנת" in result.recipe.stages[0].title
        assert result.confidence_score == 0.95

@pytest.mark.asyncio
async def test_text_processor_with_options(hebrew_simple_recipe_text):
    """Test processing with custom options."""
    # Create a TextProcessor instance
    processor = TextProcessor()
    
    # Create a valid Recipe object instead of using MagicMock
    recipe_id = str(uuid.uuid4())
    current_time = datetime.now()
    
    # Create a very basic but valid Recipe object
    recipe_instance = Recipe(
        id=recipe_id,
        name="Test Recipe",
        instructions=["Step 1"],  # Either instructions or stages must be provided
        ingredients=[
            Ingredient(item="Test ingredient", amount="1", unit="cup")
        ],
        creationTime=current_time
    )
    
    # Mock the GeminiService's extract_recipe method
    with patch.object(processor.gemini_service, 'extract_recipe') as mock_extract:
        # Configure the mock to return a response with a valid Recipe object
        mock_extract.return_value = RecipeResponse(
            recipe=recipe_instance,
            confidence_score=0.9,
            processing_time=0.5
        )
        
        # Custom options
        options = {
            "temperature": 0.1,
            "format_type": "structured"
        }
        
        # Process with options
        await processor.process_text(hebrew_simple_recipe_text, options)
        
        # Verify options were passed through
        mock_extract.assert_called_once_with(hebrew_simple_recipe_text, options)

@pytest.mark.asyncio
async def test_text_processor_error_handling():
    """Test that TextProcessor handles errors from GeminiService."""
    # Create a TextProcessor instance
    processor = TextProcessor()
    
    # Mock the GeminiService's extract_recipe method to raise an exception
    with patch.object(processor.gemini_service, 'extract_recipe', 
                    side_effect=Exception("Test error")):
        # Process should raise the exception
        with pytest.raises(Exception) as excinfo:
            await processor.process_text("Test recipe")
        
        # Verify the error message
        assert "Test error" in str(excinfo.value)

# This test will be skipped by default unless you have the API key set up
@pytest.mark.skipif(not os.environ.get("GOOGLE_AI_API_KEY"), 
                   reason="Skipping real API test - no API key available")
@pytest.mark.asyncio
async def test_text_processor_real_api_integration():
    """Test integration with the real Gemini API (if API key is available)."""
    # Use a very simple recipe text to minimize API errors
    simple_recipe = """
    Pancakes
    
    Ingredients:
    - 1 cup flour
    - 1 egg
    - 1 cup milk
    - 1 tbsp sugar
    
    Instructions:
    1. Mix all ingredients
    2. Cook on griddle
    """
    
    # Create a TextProcessor instance (should use real API key from env)
    processor = TextProcessor()
    assert processor.gemini_service.available, "GeminiService should be available with API key"
    
    # Process the text (will use real API)
    result = await processor.process_text(simple_recipe)
    
    # Basic validation that we got a meaningful result
    assert result.recipe is not None
    assert result.recipe.name and len(result.recipe.name) > 3
    assert len(result.recipe.ingredients) > 0
    assert result.confidence_score > 0.5