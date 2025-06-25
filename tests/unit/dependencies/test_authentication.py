"""
Tests for authentication dependencies and API key validation.

This module tests the multi-tenant authentication system including
API key validation, client status checking, and usage tracking.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from app.dependencies.authentication import get_client_from_db, api_key_header


class TestAPIKeyAuthentication:
    """Test cases for API key authentication functionality."""
    
    @pytest.fixture
    def mock_db_manager(self):
        """Mock database manager for testing."""
        with patch('app.database.connection.db_manager') as mock:
            mock.is_connected = True
            mock.connect = AsyncMock()
            mock.database = AsyncMock()
            yield mock
    
    @pytest.fixture
    def valid_client_record(self):
        """Sample valid client record from database."""
        return {
            "api_key": "test_api_key_12345",
            "client_name": "Test Client",
            "is_active": True,
            "total_requests_this_month": 100,
            "master_rate_limit_per_minute": 500,
            "last_used_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
    
    @pytest.fixture
    def inactive_client_record(self):
        """Sample inactive client record from database."""
        return {
            "api_key": "inactive_api_key_12345",
            "client_name": "Inactive Client", 
            "is_active": False,
            "total_requests_this_month": 50,
            "master_rate_limit_per_minute": 500,
            "last_used_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }

    @pytest.mark.asyncio
    async def test_valid_api_key_authentication(self, mock_db_manager, valid_client_record):
        """Test successful authentication with valid API key."""
        # Setup
        mock_db_manager.database.fetch_one.return_value = valid_client_record
        mock_db_manager.database.execute.return_value = None
        
        # Execute
        result = await get_client_from_db("test_api_key_12345")
        
        # Verify
        assert result == valid_client_record
        assert mock_db_manager.database.fetch_one.called
        assert mock_db_manager.database.execute.called
        
        # Check that usage tracking update was called
        execute_call = mock_db_manager.database.execute.call_args
        assert "total_requests_this_month = total_requests_this_month + 1" in execute_call[1]["query"]
        assert execute_call[1]["values"]["api_key"] == "test_api_key_12345"

    @pytest.mark.asyncio 
    async def test_missing_api_key(self, mock_db_manager):
        """Test authentication failure when API key is missing."""
        with pytest.raises(HTTPException) as exc_info:
            await get_client_from_db("")
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail["error"] == "missing_api_key"
        assert "Missing API Key" in exc_info.value.detail["message"]
        assert "timestamp" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_invalid_api_key(self, mock_db_manager):
        """Test authentication failure with invalid API key."""
        # Setup - return None for non-existent API key
        mock_db_manager.database.fetch_one.return_value = None
        
        with pytest.raises(HTTPException) as exc_info:
            await get_client_from_db("invalid_api_key")
        
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["error"] == "invalid_api_key"
        assert "Invalid API Key" in exc_info.value.detail["message"]
        assert "timestamp" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_inactive_client(self, mock_db_manager, inactive_client_record):
        """Test authentication failure for inactive client."""
        # Setup
        mock_db_manager.database.fetch_one.return_value = inactive_client_record
        
        with pytest.raises(HTTPException) as exc_info:
            await get_client_from_db("inactive_api_key_12345")
        
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["error"] == "inactive_client"
        assert "deactivated" in exc_info.value.detail["message"]
        assert "timestamp" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_database_connection_handling(self, mock_db_manager, valid_client_record):
        """Test that database connection is established if not connected."""
        # Setup - simulate disconnected database
        mock_db_manager.is_connected = False
        mock_db_manager.database.fetch_one.return_value = valid_client_record
        mock_db_manager.database.execute.return_value = None
        
        # Execute
        result = await get_client_from_db("test_api_key_12345")
        
        # Verify connection was attempted
        mock_db_manager.connect.assert_called_once()
        assert result == valid_client_record

    @pytest.mark.asyncio
    async def test_database_error_handling(self, mock_db_manager):
        """Test proper error handling when database operations fail."""
        # Setup - simulate database error
        mock_db_manager.database.fetch_one.side_effect = Exception("Database connection failed")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_client_from_db("test_api_key_12345")
        
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail["error"] == "authentication_service_error"
        assert "temporarily unavailable" in exc_info.value.detail["message"]
        assert "timestamp" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_usage_tracking_sql_query(self, mock_db_manager, valid_client_record):
        """Test that usage tracking SQL query is correctly formatted."""
        # Setup
        mock_db_manager.database.fetch_one.return_value = valid_client_record
        mock_db_manager.database.execute.return_value = None
        
        # Execute
        await get_client_from_db("test_api_key_12345")
        
        # Verify SQL query structure
        execute_call = mock_db_manager.database.execute.call_args
        query = execute_call[1]["query"]
        
        assert "UPDATE clients SET" in query
        assert "total_requests_this_month = total_requests_this_month + 1" in query
        assert "last_used_at = NOW()" in query
        assert "WHERE api_key = :api_key" in query

    def test_api_key_header_configuration(self):
        """Test that API key header is properly configured."""
        assert api_key_header.model.name == "X-API-Key"
        assert "API key for client authentication" in api_key_header.model.description

    @pytest.mark.asyncio
    async def test_client_record_conversion(self, mock_db_manager, valid_client_record):
        """Test that client record is properly converted to dict."""
        # Setup
        mock_db_manager.database.fetch_one.return_value = valid_client_record
        mock_db_manager.database.execute.return_value = None
        
        # Execute
        result = await get_client_from_db("test_api_key_12345")
        
        # Verify result is a dict with expected keys
        assert isinstance(result, dict)
        assert "api_key" in result
        assert "client_name" in result
        assert "is_active" in result
        assert "total_requests_this_month" in result
        assert result["client_name"] == "Test Client"

    @pytest.mark.asyncio
    async def test_logging_behavior(self, mock_db_manager, valid_client_record, caplog):
        """Test that appropriate log messages are generated."""
        # Setup
        mock_db_manager.database.fetch_one.return_value = valid_client_record
        mock_db_manager.database.execute.return_value = None
        
        # Execute
        with caplog.at_level("INFO"):
            await get_client_from_db("test_api_key_12345")
        
        # Verify logging
        assert "Authenticated API request from client: Test Client" in caplog.text

    @pytest.mark.asyncio
    async def test_api_key_truncation_in_logs(self, mock_db_manager, caplog):
        """Test that API keys are truncated in log messages for security."""
        # Setup - simulate invalid key
        mock_db_manager.database.fetch_one.return_value = None
        
        # Execute
        with caplog.at_level("WARNING"):
            with pytest.raises(HTTPException):
                await get_client_from_db("very_long_api_key_that_should_be_truncated")
        
        # Verify API key is truncated in logs (first 12 chars)
        assert "very_long_ap" in caplog.text  # Should show first 12 chars
        assert "very_long_api_key_that_should_be_truncated" not in caplog.text  # But not the full key


class TestErrorResponseFormat:
    """Test cases for error response formatting."""
    
    @pytest.mark.asyncio
    async def test_error_response_structure(self):
        """Test that error responses follow the specified format."""
        with patch('app.database.connection.db_manager') as mock_db:
            mock_db.is_connected = True
            mock_db.database = AsyncMock()
            mock_db.database.fetch_one.return_value = None
            
            try:
                await get_client_from_db("invalid_key")
            except HTTPException as e:
                detail = e.detail
                
                # Verify required fields
                assert "error" in detail
                assert "message" in detail  
                assert "timestamp" in detail
                
                # Verify timestamp format (ISO 8601)
                timestamp = detail["timestamp"]
                datetime.fromisoformat(timestamp)  # Should not raise
                
                # Verify error code format
                assert isinstance(detail["error"], str)
                assert detail["error"] == "invalid_api_key"