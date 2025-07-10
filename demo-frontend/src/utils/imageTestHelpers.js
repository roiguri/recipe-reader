/**
 * Test helpers for image gallery development and debugging
 * These utilities create mock image data for testing the gallery components
 */

/**
 * Generate sample image data for testing
 * @param {number} uploadedCount - Number of uploaded images to generate
 * @param {number} processedCount - Number of processed images to generate
 * @returns {Object} - Mock images object with uploaded/processed arrays
 */
export function generateSampleImages(uploadedCount = 2, processedCount = 1) {
  const uploaded = [];
  const processed = [];

  // Generate uploaded images
  for (let i = 1; i <= uploadedCount; i++) {
    uploaded.push({
      id: `uploaded-${i}`,
      url: `https://picsum.photos/800/600?random=${i}`, // Placeholder service
      thumbnail: `https://picsum.photos/200/150?random=${i}`,
      filename: `recipe-image-${i}.jpg`,
      uploadedAt: new Date(Date.now() - i * 1000 * 60 * 5).toISOString(),
      size: 1024 * 1024 * 2, // 2MB
      mimeType: 'image/jpeg',
      storagePath: `user123/uploads/recipe-image-${i}.jpg`
    });
  }

  // Generate processed images
  for (let i = 1; i <= processedCount; i++) {
    processed.push({
      id: `processed-${i}`,
      url: `https://picsum.photos/800/600?random=${i + 100}`,
      thumbnail: `https://picsum.photos/200/150?random=${i + 100}`,
      filename: `processed-recipe-${i}.jpg`,
      processedAt: new Date(Date.now() - i * 1000 * 60 * 3).toISOString(),
      ocrText: `Sample OCR text for processed image ${i}. Recipe ingredients: flour, sugar, eggs.`,
      confidence: 0.85 + (i * 0.05),
      storagePath: `user123/processed/processed-recipe-${i}.jpg`
    });
  }

  return { uploaded, processed };
}

/**
 * Add sample images to a recipe result for testing
 * @param {Object} recipeResult - Existing recipe result object
 * @param {number} uploadedCount - Number of uploaded images to add
 * @param {number} processedCount - Number of processed images to add
 * @returns {Object} - Recipe result with sample images added
 */
export function addSampleImagesToRecipe(recipeResult, uploadedCount = 2, processedCount = 1) {
  const sampleImages = generateSampleImages(uploadedCount, processedCount);
  
  return {
    ...recipeResult,
    images: sampleImages
  };
}

/**
 * Log image data structure for debugging
 * @param {Object} images - Images object to analyze
 * @param {string} label - Label for the log output
 */
export function debugImageStructure(images, label = 'Images') {
  console.group(`[ImageDebug] ${label}`);
  
  if (!images) {
    console.log('No images provided');
    console.groupEnd();
    return;
  }

  console.log('Full structure:', images);
  
  if (images.uploaded) {
    console.log(`Uploaded images (${images.uploaded.length}):`);
    images.uploaded.forEach((img, index) => {
      console.log(`  [${index}]:`, {
        id: img.id,
        url: img.url ? 'Has URL' : 'Missing URL',
        thumbnail: img.thumbnail ? 'Has thumbnail' : 'Missing thumbnail',
        filename: img.filename,
        storagePath: img.storagePath
      });
    });
  }
  
  if (images.processed) {
    console.log(`Processed images (${images.processed.length}):`);
    images.processed.forEach((img, index) => {
      console.log(`  [${index}]:`, {
        id: img.id,
        url: img.url ? 'Has URL' : 'Missing URL',
        thumbnail: img.thumbnail ? 'Has thumbnail' : 'Missing thumbnail',
        filename: img.filename,
        ocrText: img.ocrText ? `OCR: ${img.ocrText.substring(0, 50)}...` : 'No OCR',
        storagePath: img.storagePath
      });
    });
  }
  
  console.groupEnd();
}

/**
 * Check if images have valid URLs for display
 * @param {Object} images - Images object to validate
 * @returns {Object} - Validation result with details
 */
export function validateImageUrls(images) {
  const result = {
    valid: true,
    issues: [],
    stats: {
      totalImages: 0,
      imagesWithUrls: 0,
      imagesWithThumbnails: 0
    }
  };

  if (!images) {
    result.valid = false;
    result.issues.push('No images object provided');
    return result;
  }

  const allImages = [...(images.uploaded || []), ...(images.processed || [])];
  result.stats.totalImages = allImages.length;

  allImages.forEach((img, index) => {
    if (img.url) {
      result.stats.imagesWithUrls++;
    } else {
      result.valid = false;
      result.issues.push(`Image ${index} (${img.filename || img.id}) missing URL`);
    }

    if (img.thumbnail) {
      result.stats.imagesWithThumbnails++;
    }

    if (!img.filename && !img.id) {
      result.issues.push(`Image ${index} missing both filename and id`);
    }
  });

  return result;
}

// Export for use in browser console during development
if (typeof window !== 'undefined') {
  window.ImageTestHelpers = {
    generateSampleImages,
    addSampleImagesToRecipe,
    debugImageStructure,
    validateImageUrls
  };
}