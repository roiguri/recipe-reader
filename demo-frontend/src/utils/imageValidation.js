const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MIN_FILE_SIZE = 1024; // 1KB minimum

export const validateFile = (file) => {
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }

  if (!file.type || !ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: `Invalid file type. Only ${ALLOWED_TYPES.join(', ')} are allowed`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    return {
      isValid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB`
    };
  }

  if (file.size < MIN_FILE_SIZE) {
    return {
      isValid: false,
      error: 'File too small. Minimum size is 1KB'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

export const validateFiles = (files) => {
  if (!files || !Array.isArray(files)) {
    return {
      isValid: false,
      error: 'No files provided or invalid format'
    };
  }

  if (files.length === 0) {
    return {
      isValid: false,
      error: 'No files provided'
    };
  }

  if (files.length > 10) {
    return {
      isValid: false,
      error: 'Too many files. Maximum 10 files allowed'
    };
  }

  const validationResults = files.map((file, index) => ({
    index,
    fileName: file.name,
    ...validateFile(file)
  }));

  const invalidFiles = validationResults.filter(result => !result.isValid);

  if (invalidFiles.length > 0) {
    return {
      isValid: false,
      error: `Invalid files: ${invalidFiles.map(f => `${f.fileName} (${f.error})`).join(', ')}`,
      details: validationResults
    };
  }

  return {
    isValid: true,
    error: null,
    details: validationResults
  };
};

export const getFileInfo = (file) => {
  if (!file) {
    return null;
  }

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified),
    sizeFormatted: formatFileSize(file.size)
  };
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isImageFile = (file) => {
  if (!file || !file.type) {
    return false;
  }

  return ALLOWED_TYPES.includes(file.type.toLowerCase());
};

export const getImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error('File is not a valid image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

export const validateImageDimensions = (file, maxWidth = 4000, maxHeight = 4000) => {
  return new Promise((resolve) => {
    if (!isImageFile(file)) {
      resolve({
        isValid: false,
        error: 'File is not a valid image'
      });
      return;
    }

    const img = new Image();
    img.onload = () => {
      const isValid = img.width <= maxWidth && img.height <= maxHeight;
      resolve({
        isValid,
        error: isValid ? null : `Image dimensions too large. Maximum ${maxWidth}x${maxHeight} pixels`,
        dimensions: {
          width: img.width,
          height: img.height
        }
      });
    };
    img.onerror = () => {
      resolve({
        isValid: false,
        error: 'Failed to load image for dimension validation'
      });
    };
    img.src = URL.createObjectURL(file);
  });
};