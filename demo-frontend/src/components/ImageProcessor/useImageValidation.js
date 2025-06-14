import { useState, useCallback } from 'react';

export const useImageValidation = ({
  maxFiles = 10,
  maxFileSize = 4 * 1024 * 1024, // 4MB
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
} = {}) => {
  const [validationErrors, setValidationErrors] = useState([]);

  const validateFiles = useCallback((files) => {
    const validFiles = [];
    const errors = [];

    // Convert FileList to Array if needed
    const fileArray = Array.isArray(files) ? files : Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // Check if it's a file object
      if (!file || typeof file.size !== 'number') {
        errors.push('Invalid file object');
        continue;
      }

      // Check file type
      if (!acceptedFormats.includes(file.type)) {
        const supportedFormats = acceptedFormats.map(format => 
          format.split('/')[1].toUpperCase()
        ).join(', ');
        errors.push(`${file.name}: Unsupported format. Please use: ${supportedFormats}`);
        continue;
      }
      
      // Check file size
      if (file.size > maxFileSize) {
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
        errors.push(`${file.name}: File too large. Maximum size is ${maxSizeMB}MB`);
        continue;
      }

      // Check if file is empty
      if (file.size === 0) {
        errors.push(`${file.name}: File is empty`);
        continue;
      }
      
      validFiles.push(file);
    }

    // Check total count
    if (validFiles.length > maxFiles) {
      errors.push(`Too many files selected. Maximum is ${maxFiles} images`);
      return { 
        validFiles: validFiles.slice(0, maxFiles), 
        errors: [...errors, `Only the first ${maxFiles} files will be processed`]
      };
    }

    setValidationErrors(errors);
    return { validFiles, errors };
  }, [acceptedFormats, maxFileSize, maxFiles]);

  const convertToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      reader.readAsDataURL(file);
    });
  }, []);

  const convertFilesToBase64 = useCallback(async (files) => {
    const conversions = files.map(async (file) => {
      try {
        const base64 = await convertToBase64(file);
        return {
          file,
          base64,
          name: file.name,
          size: file.size,
          type: file.type
        };
      } catch (error) {
        throw new Error(`Failed to convert ${file.name}: ${error.message}`);
      }
    });

    try {
      const results = await Promise.all(conversions);
      return { success: true, data: results, errors: [] };
    } catch (error) {
      return { success: false, data: [], errors: [error.message] };
    }
  }, [convertToBase64]);

  const validateAndConvert = useCallback(async (files) => {
    // First validate the files
    const { validFiles, errors: validationErrors } = validateFiles(files);
    
    if (validFiles.length === 0) {
      return { 
        success: false, 
        data: [], 
        errors: validationErrors.length > 0 ? validationErrors : ['No valid files selected'] 
      };
    }

    // Then convert valid files to base64
    const conversionResult = await convertFilesToBase64(validFiles);
    
    return {
      success: conversionResult.success,
      data: conversionResult.data,
      errors: [...validationErrors, ...conversionResult.errors]
    };
  }, [validateFiles, convertFilesToBase64]);

  const clearErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  const getAcceptString = useCallback(() => {
    return acceptedFormats.join(',');
  }, [acceptedFormats]);

  const getMaxFileSizeMB = useCallback(() => {
    return Math.round(maxFileSize / (1024 * 1024));
  }, [maxFileSize]);

  const getSupportedFormats = useCallback(() => {
    return acceptedFormats.map(format => 
      format.split('/')[1].toUpperCase()
    );
  }, [acceptedFormats]);

  return {
    validateFiles,
    convertToBase64,
    convertFilesToBase64,
    validateAndConvert,
    validationErrors,
    clearErrors,
    getAcceptString,
    getMaxFileSizeMB,
    getSupportedFormats,
    maxFiles,
    maxFileSize
  };
};