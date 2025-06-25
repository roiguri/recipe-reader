"""
Admin security middleware and utilities for Recipe Reader API.

This module provides security enhancements for admin endpoints including
rate limiting, input sanitization, and secure header management.
"""

import re
import time
from collections import defaultdict
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, Request, Response
import logging

logger = logging.getLogger(__name__)

# Simple in-memory rate limiter for admin operations
class AdminRateLimiter:
    """
    Simple rate limiter for admin operations.
    Tracks requests per IP address with configurable limits.
    """
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        """
        Initialize rate limiter.
        
        Args:
            max_requests: Maximum requests allowed per window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)
    
    def is_allowed(self, client_ip: str) -> bool:
        """
        Check if request is allowed for given client IP.
        
        Args:
            client_ip: Client IP address
            
        Returns:
            bool: True if request is allowed, False if rate limited
        """
        now = time.time()
        
        # Clean old requests outside the window
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < self.window_seconds
        ]
        
        # Check if within rate limit
        if len(self.requests[client_ip]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[client_ip].append(now)
        return True
    
    def get_remaining_requests(self, client_ip: str) -> int:
        """Get remaining requests for client IP."""
        now = time.time()
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < self.window_seconds
        ]
        return max(0, self.max_requests - len(self.requests[client_ip]))

# Global rate limiter instance for admin operations
admin_rate_limiter = AdminRateLimiter(max_requests=30, window_seconds=300)  # 30 requests per 5 minutes

def get_client_ip(request: Request) -> str:
    """
    Extract client IP address from request, handling proxies.
    
    Args:
        request: FastAPI request object
        
    Returns:
        str: Client IP address
    """
    # Check for forwarded IP headers (common in production deployments)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain (original client)
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fallback to direct client IP
    return request.client.host if request.client else "unknown"

def check_admin_rate_limit(request: Request) -> None:
    """
    Check rate limit for admin operations.
    
    Args:
        request: FastAPI request object
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    client_ip = get_client_ip(request)
    
    if not admin_rate_limiter.is_allowed(client_ip):
        remaining = admin_rate_limiter.get_remaining_requests(client_ip)
        logger.warning(f"Admin rate limit exceeded for IP: {client_ip}")
        
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limit_exceeded",
                "message": "Too many admin requests. Please wait before trying again.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "retry_after": admin_rate_limiter.window_seconds
            },
            headers={"Retry-After": str(admin_rate_limiter.window_seconds)}
        )

def sanitize_client_name(client_name: str) -> str:
    """
    Sanitize client name input to prevent injection attacks.
    
    Args:
        client_name: Raw client name input
        
    Returns:
        str: Sanitized client name
        
    Raises:
        ValueError: If client name is invalid
    """
    if not client_name or not client_name.strip():
        raise ValueError("Client name cannot be empty")
    
    # Remove leading/trailing whitespace
    sanitized = client_name.strip()
    
    # Check length constraints
    if len(sanitized) < 1:
        raise ValueError("Client name cannot be empty")
    if len(sanitized) > 255:
        raise ValueError("Client name cannot exceed 255 characters")
    
    # Allow alphanumeric, spaces, hyphens, underscores, and dots
    if not re.match(r"^[a-zA-Z0-9\s\-_.]+$", sanitized):
        raise ValueError("Client name contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, and dots are allowed")
    
    # Prevent excessive consecutive spaces/special chars
    if re.search(r"[\s\-_.]{3,}", sanitized):
        raise ValueError("Client name cannot contain excessive consecutive spaces or special characters")
    
    return sanitized

def validate_rate_limit(rate_limit: Optional[int]) -> int:
    """
    Validate and sanitize rate limit input.
    
    Args:
        rate_limit: Raw rate limit input
        
    Returns:
        int: Validated rate limit
        
    Raises:
        ValueError: If rate limit is invalid
    """
    if rate_limit is None:
        return 500  # Default rate limit
    
    if not isinstance(rate_limit, int):
        raise ValueError("Rate limit must be an integer")
    
    if rate_limit < 1:
        raise ValueError("Rate limit must be at least 1 request per minute")
    
    if rate_limit > 10000:
        raise ValueError("Rate limit cannot exceed 10,000 requests per minute")
    
    return rate_limit

def validate_api_key_format(api_key: str, strict_length: bool = True) -> None:
    """
    Validate API key format for security.
    
    Args:
        api_key: API key to validate
        strict_length: Whether to enforce strict 48-character length (False for testing)
        
    Raises:
        ValueError: If API key format is invalid
    """
    if not api_key or not api_key.strip():
        raise ValueError("API key cannot be empty")
    
    # Check minimum length for security (allow shorter keys in test environment)
    if strict_length and len(api_key) != 48:
        raise ValueError("API key must be exactly 48 characters long")
    elif not strict_length and len(api_key) < 16:
        raise ValueError("API key must be at least 16 characters long")
    
    # Check if it contains valid characters (allow alphanumeric and hyphens for test keys)
    if strict_length:
        # Production: only hexadecimal
        if not re.match(r"^[a-fA-F0-9]+$", api_key):
            raise ValueError("API key must contain only hexadecimal characters")
    else:
        # Testing: allow alphanumeric and hyphens
        if not re.match(r"^[a-fA-F0-9\-]+$", api_key):
            raise ValueError("API key must contain only valid characters")

def add_security_headers(response: Response) -> None:
    """
    Add security headers to admin endpoint responses.
    
    Args:
        response: FastAPI response object
    """
    # Prevent caching of sensitive admin data
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    # Content security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Prevent information leakage
    response.headers["Server"] = "Recipe-API"
    
    # HSTS for HTTPS deployments (will be ignored on HTTP)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

def log_admin_operation(
    operation: str,
    client_ip: str,
    admin_key_prefix: str,
    details: Optional[Dict[str, Any]] = None,
    success: bool = True
) -> None:
    """
    Log admin operations for security monitoring.
    
    Args:
        operation: Operation being performed
        client_ip: Client IP address
        admin_key_prefix: Admin key prefix for identification
        details: Additional operation details
        success: Whether operation was successful
    """
    log_data = {
        "operation": operation,
        "client_ip": client_ip,
        "admin_key_prefix": admin_key_prefix,
        "success": success,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if details:
        log_data["details"] = details
    
    if success:
        logger.info(f"Admin operation successful: {operation}", extra=log_data)
    else:
        logger.warning(f"Admin operation failed: {operation}", extra=log_data)