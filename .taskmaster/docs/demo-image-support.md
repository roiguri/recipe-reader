Image Support Implementation Plan for Recipe Reader
Overview
This plan implements image upload and processing functionality for the recipe reader demo, following the project's Phase 6 goals and contribution guidelines. The implementation will be done in small, testable steps with proper version control practices.
Project Context
Current Phase: Phase 6 - Image Processing (moved up in priority)
Base Project: Demo frontend with React/Supabase stack
Existing Features: Text and URL recipe processing with authentication
Goal: Add image upload → display → parsing → recipe extraction pipeline

Implementation Steps
Step 1: Supabase Storage Setup
Timeline: 1-2 hours
 Branch: feature/supabase-image-storage
Tasks:
Configure Supabase storage bucket


Create migration for recipe-images bucket
Set up RLS policies for user access
Configure file size limits (50MB) and allowed MIME types
Update Supabase configuration


Enable storage bucket in supabase/config.toml
Set appropriate file size limits
Configure security policies
Files to Create/Modify:
demo-frontend/supabase/migrations/
  └── 20250706_create_recipe_images_bucket.sql (new)
demo-frontend/supabase/config.toml (update storage section)

Git Strategy:
git checkout develop
git pull origin develop
git checkout -b feature/supabase-image-storage

# Commits:
# 1. feat(storage): create recipe-images storage bucket with RLS policies
# 2. chore(config): update supabase config for image storage limits

Acceptance Criteria:
[ ] Storage bucket created and accessible
[ ] RLS policies allow authenticated users to upload/read their images
[ ] File size and type restrictions properly configured
[ ] Local Supabase setup working with storage

Step 2: Image Upload Service & Utilities
Timeline: 2-3 hours
 Branch: feature/image-upload-service
Tasks:
Create image service utilities


Image validation (size, type, dimensions)
File compression and resizing
Base64 conversion utilities
Upload progress tracking
Implement upload service


Upload to Supabase storage
Error handling and retry logic
Generate secure URLs for uploaded images
Files to Create:
demo-frontend/src/services/
  └── imageService.js (new)
demo-frontend/src/utils/
  └── imageUtils.js (new)
  └── imageValidation.js (new)

Key Functions:
validateImageFile(file) - Check file type, size, dimensions
compressImage(file, maxWidth, quality) - Optimize images
uploadRecipeImage(file, userId) - Upload to Supabase
getImageUrl(path) - Get secure URLs
deleteImage(path) - Clean up uploads
Git Strategy:
git checkout develop
git checkout -b feature/image-upload-service

# Commits:
# 1. feat(utils): add image validation and compression utilities
# 2. feat(service): implement Supabase image upload service
# 3. test(images): add image service validation and error handling

Acceptance Criteria:
[ ] Images can be uploaded to Supabase storage
[ ] File validation works (size, type, dimensions)
[ ] Image compression reduces file sizes appropriately
[ ] Secure URLs generated for uploaded images
[ ] Error handling for upload failures

Step 3: Image Upload UI Component
Timeline: 3-4 hours
 Branch: feature/image-upload-ui
Tasks:
Create drag & drop upload component


Multi-file support for recipe books/multiple pages
Visual feedback during upload
Progress indicators
Error state handling
Design upload interface


Consistent with existing UI design system
RTL support for Hebrew
Mobile-responsive design
Preview thumbnails
Files to Create:
demo-frontend/src/components/ImageUpload/
  ├── ImageUploadArea.jsx (new)
  ├── ImagePreview.jsx (new)
  ├── UploadProgress.jsx (new)
  └── index.js (new)
demo-frontend/src/components/ui/
  └── FileDropZone.jsx (new)

Component Features:
ImageUploadArea: Main drag & drop interface
ImagePreview: Thumbnail grid with delete options
UploadProgress: Progress bars and status indicators
FileDropZone: Reusable drop zone component
Git Strategy:
git checkout develop
git checkout -b feature/image-upload-ui

# Commits:
# 1. feat(ui): create reusable file drop zone component
# 2. feat(upload): implement image upload area with drag & drop
# 3. feat(preview): add image preview grid with thumbnails
# 4. style(upload): add responsive design and RTL support

Acceptance Criteria:
[ ] Drag & drop works on desktop and mobile
[ ] Multiple files can be selected/uploaded
[ ] Upload progress shown in real-time
[ ] Error states properly displayed
[ ] Preview thumbnails with delete functionality
[ ] RTL layout support

Step 4: Integration with Recipe Display
Timeline: 2-3 hours
 Branch: feature/recipe-image-display
Tasks:
Extend recipe data model


Add images field to recipe schema
Update database migrations
Modify API responses to include image URLs
Update result display components


Show uploaded images in recipe results
Image gallery/carousel for multiple images
Integration with existing tabs (raw/formatted/edit)
Files to Modify:
demo-frontend/src/components/ResultDisplay/
  ├── index.jsx (update to show images)
  ├── RecipeImageGallery.jsx (new)
  └── FormattedRecipeDisplay.jsx (add image section)
demo-frontend/supabase/migrations/
  └── 20250706_add_images_to_recipes.sql (new)

Git Strategy:
git checkout develop
git checkout -b feature/recipe-image-display

# Commits:
# 1. feat(schema): add images field to recipe data model
# 2. feat(display): integrate image gallery in result display
# 3. feat(gallery): implement recipe image carousel component

Acceptance Criteria:
[ ] Recipe results display uploaded images
[ ] Image gallery with navigation for multiple images
[ ] Images properly integrated with all result tabs
[ ] Database schema supports image storage
[ ] Images persist with saved recipes

Step 5: Image Processing Integration
Timeline: 4-5 hours
 Branch: feature/image-processing-integration
Tasks:
Update API calls


Modify processRecipeImage() function in api.js
Handle multiple image uploads
Pass image data to recipe processing endpoint
Integrate with main input flow


Add image option to main processing interface
Update input type selection
Handle image processing responses
Files to Modify:
demo-frontend/src/utils/api.js (update processRecipeImage)
demo-frontend/src/components/RecipeInput/
  ├── InputTypeSelector.jsx (add image option)
  └── RecipeInputForm.jsx (integrate image upload)
demo-frontend/src/pages/HomePage.jsx (handle image processing)

Git Strategy:
git checkout develop
git checkout -b feature/image-processing-integration

# Commits:
# 1. feat(api): update image processing API integration
# 2. feat(input): add image upload to main recipe input flow
# 3. feat(processing): integrate image processing with result display

Acceptance Criteria:
[ ] Users can select "Image" as input type
[ ] Uploaded images sent to processing API
[ ] Processing results include extracted text and recipe data
[ ] Error handling for image processing failures
[ ] Consistent UX flow with text/URL processing

Step 6: Error Handling & Validation
Timeline: 2-3 hours
 Branch: feature/image-error-handling
Tasks:
Comprehensive error handling


Upload failures (network, file size, permissions)
Processing errors (OCR failures, invalid images)
User-friendly error messages
Retry mechanisms
Enhanced validation


File type validation (JPEG, PNG, PDF)
Image quality checks
Recipe content detection
Multi-language error messages
Files to Modify:
demo-frontend/src/services/imageService.js (add error handling)
demo-frontend/src/utils/imageValidation.js (enhance validation)
demo-frontend/public/locales/en/translation.json (add error messages)
demo-frontend/public/locales/he/translation.json (add Hebrew messages)

Git Strategy:
git checkout develop
git checkout -b feature/image-error-handling

# Commits:
# 1. feat(validation): enhance image file validation
# 2. feat(errors): add comprehensive error handling
# 3. feat(i18n): add multilingual error messages

Acceptance Criteria:
[ ] Clear error messages for all failure scenarios
[ ] Validation prevents invalid files from uploading
[ ] Retry mechanisms for transient failures
[ ] Error messages in both English and Hebrew
[ ] Graceful degradation when processing fails

Step 7: Testing & Documentation
Timeline: 2-3 hours
 Branch: feature/image-testing-docs
Tasks:
Testing


Unit tests for image services
Integration tests for upload flow
Error scenario testing
Cross-browser compatibility
Documentation


Update README with image processing info
API documentation for image endpoints
User guide for image uploads
Developer setup instructions
Files to Create/Modify:
demo-frontend/src/services/__tests__/
  └── imageService.test.js (new)
demo-frontend/src/components/__tests__/
  └── ImageUpload.test.js (new)
demo-frontend/README.md (update features section)
demo-frontend/docs/
  └── image-processing.md (new)

Git Strategy:
git checkout develop
git checkout -b feature/image-testing-docs

# Commits:
# 1. test(images): add unit tests for image services
# 2. test(upload): add integration tests for upload flow
# 3. docs(images): add image processing documentation

Acceptance Criteria:
[ ] All image functionality has test coverage
[ ] Documentation explains image upload process
[ ] Setup instructions for developers
[ ] User guide for image processing features

Final Integration & Deployment
Step 8: Production Preparation
Timeline: 1-2 hours
 Branch: feature/image-production-ready
Tasks:
Environment configuration


Production Supabase storage setup
CDN configuration for image delivery
Performance optimization
Security hardening


Rate limiting for uploads
File scan integration
Access control verification
Git Strategy:
git checkout develop
git checkout -b feature/image-production-ready

# Commits:
# 1. feat(prod): configure production image storage
# 2. feat(security): add upload rate limiting and validation
# 3. perf(images): optimize image delivery and caching


Technical Specifications
Storage Structure
supabase-bucket: recipe-images/
├── {user-id}/
│   ├── uploads/
│   │   ├── {timestamp}-{filename}.jpg
│   │   └── {timestamp}-{filename}.png
│   └── processed/
│       ├── thumbnails/
│       └── compressed/

Image Processing Flow
1. User uploads image(s) → Frontend validation
2. Images compressed/resized → Upload to Supabase storage
3. Secure URLs generated → Sent to processing API
4. OCR/AI extracts text → Recipe data returned
5. Images linked to recipe → Saved in user collection

Error Handling Strategy
Upload Errors: Show retry button, fallback to manual text input
Processing Errors: Display extracted text for manual editing
Storage Errors: Temporary local storage with retry mechanism
Rate Limiting: Clear messaging about quota limits
Performance Considerations
Image Compression: Reduce file sizes before upload
Lazy Loading: Load images on demand in galleries
CDN Caching: Cache frequently accessed images
Progressive Enhancement: Work without JavaScript for basic upload

Testing Strategy
Test Categories
Unit Tests: Image validation, compression, API calls
Integration Tests: Upload flow, storage integration
E2E Tests: Complete recipe processing from image
Performance Tests: Large image handling, multiple uploads
Security Tests: File type validation, access controls
Test Files
demo-frontend/src/__tests__/
├── services/
│   ├── imageService.test.js
│   └── imageValidation.test.js
├── components/
│   ├── ImageUpload.test.js
│   └── ImageGallery.test.js
└── integration/
    └── imageProcessing.test.js


Success Metrics
Functional Requirements
[ ] Users can upload single/multiple recipe images
[ ] Images displayed in recipe results
[ ] OCR extracts text from recipe images
[ ] AI processes extracted text into structured recipes
[ ] Images saved with recipe data
[ ] Error handling for all failure scenarios
Performance Requirements
[ ] Image upload completes within 10 seconds
[ ] Processing time under 30 seconds for single image
[ ] File size optimization reduces images by 50%+
[ ] UI remains responsive during upload/processing
User Experience Requirements
[ ] Intuitive drag & drop interface
[ ] Clear progress feedback
[ ] Mobile-friendly upload experience
[ ] Multilingual error messages
[ ] Accessible for screen readers

Risk Mitigation
Technical Risks
Large File Uploads: Implement chunked upload for >10MB files
OCR Accuracy: Provide manual text editing fallback
Storage Costs: Monitor usage and implement quotas
Processing Time: Add background processing for complex images
User Experience Risks
Upload Failures: Clear error messages and retry mechanisms
Slow Processing: Progress indicators and expected time estimates
Mobile Performance: Optimize for lower-end devices
Accessibility: Ensure keyboard navigation and screen reader support

Conclusion
This implementation plan provides a comprehensive roadmap for adding image support to the recipe reader. Each step is designed to be:
Small and testable: Individual features can be tested independently
Version controlled: Clear branching strategy and commit messages
User-focused: Prioritizes user experience and error handling
Scalable: Architecture supports future enhancements
The plan follows the project's existing patterns and technologies while adding robust image processing capabilities that enhance the recipe extraction workflow.

