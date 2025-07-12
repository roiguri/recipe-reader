import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const ImageUploader = ({ 
  onFilesSelected, 
  maxFiles = 10, 
  maxSizeMB = 10,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  className = '',
  disabled = false 
}) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Validate file
  const validateFile = (file) => {
    const errors = [];
    
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      errors.push(t('imageProcessor.validation.invalidFormat'));
    }
    
    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      errors.push(t('imageProcessor.validation.tooLarge', { maxSize: maxSizeMB }));
    }
    
    return errors;
  };

  // Process selected files
  const processFiles = (files) => {
    const fileArray = Array.from(files);
    
    // Check total count
    if (fileArray.length > maxFiles) {
      onFilesSelected([], [t('imageProcessor.validation.tooMany', { maxFiles })]);
      return;
    }
    
    const validFiles = [];
    const allErrors = [];
    
    fileArray.forEach(file => {
      const errors = validateFile(file);
      if (errors.length === 0) {
        validFiles.push(file);
      } else {
        allErrors.push(`${file.name}: ${errors.join(', ')}`);
      }
    });
    
    onFilesSelected(validFiles, allErrors);
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (disabled) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input to allow selecting same files again
    e.target.value = '';
  };

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  // Handle click to open file picker
  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Format accepted formats for display
  const formatList = acceptedFormats
    .map(format => format.split('/')[1].toUpperCase())
    .join(', ');

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
        disabled 
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
          : isDragOver 
            ? 'border-[#994d51] bg-[#fdf2f3]' 
            : 'border-gray-300 hover:border-[#994d51] hover:bg-[#fdf2f3]'
      } ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div className={`space-y-2 ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-4xl">📷</div>
        <div className="text-lg font-medium">
          {t('resultDisplay.edit.images.uploadZone')}
        </div>
        <div className="text-sm space-y-1">
          <div>{t('resultDisplay.edit.images.maxFiles', { count: maxFiles })}</div>
          <div>{t('resultDisplay.edit.images.maxSize', { size: maxSizeMB })}</div>
          <div>{t('resultDisplay.edit.images.supportedFormats')}: {formatList}</div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;