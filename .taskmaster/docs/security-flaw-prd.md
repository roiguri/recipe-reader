# PRD: Demo Security Backend Proxy Implementation

## Executive Summary

### Problem Statement
The Recipe Demo application currently exposes API keys in frontend code, creating a critical security vulnerability that allows malicious users to bypass rate limiting and make unlimited requests to our Recipe API service.

### Solution Overview
Implement a secure Supabase Edge Function proxy that handles authentication, rate limiting, and API key management server-side, eliminating client-side exposure while maintaining all existing functionality.

### Success Metrics
- **Security**: 0% API key exposure in frontend code
- **Reliability**: 99.9% uptime for proxy service
- **Performance**: <500ms additional latency per request
- **User Experience**: Zero functional regression for end users

---

## Background & Context

### Current Architecture Issues
- **Critical Security Flaw**: Recipe API key exposed in `demo-frontend/src/utils/api.js`
- **Rate Limiting Bypass**: Malicious users can call Recipe API directly with unlimited requests
- **Potential Financial Impact**: Unauthorized API usage could result in significant costs
- **Brand Risk**: Security vulnerability undermines trust in our technical capabilities

### Technical Debt
- Direct API calls from frontend bypass our authentication system
- Rate limiting enforced client-side (easily circumvented)
- No server-side validation of user permissions
- Inconsistent error handling across endpoints

---

## Goals & Requirements

### Primary Goals
1. **Eliminate API Key Exposure**: Remove all API keys from frontend code
2. **Enforce Server-Side Rate Limiting**: Prevent client-side bypass attempts
3. **Maintain User Experience**: Zero functional regression for legitimate users
4. **Enable Incremental Migration**: Allow gradual rollout without breaking changes

### Functional Requirements

#### Authentication & Authorization
- **FR-1**: All API requests must validate Supabase authentication tokens
- **FR-2**: Admin users must bypass rate limiting (unlimited access)
- **FR-3**: Unauthenticated requests must return clear error messages
- **FR-4**: Expired sessions must prompt re-authentication

#### Rate Limiting
- **FR-5**: Non-admin users limited to 5 requests per account
- **FR-6**: Rate limits enforced server-side in Supabase database
- **FR-7**: Rate limit counters must update in real-time
- **FR-8**: Clear error messages when rate limits exceeded

#### API Coverage
- **FR-9**: Support text processing endpoint (`/api/v1/recipe/text`)
- **FR-10**: Support URL processing endpoint (`/api/v1/recipe/url`)
- **FR-11**: Support image processing endpoint (`/api/v1/recipe/image`)
- **FR-12**: Maintain identical request/response formats

#### Error Handling
- **FR-13**: User-friendly error messages for all failure scenarios
- **FR-14**: Proper HTTP status codes (401, 429, 500, etc.)
- **FR-15**: Detailed logging for debugging without exposing sensitive data

### Non-Functional Requirements

#### Performance
- **NFR-1**: Proxy adds <500ms latency per request
- **NFR-2**: Edge function cold start <2 seconds
- **NFR-3**: Database queries execute <100ms

#### Reliability
- **NFR-4**: 99.9% uptime for proxy service
- **NFR-5**: Graceful degradation during Edge function outages
- **NFR-6**: Automatic retry logic for transient failures

#### Security
- **NFR-7**: API keys stored only in server-side environment variables
- **NFR-8**: All communications over HTTPS
- **NFR-9**: No sensitive data logged in plain text
- **NFR-10**: JWT token validation on every request

---

## Technical Implementation

### Architecture Overview

```
[Frontend] → [Supabase Edge Function] → [Recipe API]
     ↓              ↓
[Supabase Auth] [Rate Limit Check]
     ↓              ↓
[User Session]  [Database Update]
```

### Implementation Phases

#### Phase 1: Backend Proxy Setup (Week 1)
**Deliverables:**
- Supabase Edge Function deployed and tested
- Environment variables configured securely
- Database policies updated for server-side access
- Comprehensive testing of authentication and rate limiting

**Acceptance Criteria:**
- Edge function handles all three endpoint types (text, URL, image)
- Authentication validation working correctly
- Rate limiting enforced server-side
- Admin bypass functionality confirmed
- Error handling provides clear user feedback

#### Phase 2: Frontend Migration - Text Endpoint (Week 1)
**Deliverables:**
- `secureProcessRecipeText` updated to use proxy
- Text processing fully migrated and tested
- Rollback plan verified and documented

**Acceptance Criteria:**
- Text processing works identically to current implementation
- Rate limiting updates reflected in real-time UI
- Error messages consistent with existing UX
- No API key exposure in browser developer tools

#### Phase 3: Frontend Migration - URL Endpoint (Week 2)
**Deliverables:**
- `secureProcessRecipeUrl` updated to use proxy
- URL processing fully migrated and tested
- Integration testing with text endpoint

**Acceptance Criteria:**
- URL processing maintains all current functionality
- Combined rate limiting works across endpoint types
- Performance remains acceptable for URL scraping operations

#### Phase 4: Frontend Migration - Image Endpoint (Week 2)
**Deliverables:**
- `secureProcessRecipeImage` updated to use proxy
- Image processing fully migrated and tested
- Complete system integration testing

**Acceptance Criteria:**
- Image processing handles single and multiple images
- File size limits respected and enforced
- All three endpoints share rate limiting quota

#### Phase 5: Security Hardening (Week 3)
**Deliverables:**
- Old database policies removed
- Direct API access completely disabled
- Security audit completed
- Documentation updated

**Acceptance Criteria:**
- Frontend cannot directly modify rate limit database
- All API calls route through secure proxy
- Security vulnerability completely eliminated
- System monitoring and alerting in place

---

## Detailed Technical Specifications

### Supabase Edge Function

#### Function Structure
```typescript
// Single function handling all three endpoints with routing
functions/recipe-proxy/index.ts
```

#### Endpoint Routing
- `POST /functions/v1/recipe-proxy/text` → Recipe API `/api/v1/recipe/text`
- `POST /functions/v1/recipe-proxy/url` → Recipe API `/api/v1/recipe/url`
- `POST /functions/v1/recipe-proxy/image` → Recipe API `/api/v1/recipe/image`

#### Authentication Flow
1. Extract `Authorization: Bearer <jwt>` header
2. Validate JWT token with Supabase Auth
3. Check user permissions and admin status
4. Proceed with rate limiting or bypass for admins

#### Rate Limiting Logic
1. Query `demo_rate_limits` table for user's current usage
2. Create new record if user doesn't exist (5 request limit)
3. Reject request if limit exceeded (429 status)
4. Forward request to Recipe API if quota available
5. Increment usage counter on successful response

### Database Schema Updates

#### New Policies
```sql
-- Service role can manage all rate limits (for Edge Function)
CREATE POLICY "Service role can manage all rate limits" 
ON demo_rate_limits FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can only read their own rate limits
CREATE POLICY "Users can view own rate limits" 
ON demo_rate_limits FOR SELECT 
USING (auth.uid() = user_id);
```

#### Cleanup (After Migration)
```sql
-- Remove client-side update permissions
DROP POLICY IF EXISTS "Users can update own rate limits" ON demo_rate_limits;
```

### Frontend Code Changes

#### API Service Updates
- Replace direct Recipe API calls with proxy calls
- Update error handling to work with proxy responses
- Remove API key references from all files
- Add Supabase URL configuration

#### Rate Limit Hook Changes
- Remove client-side `incrementUsage` function
- Keep read-only access for UI updates
- Maintain real-time subscriptions for live usage display
- Update computed values and utility functions

#### Environment Variable Changes
```bash
# Remove (security risk)
# REACT_APP_API_KEY=exposed_key

# Add
REACT_APP_SUPABASE_URL=https://project.supabase.co
```

---

## Risk Assessment & Mitigation

### High Risks

#### Risk: Breaking Existing Functionality
**Probability**: Medium | **Impact**: High
**Mitigation**: 
- Incremental migration (one endpoint at a time)
- Comprehensive testing at each phase
- Immediate rollback capability maintained
- Staging environment testing before production

#### Risk: Performance Degradation
**Probability**: Low | **Impact**: Medium
**Mitigation**:
- Edge functions run close to users globally
- Direct database access from Edge function
- Performance monitoring and alerting
- Load testing during implementation

#### Risk: Edge Function Outages
**Probability**: Low | **Impact**: High
**Mitigation**:
- Supabase has 99.9% uptime SLA
- Edge functions have automatic failover
- Error handling gracefully handles temporary failures
- Monitoring and alerting for service issues

### Medium Risks

#### Risk: Database Policy Conflicts
**Probability**: Low | **Impact**: Medium
**Mitigation**:
- Add new policies before removing old ones
- Test policy changes in staging first
- Keep rollback scripts ready
- Incremental policy updates

#### Risk: User Session Management
**Probability**: Medium | **Impact**: Low
**Mitigation**:
- Existing Supabase auth system is mature
- Clear error messages for expired sessions
- Automatic token refresh implemented
- Fallback authentication flows

---

## Testing Strategy

### Unit Testing
- Edge function authentication validation
- Rate limiting logic with various scenarios
- Error handling for all failure modes
- Database policy enforcement

### Integration Testing
- End-to-end request flow through proxy
- Real-time rate limit updates in UI
- Admin user bypass functionality
- Cross-endpoint rate limiting behavior

### Security Testing
- API key exposure verification (browser dev tools)
- Direct Recipe API access blocking
- JWT token validation edge cases
- Rate limit bypass attempt prevention

### Performance Testing
- Latency measurements for proxy overhead
- Edge function cold start times
- Database query performance under load
- Concurrent user handling

### User Acceptance Testing
- Existing functionality preservation
- Error message clarity and helpfulness
- Admin user experience validation
- Rate limiting user experience

---

## Success Criteria

### Security Objectives
- [ ] Zero API keys visible in frontend code or browser
- [ ] All API requests authenticated and authorized
- [ ] Rate limiting cannot be bypassed client-side
- [ ] Direct Recipe API access blocked for demo users

### Functional Objectives
- [ ] All three processing types (text, URL, image) work identically
- [ ] Real-time rate limit updates in UI
- [ ] Admin users have unlimited access
- [ ] Clear, actionable error messages

### Performance Objectives
- [ ] <500ms additional latency from proxy
- [ ] 99.9% uptime for proxy service
- [ ] No degradation in Recipe API processing times
- [ ] UI responsiveness maintained

### User Experience Objectives
- [ ] Zero functional regression for end users
- [ ] Seamless transition during migration
- [ ] Improved security without UX impact
- [ ] Clear communication of rate limits

---

## Rollback Plan

### Immediate Rollback Triggers
- Security vulnerability discovered in implementation
- >10% increase in error rates
- >1 second increase in average response times
- Critical functionality completely broken

### Rollback Procedures

#### Phase-by-Phase Rollback
```bash
# Revert frontend changes
git revert <commit-hash>
git push origin main

# Restore environment variables
REACT_APP_API_KEY=original_exposed_key
REACT_APP_API_URL=https://recipe-api.vercel.app

# Restore database policies
CREATE POLICY "Users can update own rate limits - emergency" 
ON demo_rate_limits FOR UPDATE 
USING (auth.uid() = user_id);
```

#### Emergency Database Access
- Keep original database policies until migration complete
- Service role key available for manual data fixes
- Database backups automated and verified

### Rollback Testing
- Document complete rollback procedure
- Test rollback in staging environment
- Verify rollback can be executed within 5 minutes
- Confirm full functionality restoration

---

## Timeline & Milestones

### Week 1: Backend Foundation
- **Day 1-2**: Supabase Edge Function development and testing
- **Day 3**: Database policy updates and testing
- **Day 4**: Text endpoint frontend migration
- **Day 5**: Testing and validation

### Week 2: Endpoint Migration
- **Day 1-2**: URL endpoint migration and testing
- **Day 3-4**: Image endpoint migration and testing
- **Day 5**: Integration testing across all endpoints

### Week 3: Security Hardening
- **Day 1-2**: Remove old database policies
- **Day 3**: Security audit and penetration testing
- **Day 4**: Performance optimization and monitoring
- **Day 5**: Documentation and handover

### Critical Milestones
- [ ] **M1**: Edge function deployed and tested (Day 2)
- [ ] **M2**: First endpoint migrated successfully (Day 4)
- [ ] **M3**: All endpoints migrated (Week 2, Day 4)
- [ ] **M4**: Security hardening complete (Week 3, Day 3)
- [ ] **M5**: Full system validation (Week 3, Day 5)

---

## Resource Requirements

### Development Resources
- **Lead Developer**: 15 hours/week for 3 weeks
- **DevOps Support**: 5 hours for deployment and monitoring setup
- **QA Testing**: 10 hours across all phases

### Infrastructure Resources
- **Supabase Edge Functions**: Existing free tier sufficient
- **Database**: No additional storage requirements
- **Monitoring**: Existing Supabase dashboard capabilities

### External Dependencies
- Supabase service availability and performance
- Recipe API endpoint stability
- Netlify deployment pipeline for frontend updates

---

## Post-Launch Monitoring

### Key Metrics to Track
- **Security**: API key exposure incidents (target: 0)
- **Performance**: Average response latency (target: <500ms additional)
- **Reliability**: Proxy service uptime (target: 99.9%)
- **User Experience**: Error rate increase (target: <5%)

### Monitoring Setup
- Supabase Edge Function logs and metrics
- Database query performance monitoring
- Frontend error tracking and user feedback
- Security scanning for API key exposure

### Alert Thresholds
- **Critical**: Edge function error rate >10%
- **Warning**: Response latency >1 second
- **Info**: Rate limit hits increasing >50%

---

## Future Enhancements

### Short-term Opportunities (Next Quarter)
- **Admin Dashboard**: Management interface for rate limits
- **Analytics**: Usage patterns and user behavior insights
- **Caching**: Response caching for improved performance
- **Monitoring**: Enhanced logging and alerting

### Long-term Vision (Next 6 Months)
- **API Versioning**: Support for multiple Recipe API versions
- **Multi-tenant**: Support for multiple client applications
- **Advanced Rate Limiting**: Per-endpoint and time-based limits
- **Security**: Advanced threat detection and prevention

---

## Appendix

### Environment Variables Reference
```bash
# Supabase Edge Function
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key
RECIPE_API_URL=https://recipe-api.vercel.app
RECIPE_API_KEY=secure_api_key

# Frontend
REACT_APP_SUPABASE_URL=https://project.supabase.co
```

### Database Schema
```sql
-- Existing table structure
CREATE TABLE demo_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  requests_used INTEGER DEFAULT 0,
  requests_limit INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoint Reference
- **Current**: Direct calls to `https://recipe-api.vercel.app/api/v1/recipe/*`
- **New**: Proxy calls to `https://project.supabase.co/functions/v1/recipe-proxy/*`

---

## Implementation Summary - Text Endpoint Migration

### **Changes Made**

#### **1. Backend: Supabase Edge Function** ✅
- **File**: `demo-frontend/supabase/functions/recipe-proxy/index.ts`
- **Purpose**: Secure proxy that handles authentication, rate limiting, and API calls
- **Key features**:
  - JWT token validation
  - Admin bypass (`user.app_metadata?.is_admin === true`)
  - Server-side rate limiting
  - Forwards requests to external Recipe API
  - Returns same response format as direct API

#### **2. Frontend: API Layer Update** ✅
- **File**: `demo-frontend/src/utils/api.js`
- **Function**: `processRecipeText(text, options, signal, accessToken)`
- **Changes**:
  - **OLD**: Direct API call with `'X-API-Key': API_KEY`
  - **NEW**: Edge Function call with `'Authorization': Bearer ${accessToken}`
  - **URL**: `${SUPABASE_URL}/functions/v1/recipe-proxy/text`
  - **Environment variable**: Uses `REACT_APP_SUPABASE_URL`

#### **3. Frontend: Security Layer Update** ✅
- **File**: `demo-frontend/src/utils/secureApi.js`
- **Function**: `secureProcessRecipeText()`
- **Changes**:
  - **Removed**: Client-side rate limiting (`performSecurityChecks()`)
  - **Kept**: Authentication validation only (`validateAuthentication()`)
  - **Added**: Pass `auth.session.access_token` to API call
  - **Added**: Real-time rate limit refresh after successful request

#### **4. Authentication Fixes** ✅
- **Files**: All components using `useAuth()`
- **Changes**: Safe property access (`auth?.isAuthenticated` instead of `auth.isAuthenticated`)
- **Reason**: Prevents crashes during rapid auth state transitions

### **Security Improvements Achieved**

| Aspect | Before | After |
|--------|--------|-------|
| **API Key** | ❌ Exposed in frontend | ✅ Hidden in Edge Function |
| **Rate Limiting** | ❌ Client-side (bypassable) | ✅ Server-side (enforced) |
| **Authentication** | ❌ Optional/client-side | ✅ Required/server-side |
| **Admin Access** | ❌ Client-controlled | ✅ JWT metadata-based |

### **Migration Checklist for URL/Image Endpoints**

**For each endpoint (URL/Image)**:

1. **✅ Edge Function**: Update `/functions/recipe-proxy/index.ts` to handle new endpoint
2. **✅ API Layer**: Update `processRecipeUrl/Image()` in `api.js`:
   - Change URL to Edge Function endpoint
   - Add `accessToken` parameter
   - Replace API key header with Authorization header
3. **✅ Security Layer**: Update `secureProcessRecipeUrl/Image()` in `secureApi.js`:
   - Remove `performSecurityChecks()` call
   - Keep only `validateAuthentication()` 
   - Pass `auth.session.access_token` to API call
4. **✅ Testing**: Verify authentication, rate limiting, and admin bypass work
5. **✅ Cleanup**: Remove debug logs

### **Files to Modify for URL/Image Migration**

1. `demo-frontend/supabase/functions/recipe-proxy/index.ts` (add URL/image routes)
2. `demo-frontend/src/utils/api.js` (update `processRecipeUrl/Image` functions)
3. `demo-frontend/src/utils/secureApi.js` (update `secureProcessRecipeUrl/Image` functions)

**Result**: Same security architecture as text endpoint - API keys hidden, server-side rate limiting, JWT authentication required.