# Product Requirements Document: Recipe Demo with OAuth Authentication & Rate Limiting

## Document Information
- **Version**: 2.0
- **Date**: June 27, 2025
- **Author**: Development Team
- **Status**: Ready for Implementation

---

## 1. Executive Summary

### 1.1 Project Overview
Deploy a production-ready Recipe Auto-Creation Service demo with Supabase OAuth authentication and rate limiting, hosted on Netlify. Users authenticate via Google/Apple to receive 5 free recipe processing requests with a guided onboarding experience.

### 1.2 Key Objectives
- **Seamless Authentication**: One-click OAuth with Google/Apple sign-in
- **Abuse Prevention**: 5 requests per authenticated user, unlimited for admins
- **Excellent UX**: Guided tutorial for new users, clear quota display
- **Production Ready**: Deployed to Netlify with proper monitoring

### 1.3 Success Metrics
- **User Engagement**: 80% of visitors complete OAuth sign-in
- **Tutorial Completion**: 70% of users complete guided walkthrough  
- **Abuse Prevention**: Zero instances of quota circumvention
- **Performance**: <2s initial load, <5s recipe processing
- **Uptime**: 99.9% availability

---

## 2. Problem Statement

### 2.1 Current State
- Demo frontend exists but not deployed to production
- No user authentication or rate limiting
- Vulnerable to API abuse and unlimited usage costs
- No structured user onboarding experience

### 2.2 Key Challenges
- **Service Abuse**: Unlimited API requests could drain resources
- **Cost Control**: AI processing costs scale with usage
- **User Experience**: Need seamless auth without friction
- **Admin Access**: Owner needs unlimited usage for testing

---

## 3. Target Users & Use Cases

### 3.1 Primary Users
- **Food Bloggers**: Testing recipe extraction capabilities
- **Developers**: Evaluating API for potential integration
- **Home Cooks**: Converting recipes from various sources
- **Content Creators**: Processing recipes for apps/websites

### 3.2 User Journeys

#### 3.2.1 New User Experience
1. **Landing**: Visits demo site, sees clear value proposition
2. **Authentication**: Signs in with Google/Apple (one click)
3. **Guided Tutorial**: Follows step-by-step recipe processing demo
4. **Exploration**: Tries own recipes, monitors quota usage
5. **Conversion**: Contacts owner for API access when impressed

#### 3.2.2 Returning User Experience
1. **Auto Sign-in**: Automatically authenticated from previous session
2. **Quick Access**: Immediately sees quota status and can process recipes
3. **Quota Management**: Tracks remaining requests, plans usage accordingly

#### 3.2.3 Admin User Experience
1. **Unlimited Access**: Signs in with admin account, no quota restrictions
2. **Full Testing**: Tests all features without limitations
3. **User Monitoring**: Can observe demo usage patterns

---

## 4. Product Requirements

### 4.1 Functional Requirements

#### 4.1.1 Authentication System (P0)
- **FRQ-001**: Implement Supabase OAuth with Google and Apple providers
- **FRQ-002**: Maintain user sessions across browser restarts
- **FRQ-003**: Store user email and OAuth provider information
- **FRQ-004**: Handle authentication errors gracefully
- **FRQ-005**: Provide clear sign-out functionality

#### 4.1.2 Rate Limiting System (P0)
- **FRQ-006**: Grant 5 free requests per authenticated user
- **FRQ-007**: Track usage in Supabase PostgreSQL database
- **FRQ-008**: Display real-time quota information in UI
- **FRQ-009**: Block requests when quota exceeded with clear messaging
- **FRQ-010**: Enable unlimited access for admin users via metadata flag

#### 4.1.3 Guided Tutorial (P0)
- **FRQ-011**: Present guided walkthrough for new users
- **FRQ-012**: Auto-populate sample recipe text for first attempt
- **FRQ-013**: Provide "Skip Tutorial" option for experienced users
- **FRQ-014**: Highlight UI elements with animations during tutorial
- **FRQ-015**: Remove tutorial hints after completion

#### 4.1.4 User Interface (P0)
- **FRQ-016**: Show quota progress near processing buttons
- **FRQ-017**: Display user's email/avatar in header when authenticated
- **FRQ-018**: Provide contact information for API access inquiries
- **FRQ-019**: Handle loading states during authentication and processing
- **FRQ-020**: Responsive design for mobile and desktop usage

#### 4.1.5 Admin Features (P1)
- **FRQ-021**: Flag admin users for unlimited access
- **FRQ-022**: Simple method to promote users to admin status
- **FRQ-023**: Admin user identification via email configuration
- **FRQ-024**: Monitoring dashboard for usage analytics (future)

### 4.2 Non-Functional Requirements

#### 4.2.1 Performance
- **NFR-001**: Initial page load within 2 seconds
- **NFR-002**: OAuth authentication within 3 seconds
- **NFR-003**: Recipe processing within 10 seconds
- **NFR-004**: Database queries under 100ms response time

#### 4.2.2 Security
- **NFR-005**: All communications over HTTPS
- **NFR-006**: JWT token validation on every API request
- **NFR-007**: Row-level security in Supabase database
- **NFR-008**: No sensitive data stored in frontend localStorage

#### 4.2.3 Reliability
- **NFR-009**: 99.9% uptime for demo application
- **NFR-010**: Graceful degradation during backend outages
- **NFR-011**: Session persistence across browser restarts
- **NFR-012**: Error recovery for failed authentication attempts

#### 4.2.4 Scalability
- **NFR-013**: Support 1000+ concurrent authenticated users
- **NFR-014**: Database performance maintained under demo load
- **NFR-015**: CDN delivery for global performance
- **NFR-016**: Auto-scaling for traffic spikes

---

## 5. Technical Architecture

### 5.1 System Overview

```
[User Browser] → [Netlify CDN] → [React Demo App] → [Supabase Auth]
                                        ↓              ↓
                               [JWT Token] → [FastAPI Backend] → [Recipe Processing]
                                        ↓              ↓
                               [Rate Limiting] → [Supabase Database]
```

### 5.2 Technology Stack

#### 5.2.1 Frontend (React Demo)
- **Core Framework**: React 19.1.0, Tailwind CSS 3.4.17, Framer Motion 12.16.0
- **Authentication & State**: Supabase client libraries, React Context + useReducer
- **Deployment**: Netlify hosting with CDN and environment variable configuration

#### 5.2.2 Backend (FastAPI)
- **Authentication**: Supabase Python client, JWT token verification, multipart form handling
- **Existing Stack**: FastAPI framework, Google Generative AI, Uvicorn ASGI server

#### 5.2.3 Database & Authentication
- **Supabase Configuration**: Google OAuth 2.0, Apple Sign-In, JWT token management, session persistence
- **Database**: PostgreSQL with row-level security policies, real-time subscriptions, automatic backups

### 5.3 Database Schema

#### 5.3.1 Core Tables
- **Authentication**: Managed by Supabase Auth service (users, sessions, identities)
- **Rate Limiting**: Custom demo_rate_limits table with user relationships and usage tracking
- **Security**: Row-level security policies for data protection
- **Performance**: Optimized indexes for email lookups and timestamp queries

#### 5.3.2 Data Relationships
- **User-to-Rate-Limit**: One-to-one relationship via foreign key constraint
- **Automatic Record Creation**: Database triggers create rate limit records for new users
- **Admin Identification**: Boolean flag and metadata-based admin user detection

### 5.4 Authentication Flow

#### 5.4.1 OAuth Process
1. **User Initiation**: Click sign-in button triggers OAuth provider selection
2. **Provider Redirect**: Supabase handles OAuth redirect flow with Google/Apple
3. **Token Exchange**: User returns with JWT token and authenticated user data
4. **Session Storage**: Frontend stores encrypted session via Supabase client
5. **API Integration**: All requests include Authorization header with JWT token
6. **Backend Verification**: FastAPI validates JWT and extracts user information
7. **Rate Limiting**: Check user quota against database before processing
8. **Response Handling**: Process request or return quota exceeded error with headers

---

## 6. Implementation Plan

### 6.1 Phase 1: Supabase Setup & Configuration (Week 1, Days 1-2)

#### 6.1.1 Supabase Project Creation
**Objective**: Establish authentication infrastructure and database foundation
**Tasks**:
- Create new Supabase project with appropriate tier selection
- Configure project settings, billing, and basic security policies
- Set up database connection strings and verify connectivity
- Document project credentials and access patterns

**Success Criteria**:
- Supabase project accessible with admin dashboard
- Database connection verified from development environment
- Project URL and API keys documented securely

#### 6.1.2 OAuth Provider Configuration
**Objective**: Enable Google and Apple sign-in for demo users
**Tasks**:
- Configure Google OAuth 2.0 in Google Cloud Console with proper scopes
- Set up Apple Sign-In in Apple Developer Portal with domain verification
- Add OAuth credentials to Supabase Auth settings with correct redirect URLs
- Test OAuth flows in development environment with real provider accounts

**Success Criteria**:
- Google sign-in working in development with test account
- Apple sign-in functional with Apple Developer account
- OAuth redirect URLs properly configured for both environments

#### 6.1.3 Database Schema Implementation
**Objective**: Create rate limiting infrastructure with security policies
**Tasks**:
- Design and implement demo_rate_limits table with proper constraints
- Create Row Level Security policies for user data protection
- Add database indexes for performance optimization on common queries
- Implement automated triggers for new user rate limit record creation

**Success Criteria**:
- Rate limiting table created with all required fields and constraints
- RLS policies tested and verified for data isolation
- Database performance benchmarks meet requirements
- Automated user record creation functioning properly

### 6.2 Phase 2: Frontend Authentication Integration (Week 1, Days 3-5)

#### 6.2.1 Supabase Client Setup
**Objective**: Integrate Supabase authentication into React application
**Tasks**:
- Install and configure Supabase client libraries with proper versioning
- Set up environment variables for development and production configurations
- Create authentication context for global state management across components
- Implement session persistence and automatic token refresh mechanisms

**Success Criteria**:
- Supabase client properly initialized with environment configuration
- Authentication context providing user state to all components
- Session persistence working across browser restarts
- Token refresh handling authentication expiration gracefully

#### 6.2.2 Authentication Components
**Objective**: Build user-facing authentication interface and session management
**Tasks**:
- Create OAuth sign-in components with Google and Apple provider options
- Implement session management with proper error handling and recovery
- Build user profile display components with sign-out functionality
- Add authentication loading states and error messaging for user feedback

**Success Criteria**:
- OAuth sign-in flow completing successfully with both providers
- User session state properly managed throughout application lifecycle
- Sign-out functionality clearing all session data appropriately
- Error states providing helpful feedback for authentication failures

#### 6.2.3 Rate Limit Display Components
**Objective**: Provide users with clear quota information and usage tracking
**Tasks**:
- Create quota progress indicator components with visual feedback
- Implement real-time usage updates after each API request completion
- Build quota exceeded messaging with contact information and next steps
- Add admin unlimited status display for privileged user accounts

**Success Criteria**:
- Quota display accurately reflecting current user usage from database
- Visual progress indicators updating in real-time after requests
- Clear messaging when quota limits reached with actionable guidance
- Admin users seeing unlimited status without quota restrictions

### 6.3 Phase 3: Guided Tutorial Implementation (Week 2, Days 1-2)

#### 6.3.1 Tutorial State Management
**Objective**: Create comprehensive tutorial system for user onboarding
**Tasks**:
- Design tutorial context for managing walkthrough state across components
- Implement step-by-step progression logic with navigation and completion tracking
- Add skip tutorial functionality with persistent completion status storage
- Create tutorial data structure defining steps, targets, and content

**Success Criteria**:
- Tutorial state properly managed across all application components
- Step progression working smoothly with proper validation
- Skip functionality allowing users to bypass tutorial without issues
- Tutorial completion status persisting across user sessions

#### 6.3.2 Tutorial Overlay Components
**Objective**: Build engaging tutorial interface with visual guidance
**Tasks**:
- Create tutorial overlay system with step indicators and progress tracking
- Add spotlight effects for highlighting specific UI elements during walkthrough
- Implement smooth transitions and animations between tutorial steps
- Design mobile-responsive tutorial interface for various screen sizes

**Success Criteria**:
- Tutorial overlay displaying properly with clear visual hierarchy
- Spotlight effects correctly highlighting target elements
- Smooth animations enhancing user experience without distraction
- Mobile tutorial experience working well on various device sizes

#### 6.3.3 Sample Recipe Integration
**Objective**: Provide meaningful tutorial content showcasing API capabilities
**Tasks**:
- Create sample recipe text that demonstrates AI processing capabilities effectively
- Implement auto-population of textarea during tutorial progression
- Add logic to clear sample text after tutorial completion
- Ensure sample recipe showcases Hebrew RTL text support and complex ingredient parsing

**Success Criteria**:
- Sample recipe demonstrating key features of the recipe processing API
- Auto-population working smoothly during tutorial flow
- Tutorial completion properly clearing sample data for user input
- Sample recipe highlighting both English and Hebrew text processing capabilities

### 6.4 Phase 4: Backend Rate Limiting Integration (Week 2, Days 3-4)

#### 6.4.1 JWT Verification Middleware
**Objective**: Secure API endpoints with proper authentication verification
**Tasks**:
- Install and configure Supabase Python client in FastAPI backend
- Create JWT verification middleware for extracting and validating user tokens
- Add user identification to request context for downstream processing
- Implement graceful handling of expired, invalid, or missing authentication tokens

**Success Criteria**:
- JWT tokens properly verified against Supabase authentication service
- User information correctly extracted and available in request context
- Invalid token scenarios handled gracefully with appropriate error responses
- Middleware performance meeting latency requirements for API calls

#### 6.4.2 Rate Limiting Service
**Objective**: Implement robust quota management and abuse prevention
**Tasks**:
- Create rate limiting service with Supabase database integration
- Implement quota checking and usage increment logic with atomic operations
- Add admin user detection and unlimited access handling
- Build comprehensive error handling and logging for rate limiting operations

**Success Criteria**:
- Rate limiting accurately tracking user quota against database records
- Atomic operations ensuring data consistency under concurrent access
- Admin users properly identified and granted unlimited access
- Comprehensive logging enabling debugging and monitoring of quota usage

#### 6.4.3 API Endpoint Integration
**Objective**: Apply rate limiting to existing recipe processing endpoints
**Tasks**:
- Integrate rate limiting middleware with existing FastAPI routes
- Add rate limit headers to all API responses for client feedback
- Implement proper error responses when quota limits exceeded
- Update API documentation to reflect authentication and rate limiting requirements

**Success Criteria**:
- All recipe processing endpoints protected with rate limiting
- Rate limit headers providing accurate information to frontend clients
- Quota exceeded errors returning helpful information for user guidance
- API documentation updated with authentication and rate limiting details

### 6.5 Phase 5: Netlify Deployment Configuration (Week 2, Day 5)

#### 6.5.1 Netlify Project Setup
**Objective**: Configure production hosting environment with proper optimization
**Tasks**:
- Create Netlify project with GitHub repository integration for automated deployments
- Configure build settings with appropriate Node.js version and build commands
- Set up custom domain with SSL certificate and DNS configuration
- Configure environment variables for production Supabase and API endpoints

**Success Criteria**:
- Netlify project deploying successfully from GitHub repository
- Custom domain accessible with valid SSL certificate
- Build process completing without errors and deploying latest changes
- Environment variables properly configured for production environment

#### 6.5.2 Production Environment Configuration
**Objective**: Optimize production deployment for performance and reliability
**Tasks**:
- Configure Netlify edge functions for any server-side processing needs
- Set up redirects and headers for proper SPA routing and security
- Configure caching policies for optimal performance and user experience
- Add monitoring and analytics for tracking demo usage and performance

**Success Criteria**:
- Production site loading within performance requirements
- SPA routing working correctly with proper fallback handling
- Caching policies optimizing load times without breaking functionality
- Monitoring systems providing visibility into demo performance and usage

#### 6.5.3 Production Testing & Validation
**Objective**: Verify all functionality working correctly in production environment
**Tasks**:
- Conduct end-to-end testing of authentication flow with both OAuth providers
- Validate rate limiting functionality with real user accounts and quota testing
- Test tutorial experience and recipe processing with production API endpoints
- Perform cross-browser testing on major platforms and mobile devices

**Success Criteria**:
- OAuth authentication working reliably in production with both providers
- Rate limiting properly enforcing quotas and displaying accurate information
- Tutorial and recipe processing functioning correctly with production backend
- Cross-browser compatibility verified on Chrome, Firefox, Safari, and Edge

---

## 7. Deployment Specifications

### 7.1 Netlify Configuration

#### 7.1.1 Build Settings
- **Build Command**: npm run build with production optimizations
- **Output Directory**: build folder with static assets and optimized bundles
- **Install Command**: npm install with exact dependency versions
- **Framework Detection**: Create React App with automatic configuration

#### 7.1.2 Environment Variables
- **Authentication**: Supabase URL and anonymous key for client-side authentication
- **API Integration**: Production API URL and demo client API key
- **Application**: Environment flag and rate limit information URL for user guidance

#### 7.1.3 Custom Domain Configuration
- **Primary Domain**: demo.recipe-api.example.com with automatic SSL via Let's Encrypt
- **DNS Configuration**: CNAME record pointing to Netlify CDN infrastructure
- **Security Headers**: HTTPS enforcement and security policy headers

### 7.2 Backend Configuration

#### 7.2.1 Environment Variables
- **Supabase Integration**: Service URL, service role key, and JWT secret for authentication
- **Rate Limiting**: Configurable limits per hour, burst allowances, and abuse thresholds
- **Database Cleanup**: Automated cleanup intervals for maintaining database performance

#### 7.2.2 Database Configuration
- **Connection Settings**: Supabase PostgreSQL with connection pooling and SSL
- **Performance**: Optimized queries with proper indexing and caching strategies
- **Monitoring**: Database performance metrics and automated alerting systems

---

## 8. Success Criteria

### 8.1 Launch Criteria
- Demo accessible at production URL with sub-2-second load times
- OAuth authentication functional with Google and Apple providers
- Rate limiting successfully preventing quota circumvention attempts
- Tutorial system guiding users through complete recipe processing workflow
- All automated tests passing in CI/CD pipeline with comprehensive coverage

### 8.2 Post-Launch Metrics (30 days)

#### 8.2.1 Technical Performance
- **Uptime**: Greater than 99.9% availability with minimal service interruptions
- **Performance**: Less than 2s initial load, less than 5s recipe processing times
- **Rate Limiting**: Greater than 95% effectiveness in preventing abuse attempts
- **Error Rate**: Less than 1% of legitimate user requests resulting in errors

#### 8.2.2 User Engagement
- **Authentication**: 80% of visitors completing OAuth sign-in process
- **Tutorial**: 70% of new users completing guided walkthrough
- **Usage**: 500+ unique authenticated users processing recipes
- **Conversion**: 5% of demo users making API access inquiries

#### 8.2.3 Business Impact
- **User Satisfaction**: Greater than 4.0/5.0 rating from user feedback
- **Support Load**: Less than 10 support tickets related to rate limiting
- **Cost Control**: Demo usage staying within projected budget parameters
- **Lead Generation**: Measurable increase in API access inquiries from demo traffic

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|---------|-------------|-------------------|
| OAuth Provider Outages | High | Low | Graceful degradation, multiple provider options |
| Rate Limiting Circumvention | High | Medium | Multiple detection methods, database logging |
| Database Performance Issues | Medium | Low | Proper indexing, connection pooling, monitoring |
| Frontend Bundle Size Growth | Low | Medium | Code splitting, lazy loading, bundle analysis |

### 9.2 Business Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|---------|-------------|-------------------|
| Poor User Experience | High | Low | Extensive user testing, feedback collection |
| Competitive Feature Gaps | Medium | Low | Rapid iteration cycles, user feedback integration |
| Unexpected Cost Escalation | Medium | Low | Usage monitoring, automated alerts, budget controls |
| Compliance Issues | High | Very Low | Security review, privacy policy, data protection |

### 9.3 Operational Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|---------|-------------|-------------------|
| Deployment Pipeline Failures | Medium | Low | Comprehensive testing, rollback procedures |
| Third-Party Service Dependencies | Medium | Medium | Service level monitoring, fallback options |
| Documentation Drift | Low | Medium | Automated documentation, regular reviews |
| Team Knowledge Gaps | Medium | Low | Documentation, knowledge sharing, training |

---

## 10. Future Enhancements

### 10.1 Short-term Improvements (3 months)
- **Enhanced Analytics**: Detailed user behavior tracking and conversion funnel optimization
- **A/B Testing Framework**: Different rate limiting strategies and user interface variations
- **Mobile App Integration**: Progressive Web App features and mobile-specific optimizations
- **Social Sharing**: Recipe sharing capabilities and community feedback mechanisms

### 10.2 Long-term Vision (6+ months)
- **User Account System**: Optional registration for enhanced quotas and personalization
- **Tiered Access Plans**: Multiple usage tiers with different feature sets and limits
- **API Integration Widgets**: Embeddable components for third-party website integration
- **Global Expansion**: Multi-language support and regional hosting optimization

### 10.3 Advanced Features (12+ months)
- **Machine Learning**: Usage pattern analysis for personalized recommendations
- **Enterprise Features**: White-label solutions and custom integration support
- **Community Platform**: User-generated content and recipe sharing ecosystem
- **Advanced Analytics**: Business intelligence dashboard and predictive analytics

---

## 11. Conclusion

This PRD outlines a comprehensive approach to deploying a production-ready recipe processing demo with robust authentication and rate limiting. The solution balances user experience with cost control while providing a scalable foundation for future business growth.

### 11.1 Key Success Factors
- **User-Centric Design**: Authentication and rate limiting that enhances rather than hinders user experience
- **Technical Excellence**: Reliable, performant, and secure implementation using proven technologies
- **Business Value**: Effective lead generation and user engagement while controlling operational costs
- **Scalable Architecture**: Foundation that supports future enhancements and business growth

### 11.2 Next Steps
1. **Stakeholder Review**: Technical architecture validation and business requirements confirmation
2. **Resource Planning**: Development team allocation and timeline refinement
3. **Risk Mitigation**: Detailed planning for identified risks and contingency procedures
4. **Implementation Kickoff**: Phase 1 development initiation with clear success criteria

### 11.3 Questions for Stakeholder Review
- Are the proposed rate limits appropriate for the target user demographics?
- Should we implement additional OAuth providers beyond Google and Apple?
- What level of analytics and user tracking is acceptable for privacy compliance?
- How should we prioritize the tutorial experience versus advanced features?

---

## Appendices

### Appendix A: Competitive Analysis
Comprehensive research on similar services and their authentication and rate limiting approaches, including industry best practices and user experience benchmarks.

### Appendix B: Technical Architecture Diagrams
Detailed system architecture diagrams showing data flow, security boundaries, and integration points between all system components.

### Appendix C: User Research Findings
Insights from user interviews, usability testing, and market research informing design decisions and feature prioritization.

### Appendix D: Cost Analysis
Detailed breakdown of hosting, infrastructure, third-party service costs, and operational expenses for the demo system.

### Appendix E: Security Assessment
Comprehensive security review including threat modeling, vulnerability assessment, and compliance considerations for user data protection.