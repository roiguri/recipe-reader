# Product Requirements Document: Mobile Share Integration

## 📋 Document Information

| Field | Value |
|-------|-------|
| **Product** | Recipe Box Demo - Mobile Share Integration |
| **Version** | 1.0 |
| **Date** | July 2025 |
| **Author** | Development Team |
| **Status** | Draft |

---

## 🎯 Executive Summary

### Problem Statement
Users currently cannot share recipe URLs directly from their mobile devices to the Recipe Box Demo application. When URL extraction fails, the shared URLs are lost, requiring users to manually re-enter them. There's no dedicated workflow for managing shared recipes that haven't been fully processed yet.

### Solution Overview
Implement a comprehensive mobile sharing system that:
- Enables direct URL sharing from mobile devices via Web Share Target API
- Preserves all shared URLs regardless of extraction success/failure
- Provides a dedicated "Shared Recipes" management interface
- Offers seamless workflow from shared URL to saved recipe

### Success Metrics
- **User Engagement**: 40% increase in recipe processing from mobile devices
- **URL Retention**: 100% of shared URLs preserved (zero data loss)
- **Conversion Rate**: 75% of successfully extracted shared recipes saved to user collections
- **User Satisfaction**: 90% positive feedback on mobile sharing experience

---

## 🔍 Current State Analysis

### Existing Architecture
- ✅ URL scraping endpoint exists in Recipe API
- ✅ Supabase Edge Function handles secure proxy with auth/rate limiting
- ✅ User authentication via Google/GitHub OAuth
- ✅ User quota system (`demo_rate_limits` table)
- ✅ Recipe saving (`user_recipes` table)
- ✅ Real-time quota tracking

### Current Limitations
- ❌ No mobile sharing capability
- ❌ Failed URL extractions result in data loss
- ❌ No workflow for managing partially processed recipes
- ❌ Users must manually re-enter failed URLs

---

## 🎯 Product Goals

### Primary Goals
1. **Zero Data Loss**: Ensure no shared URL is ever lost, regardless of processing outcome
2. **Seamless Mobile Experience**: Enable one-tap sharing from any mobile app to Recipe Box
3. **Robust Error Handling**: Graceful failure recovery with retry mechanisms
4. **User Control**: Clear workflow for managing shared recipes at different processing stages

### Secondary Goals
1. **Offline Support**: Handle shares when device is offline
2. **Analytics Integration**: Track sharing patterns and success rates
3. **Performance Optimization**: Minimize load times for mobile users
4. **Accessibility**: Ensure mobile sharing works across all supported devices

---

## 👥 Target Users

### Primary Users
- **Mobile-First Recipe Enthusiasts**: Users who primarily browse recipes on mobile devices
- **Social Media Users**: Users who discover recipes through social platforms
- **Busy Cooks**: Users who want quick, frictionless recipe saving while browsing

### User Personas
1. **Sarah, the Social Foodie** (Primary)
   - Discovers recipes on Instagram/Pinterest
   - Shares recipes frequently with friends
   - Wants instant access to shared recipes
   - Values simplicity and speed

2. **Mike, the Meal Planner** (Secondary)
   - Collects recipes for weekly meal planning
   - Often shares recipes from cooking websites
   - Needs reliable recipe storage system
   - Values organization and accessibility

---

## ✨ Feature Requirements

### 🏗️ Epic 0: Recipe Organization Foundation (PREPARATION)

#### Feature 0.1: Sectioned Recipe Page UI
**Priority**: High | **Effort**: Medium

**Description**: Restructure "My Recipes" page into organized sections with reusable components.

**Current State**: Flat list of all user recipes
**Target State**: Sectioned view with "Saved Recipes" as initial section

**Acceptance Criteria**:
- [ ] Recipe page displays clear section headers and navigation
- [ ] "Saved Recipes" section shows all current user recipes
- [ ] Responsive design works on mobile and desktop
- [ ] Reusable `RecipeSection` component created
- [ ] Reusable `RecipeCard` and `RecipeList` components extracted
- [ ] Empty states and loading states implemented
- [ ] Section navigation is intuitive and accessible

**Technical Requirements**:
- Create `RecipeSection` component with props for title, recipes, actions
- Extract `RecipeCard` component with consistent styling
- Implement section-based routing/navigation
- Maintain existing functionality while restructuring

#### Feature 0.2: Recipe Status Database Schema
**Priority**: High | **Effort**: Low

**Description**: Add recipe status tracking to database schema.

**Database Changes**:
```sql
-- Add status tracking fields
ALTER TABLE user_recipes ADD COLUMN recipe_status TEXT DEFAULT 'saved';
ALTER TABLE user_recipes ADD COLUMN processed_at TIMESTAMP DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX idx_user_recipes_status ON user_recipes(user_id, recipe_status);
CREATE INDEX idx_user_recipes_processed_at ON user_recipes(user_id, processed_at DESC);

-- Update existing records
UPDATE user_recipes SET recipe_status = 'saved' WHERE recipe_status IS NULL;
```

**Acceptance Criteria**:
- [ ] All existing recipes marked as 'saved' status
- [ ] New recipes automatically get appropriate status
- [ ] Database indexes optimize status-based queries
- [ ] Migration script handles existing data safely
- [ ] `processed_at` timestamp tracks when recipe was created

#### Feature 0.3: Enhanced Recipe Service Layer
**Priority**: High | **Effort**: Medium

**Description**: Update RecipesService to handle status-based recipe management.

**New Service Methods**:
```javascript
// Status-based filtering
static async getSavedRecipes(userId) 
static async getRecipesByStatus(userId, status)
static async getAllRecipesWithHistory(userId)

// Status management
static async promoteToSaved(recipeId)
static async updateRecipeStatus(recipeId, status)
```

**Acceptance Criteria**:
- [ ] Service methods properly filter recipes by status
- [ ] Status transitions are handled correctly
- [ ] Real-time updates work with new service methods
- [ ] Error handling for status operations
- [ ] Backward compatibility maintained

#### Feature 0.4: History Section Implementation
**Priority**: High | **Effort**: Medium

**Description**: Add "History" section showing all processed recipes with time-based organization.

**UI Structure**:
```
My Recipes
├── Saved Recipes (status = 'saved')
└── History (all recipes, sorted by processed_at)
    ├── Today
    ├── Yesterday  
    ├── This Week
    └── Older
```

**Acceptance Criteria**:
- [ ] History section shows all recipes regardless of status
- [ ] Recipes grouped by processing time (Today, Yesterday, etc.)
- [ ] Clear visual indicators for saved vs non-saved recipes
- [ ] "Save to Collection" action for non-saved recipes
- [ ] Time-based sorting (newest first) within groups
- [ ] Mobile-optimized layout with touch-friendly interactions
- [ ] Real-time updates when recipes are saved/processed

**User Actions**:
- **Save to Collection**: Promote recipe from processed to saved (doesn't remove from history)
- **View Recipe**: Access full recipe details
- **Remove from History**: Delete recipe entirely (with confirmation)

### 🚀 Epic 1: Web Share Target Integration

#### Feature 1.1: PWA Share Target Registration
**Priority**: High | **Effort**: Medium

**Description**: Enable the Recipe Box Demo to appear in mobile share menus when users share URLs.

**Acceptance Criteria**:
- [ ] App appears in mobile share menu for URL content
- [ ] Share target handles recipe-related URLs appropriately
- [ ] Non-recipe URLs are handled gracefully with appropriate messaging
- [ ] Share functionality works across iOS Safari and Android Chrome

**Technical Requirements**:
- Update `manifest.json` with share target configuration
- Implement share handler route (`/share`)
- Add URL validation and filtering logic

#### Feature 1.2: Share Handler Route
**Priority**: High | **Effort**: Medium

**Description**: Create dedicated route to process incoming shared URLs.

**Acceptance Criteria**:
- [ ] `/share` route accepts URL parameters from share target
- [ ] Authentication state is preserved during share flow
- [ ] Unauthenticated users are redirected to login with return URL
- [ ] Shared URLs are auto-populated in appropriate input fields

### 🗄️ Epic 2: Persistent URL Storage System

#### Feature 2.1: Enhanced Database Schema for Sharing
**Priority**: High | **Effort**: Low

**Description**: Extend database schema to support complete sharing workflow.

**Additional Database Changes** (building on preparation phase):
```sql
-- Add sharing-specific fields
ALTER TABLE user_recipes ADD COLUMN extraction_error TEXT;
ALTER TABLE user_recipes ADD COLUMN shared_url TEXT;
ALTER TABLE user_recipes ADD COLUMN retry_count INTEGER DEFAULT 0;

-- Add sharing-specific indexes
CREATE INDEX idx_user_recipes_shared_url ON user_recipes(shared_url) WHERE shared_url IS NOT NULL;
```

**Recipe Status Values** (extended from preparation):
- `saved`: Fully processed and saved to user's recipe collection
- `processed`: Successfully extracted but not yet saved to collection
- `shared`: URL shared but not yet processed
- `processing`: Currently being extracted
- `failed`: Extraction failed but URL preserved for retry

**Acceptance Criteria**:
- [ ] All shared URLs are immediately saved with appropriate status
- [ ] Status transitions are properly tracked through processing pipeline
- [ ] Error messages are preserved for failed extractions
- [ ] Retry count is incremented with each attempt
- [ ] Shared URLs are preserved even when extraction fails

#### Feature 2.2: Advanced Recipe Service for Sharing
**Priority**: High | **Effort**: Medium

**Description**: Extend RecipesService to handle complete sharing workflow.

**Additional Service Methods**:
```javascript
// Sharing workflow
static async saveSharedUrl(url, userId)
static async retryExtraction(recipeId)
static async getSharedRecipes(userId, status)

// Enhanced status management
static async updateProcessingStatus(recipeId, status, error = null)
static async incrementRetryCount(recipeId)
```

**Acceptance Criteria**:
- [ ] URLs are saved immediately upon sharing
- [ ] Failed extractions preserve original URL for retry
- [ ] Success/failure states are properly tracked
- [ ] Real-time updates reflect status changes
- [ ] Integration with existing history section

### 🎨 Epic 3: Shared Recipes Management Interface

#### Feature 3.1: Shared Recipes Section
**Priority**: High | **Effort**: High

**Description**: Add "Shared Recipes" section to the existing sectioned interface.

**Extended UI Structure**:
```
My Recipes
├── Saved Recipes (status = 'saved')
├── History (all recipes, sorted by processed_at)
└── Shared Recipes (status = 'shared', 'processing', 'processed', 'failed')
    ├── Ready to Save (status = 'processed')
    ├── Processing (status = 'processing')
    ├── Failed Extractions (status = 'failed')
    └── Recently Shared (status = 'shared')
```

**Acceptance Criteria**:
- [ ] Shared recipes section integrates with existing sectioned layout
- [ ] Reuses existing `RecipeSection` and `RecipeCard` components
- [ ] Status-based organization within shared section
- [ ] Real-time updates reflect processing state changes
- [ ] Mobile-optimized interface with touch-friendly interactions
- [ ] Consistent styling with existing sections

#### Feature 3.2: Recipe Status Management Actions
**Priority**: High | **Effort**: Medium

**Description**: Provide user controls for managing recipes at different processing stages.

**User Actions** (building on existing "Save to Collection"):
- **Retry Extraction**: For failed recipes, attempt processing again
- **Save to Collection**: Promote successfully extracted recipes (appears in both Saved and History)
- **View Original URL**: Access source URL for manual verification
- **Remove from Shared**: Delete unwanted shared recipes

**Acceptance Criteria**:
- [ ] One-click retry for failed extractions
- [ ] Clear promotion path from processed to saved
- [ ] Original URL always accessible for reference
- [ ] Bulk operations for managing multiple shared recipes
- [ ] Consistent action patterns across all sections

### 📱 Epic 4: Mobile Experience Optimization

#### Feature 4.1: Mobile-First Share Flow
**Priority**: Medium | **Effort**: Medium

**Description**: Optimize entire sharing workflow for mobile devices.

**Mobile Optimizations**:
- Touch-friendly interface elements across all sections
- Swipe gestures for recipe management
- Mobile-optimized processing feedback
- One-handed operation support

**Acceptance Criteria**:
- [ ] All sections work smoothly on mobile devices
- [ ] Processing states are clearly communicated
- [ ] Share flow completes in minimal steps
- [ ] Interface adapts to different screen sizes
- [ ] Consistent mobile experience across Saved, History, and Shared sections

#### Feature 4.2: Offline Support
**Priority**: Low | **Effort**: High

**Description**: Handle sharing when device is offline.

**Offline Capabilities**:
- Queue shared URLs for processing when online
- Local storage for offline shares
- Sync mechanism for pending shares
- Offline status indicators

**Acceptance Criteria**:
- [ ] Shared URLs are queued when offline
- [ ] Auto-sync when connection is restored
- [ ] Clear offline status communication
- [ ] No data loss during offline periods

---

## 🔧 Technical Specifications

### Architecture Overview
```
Mobile Device Share Menu
    ↓ Web Share Target API
PWA Manifest Share Target
    ↓ Route to /share
React Share Handler Component
    ↓ JWT Authentication
Supabase Edge Function (Auth + Rate Limiting)
    ↓ URL Processing
Recipe API Extraction Service
    ↓ Status Updates
Database (user_recipes with status tracking)
    ↓ Real-time Updates
React UI (Shared Recipes Section)
```

### Database Schema Changes
```sql
-- Extend existing user_recipes table
ALTER TABLE user_recipes ADD COLUMN recipe_status TEXT DEFAULT 'saved';
ALTER TABLE user_recipes ADD COLUMN extraction_error TEXT;
ALTER TABLE user_recipes ADD COLUMN shared_url TEXT;
ALTER TABLE user_recipes ADD COLUMN retry_count INTEGER DEFAULT 0;

-- Indexes for performance
CREATE INDEX idx_user_recipes_status ON user_recipes(user_id, recipe_status);
CREATE INDEX idx_user_recipes_shared_url ON user_recipes(shared_url) WHERE shared_url IS NOT NULL;
```

### API Enhancements
- **Enhanced Recipe Processing**: Status tracking throughout extraction pipeline
- **Batch Operations**: Bulk status updates for shared recipes
- **Real-time Updates**: WebSocket notifications for processing state changes
- **Error Handling**: Comprehensive error capture and retry mechanisms

### Security Considerations
- **URL Validation**: Sanitize and validate all shared URLs
- **Rate Limiting**: Apply existing quota system to shared URL processing
- **Authentication**: Maintain secure auth flow during share process
- **Data Privacy**: Ensure shared URLs are only accessible to owning user

---

## 🗓️ Implementation Timeline

### 🚀 Preparation Phase: Recipe Organization Foundation (2 weeks)

#### Phase 0.1: UI Architecture Restructuring (Week 1)
**Goal**: Create sectioned "My Recipes" page with reusable components

**Deliverables**:
- **Sectioned Recipe Page Layout** (2 days)
  - Convert current flat recipe list to sectioned view
  - Create reusable `RecipeSection` component
  - Implement "Saved Recipes" section as default
  - Ensure responsive design for mobile/desktop

- **Recipe Component Refactoring** (3 days)
  - Extract reusable `RecipeCard` component
  - Create `RecipeList` component with filtering/sorting
  - Implement section-based navigation
  - Add loading states and empty states

**Version Control**:
- Branch: `feature/recipe-sections-ui`
- Commits: 
  - `refactor(ui): create sectioned recipe page layout`
  - `refactor(components): extract reusable recipe components`
  - `feat(ui): add saved recipes section with navigation`

#### Phase 0.2: Database Schema & Service Layer (Week 2)
**Goal**: Add recipe status tracking and update services

**Deliverables**:
- **Database Schema Update** (2 days)
  ```sql
  ALTER TABLE user_recipes ADD COLUMN recipe_status TEXT DEFAULT 'saved';
  ALTER TABLE user_recipes ADD COLUMN processed_at TIMESTAMP DEFAULT NOW();
  CREATE INDEX idx_user_recipes_status ON user_recipes(user_id, recipe_status);
  CREATE INDEX idx_user_recipes_processed_at ON user_recipes(user_id, processed_at DESC);
  ```

- **Service Layer Enhancement** (3 days)
  - Update `RecipesService` to handle status filtering
  - Add `getSavedRecipes()` method
  - Add `getRecipesByStatus()` method
  - Update existing save methods to set proper status
  - Add recipe status management methods

**Version Control**:
- Branch: `feature/recipe-status-schema`
- Commits:
  - `feat(db): add recipe status and timestamp fields`
  - `feat(services): add status-based recipe filtering`
  - `refactor(services): update save methods for status tracking`

#### Phase 0.3: History Section Implementation (Week 3)
**Goal**: Add "History" section showing all processed recipes

**Deliverables**:
- **History Section UI** (2 days)
  - Add "History" tab to recipe sections
  - Show all recipes sorted by `processed_at` timestamp
  - Display recipe status indicators (saved/processed)
  - Implement time-based grouping (Today, Yesterday, This Week, etc.)

- **Save Action Integration** (2 days)
  - Add "Save to Collection" button for non-saved recipes
  - Implement `promoteToSaved()` action
  - Update UI to reflect status changes
  - Add confirmation feedback

- **Testing & Refinement** (1 day)
  - Test status transitions
  - Verify history sorting and filtering
  - Mobile UI testing
  - Performance optimization

**Version Control**:
- Branch: `feature/recipe-history-section`
- Commits:
  - `feat(ui): add history section with time-based sorting`
  - `feat(actions): add save to collection functionality`
  - `fix(ui): improve mobile history section layout`

### 🎯 Core Implementation Phase: Mobile Share Integration (4 weeks)

#### Phase 1: Share Target Foundation (Week 4)
- **PWA Share Target Setup** (3 days)
- **Share Handler Route** (2 days)

#### Phase 2: Shared Recipes Workflow (Week 5)
- **Enhanced Recipe Service for Sharing** (3 days)
- **Database Schema for Shared URLs** (2 days)

#### Phase 3: Shared Recipes UI (Week 6)
- **Shared Recipes Section** (4 days)
- **Mobile Share Flow Optimization** (1 day)

#### Phase 4: Integration & Testing (Week 7)
- **End-to-End Testing** (2 days)
- **Error Handling & Edge Cases** (2 days)
- **Documentation & Deployment** (1 day)

**Total Estimated Duration**: 7 weeks (3 weeks preparation + 4 weeks implementation)

---

## 📊 Success Metrics & KPIs

### Quantitative Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Mobile Recipe Processing | 0% | 40% | % of total recipe processing from mobile |
| URL Retention Rate | ~60% | 100% | % of shared URLs preserved |
| Share-to-Save Conversion | N/A | 75% | % of extracted recipes saved |
| Retry Success Rate | N/A | 80% | % of failed extractions successful on retry |
| Mobile User Satisfaction | N/A | 90% | User feedback score |

### Qualitative Metrics
- **User Feedback**: Collect feedback on mobile sharing experience
- **Usage Patterns**: Analyze sharing behavior and preferences
- **Error Analysis**: Track common failure modes and improvement opportunities
- **Feature Adoption**: Monitor adoption rate of shared recipes features

### Monitoring & Analytics
- **Dashboard Tracking**: Real-time monitoring of share flow metrics
- **Error Logging**: Comprehensive logging of extraction failures
- **User Journey Analysis**: Track complete flow from share to save
- **Performance Monitoring**: Mobile-specific performance metrics

---

## 🚨 Risk Assessment & Mitigation

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Web Share API compatibility issues | Medium | High | Thorough testing across devices; graceful fallbacks |
| Database performance with new fields | Low | Medium | Proper indexing; query optimization |
| Mobile browser limitations | Medium | Medium | Progressive enhancement; feature detection |

### Business Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Low user adoption of sharing | Medium | Medium | User education; prominent feature placement |
| Increased server costs from failed retries | Low | Low | Rate limiting; retry limits |
| User confusion with new workflow | Low | High | Clear UX design; user testing |

### Contingency Plans
- **Rollback Strategy**: Feature flags for quick rollback if issues arise
- **Progressive Rollout**: Gradual release to subset of users initially
- **Monitoring**: Real-time alerts for critical issues
- **Support Plan**: Documentation and user support for new features

---

## 🔄 Future Enhancements

### Short-term (Next Quarter)
- **Batch Processing**: Process multiple shared URLs simultaneously
- **Smart Categorization**: Auto-categorize shared recipes
- **Social Features**: Share recipes with other users

### Medium-term (6 months)
- **AI-Powered Retry**: Intelligent retry strategies based on failure patterns
- **Recipe Recommendations**: Suggest similar recipes based on shared URLs
- **Cross-Platform Sync**: Sync shared recipes across devices

### Long-term (12+ months)
- **Voice Sharing**: Voice-activated recipe sharing
- **AR Integration**: Augmented reality recipe viewing
- **Community Features**: User-generated recipe sharing network

---

## ✅ Acceptance Criteria Summary

### Definition of Done
- [ ] All shared URLs are preserved regardless of extraction outcome
- [ ] Mobile share menu integration works across major browsers
- [ ] Shared recipes section provides complete workflow management
- [ ] Error handling provides clear user feedback and retry options
- [ ] Mobile experience is optimized for touch interaction
- [ ] Real-time updates reflect processing state changes
- [ ] Authentication flow is preserved during share process
- [ ] Rate limiting and quota systems work with shared recipes
- [ ] Comprehensive testing covers edge cases and error scenarios
- [ ] Documentation is updated for new features and workflows

### Release Criteria
- [ ] All unit and integration tests pass
- [ ] Mobile compatibility testing complete
- [ ] Performance benchmarks meet targets
- [ ] Security review passed
- [ ] User acceptance testing complete
- [ ] Documentation and training materials ready
- [ ] Monitoring and analytics configured
- [ ] Rollback procedures tested and documented

---

## 📚 Dependencies & Assumptions

### Technical Dependencies
- **Existing Recipe API**: URL processing endpoint must remain stable
- **Supabase Infrastructure**: Database and authentication services
- **Web Share API**: Browser support for share target functionality
- **PWA Compliance**: App must meet PWA requirements for sharing

### Business Assumptions
- **User Demand**: Users want mobile sharing functionality
- **Usage Patterns**: Mobile sharing will become significant traffic source
- **Performance**: Current infrastructure can handle increased mobile load
- **Support**: Development team has capacity for maintenance and updates

### External Dependencies
- **Browser Updates**: Continued support for Web Share API
- **Mobile OS Changes**: iOS/Android sharing behavior remains stable
- **Third-party Services**: Recipe websites remain accessible for extraction
- **Network Reliability**: Mobile users have sufficient connectivity

---

*This PRD serves as the complete specification for implementing mobile share integration in the Recipe Box Demo application, ensuring comprehensive coverage of user needs, technical requirements, and business objectives.*