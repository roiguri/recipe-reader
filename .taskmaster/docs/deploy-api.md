# Multi-Tenant Recipe Reader API - Product Requirements Document

## Overview

The Recipe Reader application currently operates as a single-instance API without client authentication or usage tracking. This creates challenges for scaling to multiple applications and monitoring API usage across different client integrations.

This feature transforms the existing recipe-reader project into a secure, scalable, multi-tenant API platform ready for public consumption. The solution enables multiple client applications to securely access recipe processing services through API key authentication while maintaining backward compatibility with existing functionality.

The solution addresses pain points for both API providers (lack of usage visibility and client management) and API consumers (unclear access patterns and rate limiting), while laying groundwork for future features like usage analytics, tiered pricing, and enhanced monitoring.

## Core Features

### Multi-Client Authentication System
- Replace open API access with secure API key-based authentication
- Implement database-driven client management with usage tracking
- Provide automated client onboarding through admin endpoints
- Maintain backward compatibility for existing API consumers

### Usage Tracking and Analytics
- Track API requests per client with monthly aggregation
- Record client activity timestamps for engagement monitoring
- Enable foundation for future rate limiting and usage analytics
- Provide admin visibility into API consumption patterns

### Enhanced Security and Error Handling
- Standardized error responses with consistent formatting
- Secure API key generation using cryptographic methods
- Proper HTTP status codes and error messaging
- Basic request logging for monitoring and debugging

### Client Management Infrastructure
- Admin interface for creating and managing API clients
- Database schema supporting client metadata and usage history
- Automated API key generation with secure distribution
- Foundation for future self-service client portals

# Technical Architecture

## Backend Components

### Database Schema Design
```sql
CREATE TABLE clients (
    api_key TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    total_requests_this_month BIGINT DEFAULT 0 NOT NULL,
    master_rate_limit_per_minute INTEGER DEFAULT 500 NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Authentication Service
- Database-backed API key validation with real-time client status checking
- Automatic usage tracking and timestamp updates per request
- Secure authentication dependency injection across all protected endpoints
- Standardized error responses for authentication failures

### Admin Management Layer
- Secure admin endpoints for client creation and management
- Automated API key generation using `secrets.token_hex(24)` for cryptographic security
- Admin authentication through separate admin API key mechanism
- Request logging for audit trail of administrative actions

## API Layer Updates

### Protected Endpoint Architecture
```python
# All recipe endpoints protected with authentication dependency
app.include_router(
    recipe.router,
    prefix="/api/v1",
    dependencies=[Depends(get_client_from_db)]
)
```

### Enhanced Error Response Format
```json
{
    "error": "error_code",
    "message": "Human readable message", 
    "timestamp": "2024-01-15T10:30:00Z"
}
```

### Usage Tracking Integration
- Automatic request counting per authenticated client
- Last usage timestamp updates for engagement monitoring
- Foundation for future rate limiting and analytics features
- Request logging with client identification for monitoring

## Deployment Infrastructure

### Vercel Platform Integration
- Seamless PostgreSQL database integration through Vercel Storage
- Environment variable management for secure configuration
- Serverless deployment with automatic scaling capabilities
- Production-ready hosting with built-in monitoring

### API Versioning Strategy

#### Version Management Architecture
- **URL Path Versioning**: `/api/v{major}` format (e.g., `/api/v1`, `/api/v2`)
- **Semantic Versioning**: Major versions for breaking changes, backwards compatibility within major versions
- **Multiple Version Support**: Run multiple API versions simultaneously during transition periods
- **Version Discovery**: Dedicated endpoint for clients to discover available versions

#### Version Lifecycle Management
```python
# Version routing in main.py
app.include_router(
    recipe.router,
    prefix="/api/v1",
    dependencies=[Depends(get_client_from_db)]
)

# Future version support
# app.include_router(
#     recipe_v2.router,
#     prefix="/api/v2",
#     dependencies=[Depends(get_client_from_db)]
# )

@app.get("/api/versions", tags=["Versioning"])
async def get_api_versions():
    """Discover available API versions and their status"""
    return {
        "supported_versions": ["v1"],
        "latest_version": "v1",
        "deprecated_versions": [],
        "version_info": {
            "v1": {
                "status": "stable",
                "released_date": "2024-01-15",
                "deprecated_date": None,
                "sunset_date": None,
                "documentation": "/docs"
            }
        }
    }
```

#### Backward Compatibility Policy
- **Stability Guarantee**: No breaking changes within major versions
- **Deprecation Timeline**: 6-month notice before version deprecation
- **Sunset Timeline**: 12-month support after deprecation announcement
- **Migration Support**: Clear upgrade guides and compatibility documentation

#### Version-Specific Features
- **Schema Evolution**: Handle model changes between versions gracefully
- **Feature Flags**: Enable gradual feature rollout within versions
- **Client Tracking**: Monitor version adoption across client base
- **Performance Isolation**: Separate monitoring and optimization per version

### Configuration Management
```json
{
  "builds": [
    {
      "src": "app/main.py",
      "use": "@vercel/python",
      "config": { "maxLambdaSize": "15mb" }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app/main.py"
    }
  ]
}
```

# Development Roadmap

## Phase 1: Core Authentication Infrastructure (Week 1)

### Database Foundation Setup
- Add PostgreSQL dependencies: `asyncpg`, `databases[postgresql]`
- Create client management schema in Vercel Postgres
- Implement database connection lifecycle management
- Add connection pooling and error handling for database operations

### Authentication Service Implementation
```python
async def get_client_from_db(api_key: str = Security(api_key_header)):
    """Enhanced client authentication with comprehensive validation"""
    if not api_key:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "missing_api_key",
                "message": "Missing API Key",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    query = "SELECT * FROM clients WHERE api_key = :api_key"
    client_record = await database.fetch_one(query=query, values={"api_key": api_key})
    
    if client_record and client_record['is_active']:
        # Track usage and last access
        update_query = """
            UPDATE clients SET 
                total_requests_this_month = total_requests_this_month + 1,
                last_used_at = NOW()
            WHERE api_key = :api_key
        """
        await database.execute(query=update_query, values={"api_key": api_key})
        
        logger.info(f"API request from client: {client_record['client_name']}")
        return client_record
    else:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "invalid_api_key",
                "message": "Invalid, missing, or revoked API Key",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
```

### Request Protection Integration
- Add authentication dependency to all recipe processing endpoints
- Implement standardized error response formatting across API
- Add basic request logging with client identification
- Ensure backward compatibility for existing API response formats

### API Versioning Implementation
- Formalize `/api/v1` prefix as part of versioning strategy
- Add version discovery endpoint for client compatibility checking
- Implement version-specific routing and documentation
- Establish deprecation and migration policies for future versions

## Phase 2: Admin Management Interface (Week 1.5)

### Client Creation Automation
```python
@app.post("/admin/create-client", tags=["Admin"])
async def create_client(
    client_name: str, 
    admin_key: str = Header(..., alias="X-Admin-Key")
):
    if admin_key != os.getenv("ADMIN_API_KEY"):
        raise HTTPException(403, "Invalid admin key")
    
    import secrets
    api_key = secrets.token_hex(24)  # 48-character secure key
    
    query = """
        INSERT INTO clients (api_key, client_name) 
        VALUES (:api_key, :client_name) 
        RETURNING api_key, client_name
    """
    result = await database.fetch_one(
        query=query, 
        values={"api_key": api_key, "client_name": client_name}
    )
    
    logger.info(f"New client created: {client_name}")
    return {
        "api_key": result['api_key'], 
        "client_name": result['client_name'],
        "message": "Client created successfully"
    }
```

### Enhanced Error Handling
- Standardize all HTTPException instances with structured error format
- Add consistent timestamp inclusion across error responses
- Implement proper HTTP status code usage for different error types
- Add error logging for debugging and monitoring purposes

## Phase 3: Deployment and Client Integration (Week 2)

### Production Deployment Setup
- Configure Vercel project with PostgreSQL database integration
- Set up environment variables for API keys and database connection
- Deploy enhanced API with authentication to production environment
- Validate database connectivity and authentication flow in production

### Client Onboarding Process
- Create initial API clients through admin endpoint
- Test authentication flow with real client applications
- Validate usage tracking accuracy and timestamp updates
- Document client integration requirements and examples

### Demo Frontend Integration
- Integrate demo frontend with authenticated backend API
- Update demo application to use API key authentication
- Test recipe processing workflows through authenticated endpoints
- Ensure demo continues to function as showcase application

# Client Integration Guide

## Authentication Requirements

All API requests must include the `X-API-Key` header for authentication and should use the current API version:

```bash
curl -H "X-API-Key: your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"text":"Recipe text here"}' \
     https://your-api.vercel.app/api/v1/recipe/text
```

### API Version Discovery

Check available API versions and their status:

```bash
curl https://your-api.vercel.app/api/versions
```

Response format:
```json
{
    "supported_versions": ["v1"],
    "latest_version": "v1", 
    "deprecated_versions": [],
    "version_info": {
        "v1": {
            "status": "stable",
            "deprecated_date": null,
            "sunset_date": null
        }
    }
}
```

## Error Handling Standards

Clients should handle these standardized HTTP status codes:

### Authentication Errors
- `401 Unauthorized` - Missing API key in request headers
- `403 Forbidden` - Invalid, expired, or deactivated API key

### Rate Limiting Errors  
- `429 Too Many Requests` - Client rate limit exceeded (future implementation)

### Server Errors
- `500 Internal Server Error` - Server-side processing error
- `503 Service Unavailable` - Temporary service outage

### Error Response Format
```json
{
    "error": "invalid_api_key",
    "message": "Invalid, missing, or revoked API Key", 
    "timestamp": "2024-01-15T10:30:00Z"
}
```

## Usage Tracking Information

- Request counts are tracked automatically per API key
- Usage statistics available through admin interface
- Monthly usage resets automatically
- No action required from client applications

## Integrating Demo Frontend with Server

### Demo Application Setup

The demo frontend application requires API key configuration to connect with the authenticated backend:

#### Environment Configuration
```bash
# In demo-frontend/.env.local
REACT_APP_API_URL=https://your-api.vercel.app
REACT_APP_API_KEY=your_demo_api_key_here
```

#### API Service Updates
```javascript
// In demo-frontend/src/utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_KEY = process.env.REACT_APP_API_KEY;
const API_VERSION = 'v1'; // Explicit version management

export async function processRecipeText(text, options = {}, signal = null) {
  const url = `${API_BASE_URL}/api/${API_VERSION}/recipe/text`;
  
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,  // Add authentication header
    },
    body: JSON.stringify({ text: text.trim(), options: options }),
    signal
  };

  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new APIError(errorData.message || 'API request failed', response.status, errorData);
    }

    return await response.json();
  } catch (error) {
    // Enhanced error handling for authentication errors
    if (error.status === 401 || error.status === 403) {
      throw new APIError('Authentication failed. Please check API configuration.', error.status);
    }
    throw error;
  }
}

// Version compatibility checking
export async function checkAPICompatibility() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/versions`);
    const versions = await response.json();
    
    if (!versions.supported_versions.includes(API_VERSION)) {
      console.warn(`API version ${API_VERSION} may not be supported. Latest: ${versions.latest_version}`);
    }
    
    return versions;
  } catch (error) {
    console.error('Failed to check API version compatibility:', error);
    return null;
  }
}
```

#### Demo Client Creation
```bash
# Create API key for demo application
curl -X POST "https://your-api.vercel.app/admin/create-client" \
  -H "X-Admin-Key: your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Recipe Box Demo Application"
  }'
```

#### Demo Deployment Updates
```json
// In demo-frontend/vercel.json - add environment variable
{
  "env": {
    "REACT_APP_API_URL": "https://your-api.vercel.app"
  }
}
```

### Testing Demo Integration

1. **Local Development**: Configure `.env.local` with API key and test recipe processing
2. **Error Handling**: Verify demo handles authentication errors gracefully
3. **User Experience**: Ensure demo functions identically to previous version
4. **Production Deploy**: Deploy demo with environment variables configured

## Backend Proxy Implementation

For applications serving multiple end users, implement a backend proxy pattern:

```javascript
// Example: Firebase Cloud Function for multi-user applications
const functions = require("firebase-functions");
const fetch = require("node-fetch");
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const RECIPE_API_KEY = functions.config().recipeapi.key;
const RECIPE_API_URL = "https://your-api.vercel.app/api/v1";

exports.processRecipe = functions.https.onCall(async (data, context) => {
    // 1. Authenticate your end-user
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const userId = context.auth.uid;

    // 2. Check user limits in your database
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'User not found');
    }

    if (userDoc.data().requestsThisMonth >= userDoc.data().monthlyRequestLimit) {
        throw new functions.https.HttpsError('permission-denied', 'Monthly limit exceeded');
    }

    // 3. Call Recipe Reader API with your client key
    const response = await fetch(`${RECIPE_API_URL}/recipe/text`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': RECIPE_API_KEY,      // Your client API key
            'X-End-User-ID': userId           // End user identification
        },
        body: JSON.stringify({ text: data.text }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Recipe API Error:", errorData);
        
        // Handle version compatibility issues
        if (response.status === 404 && errorData.error === 'version_not_found') {
            throw new functions.https.HttpsError('failed-precondition', 'API version no longer supported');
        }
        
        throw new functions.https.HttpsError('internal', 'Recipe service error');
    }

    // 4. Update user usage tracking
    await userRef.update({ 
        requestsThisMonth: admin.firestore.FieldValue.increment(1) 
    });

    return await response.json();
});
```

# Logical Dependency Chain

## Foundation Layer (Week 1 - Build First)
1. **Database Schema**: PostgreSQL client table with usage tracking fields
2. **Authentication Service**: Core API key validation and client management
3. **API Versioning**: Implement version discovery endpoint and routing strategy
4. **Request Protection**: Apply authentication dependency to all recipe endpoints
5. **Error Standardization**: Consistent error response format across API

## Management Layer (Week 1.5 - Admin Capabilities)  
6. **Admin Authentication**: Secure admin endpoint access control
7. **Client Creation**: Automated API key generation and client onboarding
8. **Usage Tracking**: Request counting and timestamp updates per client
9. **Admin Logging**: Audit trail for administrative operations

## Integration Layer (Week 2 - Client Onboarding)
10. **Production Deployment**: Vercel deployment with database integration
11. **Demo Integration**: Update demo frontend to use authenticated API with version management
12. **Client Documentation**: Integration guides and error handling examples
13. **Testing Validation**: End-to-end testing of authentication and usage tracking

## Optimization Layer (Future Enhancements)
14. **Rate Limiting**: Per-client rate limiting based on usage patterns
15. **Analytics Dashboard**: Admin interface for usage monitoring and client management
16. **Self-Service Portal**: Client self-registration and key management
17. **Advanced Monitoring**: Request analytics, performance metrics, and alerting
18. **Version Management**: Deprecation workflows and migration tooling

# Risks and Mitigations

## Technical Challenges

### Database Performance Risk
**Risk**: Authentication queries create latency bottlenecks under load
**Mitigation**: Database connection pooling, query optimization, and caching strategies

### Backward Compatibility Risk
**Risk**: Existing API consumers break when authentication is required
**Mitigation**: Phased rollout with advance notice and migration documentation

### Security Vulnerability Risk
**Risk**: API key exposure or unauthorized access to admin endpoints
**Mitigation**: Secure key generation, environment variable storage, admin authentication

## Operational Challenges

### Client Onboarding Complexity Risk
**Risk**: Manual client creation process creates operational burden
**Mitigation**: Automated admin endpoints with clear documentation and workflows

### Usage Tracking Accuracy Risk  
**Risk**: Request counting failures lead to billing or rate limiting issues
**Mitigation**: Database transaction isolation and comprehensive error handling

### Demo Application Reliability Risk
**Risk**: Demo frontend breaks due to authentication requirements
**Mitigation**: Dedicated demo API key and robust error handling in demo application

## MVP Definition and Scope

### Minimum Viable Product
- Database-backed API key authentication for all recipe endpoints
- Admin endpoint for creating new client API keys
- Basic usage tracking with monthly request counting
- Standardized error responses with proper HTTP status codes
- Demo frontend integration with authenticated backend

### Non-MVP (Future Enhancements)
- Rate limiting enforcement based on client tiers
- Self-service client registration portal
- Advanced usage analytics and reporting dashboard
- API key rotation and expiration management
- Geographic usage tracking and analytics

# Success Criteria

## Launch Criteria
- [ ] All authentication flows tested and validated
- [ ] Database schema deployed and populated with test clients
- [ ] Admin client creation endpoint functional and secure
- [ ] Usage tracking accurate to 99.9% of requests
- [ ] Demo application integrated and functioning with authentication
- [ ] API documentation updated with authentication requirements

## Performance Targets
- Authentication latency: <200ms per request
- API response time: <2s (excluding AI processing time)
- Database uptime: >99.5% availability
- Error rate: <1% of total requests

## Security Validation
- [ ] API keys generated with cryptographic security (48+ character length)
- [ ] Admin endpoints protected with separate authentication mechanism
- [ ] Database credentials stored securely in environment variables
- [ ] Error messages do not expose sensitive information
- [ ] Request logging excludes sensitive data (API keys, personal information)

## Client Integration Success
- [ ] Demo frontend successfully connects to authenticated API
- [ ] Client documentation enables successful integration without support
- [ ] Error handling provides clear guidance for troubleshooting
- [ ] Usage tracking visible through admin interface
- [ ] Multiple client applications can be onboarded simultaneously

---

This comprehensive approach ensures the Recipe Reader API transforms into a production-ready, multi-tenant platform while maintaining simplicity and enabling future scalability through careful architectural foundation and clear implementation roadmap.