"""
Tests for audit logging service.

Tests the audit logging functionality for admin operations.
"""

import pytest
import json
import logging
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app.services.audit_logger import AuditLogger, AuditAction


class TestAuditLogger:
    """Test audit logging service."""

    @pytest.fixture
    def audit_logger(self):
        """Create audit logger instance for testing."""
        return AuditLogger()

    @pytest.fixture
    def mock_logger(self):
        """Mock the underlying logger."""
        with patch('app.services.audit_logger.logging.getLogger') as mock_get_logger:
            mock_logger = MagicMock()
            mock_get_logger.return_value = mock_logger
            yield mock_logger

    def test_audit_logger_initialization(self, audit_logger):
        """Test audit logger initializes correctly."""
        assert audit_logger.logger.name == "audit"
        assert audit_logger.logger.level == logging.INFO

    def test_log_admin_action_structure(self, audit_logger, mock_logger):
        """Test that admin actions are logged with correct structure."""
        audit_logger.logger = mock_logger
        
        audit_logger.log_admin_action(
            action=AuditAction.CLIENT_CREATED,
            admin_key_prefix="admin123",
            details={"test": "data"},
            resource_id="api_key_123",
            success=True
        )
        
        # Verify logging was called
        mock_logger.info.assert_called_once()
        
        # Parse the logged JSON
        logged_data = json.loads(mock_logger.info.call_args[0][0])
        
        # Verify structure
        assert logged_data["action"] == "client_created"
        assert logged_data["admin_key_prefix"] == "admin123"
        assert logged_data["success"] is True
        assert logged_data["resource_id"] == "api_key_123"
        assert logged_data["details"] == {"test": "data"}
        assert "timestamp" in logged_data

    def test_log_client_creation_success(self, audit_logger, mock_logger):
        """Test client creation audit logging."""
        audit_logger.logger = mock_logger
        
        audit_logger.log_client_creation(
            admin_key_prefix="admin123",
            client_name="Test Client",
            api_key_prefix="api_key_123",
            rate_limit=500,
            success=True
        )
        
        mock_logger.info.assert_called_once()
        logged_data = json.loads(mock_logger.info.call_args[0][0])
        
        assert logged_data["action"] == "client_created"
        assert logged_data["details"]["client_name"] == "Test Client"
        assert logged_data["details"]["api_key_prefix"] == "api_key_123"
        assert logged_data["details"]["rate_limit"] == 500
        assert logged_data["success"] is True

    def test_log_client_creation_failure(self, audit_logger, mock_logger):
        """Test client creation failure audit logging."""
        audit_logger.logger = mock_logger
        
        audit_logger.log_client_creation(
            admin_key_prefix="admin123",
            client_name="Failed Client",
            api_key_prefix="",
            rate_limit=500,
            success=False,
            error_message="Database error"
        )
        
        mock_logger.info.assert_called_once()
        logged_data = json.loads(mock_logger.info.call_args[0][0])
        
        assert logged_data["success"] is False
        assert logged_data["error"] == "Database error"

    def test_log_client_status_change(self, audit_logger, mock_logger):
        """Test client status change audit logging."""
        audit_logger.logger = mock_logger
        
        audit_logger.log_client_status_change(
            admin_key_prefix="admin123",
            api_key_prefix="api_key_123",
            action=AuditAction.CLIENT_DEACTIVATED,
            success=True
        )
        
        mock_logger.info.assert_called_once()
        logged_data = json.loads(mock_logger.info.call_args[0][0])
        
        assert logged_data["action"] == "client_deactivated"
        assert logged_data["resource_id"] == "api_key_123"

    def test_log_data_access(self, audit_logger, mock_logger):
        """Test data access audit logging."""
        audit_logger.logger = mock_logger
        
        audit_logger.log_data_access(
            admin_key_prefix="admin123",
            action=AuditAction.USAGE_STATS_ACCESSED,
            details={"client_count": 5, "total_requests": 1000}
        )
        
        mock_logger.info.assert_called_once()
        logged_data = json.loads(mock_logger.info.call_args[0][0])
        
        assert logged_data["action"] == "usage_stats_accessed"
        assert logged_data["details"]["client_count"] == 5
        assert logged_data["details"]["total_requests"] == 1000

    def test_audit_action_enum_values(self):
        """Test that audit action enum has expected values."""
        expected_actions = {
            "client_created",
            "client_updated", 
            "client_deactivated",
            "client_reactivated",
            "usage_stats_accessed",
            "client_list_accessed"
        }
        
        actual_actions = {action.value for action in AuditAction}
        assert actual_actions == expected_actions

    def test_timestamp_format(self, audit_logger, mock_logger):
        """Test that timestamps are in ISO format."""
        audit_logger.logger = mock_logger
        
        audit_logger.log_admin_action(
            action=AuditAction.CLIENT_CREATED,
            admin_key_prefix="admin123"
        )
        
        logged_data = json.loads(mock_logger.info.call_args[0][0])
        timestamp_str = logged_data["timestamp"]
        
        # Should be able to parse as ISO format
        parsed_timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        assert isinstance(parsed_timestamp, datetime)