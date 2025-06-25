"""
Tests for database dependencies and dependency injection.

This module tests the FastAPI dependencies that provide database
connections and repository instances to route handlers.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from databases import Database
from app.dependencies.database import get_db, get_client_repository
from app.database.client_repository import ClientRepository


class TestDatabaseDependencies:
    """Test cases for database dependency injection."""
    
    @pytest.mark.asyncio
    async def test_get_db_dependency(self):
        """Test that get_db dependency returns database connection."""
        mock_database = AsyncMock(spec=Database)
        
        with patch('app.dependencies.database.get_database', return_value=mock_database):
            # Test the async generator
            db_generator = get_db()
            database = await db_generator.__anext__()
            
            assert database is mock_database
            
            # Test generator cleanup (should not raise)
            try:
                await db_generator.__anext__()
            except StopAsyncIteration:
                pass  # Expected behavior
    
    @pytest.mark.asyncio
    async def test_get_db_dependency_cleanup(self):
        """Test that get_db dependency handles cleanup properly."""
        mock_database = AsyncMock(spec=Database)
        
        with patch('app.dependencies.database.get_database', return_value=mock_database):
            async with get_db() as database:
                assert database is mock_database
            
            # Cleanup should complete without errors
            # (No specific cleanup actions in current implementation)
    
    @pytest.mark.asyncio
    async def test_get_client_repository_with_database(self):
        """Test get_client_repository when database is provided."""
        mock_database = AsyncMock(spec=Database)
        
        repository = await get_client_repository(database=mock_database)
        
        assert isinstance(repository, ClientRepository)
        assert repository.database is mock_database
    
    @pytest.mark.asyncio
    async def test_get_client_repository_without_database(self):
        """Test get_client_repository when no database is provided."""
        mock_database = AsyncMock(spec=Database)
        
        with patch('app.dependencies.database.get_database', return_value=mock_database):
            repository = await get_client_repository()
            
            assert isinstance(repository, ClientRepository)
            assert repository.database is mock_database
    
    @pytest.mark.asyncio
    async def test_get_client_repository_none_parameter(self):
        """Test get_client_repository with explicit None parameter."""
        mock_database = AsyncMock(spec=Database)
        
        with patch('app.dependencies.database.get_database', return_value=mock_database):
            repository = await get_client_repository(database=None)
            
            assert isinstance(repository, ClientRepository)
            assert repository.database is mock_database


class TestDependencyIntegration:
    """Test cases for dependency integration scenarios."""
    
    @pytest.mark.asyncio
    async def test_dependency_chain(self):
        """Test the full dependency chain from database to repository."""
        mock_database = AsyncMock(spec=Database)
        
        with patch('app.dependencies.database.get_database', return_value=mock_database):
            # Simulate FastAPI dependency injection
            async with get_db() as database:
                repository = await get_client_repository(database=database)
                
                assert repository.database is database
                assert repository.database is mock_database
    
    @pytest.mark.asyncio
    async def test_multiple_repository_instances(self):
        """Test that multiple repository calls create separate instances."""
        mock_database = AsyncMock(spec=Database)
        
        with patch('app.dependencies.database.get_database', return_value=mock_database):
            repository1 = await get_client_repository()
            repository2 = await get_client_repository()
            
            # Should be different instances
            assert repository1 is not repository2
            
            # But should share the same database connection
            assert repository1.database is repository2.database
    
    @pytest.mark.asyncio 
    async def test_database_dependency_error_handling(self):
        """Test error handling in database dependency."""
        with patch('app.dependencies.database.get_database', side_effect=Exception("Database error")):
            with pytest.raises(Exception, match="Database error"):
                async with get_db() as database:
                    pass
    
    @pytest.mark.asyncio
    async def test_repository_dependency_error_handling(self):
        """Test error handling in repository dependency."""
        with patch('app.dependencies.database.get_database', side_effect=Exception("Database error")):
            with pytest.raises(Exception, match="Database error"):
                await get_client_repository()


class TestMockVerification:
    """Test cases to verify mocking behavior."""
    
    @pytest.mark.asyncio
    async def test_database_mock_specifications(self):
        """Test that database mocks have correct specifications."""
        mock_database = AsyncMock(spec=Database)
        
        # Should have Database methods
        assert hasattr(mock_database, 'fetch_one')
        assert hasattr(mock_database, 'fetch_all')
        assert hasattr(mock_database, 'execute')
    
    @pytest.mark.asyncio
    async def test_repository_mock_verification(self):
        """Test that repository creation works with properly mocked database."""
        mock_database = AsyncMock(spec=Database)
        
        repository = await get_client_repository(database=mock_database)
        
        # Verify repository has expected methods
        assert hasattr(repository, 'create_client')
        assert hasattr(repository, 'get_client_by_api_key')
        assert hasattr(repository, 'update_client_usage')
        assert hasattr(repository, 'get_all_clients')
        
        # Verify repository is properly initialized
        assert repository.database is mock_database