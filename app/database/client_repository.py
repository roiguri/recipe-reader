"""
Client repository for managing API clients in the database.

This module provides CRUD operations for the clients table,
handling API key authentication and usage tracking.
"""

import secrets
from datetime import datetime
from typing import Optional, Dict, Any, List
from databases import Database
import logging

logger = logging.getLogger(__name__)

class ClientRepository:
    """
    Repository class for client database operations.
    
    Handles all database interactions related to client management,
    including authentication, usage tracking, and client lifecycle.
    """
    
    def __init__(self, database: Database):
        """
        Initialize client repository with database connection.
        
        Args:
            database: Active database connection
        """
        self.database = database
    
    async def create_client(self, client_name: str, rate_limit: int = 500) -> Dict[str, Any]:
        """
        Create a new API client with generated API key.
        
        Args:
            client_name: Human-readable name for the client
            rate_limit: Rate limit per minute for this client
            
        Returns:
            Dict containing client data including generated API key
            
        Raises:
            Exception: If client creation fails
        """
        try:
            # Generate secure API key
            api_key = secrets.token_hex(24)  # 48-character hex string
            
            query = """
                INSERT INTO clients (api_key, client_name, master_rate_limit_per_minute)
                VALUES (:api_key, :client_name, :rate_limit)
                RETURNING api_key, client_name, is_active, total_requests_this_month, 
                         master_rate_limit_per_minute, created_at
            """
            
            result = await self.database.fetch_one(
                query=query,
                values={
                    "api_key": api_key,
                    "client_name": client_name,
                    "rate_limit": rate_limit
                }
            )
            
            if result:
                logger.info(f"Created new client: {client_name} with API key: {api_key[:8]}...")
                return dict(result)
            else:
                raise Exception("Failed to create client - no result returned")
                
        except Exception as e:
            logger.error(f"Error creating client {client_name}: {str(e)}")
            raise
    
    async def get_client_by_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve client information by API key.
        
        Args:
            api_key: The API key to look up
            
        Returns:
            Dict containing client data if found, None otherwise
        """
        try:
            query = """
                SELECT api_key, client_name, is_active, total_requests_this_month,
                       master_rate_limit_per_minute, last_used_at, created_at
                FROM clients 
                WHERE api_key = :api_key
            """
            
            result = await self.database.fetch_one(
                query=query,
                values={"api_key": api_key}
            )
            
            return dict(result) if result else None
            
        except Exception as e:
            logger.error(f"Error fetching client by API key: {str(e)}")
            return None
    
    async def update_client_usage(self, api_key: str) -> bool:
        """
        Update client usage statistics and last used timestamp.
        
        Args:
            api_key: The API key of the client to update
            
        Returns:
            bool: True if update successful, False otherwise
        """
        try:
            query = """
                UPDATE clients SET 
                    total_requests_this_month = total_requests_this_month + 1,
                    last_used_at = NOW()
                WHERE api_key = :api_key AND is_active = TRUE
                RETURNING api_key
            """
            
            result = await self.database.fetch_one(
                query=query,
                values={"api_key": api_key}
            )
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Error updating client usage for API key: {str(e)}")
            return False
    
    async def get_all_clients(self, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """
        Retrieve all clients from the database.
        
        Args:
            include_inactive: Whether to include inactive clients
            
        Returns:
            List of client dictionaries
        """
        try:
            if include_inactive:
                query = """
                    SELECT api_key, client_name, is_active, total_requests_this_month,
                           master_rate_limit_per_minute, last_used_at, created_at
                    FROM clients 
                    ORDER BY created_at DESC
                """
                values = {}
            else:
                query = """
                    SELECT api_key, client_name, is_active, total_requests_this_month,
                           master_rate_limit_per_minute, last_used_at, created_at
                    FROM clients 
                    WHERE is_active = TRUE
                    ORDER BY created_at DESC
                """
                values = {}
            
            results = await self.database.fetch_all(query=query, values=values)
            return [dict(result) for result in results]
            
        except Exception as e:
            logger.error(f"Error fetching all clients: {str(e)}")
            return []
    
    async def deactivate_client(self, api_key: str) -> bool:
        """
        Deactivate a client (soft delete).
        
        Args:
            api_key: The API key of the client to deactivate
            
        Returns:
            bool: True if deactivation successful, False otherwise
        """
        try:
            query = """
                UPDATE clients SET is_active = FALSE
                WHERE api_key = :api_key
                RETURNING api_key
            """
            
            result = await self.database.fetch_one(
                query=query,
                values={"api_key": api_key}
            )
            
            if result:
                logger.info(f"Deactivated client with API key: {api_key[:8]}...")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error deactivating client: {str(e)}")
            return False
    
    async def reactivate_client(self, api_key: str) -> bool:
        """
        Reactivate a client.
        
        Args:
            api_key: The API key of the client to reactivate
            
        Returns:
            bool: True if reactivation successful, False otherwise
        """
        try:
            query = """
                UPDATE clients SET is_active = TRUE
                WHERE api_key = :api_key
                RETURNING api_key
            """
            
            result = await self.database.fetch_one(
                query=query,
                values={"api_key": api_key}
            )
            
            if result:
                logger.info(f"Reactivated client with API key: {api_key[:8]}...")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error reactivating client: {str(e)}")
            return False
    
    async def reset_monthly_usage(self, api_key: Optional[str] = None) -> int:
        """
        Reset monthly usage counters for clients.
        
        Args:
            api_key: If provided, reset only this client. Otherwise reset all clients.
            
        Returns:
            int: Number of clients updated
        """
        try:
            if api_key:
                query = """
                    UPDATE clients SET total_requests_this_month = 0
                    WHERE api_key = :api_key
                """
                values = {"api_key": api_key}
            else:
                query = "UPDATE clients SET total_requests_this_month = 0"
                values = {}
            
            result = await self.database.execute(query=query, values=values)
            logger.info(f"Reset monthly usage for {result} clients")
            return result
            
        except Exception as e:
            logger.error(f"Error resetting monthly usage: {str(e)}")
            return 0
    
    async def get_usage_stats(self) -> Dict[str, Any]:
        """
        Get overall usage statistics across all clients.
        
        Returns:
            Dict containing usage statistics
        """
        try:
            query = """
                SELECT 
                    COUNT(*) as total_clients,
                    COUNT(*) FILTER (WHERE is_active = TRUE) as active_clients,
                    SUM(total_requests_this_month) as total_requests_this_month,
                    AVG(total_requests_this_month) as avg_requests_per_client,
                    MAX(last_used_at) as last_activity
                FROM clients
            """
            
            result = await self.database.fetch_one(query=query)
            return dict(result) if result else {}
            
        except Exception as e:
            logger.error(f"Error fetching usage stats: {str(e)}")
            return {}