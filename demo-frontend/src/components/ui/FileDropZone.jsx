import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Reusable file drop zone component with drag & drop functionality
 * Follows existing UI patterns and supports accessibility
 */
const FileDropZone = ({ 
  onFilesSelected, 
  accept = 'image/*',
  multiple = true,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB to match Supabase bucket
  disabled = false,
  className = '',
  children,
  variant = 'default', // default, compact, bordered
  showIcon = true,
  showInstructions = true,
  dragActiveOverlay = true
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef(null);

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
    
    // Ensure proper drag effect
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setDragCounter(0);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    
    // Filter files by accept attribute if specified
    let filteredFiles = files;
    if (accept && accept !== '*/*') {
      const acceptTypes = accept.split(',').map(type => type.trim());
      filteredFiles = files.filter(file => {
        return acceptTypes.some(acceptType => {
          if (acceptType.endsWith('/*')) {
            const baseType = acceptType.split('/')[0];
            return file.type.startsWith(baseType + '/');
          }
          return file.type === acceptType;
        });
      });
    }
    
    // Limit number of files
    if (!multiple) {
      filteredFiles = filteredFiles.slice(0, 1);
    } else if (maxFiles) {
      filteredFiles = filteredFiles.slice(0, maxFiles);
    }
    
    if (filteredFiles.length > 0) {
      onFilesSelected(filteredFiles);
    }
  }, [onFilesSelected, disabled, accept, multiple, maxFiles]);

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      onFilesSelected(files);
    }
    
    // Reset input for repeated selections
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesSelected]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick, disabled]);

  // Variant-specific styling
  const getVariantClasses = () => {
    const base = 'transition-colors duration-200 ease-in-out';
    
    switch (variant) {
      case 'compact':
        return `${base} border-2 border-dashed rounded-lg p-4`;
      case 'bordered':
        return `${base} border-2 border-solid rounded-lg p-6 bg-white`;
      default:
        return `${base} border-2 border-dashed rounded-lg p-8`;
    }
  };

  const getBorderClasses = () => {
    if (disabled) {
      return 'border-gray-200 bg-gray-50 cursor-not-allowed';
    }
    
    if (isDragOver) {
      return 'border-[#994d51] bg-[#fcf8f8]';
    }
    
    return 'border-[#f3e7e8] hover:border-[#994d51] hover:bg-[#fcf8f8] cursor-pointer';
  };

  const defaultIcon = (
    <svg 
      className={`w-12 h-12 mx-auto ${isDragOver ? 'text-[#994d51]' : 'text-gray-400'}`}
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
  );

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      <motion.div
        className={`
          relative text-center
          ${getVariantClasses()}
          ${getBorderClasses()}
        `}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={t('aria.uploadFiles')}
        whileHover={disabled ? {} : { scale: 1.005 }}
        whileTap={disabled ? {} : { scale: 0.995 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          aria-hidden="true"
        />
        
        <div className={`flex flex-col items-center space-y-4 ${disabled ? 'opacity-50' : ''}`}>
          {showIcon && (
            <motion.div
              animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {defaultIcon}
            </motion.div>
          )}
          
          {showInstructions && (
            <div className={`max-w-sm ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-sm font-medium text-[#1b0e0e] mb-1">
                {isDragOver 
                  ? t('fileDropZone.dragActive', { defaultValue: 'Drop files here' })
                  : t('fileDropZone.dragInactive', { defaultValue: 'Drag & drop files here, or click to select' })
                }
              </p>
              <p className="text-xs text-gray-600">
                {multiple 
                  ? t('fileDropZone.multipleFiles', { maxFiles, defaultValue: `Upload up to ${maxFiles} files` })
                  : t('fileDropZone.singleFile', { defaultValue: 'Upload a single file' })
                }
              </p>
              {maxFileSize && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('fileDropZone.maxSize', { 
                    maxSize: formatFileSize(maxFileSize),
                    defaultValue: `Max ${formatFileSize(maxFileSize)} per file`
                  })}
                </p>
              )}
            </div>
          )}
          
          {children}
        </div>
        
        {/* Drag overlay */}
        {isDragOver && dragActiveOverlay && (
          <motion.div
            className="absolute inset-0 border-2 border-[#994d51] border-dashed rounded-lg bg-[#fcf8f8] bg-opacity-75 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-[#994d51] font-medium">
              {t('fileDropZone.dropHere', { defaultValue: 'Drop files here' })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default FileDropZone;