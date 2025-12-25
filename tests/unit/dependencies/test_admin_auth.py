"""
Unit tests for admin authentication dependencies.

Tests the admin authentication logic including header validation,
environment variable checking, and error handling.
"""

import pytest
import os
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from datetime import datetime, timezone

from app.dependencies.admin_auth import get_admin_from_key, admin_key_header


class TestAdminAuthentication:
    """Test admin authentication dependency functionality."""

    @pytest.mark.asyncio
    async def test_constant_time_comparison(self, mock_env_admin_key):
        """Test that secrets.compare_digest is used for constant-time comparison."""
        with patch("app.dependencies.admin_auth.secrets.compare_digest", return_value=True) as mock_compare:
            await get_admin_from_key(mock_env_admin_key)
            mock_compare.assert_called_once_with(mock_env_admin_key, mock_env_admin_key)

    @pytest.fixture
    def mock_admin_key(self):
        """Fixture providing a test admin key."""
        return "test-admin-key-12345"

    @pytest.fixture
    def mock_env_admin_key(self, mock_admin_key):
        """Fixture that mocks the ADMIN_API_KEY environment variable."""
        with patch.dict(os.environ, {"ADMIN_API_KEY": mock_admin_key}):
            yield mock_admin_key

    @pytest.mark.asyncio
    async def test_valid_admin_key_authentication(self, mock_env_admin_key):
        """Test successful admin authentication with valid key."""
        result = await get_admin_from_key(mock_env_admin_key)
        
        assert result["admin"] is True
        assert "authenticated_at" in result
        assert result["key_prefix"] == "test-adm..."
        
        # Verify timestamp format
        auth_time = datetime.fromisoformat(result["authenticated_at"].replace('Z', '+00:00'))
        assert isinstance(auth_time, datetime)

    @pytest.mark.asyncio
    async def test_missing_admin_key(self):
        """Test authentication failure when admin key is missing."""
        with pytest.raises(HTTPException) as exc_info:
            await get_admin_from_key("")
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail["error"] == "missing_admin_key"
        assert "Missing Admin API Key" in exc_info.value.detail["message"]
        assert "timestamp" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_none_admin_key(self):
        """Test authentication failure when admin key is None."""
        with pytest.raises(HTTPException) as exc_info:
            await get_admin_from_key(None)
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail["error"] == "missing_admin_key"

    @pytest.mark.asyncio
    async def test_invalid_admin_key(self, mock_env_admin_key):
        """Test authentication failure with invalid admin key."""
        invalid_key = "wrong-admin-key"
        
        with pytest.raises(HTTPException) as exc_info:
            await get_admin_from_key(invalid_key)
        
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["error"] == "invalid_admin_key"
        assert "Invalid Admin API Key" in exc_info.value.detail["message"]
        assert "timestamp" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_missing_environment_variable(self):
        """Test error when ADMIN_API_KEY environment variable is not set."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(HTTPException) as exc_info:
                await get_admin_from_key("any-key")
            
            assert exc_info.value.status_code == 500
            assert exc_info.value.detail["error"] == "admin_service_misconfigured"
            assert "not properly configured" in exc_info.value.detail["message"]

    @pytest.mark.asyncio
    async def test_empty_environment_variable(self):
        """Test error when ADMIN_API_KEY environment variable is empty."""
        with patch.dict(os.environ, {"ADMIN_API_KEY": ""}):
            with pytest.raises(HTTPException) as exc_info:
                await get_admin_from_key("any-key")
            
            assert exc_info.value.status_code == 500
            assert exc_info.value.detail["error"] == "admin_service_misconfigured"

    @pytest.mark.asyncio
    async def test_logging_behavior(self, mock_env_admin_key, caplog):
        """Test that admin authentication logs appropriately."""
        import logging
        
        with caplog.at_level(logging.INFO):
            await get_admin_from_key(mock_env_admin_key)
        
        assert "Authenticated admin request" in caplog.text

    @pytest.mark.asyncio
    async def test_logging_invalid_key(self, mock_env_admin_key, caplog):
        """Test that invalid admin key attempts are logged."""
        import logging
        
        with caplog.at_level(logging.WARNING):
            with pytest.raises(HTTPException):
                await get_admin_from_key("invalid-key")
        
        assert "Admin request with invalid admin key" in caplog.text
        assert "inva..." in caplog.text  # Truncated to 4 chars in logs

    @pytest.mark.asyncio
    async def test_logging_missing_key(self, caplog):
        """Test that missing admin key attempts are logged."""
        import logging
        
        with caplog.at_level(logging.WARNING):
            with pytest.raises(HTTPException):
                await get_admin_from_key("")
        
        assert "Admin request missing X-Admin-Key header" in caplog.text

    @pytest.mark.asyncio
    async def test_admin_key_truncation_in_logs(self, mock_env_admin_key, caplog):
        """Test that admin keys are properly truncated in logs for security."""
        import logging
        
        long_admin_key = "very-long-admin-key-that-should-be-truncated-in-logs"
        
        with patch.dict(os.environ, {"ADMIN_API_KEY": long_admin_key}):
            with caplog.at_level(logging.INFO):
                result = await get_admin_from_key(long_admin_key)
        
        # Check that the key is truncated in response
        assert result["key_prefix"] == "very-lon..."
        
        # Verify no full key appears in logs
        assert long_admin_key not in caplog.text

    def test_admin_key_header_configuration(self):
        """Test that admin key header is properly configured."""
        assert admin_key_header.model.name == "X-Admin-Key"
        # Test that the header scheme is properly configured
        assert isinstance(admin_key_header, type(admin_key_header))


class TestErrorResponseFormat:
    """Test admin authentication error response formatting."""

    @pytest.mark.asyncio
    async def test_error_response_structure(self):
        """Test that error responses have the correct structure."""
        with pytest.raises(HTTPException) as exc_info:
            await get_admin_from_key("")
        
        error_detail = exc_info.value.detail
        
        # Check required fields
        assert "error" in error_detail
        assert "message" in error_detail
        assert "timestamp" in error_detail
        
        # Check field types
        assert isinstance(error_detail["error"], str)
        assert isinstance(error_detail["message"], str)
        assert isinstance(error_detail["timestamp"], str)
        
        # Check timestamp format (ISO 8601)
        timestamp = datetime.fromisoformat(error_detail["timestamp"].replace('Z', '+00:00'))
        assert isinstance(timestamp, datetime)

    @pytest.mark.asyncio
    async def test_timestamp_accuracy(self):
        """Test that error timestamps are recent and accurate."""
        start_time = datetime.now(timezone.utc)
        
        with pytest.raises(HTTPException) as exc_info:
            await get_admin_from_key("")
        
        end_time = datetime.now(timezone.utc)
        
        error_timestamp = datetime.fromisoformat(
            exc_info.value.detail["timestamp"].replace('Z', '+00:00')
        )
        
        # Timestamp should be between start and end time
        assert start_time <= error_timestamp <= end_time