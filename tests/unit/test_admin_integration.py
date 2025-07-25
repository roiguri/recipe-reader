"""
Integration tests for admin functionality.

Simple tests to verify admin endpoints work correctly with proper authentication.
"""

import pytest
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from datetime import datetime, timezone

from app.main import app


class TestAdminIntegration:
    """Test admin functionality integration."""

    @pytest.fixture
    def mock_admin_key(self):
        """Mock admin key environment variable."""
        return "test-admin-key-12345"

    @pytest.fixture
    def mock_environment(self, mock_admin_key):
        """Mock environment with admin key."""
        with patch.dict(os.environ, {"ADMIN_API_KEY": mock_admin_key}):
            yield mock_admin_key


    def test_admin_endpoints_require_auth(self):
        """Test that admin endpoints require authentication."""
        client = TestClient(app)
        
        # Test without any auth header
        response = client.post("/api/v1/admin/create-client", json={"client_name": "Test"})
        assert response.status_code in [401, 403, 500]  # Auth required
        
        response = client.get("/api/v1/admin/clients")
        assert response.status_code in [401, 403, 500]  # Auth required

    def test_admin_create_client_with_auth(self, mock_environment, mock_db_manager, mock_client_ip):
        """Test client creation with proper authentication."""
        _ = mock_client_ip  # Use fixture
        # Mock successful database response
        mock_result = {
            "api_key": "generated-key-123",
            "client_name": "Test Client",
            "created_at": datetime.now(timezone.utc)
        }
        mock_db_manager.fetch_one.side_effect = [None, mock_result]  # First call: count check, second: insert

        with patch("app.routers.admin.secrets.token_hex", return_value="generated-key-123"):
            client = TestClient(app)
            response = client.post(
                "/api/v1/admin/create-client",
                json={"client_name": "Test Client"},
                headers={"X-Admin-Key": mock_environment}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["client_name"] == "Test Client"
        assert "api_key" in data

    def test_admin_list_clients_with_auth(self, mock_environment, mock_db_manager, mock_client_ip):
        """Test listing clients with proper authentication."""
        _ = mock_client_ip  # Use fixture
        # Mock database response
        mock_clients = [
            {
                "api_key": "key1",
                "client_name": "Client 1",
                "is_active": True,
                "total_requests_this_month": 100,
                "master_rate_limit_per_minute": 500,
                "last_used_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
        ]
        mock_db_manager.fetch_all.return_value = mock_clients

        client = TestClient(app)
        response = client.get(
            "/api/v1/admin/clients",
            headers={"X-Admin-Key": mock_environment}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["client_name"] == "Client 1"

    def test_admin_usage_stats_with_auth(self, mock_environment, mock_db_manager, mock_client_ip):
        """Test usage statistics with proper authentication."""
        _ = mock_client_ip  # Use fixture
        # Mock database response
        mock_stats = {
            "total_clients": 5,
            "active_clients": 4,
            "total_requests_this_month": 1000,
            "avg_requests_per_client": 200.0,
            "last_activity": datetime.now(timezone.utc)
        }
        mock_db_manager.fetch_one.return_value = mock_stats

        client = TestClient(app)
        response = client.get(
            "/api/v1/admin/usage-stats",
            headers={"X-Admin-Key": mock_environment}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_clients"] == 5
        assert data["active_clients"] == 4
        assert data["inactive_clients"] == 1

    def test_admin_invalid_key(self, mock_environment, mock_client_ip):
        """Test admin endpoints with invalid key."""
        _ = mock_client_ip  # Use fixture
        client = TestClient(app)
        
        response = client.post(
            "/api/v1/admin/create-client",
            json={"client_name": "Test"},
            headers={"X-Admin-Key": "invalid-key"}
        )
        
        assert response.status_code == 403

    def test_admin_missing_key(self, mock_environment, mock_client_ip):
        """Test admin endpoints with missing key."""
        _ = mock_client_ip  # Use fixture
        client = TestClient(app)
        
        response = client.post(
            "/api/v1/admin/create-client",
            json={"client_name": "Test"},
            headers={}
        )
        
        # Should return 401 (missing key) or 403 depending on implementation
        assert response.status_code in [401, 403]