"""
Simplified tests for database dependencies.

These tests focus on the core functionality without complex async generator handling.
"""

import pytest
from app.dependencies.database import get_db, get_client_repository
from app.database.client_repository import ClientRepository


class TestDatabaseDependencies:
    """Simplified tests for database dependency injection."""
    
    @pytest.mark.asyncio
    async def test_get_db_dependency(self, mock_db_manager):
        """Test that get_db dependency returns database connection."""
        # Test the async generator
        db_generator = get_db()
        database = await db_generator.__anext__()
        
        assert database is mock_db_manager  # get_database() returns the manager itself
        
        # Test generator cleanup (should not raise)
        try:
            await db_generator.__anext__()
        except StopAsyncIteration:
            pass  # Expected behavior
    
    @pytest.mark.asyncio
    async def test_get_client_repository_with_database(self, mock_database):
        """Test get_client_repository when database is provided."""
        repository = await get_client_repository(mock_database)
        
        assert isinstance(repository, ClientRepository)
        assert repository.database is mock_database
    
    @pytest.mark.asyncio
    async def test_get_client_repository_without_database(self, mock_db_manager):
        """Test get_client_repository when no database is provided."""
        repository = await get_client_repository()
        
        assert isinstance(repository, ClientRepository)
        assert repository.database is mock_db_manager  # get_database() returns the manager itself


class TestDependencyIntegration:
    """Test integration between dependencies."""
    
    @pytest.mark.asyncio
    async def test_dependency_functions_exist(self):
        """Test that dependency functions exist and are callable."""
        assert callable(get_db)
        assert callable(get_client_repository)
    
    @pytest.mark.asyncio
    async def test_client_repository_creation(self, mock_database):
        """Test that ClientRepository can be created with database."""
        repository = ClientRepository(mock_database)
        assert repository.database is mock_database