"""
Admin authentication dependencies for Recipe Reader API.

This module provides FastAPI dependencies for admin endpoint authentication
using X-Admin-Key header validation against environment variables.
"""

import os
from datetime import datetime, timezone
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
import logging

logger = logging.getLogger(__name__)

# Admin API Key header scheme
admin_key_header = APIKeyHeader(
    name="X-Admin-Key",
    description="Admin API key for administrative operations"
)

async def get_admin_from_key(admin_key: str = Security(admin_key_header)):
    """
    FastAPI dependency to authenticate admin users using admin API key.
    
    This dependency:
    1. Extracts admin key from X-Admin-Key header
    2. Validates the key against ADMIN_API_KEY environment variable
    3. Returns admin context for downstream use
    4. Logs admin operations for audit trail
    
    Args:
        admin_key: Admin API key from X-Admin-Key header
        
    Returns:
        dict: Admin context information
        
    Raises:
        HTTPException: 401 for missing key, 403 for invalid key
    """
    if not admin_key:
        logger.warning("Admin request missing X-Admin-Key header")
        raise HTTPException(
            status_code=401,
            detail={
                "error": "missing_admin_key",
                "message": "Missing Admin API Key. Include X-Admin-Key header in your request.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    # Get admin key from environment
    expected_admin_key = os.getenv("ADMIN_API_KEY")
    
    if not expected_admin_key:
        logger.error("ADMIN_API_KEY environment variable not configured")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "admin_service_misconfigured",
                "message": "Admin service is not properly configured. Please contact support.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    # Validate admin key
    if admin_key != expected_admin_key:
        logger.warning(f"Admin request with invalid admin key: {admin_key[:12]}...")
        raise HTTPException(
            status_code=403,
            detail={
                "error": "invalid_admin_key",
                "message": "Invalid Admin API Key. Please check your administrative credentials.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    # Log successful admin authentication
    logger.info("Authenticated admin request")
    
    return {
        "admin": True,
        "authenticated_at": datetime.now(timezone.utc).isoformat(),
        "key_prefix": admin_key[:8] + "..."
    }