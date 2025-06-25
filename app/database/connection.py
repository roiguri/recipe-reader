"""
Database connection management for Recipe Reader API.

This module handles PostgreSQL connections using asyncpg for high-performance
async database operations with connection pooling.
"""

import os
import asyncio
import logging
from typing import Optional
from databases import Database
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manages database connections and connection pooling for the Recipe Reader API.
    
    This class implements the singleton pattern to ensure only one database
    connection pool is created per application lifecycle.
    """
    
    _instance: Optional['DatabaseManager'] = None
    _database: Optional[Database] = None
    _is_connected: bool = False
    
    def __new__(cls) -> 'DatabaseManager':
        """Ensure singleton pattern for database manager."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize database manager with connection parameters."""
        if not hasattr(self, '_initialized'):
            self.database_url = None  # Lazy initialization
            self._initialized = True
    
    def _get_database_url(self) -> str:
        """
        Get database URL from environment variables.
        
        Returns:
            str: PostgreSQL connection URL
            
        Raises:
            ValueError: If DATABASE_URL is not configured
        """
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError(
                "DATABASE_URL environment variable is required. "
                "Please configure your Vercel PostgreSQL connection string."
            )
        return database_url
    
    async def connect(self) -> None:
        """
        Establish database connection with connection pooling.
        
        Creates a connection pool with optimized settings for production use.
        """
        if self._is_connected and self._database:
            logger.info("Database already connected")
            return
        
        # Lazy initialization of database URL
        if self.database_url is None:
            self.database_url = self._get_database_url()
        
        try:
            self._database = Database(
                self.database_url,
                min_size=1,        # Minimum connections in pool
                max_size=10,       # Maximum connections in pool
                ssl=True,          # Enable SSL for Vercel PostgreSQL
                server_settings={
                    "jit": "off"   # Disable JIT for better cold start performance
                }
            )
            
            await self._database.connect()
            self._is_connected = True
            logger.info("Database connected successfully with connection pooling")
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {str(e)}")
            self._is_connected = False
            raise
    
    async def disconnect(self) -> None:
        """
        Close database connection and cleanup resources.
        
        Should be called during application shutdown.
        """
        if self._database and self._is_connected:
            try:
                await self._database.disconnect()
                self._is_connected = False
                logger.info("Database disconnected successfully")
            except Exception as e:
                logger.error(f"Error disconnecting from database: {str(e)}")
                raise
    
    @property
    def database(self) -> Database:
        """
        Get the database connection instance.
        
        Returns:
            Database: Active database connection
            
        Raises:
            RuntimeError: If database is not connected
        """
        if not self._is_connected or not self._database:
            raise RuntimeError(
                "Database not connected. Call connect() first or use get_database() dependency."
            )
        return self._database
    
    @property
    def is_connected(self) -> bool:
        """Check if database is currently connected."""
        return self._is_connected
    
    async def health_check(self) -> bool:
        """
        Perform a health check on the database connection.
        
        Returns:
            bool: True if database is healthy, False otherwise
        """
        try:
            if not self._is_connected or not self._database:
                return False
            
            # Simple query to test connection
            result = await self._database.fetch_one("SELECT 1 as health_check")
            return result is not None and result["health_check"] == 1
            
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return False

# Global database manager instance
db_manager = DatabaseManager()

async def get_database() -> Database:
    """
    FastAPI dependency to get database connection.
    
    This function ensures the database is connected and returns the connection
    instance for use in route handlers.
    
    Returns:
        Database: Active database connection
        
    Raises:
        RuntimeError: If database connection fails
    """
    if not db_manager.is_connected:
        await db_manager.connect()
    
    return db_manager.database

@asynccontextmanager
async def database_lifespan():
    """
    Context manager for database lifecycle management.
    
    Use this in FastAPI lifespan events to ensure proper connection
    management during application startup and shutdown.
    """
    try:
        await db_manager.connect()
        yield
    finally:
        await db_manager.disconnect()

# Connection utilities for testing and debugging
async def test_connection() -> bool:
    """
    Test database connection for debugging purposes.
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        await db_manager.connect()
        health = await db_manager.health_check()
        await db_manager.disconnect()
        return health
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        return False

async def execute_migration(sql_file_path: str) -> bool:
    """
    Execute SQL migration file.
    
    Args:
        sql_file_path: Path to SQL file to execute
        
    Returns:
        bool: True if migration successful, False otherwise
    """
    try:
        with open(sql_file_path, 'r') as file:
            sql_content = file.read()
        
        await db_manager.connect()
        
        # Split by semicolon and execute each statement
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for statement in statements:
            await db_manager.database.execute(statement)
        
        logger.info(f"Migration {sql_file_path} executed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Migration {sql_file_path} failed: {str(e)}")
        return False