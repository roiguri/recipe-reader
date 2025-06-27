-- Recipe Reader API - Multi-Tenant Database Schema
-- This schema supports API key authentication and usage tracking for multiple clients

-- Client management table for API key authentication and usage tracking
CREATE TABLE IF NOT EXISTS clients (
    -- Primary key: API key serves as unique identifier for each client
    api_key TEXT PRIMARY KEY,
    
    -- Client identification and metadata
    client_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Usage tracking for monitoring and potential rate limiting
    total_requests_this_month BIGINT DEFAULT 0 NOT NULL,
    master_rate_limit_per_minute INTEGER DEFAULT 500 NOT NULL,
    
    -- Timestamps for usage patterns and client lifecycle management
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for efficient lookup by client name (admin queries)
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);

-- Index for active client lookups (performance optimization)
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active) WHERE is_active = TRUE;

-- Index for usage tracking queries (analytics)
CREATE INDEX IF NOT EXISTS idx_clients_last_used ON clients(last_used_at);

-- Index for request count queries (monitoring)
CREATE INDEX IF NOT EXISTS idx_clients_requests ON clients(total_requests_this_month);

-- Comments for documentation
COMMENT ON TABLE clients IS 'Client management table for multi-tenant API access control and usage tracking';
COMMENT ON COLUMN clients.api_key IS 'Unique API key serving as client identifier and authentication token';
COMMENT ON COLUMN clients.client_name IS 'Human-readable client name for identification and management';
COMMENT ON COLUMN clients.is_active IS 'Flag to enable/disable client access without deleting records';
COMMENT ON COLUMN clients.total_requests_this_month IS 'Running count of API requests for current month';
COMMENT ON COLUMN clients.master_rate_limit_per_minute IS 'Rate limit threshold per minute for this client';
COMMENT ON COLUMN clients.last_used_at IS 'Timestamp of most recent API request for usage tracking';
COMMENT ON COLUMN clients.created_at IS 'Client creation timestamp for lifecycle management';