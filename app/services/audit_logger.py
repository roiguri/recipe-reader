"""
Simple audit logging service for admin operations.

This module provides lightweight audit logging for tracking admin activities
without complex database storage - uses structured logging for simplicity.
"""

import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from enum import Enum

class AuditAction(Enum):
    """Enumeration of auditable admin actions."""
    CLIENT_CREATED = "client_created"
    CLIENT_UPDATED = "client_updated"
    CLIENT_DEACTIVATED = "client_deactivated"
    CLIENT_REACTIVATED = "client_reactivated"
    USAGE_STATS_ACCESSED = "usage_stats_accessed"
    CLIENT_LIST_ACCESSED = "client_list_accessed"

class AuditLogger:
    """
    Simple audit logger that outputs structured logs.
    
    Uses Python's logging framework with structured JSON output
    for easy parsing and monitoring.
    """
    
    def __init__(self):
        """Initialize audit logger with structured formatter."""
        self.logger = logging.getLogger("audit")
        self.logger.setLevel(logging.INFO)
        
        # Define sensitive field patterns to filter from logs
        self.sensitive_fields = {
            'password', 'token', 'secret', 'key', 'api_key', 
            'auth', 'credential', 'private', 'sensitive'
        }
        
        # Only add handler if not already configured
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setLevel(logging.INFO)
            
            # Simple format for easy parsing
            formatter = logging.Formatter(
                '%(asctime)s - AUDIT - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def _filter_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter sensitive data from details dictionary.
        
        Args:
            data: Dictionary that may contain sensitive fields
            
        Returns:
            Filtered dictionary with sensitive values masked
        """
        if not isinstance(data, dict):
            return data
            
        filtered_data = {}
        
        for key, value in data.items():
            key_lower = key.lower()
            
            # Check if key contains any sensitive patterns
            is_sensitive = any(pattern in key_lower for pattern in self.sensitive_fields)
            
            if is_sensitive:
                # Mask sensitive values
                if isinstance(value, str) and len(value) > 4:
                    filtered_data[key] = f"{value[:4]}***"
                else:
                    filtered_data[key] = "***"
            elif isinstance(value, dict):
                # Recursively filter nested dictionaries
                filtered_data[key] = self._filter_sensitive_data(value)
            else:
                # Keep non-sensitive values as-is
                filtered_data[key] = value
                
        return filtered_data
    
    def log_admin_action(
        self,
        action: AuditAction,
        admin_key_prefix: str,
        details: Optional[Dict[str, Any]] = None,
        resource_id: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """
        Log an admin action with structured data.
        
        Args:
            action: The action performed
            admin_key_prefix: Truncated admin key for identification
            details: Additional action details
            resource_id: ID of affected resource (e.g., client API key)
            success: Whether the action succeeded
            error_message: Error message if action failed
        """
        # Filter sensitive data from details before logging
        filtered_details = self._filter_sensitive_data(details or {})
        
        audit_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action.value,
            "admin_key_prefix": admin_key_prefix,
            "success": success,
            "resource_id": resource_id,
            "details": filtered_details,
        }
        
        if not success and error_message:
            audit_data["error"] = error_message
        
        # Log as structured JSON for easy parsing
        self.logger.info(json.dumps(audit_data))
    
    def log_client_creation(
        self,
        admin_key_prefix: str,
        client_name: str,
        api_key_prefix: str,
        rate_limit: int,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Log client creation with specific details."""
        details = {
            "client_name": client_name,
            "api_key_prefix": api_key_prefix,
            "rate_limit": rate_limit
        }
        
        self.log_admin_action(
            action=AuditAction.CLIENT_CREATED,
            admin_key_prefix=admin_key_prefix,
            details=details,
            resource_id=api_key_prefix,
            success=success,
            error_message=error_message
        )
    
    def log_client_status_change(
        self,
        admin_key_prefix: str,
        api_key_prefix: str,
        action: AuditAction,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Log client status changes (activate/deactivate)."""
        self.log_admin_action(
            action=action,
            admin_key_prefix=admin_key_prefix,
            resource_id=api_key_prefix,
            success=success,
            error_message=error_message
        )
    
    def log_data_access(
        self,
        admin_key_prefix: str,
        action: AuditAction,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log data access operations (list clients, usage stats)."""
        self.log_admin_action(
            action=action,
            admin_key_prefix=admin_key_prefix,
            details=details or {},
            success=True
        )

# Global audit logger instance
audit_logger = AuditLogger()