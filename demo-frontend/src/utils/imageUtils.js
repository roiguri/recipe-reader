/**
 * Image utility functions for file processing and progress tracking
 */

/**
 * Convert File to Base64 string
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 encoded string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      // Remove data URL prefix to get pure base64
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Convert File to data URL (includes MIME type prefix)
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Data URL string
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    
    reader.readAsDataURL(file);
  });
}

/**
 * Create upload progress tracker
 * @param {Function} onProgress - Callback for progress updates (percent, loaded, total)
 * @returns {Object} - Progress tracking utilities
 */
export function createProgressTracker(onProgress) {
  let totalBytes = 0;
  let loadedBytes = 0;
  
  return {
    /**
     * Initialize total bytes for tracking
     * @param {number} total - Total bytes to upload
     */
    setTotal: (total) => {
      totalBytes = total;
      loadedBytes = 0;
    },
    
    /**
     * Update loaded bytes and call progress callback
     * @param {number} loaded - Bytes loaded so far
     */
    update: (loaded) => {
      loadedBytes = loaded;
      const percent = totalBytes > 0 ? Math.round((loaded / totalBytes) * 100) : 0;
      
      if (onProgress) {
        onProgress(percent, loaded, totalBytes);
      }
    },
    
    /**
     * Mark as complete
     */
    complete: () => {
      if (onProgress) {
        onProgress(100, totalBytes, totalBytes);
      }
    },
    
    /**
     * Get current progress info
     * @returns {Object} - Current progress state
     */
    getProgress: () => ({
      percent: totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0,
      loaded: loadedBytes,
      total: totalBytes
    })
  };
}

/**
 * Compress image using Canvas API (client-side)
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed image file
 */
export function compressImage(file, options = {}) {
  const {
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1920,
    format = 'image/jpeg'
  } = options;
  
  return new Promise((resolve, reject) => {
    // Skip compression for PDFs
    if (file.type === 'application/pdf') {
      resolve(file);
      return;
    }
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Create new File object
            const compressedFile = new File(
              [blob], 
              file.name.replace(/\.[^/.]+$/, '') + '.jpg', // Force .jpg extension
              { 
                type: format,
                lastModified: Date.now()
              }
            );
            
            resolve(compressedFile);
          },
          format,
          quality
        );
      } catch (error) {
        reject(new Error(`Compression failed: ${error.message}`));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate unique filename with timestamp
 * @param {string} originalName - Original filename
 * @param {string} prefix - Optional prefix
 * @returns {string} - Unique filename
 */
export function generateUniqueFilename(originalName, prefix = '') {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  
  return `${prefix}${timestamp}-${baseName}.${extension}`;
}

/**
 * Create file from blob with progress tracking
 * @param {Blob} blob - Blob to convert
 * @param {string} filename - Desired filename
 * @param {Object} options - File options
 * @returns {File} - File object
 */
export function createFileFromBlob(blob, filename, options = {}) {
  return new File([blob], filename, {
    type: blob.type,
    lastModified: Date.now(),
    ...options
  });
}

/**
 * Get image metadata without loading full image
 * @param {File} file - Image file
 * @returns {Promise<Object>} - Image metadata
 */
export function getImageMetadata(file) {
  return new Promise((resolve) => {
    if (file.type === 'application/pdf') {
      resolve({
        type: 'pdf',
        size: file.size,
        name: file.name,
        lastModified: file.lastModified
      });
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        type: 'image',
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        size: file.size,
        name: file.name,
        mimeType: file.type,
        lastModified: file.lastModified
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        type: 'unknown',
        size: file.size,
        name: file.name,
        error: 'Failed to load image metadata'
      });
    };
    
    img.src = url;
  });
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estimate compression savings
 * @param {File} originalFile - Original file
 * @param {File} compressedFile - Compressed file
 * @returns {Object} - Compression statistics
 */
export function getCompressionStats(originalFile, compressedFile) {
  const originalSize = originalFile.size;
  const compressedSize = compressedFile.size;
  const savings = originalSize - compressedSize;
  const savingsPercent = Math.round((savings / originalSize) * 100);
  
  return {
    originalSize,
    compressedSize,
    savings,
    savingsPercent,
    ratio: (originalSize / compressedSize).toFixed(2),
    originalSizeFormatted: formatFileSize(originalSize),
    compressedSizeFormatted: formatFileSize(compressedSize),
    savingsFormatted: formatFileSize(savings)
  };
}