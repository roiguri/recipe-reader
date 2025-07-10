# Recipe Image Management - Implementation Plan

## Overview
Add image upload and display to recipe demo. Users can attach up to 5 images per recipe, stored in Supabase `recipe-images` bucket with URLs in recipe JSON `images` array.

## Requirements
- **Recipe Tab**: Display images in gallery (desktop grid, mobile carousel)  
- **Edit Tab**: Upload/delete images with drag & drop
- **Save Logic**: Only upload/delete on save button press
- **Limits**: Max 5 images, 5MB each, JPEG/PNG/WebP only
- **Mobile**: Carousel for viewing, grid for editing

## Architecture
```
Components:
- ImageDisplay.jsx (recipe tab gallery)
- ImageEditor.jsx (edit tab with upload/delete)
- imageService.js (Supabase operations)

Storage: recipe-images/{user-id}/{recipe-id}/filename
Database: recipe.images = ["url1", "url2", ...]
```

## Implementation Steps

### Step 1: Image Service (2-3h)
**Branch**: `feature/image-service`

Create `imageService.js` and `imageValidation.js`:
```javascript
// Core functions needed
uploadImage(file, userId, recipeId) → url
deleteImage(url) → void  
batchUpload(files, userId, recipeId) → urls[]
batchDelete(urls) → void
validateFile(file) → {isValid, error}
```

**Files**: 
- `src/services/imageManagementService.js`
- `src/utils/imageValidation.js`

### Step 2: Image Display (2-3h) 
**Branch**: `feature/image-display`

Create read-only gallery for Recipe tab:
```javascript
<ImageDisplay images={recipe.images} />
// Desktop: Grid layout
// Mobile: Carousel with swipe
```

**Files**:
- `src/components/ImageManagement/ImageDisplay.jsx`
- `src/components/ImageManagement/ImageCarousel.jsx`

### Step 3: Image Editor (4-5h)
**Branch**: `feature/image-editor`  

Create upload/delete interface for Edit tab:
```javascript
<ImageEditor 
  initialImages={recipe.images}
  onImagesChange={handleChanges}
  maxImages={5}
/>
// Features: drag & drop, file input, delete buttons
// State: existingImages, newImages, imagesToDelete
```

**Files**:
- `src/components/ImageManagement/ImageEditor.jsx`
- `src/components/ImageManagement/ImageUploadArea.jsx`

### Step 4: Integration (2-3h)
**Branch**: `feature/integration`

Add to ResultDisplay tabs:
```javascript
// Recipe tab
{recipe.images?.length > 0 && <ImageDisplay images={recipe.images} />}

// Edit tab  
<ImageEditor 
  initialImages={editedRecipe.images}
  onImagesChange={setImageChanges}
/>
```

**Files**:
- `src/components/ResultDisplay/index.jsx`

### Step 5: Save Logic (3-4h)
**Branch**: `feature/save-logic`

Extend save button to handle images:
```javascript
const handleSave = async () => {
  // 1. Upload new images → get URLs
  // 2. Update recipe.images array  
  // 3. Save recipe to database
  // 4. Delete removed images from storage
}
```

**Files**:
- `src/components/ResultDisplay/index.jsx` (save function)

### Step 6: Mobile & Polish (2h)
**Branch**: `feature/mobile-polish`

- Touch gestures for carousel
- Image compression before upload
- Progress indicators
- Error handling

## Git Strategy
```bash
# Each step:
git checkout develop
git checkout -b feature/[step-name]
# ... implement ...
git commit -m "feat(images): [description]"
# Create PR to develop
```

## Testing Checklist
- [ ] Upload 5 images, verify storage paths
- [ ] Delete existing images, verify cleanup  
- [ ] Mobile carousel navigation works
- [ ] File validation prevents invalid uploads
- [ ] Save/cancel flow works correctly
- [ ] Error handling for failed operations

## Success Metrics
- Images display in Recipe tab
- Upload/delete works in Edit tab
- Mobile responsive design
- No operations until save pressed
- Proper cleanup of storage and URLs