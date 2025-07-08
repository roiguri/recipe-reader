/**
 * Image validation utilities for recipe image processing
 */

// Allowed MIME types for recipe images
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'application/pdf'
];

// File size limits (50MB total, matches Supabase bucket config)
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
export const MAX_IMAGE_DIMENSION = 4096; // pixels
export const MIN_IMAGE_DIMENSION = 100; // pixels

/**
 * Validate image file type and basic properties
 * @param {File} file - File object to validate
 * @returns {Object} - Validation result with success boolean and errors array
 */
export function validateImageFile(file) {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { success: false, errors };
  }
  
  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    errors.push(`Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    errors.push(`File too large: ${sizeMB}MB. Maximum size: ${maxSizeMB}MB`);
  }
  
  // Check if file is empty
  if (file.size === 0) {
    errors.push('File is empty');
  }
  
  return {
    success: errors.length === 0,
    errors,
    fileInfo: {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2)
    }
  };
}

/**
 * Validate image dimensions (requires loading the image)
 * @param {File} file - Image file to validate
 * @returns {Promise<Object>} - Validation result with dimensions
 */
export function validateImageDimensions(file) {
  return new Promise((resolve) => {
    // Skip dimension validation for PDFs
    if (file.type === 'application/pdf') {
      resolve({
        success: true,
        errors: [],
        dimensions: null,
        isPdf: true
      });
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const errors = [];
      
      if (img.width < MIN_IMAGE_DIMENSION || img.height < MIN_IMAGE_DIMENSION) {
        errors.push(`Image too small: ${img.width}x${img.height}px. Minimum: ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}px`);
      }
      
      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        errors.push(`Image too large: ${img.width}x${img.height}px. Maximum: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px`);
      }
      
      resolve({
        success: errors.length === 0,
        errors,
        dimensions: {
          width: img.width,
          height: img.height,
          aspectRatio: (img.width / img.height).toFixed(2)
        }
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        success: false,
        errors: ['Unable to load image. File may be corrupted.'],
        dimensions: null
      });
    };
    
    img.src = url;
  });
}

/**
 * Comprehensive file validation (combines type, size, and dimension checks)
 * @param {File} file - File to validate
 * @returns {Promise<Object>} - Complete validation result
 */
export async function validateFile(file) {
  // Basic validation first
  const basicValidation = validateImageFile(file);
  
  if (!basicValidation.success) {
    return basicValidation;
  }
  
  // Dimension validation for images
  const dimensionValidation = await validateImageDimensions(file);
  
  return {
    success: basicValidation.success && dimensionValidation.success,
    errors: [...basicValidation.errors, ...dimensionValidation.errors],
    fileInfo: basicValidation.fileInfo,
    dimensions: dimensionValidation.dimensions,
    isPdf: dimensionValidation.isPdf
  };
}

/**
 * Validate multiple files at once
 * @param {FileList|Array} files - Files to validate
 * @returns {Promise<Object>} - Validation results for all files
 */
export async function validateFiles(files) {
  const fileArray = Array.from(files);
  const validationPromises = fileArray.map(validateFile);
  const results = await Promise.all(validationPromises);
  
  const validFiles = [];
  const invalidFiles = [];
  const allErrors = [];
  
  results.forEach((result, index) => {
    if (result.success) {
      validFiles.push({
        file: fileArray[index],
        validation: result
      });
    } else {
      invalidFiles.push({
        file: fileArray[index],
        validation: result
      });
      allErrors.push(...result.errors);
    }
  });
  
  return {
    success: invalidFiles.length === 0,
    validFiles,
    invalidFiles,
    errors: allErrors,
    summary: {
      total: fileArray.length,
      valid: validFiles.length,
      invalid: invalidFiles.length
    }
  };
}