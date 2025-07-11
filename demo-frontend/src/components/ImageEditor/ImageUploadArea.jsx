import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { validateFile } from '../../utils/imageValidation';

const ImageUploadArea = ({ 
  onFilesAdded, 
  disabled = false, 
  maxFiles = 5, 
  currentCount = 0 
}) => {
  const { t } = useTranslation();

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    const validFiles = [];
    const errors = [];

    // Check if adding these files would exceed the limit
    const totalAfterAdd = currentCount + acceptedFiles.length;
    if (totalAfterAdd > maxFiles) {
      errors.push(t('imageEditor.errors.tooManyFiles', { max: maxFiles }));
      return onFilesAdded([], errors);
    }

    // Validate each accepted file
    acceptedFiles.forEach((file) => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    // Handle rejected files
    rejectedFiles.forEach(({ file, errors: fileErrors }) => {
      const errorMessages = fileErrors.map(error => {
        switch (error.code) {
          case 'file-too-large':
            return t('imageEditor.errors.fileTooLarge');
          case 'file-invalid-type':
            return t('imageEditor.errors.invalidType');
          default:
            return error.message;
        }
      });
      errors.push(`${file.name}: ${errorMessages.join(', ')}`);
    });

    onFilesAdded(validFiles, errors);
  }, [onFilesAdded, maxFiles, currentCount, t]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled,
    multiple: true
  });

  const remainingSlots = maxFiles - currentCount;
  const canAddMore = remainingSlots > 0;

  const getDropzoneStyles = () => {
    let baseStyles = "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer min-h-[120px] flex flex-col items-center justify-center";
    
    if (disabled || !canAddMore) {
      return `${baseStyles} border-gray-300 bg-gray-50 cursor-not-allowed`;
    }
    
    if (isDragReject) {
      return `${baseStyles} border-red-500 bg-red-50`;
    }
    
    if (isDragAccept || isDragActive) {
      return `${baseStyles} border-blue-500 bg-blue-50`;
    }
    
    return `${baseStyles} border-gray-400 bg-gray-50 hover:border-blue-400 hover:bg-blue-50`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div {...getRootProps()} className={getDropzoneStyles()}>
        <input {...getInputProps()} />
        
        <div className="text-4xl mb-3">
          {isDragActive ? (
            isDragReject ? '❌' : '📸'
          ) : (
            '🖼️'
          )}
        </div>
        
        <div className="space-y-2">
          {!canAddMore ? (
            <p className="text-gray-500 font-medium">
              {t('imageEditor.uploadArea.maxReached')}
            </p>
          ) : isDragActive ? (
            isDragReject ? (
              <p className="text-red-600 font-medium">
                {t('imageEditor.uploadArea.invalidFiles')}
              </p>
            ) : (
              <p className="text-blue-600 font-medium">
                {t('imageEditor.uploadArea.dropHere')}
              </p>
            )
          ) : (
            <>
              <p className="text-gray-700 font-medium">
                {t('imageEditor.uploadArea.dragOrClick')}
              </p>
              <p className="text-sm text-gray-500">
                {t('imageEditor.uploadArea.supportedFormats')}
              </p>
              <p className="text-xs text-gray-400">
                {t('imageEditor.uploadArea.remainingSlots', { 
                  remaining: remainingSlots, 
                  max: maxFiles 
                })}
              </p>
            </>
          )}
        </div>

        {disabled && (
          <div className="absolute inset-0 bg-gray-200 bg-opacity-50 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ImageUploadArea;