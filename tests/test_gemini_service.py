# tests/unit/test_gemini_service.py
import pytest
import json
import os
import sys
from unittest.mock import patch, MagicMock
from pathlib import Path

# Add the project root directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Import modules
from app.services.gemini_service import GeminiService
from app.models.recipe import RecipeResponse

class MockGeminiResponse:
    """Mock response object for Gemini API"""
    def __init__(self, text):
        self.text = text

@pytest.mark.asyncio
async def test_gemini_service_initialization():
    """Test GeminiService initialization with and without API key."""
    # Test with API key
    service = GeminiService(api_key="test_key")
    assert service.available is True
    
    # Test without API key
    with patch.dict('os.environ', {}, clear=True):
        service = GeminiService()
        assert service.available is False

@pytest.mark.asyncio
async def test_prompt_generation():
    """Test prompt generation for different recipe formats."""
    service = GeminiService(api_key="test_key")
    
    # Basic prompt
    prompt = service._generate_prompt("Test recipe", {})
    assert "Test recipe" in prompt
    assert "JSON" in prompt
    
    # Structured format prompt
    prompt = service._generate_prompt("Test recipe", {"format_type": "structured"})
    assert "stages" in prompt
    
    # Simple format prompt
    prompt = service._generate_prompt("Test recipe", {"format_type": "simple"})
    assert "flat 'instructions'" in prompt

@pytest.mark.asyncio
async def test_schema_creation():
    """Test that JSON schema is created correctly."""
    service = GeminiService(api_key="test_key")
    
    # Verify schema exists
    assert hasattr(service, 'recipe_schema')
    assert service.recipe_schema is not None
    
    # Verify schema structure
    assert service.recipe_schema["type"] == "object"
    assert "properties" in service.recipe_schema
    assert "name" in service.recipe_schema["properties"]
    assert "ingredients" in service.recipe_schema["properties"]
    assert service.recipe_schema["required"] == ["name", "ingredients"]

@pytest.mark.asyncio
async def test_parse_response():
    """Test parsing of API response with different JSON formats."""
    service = GeminiService(api_key="test_key")
    
    # Clean JSON response
    valid_json = '{"name": "Test Recipe", "ingredients": [{"item": "test", "amount": "1", "unit": "cup"}], "instructions": ["Step 1"]}'
    result = service._parse_response(valid_json)
    assert result["name"] == "Test Recipe"
    
    # JSON with surrounding text
    mixed_text = 'Here is the recipe: {"name": "Test Recipe", "ingredients": [{"item": "test"}], "instructions": ["Step 1"]}'
    result = service._parse_response(mixed_text)
    assert result["name"] == "Test Recipe"
    
    # Invalid response
    with pytest.raises(ValueError):
        service._parse_response("Not a JSON response")

@pytest.mark.asyncio 
async def test_structured_response_parser():
    """Test the new structured response parser."""
    service = GeminiService(api_key="test_key")
    
    # Test valid JSON
    valid_json = '{"name": "Test Recipe", "ingredients": []}'
    result = service._parse_structured_response(valid_json)
    assert result["name"] == "Test Recipe"
    
    # Test with whitespace
    json_with_spaces = '  {"name": "Test Recipe", "ingredients": []}  '
    result = service._parse_structured_response(json_with_spaces)
    assert result["name"] == "Test Recipe"
    
    # Test invalid JSON should raise exception
    with pytest.raises(json.JSONDecodeError):
        service._parse_structured_response("invalid json")

@pytest.mark.asyncio
async def test_hebrew_detection():
    """Test Hebrew character detection."""
    service = GeminiService(api_key="test_key")
    
    # Test Hebrew text
    assert service._contains_hebrew("פרגיות אסיאתיות") is True
    assert service._contains_hebrew("מתכון טעים") is True
    
    # Test English text
    assert service._contains_hebrew("Chicken recipe") is False
    assert service._contains_hebrew("Simple pasta") is False
    
    # Test mixed text
    assert service._contains_hebrew("Recipe for פרגיות") is True
    assert service._contains_hebrew("כוס flour") is True
    
    # Test empty/edge cases
    assert service._contains_hebrew("") is False
    assert service._contains_hebrew("123456") is False
    assert service._contains_hebrew("!@#$%") is False

@pytest.mark.asyncio
async def test_structured_prompt_generation():
    """Test structured prompt generation for different scenarios."""
    service = GeminiService(api_key="test_key")
    
    # Test basic English recipe
    prompt = service._generate_structured_prompt("Pasta recipe with tomatoes", {})
    assert "Extract complete recipe information" in prompt
    assert "EXTRACTION GUIDELINES" in prompt
    assert "STRUCTURE DECISION" in prompt
    assert "HEBREW TEXT HANDLING" not in prompt  # Should not appear for English
    
    # Test Hebrew recipe
    prompt = service._generate_structured_prompt("פרגיות אסיאתיות טעימות", {})
    assert "HEBREW TEXT HANDLING" in prompt
    assert "דקות = minutes" in prompt
    assert "שעות = hours" in prompt
    
    # Test structured format preference
    prompt = service._generate_structured_prompt("Test recipe", {"format_type": "structured"})
    assert "PREFERENCE: Use 'stages'" in prompt
    
    # Test simple format preference  
    prompt = service._generate_structured_prompt("Test recipe", {"format_type": "simple"})
    assert "PREFERENCE: Use flat 'instructions'" in prompt
    
    # Test that recipe text appears in prompt
    test_text = "My special recipe with unique ingredients"
    prompt = service._generate_structured_prompt(test_text, {})
    assert test_text in prompt

@pytest.mark.asyncio
async def test_hebrew_recipe_extraction(hebrew_simple_recipe_text, gemini_hebrew_simple_response):
    """Test extraction of Hebrew recipe text."""
    service = GeminiService(api_key="test_key")
    
    # Mock the model.generate_content method
    with patch.object(service.model, 'generate_content') as mock_generate:
        # Configure the mock to return our fixture response
        mock_response = MockGeminiResponse(json.dumps(gemini_hebrew_simple_response))
        mock_generate.return_value = mock_response
        
        # Process the Hebrew recipe
        result = await service.extract_recipe(hebrew_simple_recipe_text)
        
        # Verify the result
        assert result.recipe.name == "עוגיות שוקולד צ'יפס"
        assert len(result.recipe.ingredients) > 0
        assert result.recipe.ingredients[0].item == "קמח"
        assert result.confidence_score > 0.7

@pytest.mark.asyncio
async def test_hebrew_complex_recipe(hebrew_complex_recipe_text, gemini_hebrew_complex_response):
    """Test extraction of complex Hebrew recipe with stages."""
    service = GeminiService(api_key="test_key")
    
    # Mock the model.generate_content method
    with patch.object(service.model, 'generate_content') as mock_generate:
        # Configure the mock to return our fixture response
        mock_response = MockGeminiResponse(json.dumps(gemini_hebrew_complex_response))
        mock_generate.return_value = mock_response
        
        # Process the complex Hebrew recipe
        result = await service.extract_recipe(hebrew_complex_recipe_text)
        
        # Verify the result
        assert result.recipe.name == "חומוס ביתי"
        assert result.recipe.stages is not None
        assert len(result.recipe.stages) > 0
        assert result.recipe.stages[0].title.startswith("הכנת")
        assert result.recipe.instructions is None  # Should use stages, not flat instructions
        assert result.confidence_score > 0.7

@pytest.mark.asyncio
async def test_normalization_handles_hebrew():
    """Test that normalization correctly handles Hebrew text."""
    service = GeminiService(api_key="test_key")
    
    # Test Hebrew recipe with missing fields
    partial_data = {
        "name": "מרק עוף",
        "ingredients": [
            {"item": "עוף", "amount": "1", "unit": "ק\"ג"}
        ]
        # Missing instructions/stages
    }
    
    # Normalize the data
    normalized = service._normalize_result(partial_data)
    
    # Verify the Hebrew name was preserved
    assert normalized["name"] == "מרק עוף"
    # Check that default fields were added
    assert normalized["instructions"] is not None
    assert "description" in normalized
    assert "tags" in normalized

@pytest.mark.asyncio
async def test_caching_with_hebrew_recipes(hebrew_simple_recipe_text, gemini_hebrew_simple_response):
    """Test that caching works correctly with Hebrew text."""
    service = GeminiService(api_key="test_key")
    
    # Mock the model.generate_content method
    with patch.object(service.model, 'generate_content') as mock_generate:
        # Configure the mock to return our fixture response
        mock_response = MockGeminiResponse(json.dumps(gemini_hebrew_simple_response))
        mock_generate.return_value = mock_response
        
        # First call should use the API
        await service.extract_recipe(hebrew_simple_recipe_text)
        assert mock_generate.call_count == 1
        
        # Second call with same text should use cache
        await service.extract_recipe(hebrew_simple_recipe_text)
        assert mock_generate.call_count == 1  # Still just one call
        
        # Call with different text should use API again
        await service.extract_recipe("מתכון אחר לגמרי")
        assert mock_generate.call_count == 2