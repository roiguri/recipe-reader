"""
Database dependencies for FastAPI dependency injection.

This module provides database-related dependencies that can be injected
into FastAPI route handlers for clean separation of concerns.
"""

from typing import AsyncGenerator
from databases import Database
from ..database.connection import get_database
from ..database.client_repository import ClientRepository

async def get_db() -> AsyncGenerator[Database, None]:
    """
    FastAPI dependency to provide database connection.
    
    This dependency ensures the database is connected and provides
    the connection instance to route handlers.
    
    Yields:
        Database: Active database connection
    """
    database = await get_database()
    try:
        yield database
    finally:
        # Connection cleanup is handled by the connection manager
        pass

async def get_client_repository(database: Database = None) -> ClientRepository:
    """
    FastAPI dependency to provide client repository.
    
    Args:
        database: Database connection (injected by FastAPI)
        
    Returns:
        ClientRepository: Repository instance for client operations
    """
    if database is None:
        database = await get_database()
    
    return ClientRepository(database)