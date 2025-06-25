"""
Tests for database connection management.

This module tests the DatabaseManager singleton, connection handling,
and database utility functions for the Recipe Reader API.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import os
from databases import Database
from app.database.connection import (
    DatabaseManager, 
    db_manager, 
    get_database,
    database_lifespan,
    test_connection,
    execute_migration
)


class TestDatabaseManager:
    """Test cases for DatabaseManager singleton class."""
    
    def test_singleton_pattern(self):
        """Test that DatabaseManager implements singleton pattern."""
        manager1 = DatabaseManager()
        manager2 = DatabaseManager()
        
        assert manager1 is manager2
        assert manager1 is db_manager  # Should be same as global instance
    
    def test_database_url_validation(self):
        """Test database URL validation."""
        manager = DatabaseManager()
        
        # Test with missing DATABASE_URL
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="DATABASE_URL environment variable is required"):
                manager._get_database_url()
        
        # Test with valid DATABASE_URL
        test_url = "postgresql://user:pass@host:5432/db"
        with patch.dict(os.environ, {"DATABASE_URL": test_url}):
            url = manager._get_database_url()
            assert url == test_url
    
    @pytest.mark.asyncio
    async def test_connect_success(self):
        """Test successful database connection."""
        manager = DatabaseManager()
        manager._database = None
        manager._is_connected = False
        
        mock_database = AsyncMock(spec=Database)
        
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}):
            with patch('app.database.connection.Database', return_value=mock_database):
                await manager.connect()
        
        assert manager._is_connected is True
        assert manager._database is mock_database
        mock_database.connect.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_connect_already_connected(self):
        """Test connect when already connected."""
        manager = DatabaseManager()
        manager._is_connected = True
        manager._database = AsyncMock(spec=Database)
        
        await manager.connect()
        
        # Should not create new connection
        assert manager._is_connected is True
    
    @pytest.mark.asyncio
    async def test_connect_failure(self):
        """Test connection failure handling."""
        manager = DatabaseManager()
        manager._database = None
        manager._is_connected = False
        
        mock_database = AsyncMock(spec=Database)
        mock_database.connect.side_effect = Exception("Connection failed")
        
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}):
            with patch('app.database.connection.Database', return_value=mock_database):
                with pytest.raises(Exception, match="Connection failed"):
                    await manager.connect()
        
        assert manager._is_connected is False
    
    @pytest.mark.asyncio
    async def test_disconnect_success(self):
        """Test successful disconnection."""
        manager = DatabaseManager()
        mock_database = AsyncMock(spec=Database)
        manager._database = mock_database
        manager._is_connected = True
        
        await manager.disconnect()
        
        assert manager._is_connected is False
        mock_database.disconnect.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_disconnect_not_connected(self):
        """Test disconnect when not connected."""
        manager = DatabaseManager()
        manager._database = None
        manager._is_connected = False
        
        await manager.disconnect()  # Should not raise
        
        assert manager._is_connected is False
    
    @pytest.mark.asyncio
    async def test_disconnect_failure(self):
        """Test disconnect failure handling."""
        manager = DatabaseManager()
        mock_database = AsyncMock(spec=Database)
        mock_database.disconnect.side_effect = Exception("Disconnect failed")
        manager._database = mock_database
        manager._is_connected = True
        
        with pytest.raises(Exception, match="Disconnect failed"):
            await manager.disconnect()
    
    def test_database_property_connected(self):
        """Test database property when connected."""
        manager = DatabaseManager()
        mock_database = AsyncMock(spec=Database)
        manager._database = mock_database
        manager._is_connected = True
        
        assert manager.database is mock_database
    
    def test_database_property_not_connected(self):
        """Test database property when not connected."""
        manager = DatabaseManager()
        manager._database = None
        manager._is_connected = False
        
        with pytest.raises(RuntimeError, match="Database not connected"):
            _ = manager.database
    
    def test_is_connected_property(self):
        """Test is_connected property."""
        manager = DatabaseManager()
        
        manager._is_connected = False
        assert manager.is_connected is False
        
        manager._is_connected = True
        assert manager.is_connected is True
    
    @pytest.mark.asyncio
    async def test_health_check_connected_healthy(self):
        """Test health check when connected and healthy."""
        manager = DatabaseManager()
        mock_database = AsyncMock(spec=Database)
        mock_database.fetch_one.return_value = {"health_check": 1}
        manager._database = mock_database
        manager._is_connected = True
        
        result = await manager.health_check()
        
        assert result is True
        mock_database.fetch_one.assert_called_once_with("SELECT 1 as health_check")
    
    @pytest.mark.asyncio
    async def test_health_check_not_connected(self):
        """Test health check when not connected."""
        manager = DatabaseManager()
        manager._database = None
        manager._is_connected = False
        
        result = await manager.health_check()
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_health_check_query_failure(self):
        """Test health check when query fails."""
        manager = DatabaseManager()
        mock_database = AsyncMock(spec=Database)
        mock_database.fetch_one.side_effect = Exception("Query failed")
        manager._database = mock_database
        manager._is_connected = True
        
        result = await manager.health_check()
        
        assert result is False


class TestDatabaseConfiguration:
    """Test cases for database configuration."""
    
    @pytest.mark.asyncio
    async def test_database_configuration_parameters(self):
        """Test database connection configuration parameters."""
        manager = DatabaseManager()
        
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}):
            with patch('app.database.connection.Database') as mock_db_class:
                await manager.connect()
        
        # Verify Database was called with correct parameters
        mock_db_class.assert_called_once_with(
            "postgresql://test",
            min_size=1,
            max_size=10,
            ssl=True,
            server_settings={"jit": "off"}
        )
    
    def test_lazy_database_url_initialization(self):
        """Test that database URL is initialized lazily."""
        manager = DatabaseManager()
        
        # URL should be None initially
        assert manager.database_url is None
        
        # Should be set after calling _get_database_url
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}):
            url = manager._get_database_url()
            assert url == "postgresql://test"


class TestUtilityFunctions:
    """Test cases for utility functions."""
    
    @pytest.mark.asyncio
    async def test_get_database_dependency(self):
        """Test get_database FastAPI dependency."""
        mock_database = AsyncMock(spec=Database)
        
        with patch.object(db_manager, 'is_connected', True):
            with patch.object(db_manager, 'database', mock_database):
                result = await get_database()
                assert result is mock_database
    
    @pytest.mark.asyncio
    async def test_get_database_auto_connect(self):
        """Test get_database auto-connects if not connected."""
        mock_database = AsyncMock(spec=Database)
        
        with patch.object(db_manager, 'is_connected', False):
            with patch.object(db_manager, 'connect', AsyncMock()) as mock_connect:
                with patch.object(db_manager, 'database', mock_database):
                    result = await get_database()
                    
                    mock_connect.assert_called_once()
                    assert result is mock_database
    
    @pytest.mark.asyncio
    async def test_database_lifespan_context(self):
        """Test database lifespan context manager."""
        with patch.object(db_manager, 'connect', AsyncMock()) as mock_connect:
            with patch.object(db_manager, 'disconnect', AsyncMock()) as mock_disconnect:
                async with database_lifespan():
                    pass
                
                mock_connect.assert_called_once()
                mock_disconnect.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_database_lifespan_error_handling(self):
        """Test database lifespan handles errors properly."""
        with patch.object(db_manager, 'connect', AsyncMock()) as mock_connect:
            with patch.object(db_manager, 'disconnect', AsyncMock()) as mock_disconnect:
                try:
                    async with database_lifespan():
                        raise Exception("Test error")
                except Exception:
                    pass
                
                mock_connect.assert_called_once()
                mock_disconnect.assert_called_once()  # Should still disconnect
    
    @pytest.mark.asyncio
    async def test_test_connection_success(self):
        """Test test_connection utility function success."""
        with patch.object(db_manager, 'connect', AsyncMock()) as mock_connect:
            with patch.object(db_manager, 'health_check', AsyncMock(return_value=True)) as mock_health:
                with patch.object(db_manager, 'disconnect', AsyncMock()) as mock_disconnect:
                    result = await test_connection()
                    
                    assert result is True
                    mock_connect.assert_called_once()
                    mock_health.assert_called_once()
                    mock_disconnect.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_test_connection_failure(self):
        """Test test_connection utility function failure."""
        with patch.object(db_manager, 'connect', AsyncMock(side_effect=Exception("Connection failed"))):
            result = await test_connection()
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_execute_migration_success(self):
        """Test successful migration execution."""
        mock_database = AsyncMock(spec=Database)
        
        # Create a temporary SQL file
        sql_content = "CREATE TABLE test (id INTEGER); INSERT INTO test VALUES (1);"
        
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = sql_content
            with patch.object(db_manager, 'connect', AsyncMock()):
                with patch.object(db_manager, 'database', mock_database):
                    result = await execute_migration("test.sql")
                    
                    assert result is True
                    # Should execute each statement separately
                    assert mock_database.execute.call_count == 2
    
    @pytest.mark.asyncio
    async def test_execute_migration_file_error(self):
        """Test migration execution with file error."""
        with patch('builtins.open', side_effect=FileNotFoundError("File not found")):
            result = await execute_migration("nonexistent.sql")
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_execute_migration_sql_error(self):
        """Test migration execution with SQL error."""
        mock_database = AsyncMock(spec=Database)
        mock_database.execute.side_effect = Exception("SQL error")
        
        sql_content = "CREATE TABLE test (id INTEGER);"
        
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = sql_content
            with patch.object(db_manager, 'connect', AsyncMock()):
                with patch.object(db_manager, 'database', mock_database):
                    result = await execute_migration("test.sql")
                    
                    assert result is False


class TestErrorHandlingAndLogging:
    """Test cases for error handling and logging."""
    
    @pytest.mark.asyncio
    async def test_connection_logging(self, caplog):
        """Test connection success logging."""
        manager = DatabaseManager()
        mock_database = AsyncMock(spec=Database)
        
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}):
            with patch('app.database.connection.Database', return_value=mock_database):
                with caplog.at_level("INFO"):
                    await manager.connect()
        
        assert "Database connected successfully with connection pooling" in caplog.text
    
    @pytest.mark.asyncio
    async def test_connection_error_logging(self, caplog):
        """Test connection error logging."""
        manager = DatabaseManager()
        mock_database = AsyncMock(spec=Database)
        mock_database.connect.side_effect = Exception("Connection failed")
        
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}):
            with patch('app.database.connection.Database', return_value=mock_database):
                with caplog.at_level("ERROR"):
                    with pytest.raises(Exception):
                        await manager.connect()
        
        assert "Failed to connect to database" in caplog.text
    
    @pytest.mark.asyncio
    async def test_health_check_error_logging(self, caplog):
        """Test health check error logging."""
        manager = DatabaseManager()
        mock_database = AsyncMock(spec=Database)
        mock_database.fetch_one.side_effect = Exception("Health check failed")
        manager._database = mock_database
        manager._is_connected = True
        
        with caplog.at_level("ERROR"):
            result = await manager.health_check()
        
        assert result is False
        assert "Database health check failed" in caplog.text