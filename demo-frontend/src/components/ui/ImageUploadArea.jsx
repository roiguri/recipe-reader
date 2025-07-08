import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import FileDropZone from './FileDropZone';
import { validateFiles } from '../../utils/imageValidation';
import { ImageServiceError } from '../../utils/imageService';

/**
 * Image upload area component with validation and error handling
 * Integrates with imageValidation and imageService utilities
 */
const ImageUploadArea = ({
  onFilesSelected,
  onValidationError,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  disabled = false,
  className = '',
  variant = 'default',
  showValidationSummary = true,
  autoValidate = true
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [validationState, setValidationState] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Accepted MIME types for recipe images
  const acceptedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  const handleFilesSelected = useCallback(async (files) => {
    if (disabled || !files.length) return;

    try {
      setIsValidating(true);
      setValidationState(null);

      let validationResult;
      
      if (autoValidate) {
        // Use comprehensive validation from imageValidation utility
        validationResult = await validateFiles(files);
      } else {
        // Basic validation only
        validationResult = {
          success: true,
          validFiles: files.map(file => ({ file, validation: { success: true } })),
          invalidFiles: [],
          errors: [],
          summary: {
            total: files.length,
            valid: files.length,
            invalid: 0
          }
        };
      }

      setValidationState(validationResult);

      if (validationResult.success) {
        // Pass only the file objects, not the validation wrappers
        const validFiles = validationResult.validFiles.map(item => item.file);
        onFilesSelected(validFiles, validationResult);
      } else {
        // Handle validation errors
        if (onValidationError) {
          onValidationError(validationResult.errors, validationResult);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof ImageServiceError 
        ? error.message 
        : t('imageUpload.errors.validationFailed', { defaultValue: 'File validation failed' });
      
      const errorResult = {
        success: false,
        validFiles: [],
        invalidFiles: files.map(file => ({ 
          file, 
          validation: { 
            success: false, 
            errors: [errorMessage] 
          } 
        })),
        errors: [errorMessage],
        summary: {
          total: files.length,
          valid: 0,
          invalid: files.length
        }
      };

      setValidationState(errorResult);

      if (onValidationError) {
        onValidationError([errorMessage], errorResult);
      }
    } finally {
      setIsValidating(false);
    }
  }, [disabled, autoValidate, onFilesSelected, onValidationError, t]);

  const ValidationSummary = ({ validation }) => {
    if (!validation || !showValidationSummary) return null;

    const { summary, errors, validFiles, invalidFiles } = validation;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mt-4 space-y-3"
      >
        {/* Summary stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">
              {t('imageUpload.validation.validFiles', { 
                count: summary.valid,
                defaultValue: `${summary.valid} valid` 
              })}
            </span>
          </div>
          
          {summary.invalid > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-700">
                {t('imageUpload.validation.invalidFiles', { 
                  count: summary.invalid,
                  defaultValue: `${summary.invalid} invalid` 
                })}
              </span>
            </div>
          )}
        </div>

        {/* Valid files list */}
        {validFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-700">
              {t('imageUpload.validation.validFilesTitle', { defaultValue: 'Ready to upload:' })}
            </h4>
            <div className="space-y-1">
              {validFiles.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate">
                    {item.file.name} ({(item.file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error messages */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-700">
              {t('imageUpload.validation.errorsTitle', { defaultValue: 'Issues found:' })}
            </h4>
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-red-600">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invalid files details */}
        {invalidFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-700">
              {t('imageUpload.validation.invalidFilesTitle', { defaultValue: 'Files with issues:' })}
            </h4>
            <div className="space-y-2">
              {invalidFiles.map((item, index) => (
                <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-red-800 truncate">
                      {item.file.name}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {item.validation.errors.map((error, errorIndex) => (
                      <p key={errorIndex} className="text-xs text-red-700">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const LoadingIndicator = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-4 flex items-center justify-center gap-3 text-sm text-gray-600"
    >
      <div className="w-4 h-4 border-2 border-[#994d51] border-t-transparent rounded-full animate-spin" />
      <span>{t('imageUpload.validating', { defaultValue: 'Validating files...' })}</span>
    </motion.div>
  );

  return (
    <div className={`w-full ${className}`}>
      <FileDropZone
        onFilesSelected={handleFilesSelected}
        accept={acceptedMimeTypes.join(',')}
        multiple={true}
        maxFiles={maxFiles}
        maxFileSize={maxFileSize}
        disabled={disabled || isValidating}
        variant={variant}
        showIcon={true}
        showInstructions={true}
        dragActiveOverlay={true}
      >
        {/* Additional content can be passed as children */}
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            {t('imageUpload.supportedFormats', { 
              defaultValue: 'Supported: JPEG, PNG, WebP, PDF' 
            })}
          </p>
        </div>
      </FileDropZone>

      <AnimatePresence mode="wait">
        {isValidating && <LoadingIndicator />}
        {!isValidating && validationState && (
          <ValidationSummary validation={validationState} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageUploadArea;