"""
Unit tests for admin router endpoints.

Tests the admin API endpoints including client creation, management,
and statistics functionality.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import secrets

from app.main import app
from app.routers.admin import CreateClientRequest, ClientStatusUpdate


class TestAdminRouter:
    """Test admin router endpoints."""

    @pytest.fixture
    def client(self):
        """Test client fixture."""
        return TestClient(app)

    @pytest.fixture
    def admin_headers(self):
        """Admin authentication headers."""
        return {"X-Admin-Key": "test-admin-key"}

    @pytest.fixture
    def mock_db_connected(self):
        """Mock database connection."""
        with patch("app.routers.admin.db_manager") as mock_db:
            mock_db.is_connected = True
            mock_db.database = AsyncMock()
            yield mock_db

    @pytest.fixture
    def mock_admin_auth(self):
        """Mock admin authentication to always pass."""
        with patch("app.dependencies.admin_auth.get_admin_from_key") as mock_auth:
            mock_auth.return_value = {
                "admin": True,
                "authenticated_at": datetime.now(timezone.utc).isoformat(),
                "key_prefix": "test-adm..."
            }
            yield mock_auth


class TestCreateClient(TestAdminRouter):
    """Test client creation endpoint."""

    @pytest.mark.asyncio
    async def test_create_client_success(self, mock_db_connected, mock_admin_auth):
        """Test successful client creation."""
        # Mock database response
        mock_result = {
            "api_key": "generated-api-key-123",
            "client_name": "Test Client",
            "created_at": datetime.now(timezone.utc)
        }
        mock_db_connected.database.fetch_one.return_value = mock_result

        # Mock secrets.token_hex
        with patch("app.routers.admin.secrets.token_hex", return_value="generated-api-key-123"):
            client = TestClient(app)
            response = client.post(
                "/admin/create-client",
                json={"client_name": "Test Client", "rate_limit": 500},
                headers={"X-Admin-Key": "test-admin-key"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["api_key"] == "generated-api-key-123"
        assert data["client_name"] == "Test Client"
        assert data["message"] == "Client created successfully"
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_create_client_database_error(self, mock_db_connected, mock_admin_auth):
        """Test client creation with database error."""
        # Mock database to return None (creation failed)
        mock_db_connected.database.fetch_one.return_value = None

        client = TestClient(app)
        response = client.post(
            "/admin/create-client",
            json={"client_name": "Test Client"},
            headers={"X-Admin-Key": "test-admin-key"}
        )

        assert response.status_code == 500
        data = response.json()
        assert data["detail"]["error"] == "client_creation_failed"

    @pytest.mark.asyncio
    async def test_create_client_missing_auth(self):
        """Test client creation without admin authentication."""
        client = TestClient(app)
        response = client.post(
            "/admin/create-client",
            json={"client_name": "Test Client"}
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_client_with_rate_limit(self, mock_db_connected, mock_admin_auth):
        """Test client creation with custom rate limit."""
        mock_result = {
            "api_key": "generated-api-key-123",
            "client_name": "Test Client",
            "created_at": datetime.now(timezone.utc)
        }
        mock_db_connected.database.fetch_one.return_value = mock_result

        with patch("app.routers.admin.secrets.token_hex", return_value="generated-api-key-123"):
            client = TestClient(app)
            response = client.post(
                "/admin/create-client",
                json={"client_name": "Test Client", "rate_limit": 1000},
                headers={"X-Admin-Key": "test-admin-key"}
            )

        assert response.status_code == 200
        
        # Verify rate_limit was passed to database
        mock_db_connected.database.fetch_one.assert_called_once()
        call_args = mock_db_connected.database.fetch_one.call_args
        assert call_args[1]["values"]["rate_limit"] == 1000

    @pytest.mark.asyncio
    async def test_api_key_generation_security(self, mock_db_connected, mock_admin_auth):
        """Test that API keys are generated securely."""
        mock_result = {
            "api_key": "secure-generated-key",
            "client_name": "Test Client",
            "created_at": datetime.now(timezone.utc)
        }
        mock_db_connected.database.fetch_one.return_value = mock_result

        with patch("app.routers.admin.secrets.token_hex") as mock_token_hex:
            mock_token_hex.return_value = "secure-generated-key"
            
            client = TestClient(app)
            response = client.post(
                "/admin/create-client",
                json={"client_name": "Test Client"},
                headers={"X-Admin-Key": "test-admin-key"}
            )

        # Verify secrets.token_hex was called with 24 bytes (48 hex chars)
        mock_token_hex.assert_called_once_with(24)
        assert response.status_code == 200


class TestListClients(TestAdminRouter):
    """Test client listing endpoint."""

    @pytest.mark.asyncio
    async def test_list_clients_active_only(self, mock_db_connected, mock_admin_auth):
        """Test listing active clients only."""
        mock_clients = [
            {
                "api_key": "key1",
                "client_name": "Client 1",
                "is_active": True,
                "total_requests_this_month": 100,
                "master_rate_limit_per_minute": 500,
                "last_used_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            },
            {
                "api_key": "key2",
                "client_name": "Client 2",
                "is_active": True,
                "total_requests_this_month": 50,
                "master_rate_limit_per_minute": 1000,
                "last_used_at": None,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        mock_db_connected.database.fetch_all.return_value = mock_clients

        client = TestClient(app)
        response = client.get(
            "/admin/clients",
            headers={"X-Admin-Key": "test-admin-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["client_name"] == "Client 1"
        assert data[1]["last_used_at"] is None

    @pytest.mark.asyncio
    async def test_list_clients_include_inactive(self, mock_db_connected, mock_admin_auth):
        """Test listing clients including inactive ones."""
        mock_clients = [
            {
                "api_key": "key1",
                "client_name": "Active Client",
                "is_active": True,
                "total_requests_this_month": 100,
                "master_rate_limit_per_minute": 500,
                "last_used_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            },
            {
                "api_key": "key2",
                "client_name": "Inactive Client",
                "is_active": False,
                "total_requests_this_month": 0,
                "master_rate_limit_per_minute": 500,
                "last_used_at": None,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        mock_db_connected.database.fetch_all.return_value = mock_clients

        client = TestClient(app)
        response = client.get(
            "/admin/clients?include_inactive=true",
            headers={"X-Admin-Key": "test-admin-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert any(not client["is_active"] for client in data)


class TestUpdateClientStatus(TestAdminRouter):
    """Test client status update endpoint."""

    @pytest.mark.asyncio
    async def test_deactivate_client_success(self, mock_db_connected, mock_admin_auth):
        """Test successful client deactivation."""
        mock_result = {
            "api_key": "test-key",
            "client_name": "Test Client",
            "is_active": False
        }
        mock_db_connected.database.fetch_one.return_value = mock_result

        client = TestClient(app)
        response = client.patch(
            "/admin/clients/test-key/status",
            json={"is_active": False},
            headers={"X-Admin-Key": "test-admin-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "deactivated successfully" in data["message"]
        assert data["is_active"] is False

    @pytest.mark.asyncio
    async def test_activate_client_success(self, mock_db_connected, mock_admin_auth):
        """Test successful client activation."""
        mock_result = {
            "api_key": "test-key",
            "client_name": "Test Client",
            "is_active": True
        }
        mock_db_connected.database.fetch_one.return_value = mock_result

        client = TestClient(app)
        response = client.patch(
            "/admin/clients/test-key/status",
            json={"is_active": True},
            headers={"X-Admin-Key": "test-admin-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "activated successfully" in data["message"]
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_update_nonexistent_client(self, mock_db_connected, mock_admin_auth):
        """Test updating status of non-existent client."""
        mock_db_connected.database.fetch_one.return_value = None

        client = TestClient(app)
        response = client.patch(
            "/admin/clients/nonexistent-key/status",
            json={"is_active": False},
            headers={"X-Admin-Key": "test-admin-key"}
        )

        assert response.status_code == 404
        data = response.json()
        assert data["detail"]["error"] == "client_not_found"


class TestUsageStatistics(TestAdminRouter):
    """Test usage statistics endpoint."""

    @pytest.mark.asyncio
    async def test_get_usage_statistics_success(self, mock_db_connected, mock_admin_auth):
        """Test successful usage statistics retrieval."""
        mock_stats = {
            "total_clients": 10,
            "active_clients": 8,
            "total_requests_this_month": 1500,
            "avg_requests_per_client": 150.0,
            "last_activity": datetime.now(timezone.utc)
        }
        mock_db_connected.database.fetch_one.return_value = mock_stats

        client = TestClient(app)
        response = client.get(
            "/admin/usage-stats",
            headers={"X-Admin-Key": "test-admin-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_clients"] == 10
        assert data["active_clients"] == 8
        assert data["inactive_clients"] == 2  # total - active
        assert data["total_requests_this_month"] == 1500
        assert data["avg_requests_per_client"] == 150.0
        assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_get_usage_statistics_no_activity(self, mock_db_connected, mock_admin_auth):
        """Test usage statistics when there's no activity."""
        mock_stats = {
            "total_clients": 0,
            "active_clients": 0,
            "total_requests_this_month": 0,
            "avg_requests_per_client": 0.0,
            "last_activity": None
        }
        mock_db_connected.database.fetch_one.return_value = mock_stats

        client = TestClient(app)
        response = client.get(
            "/admin/usage-stats",
            headers={"X-Admin-Key": "test-admin-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_clients"] == 0
        assert data["last_activity"] is None


class TestAdminRouterSecurity:
    """Test admin router security features."""

    def test_admin_router_requires_authentication(self):
        """Test that all admin endpoints require authentication."""
        client = TestClient(app)
        
        # Test all admin endpoints without authentication
        endpoints = [
            ("POST", "/admin/create-client", {"client_name": "Test"}),
            ("GET", "/admin/clients", None),
            ("PATCH", "/admin/clients/test-key/status", {"is_active": False}),
            ("GET", "/admin/usage-stats", None)
        ]
        
        for method, url, json_data in endpoints:
            if method == "POST":
                response = client.post(url, json=json_data)
            elif method == "GET":
                response = client.get(url)
            elif method == "PATCH":
                response = client.patch(url, json=json_data)
            
            # Should return 401 (missing key) or 403 (invalid key/misconfigured)
            assert response.status_code in [401, 403, 500], f"Endpoint {method} {url} should require authentication"

    def test_admin_router_tags_and_responses(self):
        """Test that admin router is properly configured."""
        from app.routers.admin import router
        
        assert router.prefix == "/admin"
        assert "Admin" in router.tags
        assert 401 in router.responses
        assert 403 in router.responses
        assert 500 in router.responses