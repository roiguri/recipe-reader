import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from './Button';
import { formatFileSize } from '../../utils/imageUtils';

/**
 * Image preview component with thumbnail grid and management features
 * Supports responsive design and accessibility
 */
const ImagePreview = ({
  files = [],
  onRemoveFile,
  onReorderFiles,
  loading = [],
  errors = {},
  maxPreviewSize = 200,
  showFileInfo = true,
  showRemoveButton = true,
  allowReorder = false,
  className = '',
  layout = 'grid', // grid, list, carousel
  columns = { mobile: 2, tablet: 3, desktop: 4 }
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [imageLoadErrors, setImageLoadErrors] = useState(new Set());

  // Generate preview URLs for files
  const previewUrls = useMemo(() => {
    return files.map(file => {
      if (file.type === 'application/pdf') {
        return null; // PDFs don't have image previews
      }
      try {
        return URL.createObjectURL(file);
      } catch (error) {
        console.error('Failed to create object URL:', error);
        return null;
      }
    });
  }, [files]);

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  const handleImageError = useCallback((index) => {
    setImageLoadErrors(prev => new Set([...prev, index]));
  }, []);

  const handleRemoveFile = useCallback((index) => {
    if (onRemoveFile) {
      onRemoveFile(index);
    }
  }, [onRemoveFile]);

  // Drag and drop for reordering
  const handleDragStart = useCallback((e, index) => {
    if (!allowReorder) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, [allowReorder]);

  const handleDragOver = useCallback((e, index) => {
    if (!allowReorder || draggedIndex === null) return;
    e.preventDefault();
    setDragOverIndex(index);
  }, [allowReorder, draggedIndex]);

  const handleDragEnd = useCallback(() => {
    if (!allowReorder) return;
    
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      if (onReorderFiles) {
        onReorderFiles(draggedIndex, dragOverIndex);
      }
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [allowReorder, draggedIndex, dragOverIndex, onReorderFiles]);

  const getGridClasses = () => {
    const baseClasses = 'gap-4';
    
    switch (layout) {
      case 'list':
        return `${baseClasses} space-y-4`;
      case 'carousel':
        return `${baseClasses} flex overflow-x-auto scrollbar-hide`;
      default: // grid
        return `${baseClasses} grid grid-cols-${columns.mobile} md:grid-cols-${columns.tablet} lg:grid-cols-${columns.desktop}`;
    }
  };

  const FileIcon = ({ type, size = 'w-8 h-8' }) => {
    if (type === 'application/pdf') {
      return (
        <svg className={`${size} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return (
      <svg className={`${size} text-gray-400`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    );
  };

  const PreviewCard = ({ file, index, previewUrl }) => {
    const isLoading = loading.includes(index);
    const hasError = errors[index] || imageLoadErrors.has(index);
    const isDragging = draggedIndex === index;
    const isDragOver = dragOverIndex === index;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        layout
        className={`
          relative group bg-white border border-[#f3e7e8] rounded-lg overflow-hidden
          ${layout === 'carousel' ? 'flex-shrink-0 w-48' : ''}
          ${isDragging ? 'opacity-50 z-10' : ''}
          ${isDragOver ? 'border-[#994d51] bg-[#fcf8f8]' : ''}
          ${allowReorder ? 'cursor-move' : ''}
          transition-colors duration-200
        `}
        draggable={allowReorder}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
      >
        {/* Preview area */}
        <div 
          className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden"
          style={{ maxHeight: maxPreviewSize }}
        >
          {previewUrl && !hasError ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="w-full h-full object-cover"
              onError={() => handleImageError(index)}
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4">
              <FileIcon type={file.type} size="w-12 h-12" />
              {file.type === 'application/pdf' && (
                <span className="text-xs text-gray-600 mt-2 text-center">PDF</span>
              )}
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error overlay */}
          {hasError && (
            <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
              <div className="text-center p-2">
                <svg className="w-6 h-6 text-red-500 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-red-600">
                  {t('imagePreview.loadError', { defaultValue: 'Load error' })}
                </span>
              </div>
            </div>
          )}

          {/* Remove button */}
          {showRemoveButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveFile(index)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 shadow-sm"
              aria-label={t('aria.removeFile', { fileName: file.name, defaultValue: `Remove ${file.name}` })}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}

          {/* Reorder indicator */}
          {allowReorder && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-white rounded p-1 shadow-sm">
                <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* File info */}
        {showFileInfo && (
          <div className="p-3">
            <h3 className="text-sm font-medium text-[#1b0e0e] truncate mb-1" title={file.name}>
              {file.name}
            </h3>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatFileSize(file.size)}</span>
              <span className="capitalize">
                {file.type.split('/')[1] || 'Unknown'}
              </span>
            </div>
            
            {hasError && errors[index] && (
              <p className="text-xs text-red-600 mt-1">
                {errors[index]}
              </p>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  if (files.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">
          {t('imagePreview.noFiles', { defaultValue: 'No files selected' })}
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Header with file count and actions */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#1b0e0e]">
          {t('imagePreview.selectedFiles', { 
            count: files.length,
            defaultValue: `${files.length} file${files.length !== 1 ? 's' : ''} selected` 
          })}
        </h3>
        
        {allowReorder && files.length > 1 && (
          <p className="text-xs text-gray-500">
            {t('imagePreview.dragToReorder', { defaultValue: 'Drag to reorder' })}
          </p>
        )}
      </div>

      {/* Preview grid/list/carousel */}
      <div className={getGridClasses()}>
        <AnimatePresence>
          {files.map((file, index) => (
            <PreviewCard
              key={file.name + index}
              file={file}
              index={index}
              previewUrl={previewUrls[index]}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ImagePreview;