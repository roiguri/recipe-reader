# tests/conftest.py (updated)
import pytest
import os
import json
from pathlib import Path
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

# Centralized database mocking fixtures
from unittest.mock import AsyncMock
from datetime import datetime, timezone

@pytest.fixture
def mock_database():
    """Create a mock database instance with common methods."""
    mock_db = AsyncMock()
    mock_db.connect = AsyncMock()
    mock_db.disconnect = AsyncMock()
    mock_db.fetch_one = AsyncMock()
    mock_db.fetch_all = AsyncMock()
    mock_db.execute = AsyncMock()
    return mock_db

@pytest.fixture
def mock_db_manager(mock_database):
    """Create a mock database manager."""
    with patch("app.database.connection.db_manager") as mock_manager, \
         patch("app.routers.admin.db_manager", mock_manager):
        mock_manager.is_connected = True
        mock_manager.database = mock_database
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = AsyncMock()
        mock_manager.health_check = AsyncMock(return_value=True)
        # Add database methods directly to db_manager for compatibility
        mock_manager.fetch_one = AsyncMock()
        mock_manager.fetch_all = AsyncMock()
        mock_manager.execute = AsyncMock()
        yield mock_manager

@pytest.fixture
def mock_client_ip():
    """Mock client IP extraction to return valid IP address for testing."""
    with patch("app.config.security.SecurityConfig.is_trusted_proxy", return_value=False), \
         patch("app.security.admin_security.get_client_ip", return_value="127.0.0.1") as ip_mock:
        yield ip_mock

@pytest.fixture
def mock_environment():
    """Mock environment variables for testing."""
    test_env = {
        "DATABASE_URL": "postgresql://test:test@localhost:5432/test_db",
        "GOOGLE_AI_API_KEY": "test-google-key",
        "ADMIN_API_KEY": "test-admin-key",
        "ENV": "test",
        "TESTING": "true"
    }
    
    with patch.dict(os.environ, test_env):
        yield test_env

@pytest.fixture
def sample_client_data():
    """Sample client data for testing."""
    return {
        "api_key": "test-api-key-123456789012345678901234",
        "client_name": "Test Client",
        "is_active": True,
        "total_requests_this_month": 0,
        "master_rate_limit_per_minute": 500,
        "last_used_at": None,
        "created_at": datetime.now(timezone.utc)
    }