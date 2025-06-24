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
from app.models.recipe import RecipeResponse, RecipeBase, RecipeDifficulty

class MockGeminiResponse:
    """Mock response object for new Gemini API"""
    def __init__(self, text):
        self.text = text

@pytest.mark.asyncio
async def test_gemini_service_initialization():
    """Test GeminiService initialization with and without API key."""
    # Test with API key
    service = GeminiService(api_key="test_key")
    assert service.available is True
    assert hasattr(service, 'client')
    
    # Test without API key
    with patch.dict('os.environ', {}, clear=True):
        service = GeminiService()
        assert service.available is False

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
    assert "DO NOT invent or guess missing information" in prompt
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
async def test_cache_key_generation():
    """Test cache key generation."""
    service = GeminiService(api_key="test_key")
    
    # Test that same text generates same key
    key1 = service._generate_cache_key("test recipe")
    key2 = service._generate_cache_key("test recipe")
    assert key1 == key2
    
    # Test that different text generates different keys
    key3 = service._generate_cache_key("different recipe")
    assert key1 != key3
    
    # Test Hebrew text
    hebrew_key = service._generate_cache_key("פרגיות אסיאתיות")
    assert len(hebrew_key) == 32  # MD5 hash length

@pytest.mark.asyncio
async def test_preprocess_text():
    """Test text preprocessing functionality."""
    service = GeminiService(api_key="test_key")
    
    # Test basic cleanup
    messy_text = "Recipe   with    extra     spaces"
    cleaned = service._preprocess_text(messy_text)
    assert "  " not in cleaned
    
    # Test Hebrew noise removal
    hebrew_with_noise = "פרגיות טעימות שמרו שתפו דרגו"
    cleaned = service._preprocess_text(hebrew_with_noise)
    assert "שמרו" not in cleaned
    assert "שתפו" not in cleaned
    
    # Test English noise removal
    english_with_noise = "Great recipe save share rate click here"
    cleaned = service._preprocess_text(english_with_noise)
    assert "save" not in cleaned
    assert "share" not in cleaned

@pytest.mark.asyncio
async def test_confidence_calculation():
    """Test confidence score calculation."""
    service = GeminiService(api_key="test_key")
    
    # Test minimal recipe (low confidence)
    minimal_result = {
        "name": "Test Recipe",
        "ingredients": [],
        "instructions": ["Mix and cook"]
    }
    confidence = service._calculate_confidence(minimal_result)
    assert 0.7 < confidence < 0.9
    
    # Test complete recipe (high confidence)
    complete_result = {
        "name": "Complete Recipe",
        "ingredients": [
            {"item": "flour", "amount": "2", "unit": "cups"},
            {"item": "sugar", "amount": "1", "unit": "cup"},
            {"item": "eggs", "amount": "3", "unit": None}
        ],
        "instructions": ["Step 1", "Step 2", "Step 3", "Step 4"],
        "prepTime": 15,
        "cookTime": 30,
        "totalTime": 45,
        "servings": 4,
        "tags": ["baking", "dessert"],
        "mainIngredient": "flour"
    }
    confidence = service._calculate_confidence(complete_result)
    assert confidence > 0.9

@pytest.mark.asyncio
async def test_fallback_result_creation():
    """Test fallback result creation method."""
    service = GeminiService(api_key="test_key")
    
    # Test with simple text
    result = service._create_fallback_result("Simple Recipe Name\nSome ingredients")
    assert result["name"] == "Simple Recipe Name"
    assert result["tags"] == ["extraction-failed"]
    assert "failed" in result["description"]
    
    # Test with complex text
    result = service._create_fallback_result("123456\nRecipe Title Here\nMore content")
    assert result["name"] == "Recipe Title Here"
    
    # Test with Hebrew text
    result = service._create_fallback_result("פרגיות אסיאתיות\nמתכון טעים")
    assert result["name"] == "פרגיות אסיאתיות"

@pytest.mark.asyncio
async def test_convert_to_recipe_model():
    """Test conversion from extracted data to Recipe model."""
    service = GeminiService(api_key="test_key")
    
    # Test data that matches RecipeBase structure
    test_data = {
        "name": "Test Recipe",
        "description": "A test recipe",
        "ingredients": [
            {"item": "flour", "amount": "2", "unit": "cups"}
        ],
        "instructions": ["Mix ingredients", "Bake"],
        "stages": None,
        "prepTime": 15,
        "cookTime": 30,
        "servings": 4,
        "tags": ["test"],
        "mainIngredient": "flour"
    }
    
    recipe = service._convert_to_recipe_model(test_data)
    
    # Verify Recipe model fields
    assert recipe.name == "Test Recipe"
    assert len(recipe.ingredients) == 1
    assert recipe.ingredients[0].item == "flour"
    assert recipe.id is not None  # Should be generated
    assert recipe.creationTime is not None  # Should be set

@pytest.mark.asyncio
async def test_extract_recipe_with_mock():
    """Test extract_recipe with mocked new Gemini API."""
    service = GeminiService(api_key="test_key")
    
    # Mock response that matches RecipeBase structure
    mock_response_data = {
        "name": "Test Recipe",
        "description": "A test recipe",
        "ingredients": [
            {"item": "flour", "amount": "2", "unit": "cups"},
            {"item": "eggs", "amount": "3", "unit": "units"}
        ],
        "instructions": ["Mix ingredients", "Bake for 30 minutes"],
        "stages": None,
        "prepTime": 15,
        "cookTime": 30,
        "totalTime": 45,
        "servings": 4,
        "tags": ["baking"],
        "mainIngredient": "flour"
    }
    
    with patch.object(service.client.models, 'generate_content') as mock_generate:
        mock_response = MockGeminiResponse(json.dumps(mock_response_data))
        mock_generate.return_value = mock_response
        
        result = await service.extract_recipe("Test recipe text")
        
        # Verify result structure
        assert isinstance(result, RecipeResponse)
        assert result.recipe.name == "Test Recipe"
        assert len(result.recipe.ingredients) == 2
        assert result.recipe.ingredients[0].item == "flour"
        assert result.confidence_score > 0.7
        assert result.processing_time >= 0

@pytest.mark.asyncio
async def test_extract_recipe_with_hebrew():
    """Test extract_recipe with Hebrew content."""
    service = GeminiService(api_key="test_key")
    
    hebrew_response_data = {
        "name": "פרגיות אסיאתיות",
        "description": "מתכון טעים לפרגיות",
        "ingredients": [
            {"item": "פרגיות", "amount": "1", "unit": "ק\"ג"},
            {"item": "שמן זית", "amount": "2", "unit": "כפות"}
        ],
        "instructions": None,
        "stages": [
            {
                "title": "הכנה",
                "instructions": ["לנקות את הפרגיות", "לחתוך למקומות"]
            },
            {
                "title": "בישול", 
                "instructions": ["לחמם את השמן", "לטגן את הפרגיות"]
            }
        ],
        "prepTime": 20,
        "cookTime": 15,
        "totalTime": 35,
        "servings": 4,
        "tags": ["עוף", "אסיאתי"],
        "mainIngredient": "פרגיות"
    }
    
    with patch.object(service.client.models, 'generate_content') as mock_generate:
        mock_response = MockGeminiResponse(json.dumps(hebrew_response_data))
        mock_generate.return_value = mock_response
        
        result = await service.extract_recipe("פרגיות אסיאתיות הכי טעימות")
        
        # Verify Hebrew content is preserved
        assert result.recipe.name == "פרגיות אסיאתיות"
        assert result.recipe.ingredients[0].item == "פרגיות"
        assert result.recipe.stages is not None
        assert len(result.recipe.stages) == 2
        assert result.recipe.stages[0].title == "הכנה"
        assert result.recipe.instructions is None  # Should use stages

@pytest.mark.asyncio
async def test_extract_recipe_retry_logic():
    """Test retry logic when extraction fails."""
    service = GeminiService(api_key="test_key")
    
    call_count = 0
    def mock_generate_content(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception("API Error")
        # Third attempt succeeds
        success_data = {
            "name": "Success Recipe", 
            "description": "Success",
            "ingredients": [],
            "instructions": ["Success step"],
            "stages": None
        }
        return MockGeminiResponse(json.dumps(success_data))
    
    with patch.object(service.client.models, 'generate_content', side_effect=mock_generate_content):
        result = await service.extract_recipe("test recipe", {"max_retries": 3})
        
        # Should succeed on third attempt
        assert call_count == 3
        assert result.recipe.name == "Success Recipe"

@pytest.mark.asyncio
async def test_extract_recipe_fallback():
    """Test fallback result when all retries fail."""
    service = GeminiService(api_key="test_key")
    
    with patch.object(service.client.models, 'generate_content', side_effect=Exception("API Error")):
        result = await service.extract_recipe("Failed Recipe Text", {"max_retries": 2})
        
        # Should return fallback result
        assert result.confidence_score == 0.2
        assert "extraction-failed" in result.recipe.tags
        assert "Failed Recipe Text" in result.recipe.name or "Recipe Extraction Failed" in result.recipe.name

@pytest.mark.asyncio
async def test_extract_recipe_caching():
    """Test caching behavior in extraction."""
    service = GeminiService(api_key="test_key")
    
    mock_response_data = {
        "name": "Cached Recipe", 
        "description": "Cached",
        "ingredients": [],
        "instructions": ["Cached step"],
        "stages": None
    }
    
    with patch.object(service.client.models, 'generate_content') as mock_generate:
        mock_generate.return_value = MockGeminiResponse(json.dumps(mock_response_data))
        
        # First call
        result1 = await service.extract_recipe("test recipe")
        assert mock_generate.call_count == 1
        
        # Second call with same text should use cache
        result2 = await service.extract_recipe("test recipe")
        assert mock_generate.call_count == 1  # Still just one call
        
        # Results should be equivalent
        assert result1.recipe.name == result2.recipe.name

@pytest.mark.asyncio
async def test_pydantic_integration():
    """Test that the service properly uses RecipeBase Pydantic model."""
    service = GeminiService(api_key="test_key")
    
    # Test that invalid data structure raises validation error
    invalid_response_data = {
        "name": "Test Recipe",
        # Missing required ingredients field
        "instructions": ["Step 1"]
    }
    
    with patch.object(service.client.models, 'generate_content') as mock_generate:
        mock_generate.return_value = MockGeminiResponse(json.dumps(invalid_response_data))
        
        # Should handle validation error gracefully and return fallback
        result = await service.extract_recipe("test recipe")
        
        # Should get fallback result due to validation failure
        assert result.recipe.ingredients == []  # Empty list was auto-added
        assert result.recipe.name == "Test Recipe" # Name should be preserved

@pytest.mark.asyncio
async def test_service_unavailable():
    """Test behavior when service is unavailable."""
    with patch.dict('os.environ', {}, clear=True):
        service = GeminiService()  # No API key
        assert service.available is False
        
        # Should raise ValueError when trying to extract
        with pytest.raises(ValueError, match="GeminiService is not available"):
            await service.extract_recipe("test recipe")

# Fixtures for backward compatibility (if you have separate fixture files)
@pytest.fixture
def hebrew_simple_recipe_text():
    return "עוגיות שוקולד צ'יפס - קמח, חמאה, סוכר, שוקולד צ'יפס. לערבב ולאפות 15 דקות."

@pytest.fixture
def hebrew_complex_recipe_text():
    return """חומוס ביתי
    
    הכנת החומוס:
    1. להשרות את החומוס ללילה
    2. לבשל עד שרך
    
    הכנת הטחינה:
    1. לערבב טחינה עם מים
    2. להוסיף לימון ושום
    """

@pytest.fixture 
def gemini_hebrew_simple_response():
    return {
        "name": "עוגיות שוקולד צ'יפס",
        "description": "עוגיות טעימות עם שוקולד צ'יפס",
        "ingredients": [
            {"item": "קמח", "amount": "2", "unit": "כוסות"},
            {"item": "חמאה", "amount": "100", "unit": "גרם"},
            {"item": "סוכר", "amount": "1", "unit": "כוס"}
        ],
        "instructions": ["לערבב את כל המרכיבים", "לאפות 15 דקות"],
        "stages": None,
        "prepTime": 10,
        "cookTime": 15,
        "servings": 20,
        "tags": ["עוגיות", "קינוח"],
        "mainIngredient": "קמח"
    }

@pytest.fixture
def gemini_hebrew_complex_response():
    return {
        "name": "חומוס ביתי",
        "description": "חומוס עשוי בבית",
        "ingredients": [
            {"item": "חומוס יבש", "amount": "1", "unit": "כוס"},
            {"item": "טחינה", "amount": "3", "unit": "כפות"}
        ],
        "instructions": None,
        "stages": [
            {
                "title": "הכנת החומוס",
                "instructions": ["להשרות את החומוס ללילה", "לבשל עד שרך"]
            },
            {
                "title": "הכנת הטחינה", 
                "instructions": ["לערבב טחינה עם מים", "להוסיף לימון ושום"]
            }
        ],
        "prepTime": 20,
        "cookTime": 60,
        "servings": 4,
        "tags": ["חומוס", "מזרח תיכוני"],
        "mainIngredient": "חומוס יבש"
    }


@pytest.mark.asyncio
async def test_extract_recipe_with_difficulty_validation():
    """Test full recipe extraction with difficulty enum validation."""
    service = GeminiService(api_key="test_key")
    
    mock_response_data = {
        "name": "Easy Cookies", 
        "description": "Simple cookies to make",
        "difficulty": "easy",  # Valid enum value
        "ingredients": [{"item": "flour", "amount": "1", "unit": "cup"}],
        "instructions": ["Mix and bake"],
        "stages": None
    }
    
    with patch.object(service.client.models, 'generate_content') as mock_generate:
        mock_generate.return_value = MockGeminiResponse(json.dumps(mock_response_data))
        
        result = await service.extract_recipe("Simple cookie recipe")
        
        # Should have valid difficulty enum
        assert result.recipe.difficulty == RecipeDifficulty.EASY
        assert result.recipe.name == "Easy Cookies"


@pytest.mark.asyncio
async def test_time_field_standardization():
    """Test that new time handling works correctly - no totalTime extraction, merged waiting time."""
    service = GeminiService(api_key="test_key")
    
    # Test recipe with prep + cook times (should not extract totalTime)
    mock_response_data = {
        "name": "Baked Chicken",
        "description": "Chicken with cooling time",
        "ingredients": [{"item": "chicken", "amount": "1", "unit": "lb"}],
        "instructions": ["Bake for 30 minutes", "Cool for 15 minutes", "Serve"],
        "stages": None,
        "prepTime": 10,
        "cookTime": 45  # Should include baking + cooling time (30 + 15)
    }
    
    with patch.object(service.client.models, 'generate_content') as mock_generate:
        mock_generate.return_value = MockGeminiResponse(json.dumps(mock_response_data))
        
        result = await service.extract_recipe("Prep chicken for 10 minutes, bake for 30 minutes, cool for 15 minutes")
        
        # Should have computed totalTime (not extracted)
        assert result.recipe.prepTime == 10
        assert result.recipe.cookTime == 45  # Includes cooling time
        assert result.recipe.totalTime == 55  # 10 + 45 (computed)
        assert not hasattr(result.recipe, 'waitTime')  # waitTime field removed
        
        # Verify confidence calculation doesn't reference totalTime
        confidence = service._calculate_confidence(mock_response_data)
        assert confidence > 0.8  # Should be high confidence
        
        # Verify fallback result doesn't include totalTime
        fallback = service._create_fallback_result("test text")
        assert "totalTime" not in fallback
        assert "waitTime" not in fallback