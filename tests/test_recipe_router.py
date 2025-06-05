from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_process_recipe_text():
    """Test the text processing endpoint."""
    # Simple recipe text
    recipe_text = """Simple Pancakes
    
    Mix flour, milk, and eggs.
    Cook on a hot griddle.
    Serve with maple syrup."""
    
    response = client.post(
        "/recipe/text",
        json={"text": recipe_text}
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
