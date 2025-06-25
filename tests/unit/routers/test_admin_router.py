"""
Unit tests for admin router endpoints.

Tests the admin API endpoints including client creation, management,
and statistics functionality.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from datetime import datetime, timezone

from app.main import app


class TestAdminRouter:
    """Test admin router endpoints with centralized mocking."""

    @pytest.fixture
    def client(self):
        """Test client fixture."""
        return TestClient(app)

    @pytest.fixture
    def admin_headers(self):
        """Admin authentication headers."""
        return {"X-Admin-Key": "test-admin-key"}

    @pytest.fixture
    def mock_admin_environment(self):
        """Mock admin environment with authentication."""
        with patch.dict("os.environ", {"ADMIN_API_KEY": "test-admin-key"}):
            yield

    @pytest.fixture
    def mock_admin_database(self, mock_db_manager):
        """Mock admin database operations."""
        with patch("app.routers.admin.db_manager", mock_db_manager):
            yield mock_db_manager.database

    @pytest.fixture
    def mock_token_generation(self):
        """Mock secure token generation."""
        with patch("app.routers.admin.secrets.token_hex", return_value="generated-api-key-123"):
            yield

    @pytest.fixture
    def setup_admin_test(self, mock_admin_environment, mock_admin_database, mock_token_generation):
        """Complete admin test setup with all required mocks."""
        # Use all fixtures to avoid unused parameter warnings
        _ = mock_admin_environment, mock_token_generation
        yield mock_admin_database


class TestCreateClient(TestAdminRouter):
    """Test client creation endpoint."""

    @pytest.mark.asyncio
    async def test_create_client_success(self, client, admin_headers, setup_admin_test):
        """Test successful client creation."""
        # Mock database responses - first call for name check, second for insertion
        count_result = {"count": 0}  # No existing client with same name
        insert_result = {
            "api_key": "generated-api-key-123",
            "client_name": "Test Client",
            "created_at": datetime.now(timezone.utc)
        }
        setup_admin_test.fetch_one.side_effect = [count_result, insert_result]

        response = client.post(
            "/admin/create-client",
            json={"client_name": "Test Client", "rate_limit": 500},
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["api_key"] == "generated-api-key-123"
        assert data["client_name"] == "Test Client"
        assert data["message"] == "Client created successfully"
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_create_client_database_error(self, client, admin_headers, setup_admin_test):
        """Test client creation with database error."""
        # Mock database responses - first call succeeds, second call fails (creation failed)
        count_result = {"count": 0}  # No existing client with same name
        setup_admin_test.fetch_one.side_effect = [count_result, None]

        response = client.post(
            "/admin/create-client",
            json={"client_name": "Test Client"},
            headers=admin_headers
        )

        assert response.status_code == 500
        data = response.json()
        assert data["detail"]["error"] == "client_creation_failed"

    @pytest.mark.asyncio
    async def test_create_client_missing_auth(self, client):
        """Test client creation without admin authentication."""
        response = client.post(
            "/admin/create-client",
            json={"client_name": "Test Client"}
            # No X-Admin-Key header provided
        )

        # Should return 403 because no X-Admin-Key header is provided
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_client_invalid_auth(self, client):
        """Test client creation with invalid admin key."""
        # Set ADMIN_API_KEY but use wrong key in request
        with patch.dict("os.environ", {"ADMIN_API_KEY": "correct-admin-key"}):
            response = client.post(
                "/admin/create-client",
                json={"client_name": "Test Client"},
                headers={"X-Admin-Key": "wrong-admin-key"}
            )

        # Should return 403 because admin key is invalid
        assert response.status_code == 403
        data = response.json()
        assert data["detail"]["error"] == "invalid_admin_key"

    @pytest.mark.asyncio
    async def test_create_client_admin_service_misconfigured(self, client):
        """Test client creation with misconfigured admin service."""
        # Don't set ADMIN_API_KEY but provide a header - this will trigger the 500 error
        with patch.dict("os.environ", {}, clear=True):
            response = client.post(
                "/admin/create-client",
                json={"client_name": "Test Client"},
                headers={"X-Admin-Key": "some-key"}
            )

        # Should return 500 because ADMIN_API_KEY env var is not configured
        assert response.status_code == 500
        data = response.json()
        assert data["detail"]["error"] == "admin_service_misconfigured"

    @pytest.mark.asyncio
    async def test_create_client_with_rate_limit(self, client, admin_headers, setup_admin_test):
        """Test client creation with custom rate limit."""
        # Mock database responses - first call for name check, second for insertion
        count_result = {"count": 0}  # No existing client with same name
        insert_result = {
            "api_key": "generated-api-key-123",
            "client_name": "Test Client",
            "created_at": datetime.now(timezone.utc)
        }
        setup_admin_test.fetch_one.side_effect = [count_result, insert_result]

        response = client.post(
            "/admin/create-client",
            json={"client_name": "Test Client", "rate_limit": 1000},
            headers=admin_headers
        )

        assert response.status_code == 200
        
        # Verify rate_limit was passed to database
        assert setup_admin_test.fetch_one.call_count == 2
        # Check the second call (insertion) had the correct rate_limit
        second_call_args = setup_admin_test.fetch_one.call_args_list[1]
        assert second_call_args[1]["values"]["rate_limit"] == 1000

    @pytest.mark.asyncio
    async def test_api_key_generation_security(self, client, admin_headers, setup_admin_test):
        """Test that API keys are generated securely."""
        # Mock database responses - first call for name check, second for insertion
        count_result = {"count": 0}  # No existing client with same name
        insert_result = {
            "api_key": "secure-generated-key",
            "client_name": "Test Client",
            "created_at": datetime.now(timezone.utc)
        }
        setup_admin_test.fetch_one.side_effect = [count_result, insert_result]

        with patch("app.routers.admin.secrets.token_hex") as mock_token_hex:
            mock_token_hex.return_value = "secure-generated-key"
            
            response = client.post(
                "/admin/create-client",
                json={"client_name": "Test Client"},
                headers=admin_headers
            )

        # Verify secrets.token_hex was called with 24 bytes (48 hex chars)
        mock_token_hex.assert_called_once_with(24)
        assert response.status_code == 200


class TestListClients(TestAdminRouter):
    """Test client listing endpoint."""

    @pytest.mark.asyncio
    async def test_list_clients_active_only(self, client, admin_headers, setup_admin_test):
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
        setup_admin_test.fetch_all.return_value = mock_clients

        response = client.get(
            "/admin/clients",
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["client_name"] == "Client 1"
        assert data[1]["last_used_at"] is None

    @pytest.mark.asyncio
    async def test_list_clients_include_inactive(self, client, admin_headers, setup_admin_test):
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
        setup_admin_test.fetch_all.return_value = mock_clients

        response = client.get(
            "/admin/clients?include_inactive=true",
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert any(not client["is_active"] for client in data)


class TestUpdateClientStatus(TestAdminRouter):
    """Test client status update endpoint."""

    @pytest.mark.asyncio
    async def test_deactivate_client_success(self, client, admin_headers, setup_admin_test):
        """Test successful client deactivation."""
        mock_result = {
            "api_key": "test-key",
            "client_name": "Test Client",
            "is_active": False
        }
        setup_admin_test.fetch_one.return_value = mock_result

        response = client.patch(
            "/admin/clients/test-key/status",
            json={"is_active": False},
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "deactivated successfully" in data["message"]
        assert data["is_active"] is False

    @pytest.mark.asyncio
    async def test_activate_client_success(self, client, admin_headers, setup_admin_test):
        """Test successful client activation."""
        mock_result = {
            "api_key": "test-key",
            "client_name": "Test Client",
            "is_active": True
        }
        setup_admin_test.fetch_one.return_value = mock_result

        response = client.patch(
            "/admin/clients/test-key/status",
            json={"is_active": True},
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "activated successfully" in data["message"]
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_update_nonexistent_client(self, client, admin_headers, setup_admin_test):
        """Test updating status of non-existent client."""
        setup_admin_test.fetch_one.return_value = None

        response = client.patch(
            "/admin/clients/nonexistent-key/status",
            json={"is_active": False},
            headers=admin_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert data["detail"]["error"] == "client_not_found"


class TestUsageStatistics(TestAdminRouter):
    """Test usage statistics endpoint."""

    @pytest.mark.asyncio
    async def test_get_usage_statistics_success(self, client, admin_headers, setup_admin_test):
        """Test successful usage statistics retrieval."""
        mock_stats = {
            "total_clients": 10,
            "active_clients": 8,
            "total_requests_this_month": 1500,
            "avg_requests_per_client": 150.0,
            "last_activity": datetime.now(timezone.utc)
        }
        setup_admin_test.fetch_one.return_value = mock_stats

        response = client.get(
            "/admin/usage-stats",
            headers=admin_headers
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
    async def test_get_usage_statistics_no_activity(self, client, admin_headers, setup_admin_test):
        """Test usage statistics when there's no activity."""
        mock_stats = {
            "total_clients": 0,
            "active_clients": 0,
            "total_requests_this_month": 0,
            "avg_requests_per_client": 0.0,
            "last_activity": None
        }
        setup_admin_test.fetch_one.return_value = mock_stats

        response = client.get(
            "/admin/usage-stats",
            headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_clients"] == 0
        assert data["last_activity"] is None


class TestAdminRouterSecurity(TestAdminRouter):
    """Test admin router security features."""

    def test_admin_router_requires_authentication(self, client):
        """Test that all admin endpoints require authentication."""
        
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