import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';

const ImageThumbnail = ({ 
  file, 
  index, 
  onRemove, 
  isProcessing = false,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  t
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsLoading(false);

      return () => {
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
        setIsLoading(true);
      };
    }
  }, [file]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileFormat = (file) => {
    return file.type.split('/')[1].toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isDragging ? 0.5 : 1, 
        scale: isDragging ? 0.95 : 1,
        rotateZ: isDragging ? 3 : 0
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      draggable={!isProcessing}
      onDragStart={(e) => onDragStart && onDragStart(e, index)}
      onDragOver={(e) => onDragOver && onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop && onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`
        relative group bg-white rounded-lg border-2 overflow-hidden
        transition-all duration-150
        ${isProcessing 
          ? 'opacity-75 cursor-not-allowed border-gray-200' 
          : isDragging 
            ? 'cursor-grabbing border-blue-400 shadow-lg z-10' 
            : isDragOver
              ? 'border-blue-400 border-dashed bg-blue-50'
              : 'border-gray-200 hover:shadow-md hover:border-gray-300 cursor-grab'
        }
      `}
    >
      <div className="aspect-square relative bg-gray-50">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <img
            src={previewUrl}
            alt={`Recipe ${index + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        
        {!isProcessing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            className="
              absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
              hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
            "
            aria-label={`Remove image ${index + 1}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      
      <div className="p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
            #{index + 1}
          </span>
          {isDragOver && (
            <span className="text-xs text-blue-600 font-medium">{t('imageProcessor.preview.dropHere')}</span>
          )}
        </div>
        <p className="text-xs font-medium text-gray-900 truncate" title={file.name}>
          {file.name}
        </p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">
            {getFileFormat(file)}
          </span>
          <span className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const ImagePreview = ({ 
  files = [], 
  onRemoveFile, 
  onClearAll, 
  onReorderFiles,
  isProcessing = false,
  className = '' 
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.dataTransfer.setDragImage(e.target, 0, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Create a new array with reordered files
    const newFiles = [...files];
    const draggedFile = newFiles[draggedIndex];
    
    // Remove the dragged file from its original position
    newFiles.splice(draggedIndex, 1);
    
    // Insert it at the new position
    newFiles.splice(dropIndex, 0, draggedFile);
    
    // Update the parent component
    if (onReorderFiles) {
      onReorderFiles(newFiles);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">
          {t('imageProcessor.preview.selectedImages', { count: files.length })}
        </h3>
        {!isProcessing && (
          <button
            type="button"
            onClick={onClearAll}
            className="
              text-xs text-red-600 hover:text-red-700 font-medium
              focus:outline-none focus:underline
            "
            aria-label="Remove all images"
          >
            {t('imageProcessor.preview.clearAll')}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <AnimatePresence>
          {files.map((file, index) => (
            <ImageThumbnail
              key={file.uniqueId || `${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              index={index}
              onRemove={onRemoveFile}
              isProcessing={isProcessing}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              t={t}
            />
          ))}
        </AnimatePresence>
      </div>
      
      {files.length > 1 && (
        <div className="mt-3 p-2 bg-blue-50 rounded-md">
          <p className={`text-xs text-blue-700 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('imageProcessor.preview.multiPageInfo')}
          </p>
        </div>
      )}
      
      {files.length >= 10 && (
        <div className="mt-2 p-2 bg-amber-50 rounded-md">
          <p className={`text-xs text-amber-700 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('imageProcessor.preview.maxReached', { maxFiles: 10 })}
          </p>
        </div>
      )}
    </div>
  );
};

export default ImagePreview;