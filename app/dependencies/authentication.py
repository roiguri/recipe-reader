"""
Authentication dependencies for Recipe Reader API.

This module provides FastAPI dependencies for API key authentication,
client validation, and usage tracking as specified in the multi-tenant
API requirements.
"""

from datetime import datetime, timezone
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
import logging

logger = logging.getLogger(__name__)

# API Key header scheme for client authentication
api_key_header = APIKeyHeader(
    name="X-API-Key",
    description="Client API key for recipe processing operations",
    scheme_name="ClientKey"
)

async def get_client_from_db(api_key: str = Security(api_key_header)):
    """
    FastAPI dependency to authenticate clients using API key from database.
    
    This dependency:
    1. Extracts API key from X-API-Key header
    2. Validates the key against the database
    3. Checks client active status
    4. Updates usage tracking (requests count and last_used_at)
    5. Returns client record for downstream use
    
    Args:
        api_key: API key from X-API-Key header
        
    Returns:
        dict: Client record from database
        
    Raises:
        HTTPException: 401 for missing key, 403 for invalid/inactive key
    """
    if not api_key:
        logger.warning("API request missing X-API-Key header")
        raise HTTPException(
            status_code=401,
            detail={
                "error": "missing_api_key",
                "message": "Missing API Key. Include X-API-Key header in your request.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    # Import here to avoid circular imports
    from app.database.connection import db_manager
    
    try:
        # Ensure database connection
        if not db_manager.is_connected:
            await db_manager.connect()
        
        # Look up client by API key
        query = """
            SELECT api_key, client_name, is_active, total_requests_this_month, 
                   master_rate_limit_per_minute, last_used_at, created_at
            FROM clients 
            WHERE api_key = :api_key
        """
        
        client_record = await db_manager.fetch_one(
            query=query, 
            values={"api_key": api_key}
        )
        
        if not client_record:
            logger.warning(f"API request with invalid API key: {api_key[:12]}...")
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "invalid_api_key",
                    "message": "Invalid API Key. Please check your authentication credentials.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Check if client is active
        if not client_record["is_active"]:
            logger.warning(f"API request from inactive client: {client_record['client_name']}")
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "inactive_client", 
                    "message": "API Key has been deactivated. Please contact support.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Update usage tracking
        update_query = """
            UPDATE clients SET 
                total_requests_this_month = total_requests_this_month + 1,
                last_used_at = NOW()
            WHERE api_key = :api_key
        """
        
        await db_manager.execute(
            query=update_query, 
            values={"api_key": api_key}
        )
        
        logger.info(f"Authenticated API request from client: {client_record['client_name']}")
        
        # Convert record to dict for easier access
        return dict(client_record)
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Database error during authentication: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "authentication_service_error",
                "message": "Authentication service temporarily unavailable. Please try again.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )