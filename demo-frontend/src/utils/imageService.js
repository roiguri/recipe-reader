/**
 * Image service for Supabase Storage integration with retry logic and error handling
 */

import { supabase } from './supabase';
import { validateFile } from './imageValidation';
import { 
  compressImage, 
  createProgressTracker, 
  generateUniqueFilename,
  getCompressionStats 
} from './imageUtils';

// Storage configuration
const STORAGE_BUCKET = 'recipe-images';
const UPLOAD_FOLDER = 'uploads';
const PROCESSED_FOLDER = 'processed';

// Retry configuration
const DEFAULT_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

/**
 * Custom error class for image service operations
 */
export class ImageServiceError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ImageServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute operation with exponential backoff retry
 * @param {Function} operation - Async operation to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {string} operationName - Name for error reporting
 * @returns {Promise} - Operation result
 */
async function withRetry(operation, maxAttempts = DEFAULT_RETRY_ATTEMPTS, operationName = 'operation') {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry validation or client-side errors
      if (error instanceof ImageServiceError && 
          ['VALIDATION_ERROR', 'FILE_TOO_LARGE', 'INVALID_FILE_TYPE'].includes(error.code)) {
        throw error;
      }
      
      // Don't retry on final attempt
      if (attempt === maxAttempts) {
        throw new ImageServiceError(
          `${operationName} failed after ${maxAttempts} attempts: ${error.message}`,
          'MAX_RETRIES_EXCEEDED',
          { attempts: maxAttempts, lastError: error }
        );
      }
      
      // Exponential backoff delay
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Get current user ID from Supabase auth
 * @returns {Promise<string>} - User ID
 */
async function getCurrentUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new ImageServiceError('Authentication failed', 'AUTH_ERROR', { error });
  }
  
  if (!user) {
    throw new ImageServiceError('User not authenticated', 'NOT_AUTHENTICATED');
  }
  
  return user.id;
}

/**
 * Generate storage path for user file
 * @param {string} userId - User ID
 * @param {string} folder - Folder name (uploads/processed)
 * @param {string} filename - File name
 * @returns {string} - Full storage path
 */
function getStoragePath(userId, folder, filename) {
  return `${userId}/${folder}/${filename}`;
}

/**
 * Validate and optionally compress image file
 * @param {File} file - Image file to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processed file with validation results
 */
export async function processImageFile(file, options = {}) {
  const {
    compress = true,
    compressionQuality = 0.8,
    maxWidth = 1920,
    maxHeight = 1920
  } = options;
  
  try {
    // Validate file first
    const validation = await validateFile(file);
    
    if (!validation.success) {
      throw new ImageServiceError(
        `File validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR',
        { validation }
      );
    }
    
    let processedFile = file;
    let compressionStats = null;
    
    // Compress if enabled and file is an image
    if (compress && !validation.isPdf) {
      try {
        const compressedFile = await compressImage(file, {
          quality: compressionQuality,
          maxWidth,
          maxHeight
        });
        
        compressionStats = getCompressionStats(file, compressedFile);
        processedFile = compressedFile;
      } catch (compressionError) {
        // Log compression error but continue with original file
        console.warn('Image compression failed, using original file:', compressionError);
      }
    }
    
    return {
      file: processedFile,
      validation,
      compressionStats,
      metadata: {
        originalName: file.name,
        processedName: processedFile.name,
        originalSize: file.size,
        processedSize: processedFile.size
      }
    };
  } catch (error) {
    if (error instanceof ImageServiceError) {
      throw error;
    }
    
    throw new ImageServiceError(
      `File processing failed: ${error.message}`,
      'PROCESSING_ERROR',
      { originalError: error }
    );
  }
}

/**
 * Upload image to Supabase Storage with progress tracking
 * @param {File} file - Image file to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with file path and URL
 */
export async function uploadRecipeImage(file, options = {}) {
  const {
    folder = UPLOAD_FOLDER,
    onProgress = null,
    generateUniqueName = true,
    compress = true
  } = options;
  
  return withRetry(async () => {
    try {
      // Get current user
      const userId = await getCurrentUserId();
      
      // Process file (validate and optionally compress)
      const processed = await processImageFile(file, { compress });
      
      // Generate filename
      const filename = generateUniqueName 
        ? generateUniqueFilename(processed.file.name)
        : processed.file.name;
      
      const storagePath = getStoragePath(userId, folder, filename);
      
      // Set up progress tracking
      const progressTracker = onProgress ? createProgressTracker(onProgress) : null;
      if (progressTracker) {
        progressTracker.setTotal(processed.file.size);
      }
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, processed.file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        throw new ImageServiceError(
          `Upload failed: ${error.message}`,
          'UPLOAD_ERROR',
          { supabaseError: error, storagePath }
        );
      }
      
      // Complete progress tracking
      if (progressTracker) {
        progressTracker.complete();
      }
      
      return {
        success: true,
        path: data.path,
        fullPath: data.fullPath,
        userId,
        filename,
        storagePath,
        processed,
        uploadId: data.id
      };
    } catch (error) {
      if (error instanceof ImageServiceError) {
        throw error;
      }
      
      throw new ImageServiceError(
        `Upload operation failed: ${error.message}`,
        'UPLOAD_OPERATION_ERROR',
        { originalError: error }
      );
    }
  }, DEFAULT_RETRY_ATTEMPTS, 'Image upload');
}

/**
 * Get signed URL for uploaded image
 * @param {string} storagePath - Storage path of the image
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
export async function getImageUrl(storagePath, expiresIn = 3600) {
  return withRetry(async () => {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);
    
    if (error) {
      throw new ImageServiceError(
        `Failed to generate signed URL: ${error.message}`,
        'URL_GENERATION_ERROR',
        { supabaseError: error, storagePath }
      );
    }
    
    return data.signedUrl;
  }, DEFAULT_RETRY_ATTEMPTS, 'URL generation');
}

/**
 * Delete image from storage
 * @param {string} storagePath - Storage path of the image
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteImage(storagePath) {
  return withRetry(async () => {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);
    
    if (error) {
      throw new ImageServiceError(
        `Failed to delete image: ${error.message}`,
        'DELETE_ERROR',
        { supabaseError: error, storagePath }
      );
    }
    
    return true;
  }, DEFAULT_RETRY_ATTEMPTS, 'Image deletion');
}

/**
 * List user's images in a specific folder
 * @param {string} folder - Folder to list (uploads/processed)
 * @param {Object} options - List options
 * @returns {Promise<Array>} - Array of file objects
 */
export async function listUserImages(folder = UPLOAD_FOLDER, options = {}) {
  const { limit = 100, offset = 0 } = options;
  
  return withRetry(async () => {
    const userId = await getCurrentUserId();
    const folderPath = `${userId}/${folder}`;
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folderPath, {
        limit,
        offset,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      throw new ImageServiceError(
        `Failed to list images: ${error.message}`,
        'LIST_ERROR',
        { supabaseError: error, folderPath }
      );
    }
    
    return data || [];
  }, DEFAULT_RETRY_ATTEMPTS, 'Image listing');
}

/**
 * Move image from uploads to processed folder
 * @param {string} filename - Filename in uploads folder
 * @param {string} newFilename - Optional new filename for processed folder
 * @returns {Promise<Object>} - Move operation result
 */
export async function moveToProcessed(filename, newFilename = null) {
  return withRetry(async () => {
    const userId = await getCurrentUserId();
    const sourcePath = getStoragePath(userId, UPLOAD_FOLDER, filename);
    const targetFilename = newFilename || filename;
    const targetPath = getStoragePath(userId, PROCESSED_FOLDER, targetFilename);
    
    // Copy file to processed folder
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .copy(sourcePath, targetPath);
    
    if (error) {
      throw new ImageServiceError(
        `Failed to copy image to processed folder: ${error.message}`,
        'COPY_ERROR',
        { supabaseError: error, sourcePath, targetPath }
      );
    }
    
    // Delete original from uploads folder
    await deleteImage(sourcePath);
    
    return {
      success: true,
      sourcePath,
      targetPath,
      newPath: data.path
    };
  }, DEFAULT_RETRY_ATTEMPTS, 'Move to processed');
}

/**
 * Clean up old files in uploads folder (files older than specified age)
 * @param {number} maxAgeHours - Maximum age in hours (default: 24)
 * @returns {Promise<Object>} - Cleanup result
 */
export async function cleanupOldUploads(maxAgeHours = 24) {
  return withRetry(async () => {
    const userId = await getCurrentUserId();
    const files = await listUserImages(UPLOAD_FOLDER, { limit: 1000 });
    
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    const filesToDelete = files.filter(file => 
      new Date(file.created_at) < cutoffTime
    );
    
    if (filesToDelete.length === 0) {
      return { deletedCount: 0, files: [] };
    }
    
    const pathsToDelete = filesToDelete.map(file => 
      getStoragePath(userId, UPLOAD_FOLDER, file.name)
    );
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(pathsToDelete);
    
    if (error) {
      throw new ImageServiceError(
        `Cleanup failed: ${error.message}`,
        'CLEANUP_ERROR',
        { supabaseError: error, pathsToDelete }
      );
    }
    
    return {
      deletedCount: filesToDelete.length,
      files: filesToDelete
    };
  }, DEFAULT_RETRY_ATTEMPTS, 'Cleanup old uploads');
}