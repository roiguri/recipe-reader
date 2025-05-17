# tests/conftest.py (updated)
import pytest
import os
import json
from pathlib import Path
import asyncio
from unittest.mock import MagicMock, patch

# Path to test fixtures
FIXTURES_DIR = Path(__file__).parent / "fixtures"

# Load recipe fixtures
@pytest.fixture
def simple_recipe_text():
    with open(FIXTURES_DIR / "recipes" / "simple_recipe.txt", "r", encoding="utf-8") as f:
        return f.read()

@pytest.fixture
def hebrew_simple_recipe_text():
    with open(FIXTURES_DIR / "recipes" / "hebrew_simple_recipe.txt", "r", encoding="utf-8") as f:
        return f.read()

@pytest.fixture
def hebrew_complex_recipe_text():
    with open(FIXTURES_DIR / "recipes" / "hebrew_complex_recipe.txt", "r", encoding="utf-8") as f:
        return f.read()

# Load mock response fixtures
@pytest.fixture
def gemini_simple_response():
    with open(FIXTURES_DIR / "responses" / "gemini_simple_response.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def gemini_hebrew_simple_response():
    with open(FIXTURES_DIR / "responses" / "gemini_hebrew_simple_response.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def gemini_hebrew_complex_response():
    with open(FIXTURES_DIR / "responses" / "gemini_hebrew_complex_response.json", "r", encoding="utf-8") as f:
        return json.load(f)

# Mock Gemini API response
class MockResponse:
    def __init__(self, text):
        self.text = text

# Create mocked GeminiService
@pytest.fixture
def mock_gemini_service():
    with patch("app.services.gemini_service.GeminiService") as MockService:
        service = MockService.return_value
        service.available = True
        service.extract_recipe = MagicMock()
        yield service