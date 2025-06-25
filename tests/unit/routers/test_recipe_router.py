from fastapi.testclient import TestClient
from unittest.mock import patch
from fastapi import Depends
from app.main import app
from app.models.recipe import RecipeResponse, Recipe, RecipeDifficulty
from app.dependencies.authentication import get_client_from_db
import pytest
from datetime import datetime

# Mock authentication dependency
def mock_get_client():
    return {
        "api_key": "test-key",
        "client_name": "Test Client", 
        "is_active": True
    }

# Override the dependency for all tests
app.dependency_overrides[get_client_from_db] = mock_get_client
client = TestClient(app)

def test_process_recipe_text():
    """Test the text processing endpoint."""
    # Simple recipe text
    recipe_text = """Simple Pancakes
    
    Mix flour, milk, and eggs.
    Cook on a hot griddle.
    Serve with maple syrup."""
    
    response = client.post(
        "/api/v1/recipe/text",  # Use correct versioned path
        json={"text": recipe_text},
        headers={"X-API-Key": "test-key"}
    )
    
    # Check response status code
    assert response.status_code == 200
    
    # Check response content
    data = response.json()
    assert "recipe" in data
    assert "confidence_score" in data
    assert "processing_time" in data
    
    # Check recipe content
    recipe = data["recipe"]
    assert recipe["name"] == "Simple Pancakes"
    assert "id" in recipe
    
    # Check that we have either stages or instructions
    assert ("stages" in recipe and recipe["stages"]) or ("instructions" in recipe and recipe["instructions"])


def test_recipe_response_with_valid_difficulty():
    """Test that RecipeResponse properly validates valid difficulty enum values."""
    # Create a recipe with valid difficulty
    recipe_data = {
        "id": "test123",
        "name": "Test Recipe",
        "difficulty": "easy",  # Valid enum value
        "instructions": ["Step 1", "Step 2"],
        "ingredients": [{"item": "Flour", "amount": "1", "unit": "cup"}],
        "creationTime": datetime.now().isoformat(),
    }
    
    # This should not raise an exception
    recipe = Recipe(**recipe_data)
    assert recipe.difficulty == RecipeDifficulty.EASY
    
    # Test with enum directly
    recipe_data["difficulty"] = RecipeDifficulty.MEDIUM
    recipe = Recipe(**recipe_data)
    assert recipe.difficulty == RecipeDifficulty.MEDIUM


def test_recipe_response_with_invalid_difficulty():
    """Test that RecipeResponse properly rejects invalid difficulty values."""
    from pydantic import ValidationError
    
    recipe_data = {
        "id": "test123",
        "name": "Test Recipe",
        "difficulty": "impossible",  # Invalid enum value
        "instructions": ["Step 1", "Step 2"],
        "ingredients": [{"item": "Flour", "amount": "1", "unit": "cup"}],
        "creationTime": datetime.now().isoformat(),
    }
    
    # This should raise a validation error
    with pytest.raises(ValidationError) as exc_info:
        Recipe(**recipe_data)
    
    # Check that the error is about the difficulty field
    errors = exc_info.value.errors()
    difficulty_error = next((err for err in errors if err['loc'] == ('difficulty',)), None)
    assert difficulty_error is not None
    assert 'Input should be' in str(difficulty_error['msg'])


@patch('app.services.text_processor.TextProcessor.process_text')
def test_text_endpoint_with_difficulty_validation(mock_process_text):
    """Test that the text processing endpoint properly handles difficulty validation in responses."""
    # Mock the text processor to return a recipe with valid difficulty
    mock_recipe = Recipe(
        id="test123",
        name="Mock Recipe",
        difficulty=RecipeDifficulty.HARD,
        instructions=["Step 1", "Step 2"],
        ingredients=[{"item": "Flour", "amount": "1", "unit": "cup"}],
        creationTime=datetime.now(),
    )
    
    mock_response = RecipeResponse(
        recipe=mock_recipe,
        confidence_score=0.9,
        processing_time=1.5
    )
    
    mock_process_text.return_value = mock_response
    
    # Make the API call
    response = client.post(
        "/api/v1/recipe/text",  # Use correct versioned path
        json={"text": "Some recipe text"},
        headers={"X-API-Key": "test-key"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["recipe"]["difficulty"] == "hard"


@patch('app.services.text_processor.TextProcessor.process_text')
def test_text_endpoint_handles_validation_errors(mock_process_text):
    """Test that the text processing endpoint handles difficulty validation errors properly."""
    from pydantic import ValidationError
    
    # Create a proper ValidationError for difficulty field
    try:
        Recipe(
            id="test123",
            name="Test Recipe",
            difficulty="impossible",  # Invalid enum value
            instructions=["Step 1"],
            ingredients=[{"item": "Flour", "amount": "1", "unit": "cup"}],
            creationTime=datetime.now(),
        )
    except ValidationError as e:
        mock_process_text.side_effect = e
    
    # Make the API call
    response = client.post(
        "/api/v1/recipe/text",  # Use correct versioned path
        json={"text": "Some recipe text"},
        headers={"X-API-Key": "test-key"}
    )
    
    # Should return 422 error with clear difficulty validation message
    assert response.status_code == 422
    data = response.json()
    assert "validation_errors" in data["detail"]
    assert any("Invalid difficulty value" in error for error in data["detail"]["validation_errors"])
    assert any("easy, medium, hard" in error for error in data["detail"]["validation_errors"])


@patch('app.services.text_processor.TextProcessor.process_text')
def test_text_endpoint_handles_processing_errors(mock_process_text):
    """Test that the text processing endpoint handles general processing errors properly."""
    # Mock the text processor to raise a generic exception
    mock_process_text.side_effect = Exception("Recipe processing failed due to invalid difficulty value")
    
    # Make the API call
    response = client.post(
        "/api/v1/recipe/text",  # Use correct versioned path
        json={"text": "Some recipe text"},
        headers={"X-API-Key": "test-key"}
    )
    
    # Should return 500 error with validation details
    assert response.status_code == 500
    assert "Error processing recipe text" in response.json()["detail"]
