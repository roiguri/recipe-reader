"""
Admin router for Recipe Reader API.

This module provides administrative endpoints for client management,
API key generation, and system monitoring.
"""

import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import logging

from ..dependencies.admin_auth import get_admin_from_key
from ..database.connection import db_manager
from ..services.audit_logger import audit_logger, AuditAction

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(get_admin_from_key)],
    responses={
        401: {"description": "Missing admin key"},
        403: {"description": "Invalid admin key"},
        500: {"description": "Admin service error"}
    }
)

# Request/Response models
class CreateClientRequest(BaseModel):
    client_name: str
    rate_limit: Optional[int] = 500
    
    class Config:
        # Add validation examples for OpenAPI docs
        schema_extra = {
            "example": {
                "client_name": "My Application",
                "rate_limit": 500
            }
        }

class ClientResponse(BaseModel):
    api_key: str
    client_name: str
    is_active: bool
    total_requests_this_month: int
    master_rate_limit_per_minute: int
    last_used_at: Optional[str]
    created_at: str

class CreateClientResponse(BaseModel):
    api_key: str
    client_name: str
    message: str
    created_at: str

class ClientStatusUpdate(BaseModel):
    is_active: bool

class DeleteClientResponse(BaseModel):
    message: str
    client_name: str
    api_key_hash: str
    timestamp: str

@router.post("/create-client", response_model=CreateClientResponse)
async def create_client(
    request: CreateClientRequest,
    admin_context: dict = Depends(get_admin_from_key)
):
    """
    Create a new API client with generated API key.
    
    - **client_name**: Human-readable name for the client
    - **rate_limit**: Rate limit per minute (default: 500)
    
    Returns the generated API key and client information.
    """
    try:
        # Validate input
        if not request.client_name or not request.client_name.strip():
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_client_name",
                    "message": "Client name cannot be empty.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        if request.rate_limit is not None and (request.rate_limit < 1 or request.rate_limit > 10000):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_rate_limit",
                    "message": "Rate limit must be between 1 and 10000 requests per minute.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Ensure database connection
        if not db_manager.is_connected:
            await db_manager.connect()
        
        # Check if client name already exists
        name_check_query = "SELECT COUNT(*) as count FROM clients WHERE client_name = :client_name"
        name_exists = await db_manager.database.fetch_one(
            query=name_check_query,
            values={"client_name": request.client_name.strip()}
        )
        
        # Handle different ways COUNT results might be returned
        count_value = 0
        if name_exists:
            if hasattr(name_exists, 'get'):
                count_value = name_exists.get("count", 0) or name_exists.get(0, 0)
            elif hasattr(name_exists, '__getitem__'):
                try:
                    count_value = name_exists["count"]
                except (KeyError, TypeError):
                    try:
                        count_value = name_exists[0]  # May be returned as tuple/list
                    except (IndexError, TypeError):
                        count_value = 0
        
        if count_value > 0:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "client_name_exists",
                    "message": "Client with this name already exists.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Generate secure API key
        api_key = secrets.token_hex(24)  # 48-character secure key
        
        # Insert new client
        query = """
            INSERT INTO clients (api_key, client_name, master_rate_limit_per_minute)
            VALUES (:api_key, :client_name, :rate_limit)
            RETURNING api_key, client_name, created_at
        """
        
        result = await db_manager.database.fetch_one(
            query=query,
            values={
                "api_key": api_key,
                "client_name": request.client_name.strip(),
                "rate_limit": request.rate_limit or 500
            }
        )
        
        if not result:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "client_creation_failed",
                    "message": "Failed to create client. Please try again.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Audit log successful client creation
        audit_logger.log_client_creation(
            admin_key_prefix=admin_context.get("key_prefix", "unknown"),
            client_name=request.client_name.strip(),
            api_key_prefix=api_key[:8],
            rate_limit=request.rate_limit or 500,
            success=True
        )
        
        return CreateClientResponse(
            api_key=result["api_key"],
            client_name=result["client_name"],
            message="Client created successfully",
            created_at=result["created_at"].isoformat()
        )
        
    except HTTPException:
        # Audit log failed client creation
        audit_logger.log_client_creation(
            admin_key_prefix=admin_context.get("key_prefix", "unknown"),
            client_name=request.client_name,
            api_key_prefix="",
            rate_limit=request.rate_limit or 500,
            success=False,
            error_message="Client creation failed due to validation error"
        )
        raise
    except Exception as e:
        logger.error(f"Error creating client: {str(e)}")
        # Audit log failed client creation
        audit_logger.log_client_creation(
            admin_key_prefix=admin_context.get("key_prefix", "unknown"),
            client_name=request.client_name,
            api_key_prefix="",
            rate_limit=request.rate_limit or 500,
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail={
                "error": "admin_operation_failed",
                "message": "Failed to create client due to internal error.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.get("/clients", response_model=List[ClientResponse])
async def list_clients(
    include_inactive: bool = False,
    admin_context: dict = Depends(get_admin_from_key)
):
    """
    List all API clients.
    
    - **include_inactive**: Include inactive clients in results (default: False)
    
    Returns list of all clients with their status and usage information.
    """
    try:
        # Ensure database connection
        if not db_manager.is_connected:
            await db_manager.connect()
        
        # Build query based on filter
        if include_inactive:
            query = """
                SELECT api_key, client_name, is_active, total_requests_this_month,
                       master_rate_limit_per_minute, last_used_at, created_at
                FROM clients 
                ORDER BY created_at DESC
            """
        else:
            query = """
                SELECT api_key, client_name, is_active, total_requests_this_month,
                       master_rate_limit_per_minute, last_used_at, created_at
                FROM clients 
                WHERE is_active = TRUE
                ORDER BY created_at DESC
            """
        
        results = await db_manager.database.fetch_all(query=query)
        
        # Convert to response format
        clients = []
        for result in results:
            clients.append(ClientResponse(
                api_key=result["api_key"],
                client_name=result["client_name"],
                is_active=result["is_active"],
                total_requests_this_month=result["total_requests_this_month"],
                master_rate_limit_per_minute=result["master_rate_limit_per_minute"],
                last_used_at=result["last_used_at"].isoformat() if result["last_used_at"] else None,
                created_at=result["created_at"].isoformat()
            ))
        
        # Audit log client list access
        audit_logger.log_data_access(
            admin_key_prefix=admin_context.get("key_prefix", "unknown"),
            action=AuditAction.CLIENT_LIST_ACCESSED,
            details={
                "client_count": len(clients),
                "include_inactive": include_inactive
            }
        )
        
        return clients
        
    except Exception as e:
        logger.error(f"Error listing clients: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "admin_operation_failed",
                "message": "Failed to retrieve client list.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.get("/clients/{api_key}", response_model=ClientResponse)
async def get_client(
    api_key: str,
    admin_context: dict = Depends(get_admin_from_key)
):
    """
    Get detailed information about a specific client.
    
    - **api_key**: The API key of the client to retrieve
    
    Returns detailed client information including usage statistics.
    """
    try:
        # Ensure database connection
        if not db_manager.is_connected:
            await db_manager.connect()
        
        # Get client information
        query = """
            SELECT api_key, client_name, is_active, total_requests_this_month,
                   master_rate_limit_per_minute, last_used_at, created_at
            FROM clients 
            WHERE api_key = :api_key
        """
        
        result = await db_manager.database.fetch_one(
            query=query,
            values={"api_key": api_key}
        )
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "client_not_found",
                    "message": "Client with specified API key not found.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        logger.info(f"Admin retrieved client info: {result['client_name']}")
        
        return ClientResponse(
            api_key=result["api_key"],
            client_name=result["client_name"],
            is_active=result["is_active"],
            total_requests_this_month=result["total_requests_this_month"],
            master_rate_limit_per_minute=result["master_rate_limit_per_minute"],
            last_used_at=result["last_used_at"].isoformat() if result["last_used_at"] else None,
            created_at=result["created_at"].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving client: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "admin_operation_failed",
                "message": "Failed to retrieve client information.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.patch("/clients/{api_key}/status")
async def update_client_status(
    api_key: str,
    status_update: ClientStatusUpdate,
    admin_context: dict = Depends(get_admin_from_key)
):
    """
    Update client active status.
    
    - **api_key**: The API key of the client to update
    - **is_active**: New active status for the client
    
    Activates or deactivates a client's API access.
    """
    try:
        # Ensure database connection
        if not db_manager.is_connected:
            await db_manager.connect()
        
        # Update client status
        query = """
            UPDATE clients 
            SET is_active = :is_active
            WHERE api_key = :api_key
            RETURNING api_key, client_name, is_active
        """
        
        result = await db_manager.database.fetch_one(
            query=query,
            values={
                "api_key": api_key,
                "is_active": status_update.is_active
            }
        )
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "client_not_found",
                    "message": f"Client with API key not found.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Audit log client status change
        status_text = "activated" if status_update.is_active else "deactivated"
        audit_action = AuditAction.CLIENT_REACTIVATED if status_update.is_active else AuditAction.CLIENT_DEACTIVATED
        
        audit_logger.log_client_status_change(
            admin_key_prefix=admin_context.get("key_prefix", "unknown"),
            api_key_prefix=api_key[:8],
            action=audit_action,
            success=True
        )
        
        return {
            "message": f"Client {status_text} successfully",
            "client_name": result["client_name"],
            "is_active": result["is_active"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "admin_operation_failed",
                "message": "Failed to update client status.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.get("/usage-stats")
async def get_usage_statistics(
    admin_context: dict = Depends(get_admin_from_key)
):
    """
    Get overall API usage statistics.
    
    Returns aggregated usage data across all clients.
    """
    try:
        # Ensure database connection
        if not db_manager.is_connected:
            await db_manager.connect()
        
        # Get usage statistics
        query = """
            SELECT 
                COUNT(*) as total_clients,
                COUNT(*) FILTER (WHERE is_active = TRUE) as active_clients,
                COALESCE(SUM(total_requests_this_month), 0) as total_requests_this_month,
                COALESCE(AVG(total_requests_this_month), 0) as avg_requests_per_client,
                MAX(last_used_at) as last_activity
            FROM clients
        """
        
        result = await db_manager.database.fetch_one(query=query)
        
        # Audit log usage statistics access
        audit_logger.log_data_access(
            admin_key_prefix=admin_context.get("key_prefix", "unknown"),
            action=AuditAction.USAGE_STATS_ACCESSED,
            details={
                "total_clients": result["total_clients"],
                "active_clients": result["active_clients"],
                "total_requests": result["total_requests_this_month"]
            }
        )
        
        return {
            "total_clients": result["total_clients"],
            "active_clients": result["active_clients"],
            "inactive_clients": result["total_clients"] - result["active_clients"],
            "total_requests_this_month": result["total_requests_this_month"],
            "avg_requests_per_client": round(result["avg_requests_per_client"], 2),
            "last_activity": result["last_activity"].isoformat() if result["last_activity"] else None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting usage statistics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "admin_operation_failed",
                "message": "Failed to retrieve usage statistics.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.delete("/clients/{api_key}", response_model=DeleteClientResponse)
async def delete_client(
    api_key: str,
    admin_context: dict = Depends(get_admin_from_key)
):
    """
    Delete a client and all associated data.
    
    - **api_key**: The API key of the client to delete
    
    Permanently removes the client from the system.
    WARNING: This action cannot be undone.
    """
    try:
        # Ensure database connection
        if not db_manager.is_connected:
            await db_manager.connect()
        
        # First, get client info for logging before deletion
        check_query = "SELECT client_name FROM clients WHERE api_key = :api_key"
        client_record = await db_manager.database.fetch_one(
            query=check_query,
            values={"api_key": api_key}
        )
        
        if not client_record:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "client_not_found",
                    "message": "Client with specified API key not found.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Delete the client
        delete_query = """
            DELETE FROM clients 
            WHERE api_key = :api_key
            RETURNING client_name
        """
        
        result = await db_manager.database.fetch_one(
            query=delete_query,
            values={"api_key": api_key}
        )
        
        if not result:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "deletion_failed",
                    "message": "Failed to delete client. Please try again.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Create hash for audit trail (don't log the actual key)
        import hashlib
        api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:16]
        
        # Log admin operation
        logger.info(f"Admin deleted client: {client_record['client_name']} (key hash: {api_key_hash})")
        
        return DeleteClientResponse(
            message="Client deleted successfully",
            client_name=client_record["client_name"],
            api_key_hash=api_key_hash,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "admin_operation_failed",
                "message": "Failed to delete client due to internal error.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )