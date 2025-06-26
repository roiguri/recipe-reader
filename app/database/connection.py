"""
Database connection management for Recipe Reader API.

This module handles PostgreSQL connections using asyncpg for high-performance
async database operations with connection pooling optimized for Vercel serverless.
"""

import os
import logging
from typing import Optional, Dict, Any, List
import asyncpg
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manages database connections and connection pooling for the Recipe Reader API.
    
    This class implements serverless-optimized connection pooling using asyncpg
    for better performance and reliability in Vercel's serverless environment.
    """
    
    _instance: Optional['DatabaseManager'] = None
    _pool: Optional[asyncpg.Pool] = None
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
        Establish database connection pool optimized for Vercel serverless.
        
        Creates a connection pool with settings optimized for serverless functions.
        Handles event loop issues by recreating the pool when necessary.
        """
        # Check if pool is still valid
        if self._is_connected and self._pool and not self._is_pool_invalid():
            return
        
        # Close existing pool if it exists but is invalid
        if self._pool:
            try:
                await self._pool.close()
            except Exception as e:
                logger.warning(f"Error closing invalid pool: {e}")
            finally:
                self._pool = None
                self._is_connected = False
        
        # Lazy initialization of database URL
        if self.database_url is None:
            self.database_url = self._get_database_url()
        
        try:
            # Create asyncpg connection pool optimized for serverless
            self._pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,         # Minimum connections for serverless
                max_size=3,         # Smaller pool for serverless environments
                max_queries=50000,  # Max queries per connection
                max_inactive_connection_lifetime=300,  # 5 minutes
                server_settings={
                    "jit": "off"    # Disable JIT for better cold start performance
                }
            )
            
            self._is_connected = True
            logger.info("Database pool connected successfully for serverless")
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {str(e)}")
            self._is_connected = False
            raise
    
    def _is_pool_invalid(self) -> bool:
        """
        Check if the connection pool is invalid (closed or has event loop issues).
        
        Returns:
            bool: True if pool is invalid and needs recreation
        """
        if not self._pool:
            return True
        
        try:
            # Check if pool is closed
            if hasattr(self._pool, '_closed') and self._pool._closed:
                return True
            
            # Check if pool is still connected to the correct event loop
            import asyncio
            current_loop = asyncio.get_event_loop()
            if hasattr(self._pool, '_loop') and self._pool._loop != current_loop:
                return True
                
            return False
        except Exception as e:
            logger.warning(f"Error checking pool validity: {e}")
            return True
    
    async def disconnect(self) -> None:
        """
        Close database connection pool and cleanup resources.
        
        Should be called during application shutdown.
        """
        if self._pool and self._is_connected:
            try:
                await self._pool.close()
                self._is_connected = False
                logger.info("Database pool disconnected successfully")
            except Exception as e:
                logger.error(f"Error disconnecting from database: {str(e)}")
                raise
    
    @property
    def pool(self) -> asyncpg.Pool:
        """
        Get the database connection pool.
        
        Returns:
            asyncpg.Pool: Active database connection pool
            
        Raises:
            RuntimeError: If database is not connected
        """
        if not self._is_connected or not self._pool:
            raise RuntimeError(
                "Database not connected. Call connect() first or use get_database() dependency."
            )
        return self._pool
    
    @property
    def is_connected(self) -> bool:
        """Check if database pool is currently connected."""
        return self._is_connected and self._pool is not None
    
    async def health_check(self) -> bool:
        """
        Perform a health check on the database connection pool.
        
        Returns:
            bool: True if database is healthy, False otherwise
        """
        try:
            # Ensure we have a valid connection
            await self.connect()
            
            if not self._is_connected or not self._pool:
                logger.error("Health check failed: Pool not connected or None after connect attempt")
                return False
            
            # Simple query to test connection using pool
            async with self._pool.acquire() as connection:
                result = await connection.fetchval("SELECT 1")
                return result == 1
            
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            # Mark pool as invalid so it gets recreated next time
            self._is_connected = False
            return False
    
    async def fetch_one(self, query: str, values: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Fetch one row from the database.
        
        Args:
            query: SQL query to execute (using :param syntax for named parameters)
            values: Query parameters as dictionary
            
        Returns:
            Optional[Dict[str, Any]]: Query result or None
        """
        # Ensure we have a valid connection
        await self.connect()
        
        async with self._pool.acquire() as connection:
            # Convert named parameters to positional for asyncpg
            if values:
                # Replace :param with $1, $2, etc. and get ordered values
                converted_query, ordered_values = self._convert_named_params(query, values)
                result = await connection.fetchrow(converted_query, *ordered_values)
            else:
                result = await connection.fetchrow(query)
            
            if result:
                return dict(result)
            return None
    
    async def fetch_all(self, query: str, values: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Fetch all rows from the database.
        
        Args:
            query: SQL query to execute (using :param syntax for named parameters)
            values: Query parameters as dictionary
            
        Returns:
            List[Dict[str, Any]]: Query results
        """
        # Ensure we have a valid connection
        await self.connect()
        
        async with self._pool.acquire() as connection:
            # Convert named parameters to positional for asyncpg
            if values:
                converted_query, ordered_values = self._convert_named_params(query, values)
                results = await connection.fetch(converted_query, *ordered_values)
            else:
                results = await connection.fetch(query)
            
            return [dict(row) for row in results]
    
    async def execute(self, query: str, values: Optional[Dict[str, Any]] = None) -> str:
        """
        Execute a query without returning results.
        
        Args:
            query: SQL query to execute (using :param syntax for named parameters)
            values: Query parameters as dictionary
            
        Returns:
            str: Query execution status
        """
        # Ensure we have a valid connection
        await self.connect()
        
        async with self._pool.acquire() as connection:
            # Convert named parameters to positional for asyncpg
            if values:
                converted_query, ordered_values = self._convert_named_params(query, values)
                return await connection.execute(converted_query, *ordered_values)
            else:
                return await connection.execute(query)
    
    def _convert_named_params(self, query: str, values: Dict[str, Any]) -> tuple[str, list]:
        """
        Convert named parameters (:param) to positional parameters ($1, $2, etc.) for asyncpg.
        
        Args:
            query: SQL query with named parameters
            values: Dictionary of parameter values
            
        Returns:
            tuple: (converted_query, ordered_values_list)
        """
        import re
        
        # Find all named parameters in the query
        param_pattern = r':(\w+)'
        matches = re.findall(param_pattern, query)
        
        # Create ordered list of values and convert query
        ordered_values = []
        converted_query = query
        
        for i, param_name in enumerate(matches, 1):
            if param_name in values:
                ordered_values.append(values[param_name])
                converted_query = converted_query.replace(f':{param_name}', f'${i}', 1)
        
        return converted_query, ordered_values

# Global database manager instance
db_manager = DatabaseManager()

async def get_database() -> DatabaseManager:
    """
    FastAPI dependency to get database manager.
    
    This function ensures the database pool is connected and returns the manager
    instance for use in route handlers.
    
    Returns:
        DatabaseManager: Active database manager with connection pool
        
    Raises:
        RuntimeError: If database connection fails
    """
    if not db_manager.is_connected:
        await db_manager.connect()
    
    return db_manager

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
            await db_manager.execute(statement)
        
        logger.info(f"Migration {sql_file_path} executed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Migration {sql_file_path} failed: {str(e)}")
        return False