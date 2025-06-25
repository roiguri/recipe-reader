"""
Tests for client repository database operations.

This module tests CRUD operations for the clients table,
including API key management and usage tracking.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone
from databases import Database
from app.database.client_repository import ClientRepository


class TestClientRepository:
    """Test cases for ClientRepository CRUD operations."""
    
    @pytest.fixture
    def mock_database(self):
        """Mock database for testing."""
        return AsyncMock(spec=Database)
    
    @pytest.fixture
    def client_repository(self, mock_database):
        """Client repository instance with mock database."""
        return ClientRepository(mock_database)
    
    @pytest.fixture
    def sample_client_data(self):
        """Sample client data for testing."""
        return {
            "api_key": "test_api_key_48chars_long_generated_securely_hex",
            "client_name": "Test Client",
            "is_active": True,
            "total_requests_this_month": 100,
            "master_rate_limit_per_minute": 500,
            "last_used_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }


class TestClientCreation(TestClientRepository):
    """Test cases for client creation."""
    
    @pytest.mark.asyncio
    async def test_create_client_success(self, client_repository, mock_database, sample_client_data):
        """Test successful client creation."""
        mock_database.fetch_one.return_value = sample_client_data
        
        with patch('app.database.client_repository.secrets.token_hex', return_value="test_api_key_48chars"):
            result = await client_repository.create_client("Test Client", 500)
        
        assert result == sample_client_data
        mock_database.fetch_one.assert_called_once()
        
        # Verify SQL query structure
        call_args = mock_database.fetch_one.call_args
        query = call_args[1]["query"]
        assert "INSERT INTO clients" in query
        assert "RETURNING" in query
        
        # Verify parameters
        values = call_args[1]["values"]
        assert values["client_name"] == "Test Client"
        assert values["rate_limit"] == 500
        assert "api_key" in values
    
    @pytest.mark.asyncio
    async def test_create_client_default_rate_limit(self, client_repository, mock_database, sample_client_data):
        """Test client creation with default rate limit."""
        mock_database.fetch_one.return_value = sample_client_data
        
        with patch('app.database.client_repository.secrets.token_hex', return_value="test_api_key"):
            await client_repository.create_client("Test Client")
        
        call_args = mock_database.fetch_one.call_args
        values = call_args[1]["values"]
        assert values["rate_limit"] == 500  # Default value
    
    @pytest.mark.asyncio
    async def test_create_client_api_key_generation(self, client_repository, mock_database, sample_client_data):
        """Test that API key is generated securely."""
        mock_database.fetch_one.return_value = sample_client_data
        
        with patch('app.database.client_repository.secrets.token_hex') as mock_token:
            mock_token.return_value = "secure_generated_key_48_chars_long"
            
            await client_repository.create_client("Test Client")
            
            # Verify token_hex called with 24 (produces 48-char hex string)
            mock_token.assert_called_once_with(24)
    
    @pytest.mark.asyncio
    async def test_create_client_no_result(self, client_repository, mock_database):
        """Test client creation when database returns no result."""
        mock_database.fetch_one.return_value = None
        
        with patch('app.database.client_repository.secrets.token_hex', return_value="test_key"):
            with pytest.raises(Exception, match="Failed to create client"):
                await client_repository.create_client("Test Client")
    
    @pytest.mark.asyncio
    async def test_create_client_database_error(self, client_repository, mock_database):
        """Test client creation with database error."""
        mock_database.fetch_one.side_effect = Exception("Database connection failed")
        
        with patch('app.database.client_repository.secrets.token_hex', return_value="test_key"):
            with pytest.raises(Exception, match="Database connection failed"):
                await client_repository.create_client("Test Client")


class TestClientRetrieval(TestClientRepository):
    """Test cases for client retrieval operations."""
    
    @pytest.mark.asyncio
    async def test_get_client_by_api_key_found(self, client_repository, mock_database, sample_client_data):
        """Test successful client retrieval by API key."""
        mock_database.fetch_one.return_value = sample_client_data
        
        result = await client_repository.get_client_by_api_key("test_api_key")
        
        assert result == sample_client_data
        
        # Verify SQL query
        call_args = mock_database.fetch_one.call_args
        query = call_args[1]["query"]
        assert "SELECT" in query
        assert "FROM clients" in query
        assert "WHERE api_key = :api_key" in query
        
        values = call_args[1]["values"]
        assert values["api_key"] == "test_api_key"
    
    @pytest.mark.asyncio
    async def test_get_client_by_api_key_not_found(self, client_repository, mock_database):
        """Test client retrieval when API key not found."""
        mock_database.fetch_one.return_value = None
        
        result = await client_repository.get_client_by_api_key("nonexistent_key")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_client_by_api_key_error(self, client_repository, mock_database):
        """Test client retrieval with database error."""
        mock_database.fetch_one.side_effect = Exception("Database error")
        
        result = await client_repository.get_client_by_api_key("test_key")
        
        assert result is None  # Should return None on error
    
    @pytest.mark.asyncio
    async def test_get_all_clients_active_only(self, client_repository, mock_database):
        """Test retrieving all active clients."""
        mock_clients = [
            {"api_key": "key1", "client_name": "Client 1", "is_active": True},
            {"api_key": "key2", "client_name": "Client 2", "is_active": True}
        ]
        mock_database.fetch_all.return_value = mock_clients
        
        result = await client_repository.get_all_clients(include_inactive=False)
        
        assert result == mock_clients
        
        # Verify query filters for active clients
        call_args = mock_database.fetch_all.call_args
        query = call_args[1]["query"]
        assert "WHERE is_active = TRUE" in query
    
    @pytest.mark.asyncio
    async def test_get_all_clients_include_inactive(self, client_repository, mock_database):
        """Test retrieving all clients including inactive ones."""
        mock_clients = [
            {"api_key": "key1", "client_name": "Client 1", "is_active": True},
            {"api_key": "key2", "client_name": "Client 2", "is_active": False}
        ]
        mock_database.fetch_all.return_value = mock_clients
        
        result = await client_repository.get_all_clients(include_inactive=True)
        
        assert result == mock_clients
        
        # Verify query does not filter by active status
        call_args = mock_database.fetch_all.call_args
        query = call_args[1]["query"]
        assert "WHERE is_active" not in query


class TestClientUsageTracking(TestClientRepository):
    """Test cases for client usage tracking."""
    
    @pytest.mark.asyncio
    async def test_update_client_usage_success(self, client_repository, mock_database):
        """Test successful usage update."""
        mock_database.fetch_one.return_value = {"api_key": "test_key"}
        
        result = await client_repository.update_client_usage("test_key")
        
        assert result is True
        
        # Verify SQL query updates usage and timestamp
        call_args = mock_database.fetch_one.call_args
        query = call_args[1]["query"]
        assert "UPDATE clients SET" in query
        assert "total_requests_this_month = total_requests_this_month + 1" in query
        assert "last_used_at = NOW()" in query
        assert "WHERE api_key = :api_key AND is_active = TRUE" in query
    
    @pytest.mark.asyncio
    async def test_update_client_usage_not_found(self, client_repository, mock_database):
        """Test usage update when client not found or inactive."""
        mock_database.fetch_one.return_value = None
        
        result = await client_repository.update_client_usage("nonexistent_key")
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_update_client_usage_error(self, client_repository, mock_database):
        """Test usage update with database error."""
        mock_database.fetch_one.side_effect = Exception("Database error")
        
        result = await client_repository.update_client_usage("test_key")
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_reset_monthly_usage_specific_client(self, client_repository, mock_database):
        """Test resetting monthly usage for specific client."""
        mock_database.execute.return_value = 1
        
        result = await client_repository.reset_monthly_usage("test_key")
        
        assert result == 1
        
        call_args = mock_database.execute.call_args
        query = call_args[1]["query"]
        assert "UPDATE clients SET total_requests_this_month = 0" in query
        assert "WHERE api_key = :api_key" in query
    
    @pytest.mark.asyncio
    async def test_reset_monthly_usage_all_clients(self, client_repository, mock_database):
        """Test resetting monthly usage for all clients."""
        mock_database.execute.return_value = 5
        
        result = await client_repository.reset_monthly_usage()
        
        assert result == 5
        
        call_args = mock_database.execute.call_args
        query = call_args[1]["query"]
        assert query == "UPDATE clients SET total_requests_this_month = 0"
        assert call_args[1]["values"] == {}


class TestClientLifecycleManagement(TestClientRepository):
    """Test cases for client activation/deactivation."""
    
    @pytest.mark.asyncio
    async def test_deactivate_client_success(self, client_repository, mock_database):
        """Test successful client deactivation."""
        mock_database.fetch_one.return_value = {"api_key": "test_key"}
        
        result = await client_repository.deactivate_client("test_key")
        
        assert result is True
        
        call_args = mock_database.fetch_one.call_args
        query = call_args[1]["query"]
        assert "UPDATE clients SET is_active = FALSE" in query
        assert "WHERE api_key = :api_key" in query
    
    @pytest.mark.asyncio
    async def test_deactivate_client_not_found(self, client_repository, mock_database):
        """Test deactivation when client not found."""
        mock_database.fetch_one.return_value = None
        
        result = await client_repository.deactivate_client("nonexistent_key")
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_reactivate_client_success(self, client_repository, mock_database):
        """Test successful client reactivation."""
        mock_database.fetch_one.return_value = {"api_key": "test_key"}
        
        result = await client_repository.reactivate_client("test_key")
        
        assert result is True
        
        call_args = mock_database.fetch_one.call_args
        query = call_args[1]["query"]
        assert "UPDATE clients SET is_active = TRUE" in query


class TestUsageStatistics(TestClientRepository):
    """Test cases for usage statistics."""
    
    @pytest.mark.asyncio
    async def test_get_usage_stats_success(self, client_repository, mock_database):
        """Test successful usage statistics retrieval."""
        mock_stats = {
            "total_clients": 10,
            "active_clients": 8,
            "total_requests_this_month": 1500,
            "avg_requests_per_client": 150.0,
            "last_activity": datetime.now(timezone.utc)
        }
        mock_database.fetch_one.return_value = mock_stats
        
        result = await client_repository.get_usage_stats()
        
        assert result == mock_stats
        
        # Verify SQL query uses aggregation functions
        call_args = mock_database.fetch_one.call_args
        query = call_args[1]["query"]
        assert "COUNT(*)" in query
        assert "SUM(total_requests_this_month)" in query
        assert "AVG(total_requests_this_month)" in query
        assert "MAX(last_used_at)" in query
    
    @pytest.mark.asyncio
    async def test_get_usage_stats_no_data(self, client_repository, mock_database):
        """Test usage statistics when no data available."""
        mock_database.fetch_one.return_value = None
        
        result = await client_repository.get_usage_stats()
        
        assert result == {}
    
    @pytest.mark.asyncio
    async def test_get_usage_stats_error(self, client_repository, mock_database):
        """Test usage statistics with database error."""
        mock_database.fetch_one.side_effect = Exception("Database error")
        
        result = await client_repository.get_usage_stats()
        
        assert result == {}


class TestErrorHandlingAndLogging(TestClientRepository):
    """Test cases for error handling and logging behavior."""
    
    @pytest.mark.asyncio
    async def test_logging_client_creation(self, client_repository, mock_database, sample_client_data, caplog):
        """Test logging during client creation."""
        mock_database.fetch_one.return_value = sample_client_data
        
        with patch('app.database.client_repository.secrets.token_hex', return_value="test_key_12345678"):
            with caplog.at_level("INFO"):
                await client_repository.create_client("Test Client")
        
        assert "Created new client: Test Client" in caplog.text
        assert "test_key" in caplog.text  # API key should be truncated to 8 chars
    
    @pytest.mark.asyncio
    async def test_logging_client_deactivation(self, client_repository, mock_database, caplog):
        """Test logging during client deactivation."""
        mock_database.fetch_one.return_value = {"api_key": "test_key_12345678"}
        
        with caplog.at_level("INFO"):
            await client_repository.deactivate_client("test_key_12345678")
        
        assert "Deactivated client" in caplog.text
        assert "test_key" in caplog.text  # API key should be truncated to 8 chars
    
    @pytest.mark.asyncio
    async def test_error_logging(self, client_repository, mock_database, caplog):
        """Test error logging for various operations."""
        mock_database.fetch_one.side_effect = Exception("Test database error")
        
        with caplog.at_level("ERROR"):
            await client_repository.get_client_by_api_key("test_key")
        
        assert "Error fetching client by API key" in caplog.text