import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

const ImageFileInput = ({ 
  onFilesSelected, 
  maxFiles = 10, 
  maxFileSize = 4 * 1024 * 1024, // 4MB
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  disabled = false,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [, setDragCounter] = useState(0);
  const fileInputRef = useRef(null);

  const validateFiles = useCallback((files) => {
    const validFiles = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file type
      if (!acceptedFormats.includes(file.type)) {
        errors.push(`${file.name}: Unsupported format. Please use JPEG, PNG, WebP, or GIF.`);
        continue;
      }
      
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File too large. Maximum size is ${Math.round(maxFileSize / (1024 * 1024))}MB.`);
        continue;
      }
      
      validFiles.push(file);
    }

    // Check total count
    if (validFiles.length > maxFiles) {
      errors.push(`Too many files selected. Maximum is ${maxFiles} images.`);
      return { validFiles: validFiles.slice(0, maxFiles), errors };
    }

    return { validFiles, errors };
  }, [acceptedFormats, maxFileSize, maxFiles]);

  const handleFiles = useCallback((files) => {
    if (disabled) return;
    
    const { validFiles, errors } = validateFiles(files);
    onFilesSelected(validFiles, errors);
  }, [validateFiles, onFilesSelected, disabled]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragOver(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setDragCounter(0);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles, disabled]);

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    
    // Reset the input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div className={`w-full ${className}`}>
      <motion.div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${disabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload recipe images"
        whileHover={disabled ? {} : { scale: 1.01 }}
        whileTap={disabled ? {} : { scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          aria-hidden="true"
        />
        
        <div className={`flex flex-col items-center space-y-4 ${disabled ? 'opacity-50' : ''}`}>
          <motion.div
            animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <svg 
              className={`w-12 h-12 mx-auto ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}
              stroke="currentColor" 
              fill="none" 
              viewBox="0 0 48 48" 
              aria-hidden="true"
            >
              <path 
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                strokeWidth={2} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </motion.div>
          
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {isDragOver ? 'Drop your images here' : 'Upload recipe images'}
            </p>
            <p className="text-xs text-gray-500">
              Drag and drop or click to select up to {maxFiles} images
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPEG, PNG, WebP, GIF • Max {Math.round(maxFileSize / (1024 * 1024))}MB each
            </p>
          </div>
        </div>
        
        {isDragOver && (
          <motion.div
            className="absolute inset-0 border-2 border-blue-400 border-dashed rounded-lg bg-blue-50 bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default ImageFileInput;