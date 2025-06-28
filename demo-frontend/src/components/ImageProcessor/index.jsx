import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { processRecipeImage, createRequestController, APIError } from '../../utils/api';
import ResultDisplay from '../ResultDisplay/index';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';
import Card from '../ui/Card';
import QuotaExceeded from '../QuotaExceeded';
import SignInModal from '../auth/SignInModal';
import { useRateLimit } from '../../hooks/useRateLimit';

// Import sub-components
import ImageFileInput from './ImageFileInput';
import ImagePreview from './ImagePreview';
import { useImageValidation } from './useImageValidation';

const ImageProcessor = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { hasQuota, incrementUsage } = useRateLimit();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showQuotaExceeded, setShowQuotaExceeded] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Image validation hook
  const {
    validateAndConvert,
    clearErrors,
    maxFiles,
    getMaxFileSizeMB,
    getSupportedFormats
  } = useImageValidation();

  // Restore form data after sign-in
  useEffect(() => {
    if (isAuthenticated) {
      // Check for saved form data in sessionStorage
      const savedData = sessionStorage.getItem('imageProcessor_formData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          // Note: Files cannot be fully restored from sessionStorage due to security restrictions
          // We'll show a helpful message to the user about re-selecting files
          if (parsedData.fileCount > 0) {
            setError(t('auth.reselectFiles', { count: parsedData.fileCount }));
          }
          sessionStorage.removeItem('imageProcessor_formData');
        } catch (error) {
          console.error('Error parsing saved form data:', error);
        }
      }
    }
  }, [isAuthenticated, t]);

  const handleFilesSelected = (files, errors) => {
    if (errors && errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
      clearErrors();
    }
    
    // Add unique IDs to files to prevent key conflicts
    const filesWithIds = files.map((file, index) => {
      // Create a new File object to avoid modifying the original
      const newFile = new File([file], file.name, {
        type: file.type,
        lastModified: file.lastModified
      });
      // Add the unique ID as a property
      newFile.uniqueId = `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`;
      return newFile;
    });
    
    setSelectedFiles(filesWithIds);
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setError(null);
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setError(null);
    clearErrors();
  };

  const handleReorderFiles = (reorderedFiles) => {
    setSelectedFiles(reorderedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      setError(t('imageProcessor.validation.noImages'));
      return;
    }

    // Check authentication and show sign-in modal if needed
    if (!isAuthenticated) {
      // Save current form state to sessionStorage (can't save actual files, just metadata)
      sessionStorage.setItem('imageProcessor_formData', JSON.stringify({ 
        fileCount: selectedFiles.length,
        fileNames: selectedFiles.map(f => f.name)
      }));
      // Save that this card should be expanded after OAuth redirect
      sessionStorage.setItem('app_expandedCard', 'image');
      setShowSignInModal(true);
      return;
    }

    if (!hasQuota) {
      setShowQuotaExceeded(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    // Create abort controller for timeout and cancellation
    abortControllerRef.current = createRequestController(60000); // 60 seconds for image processing

    try {
      // Convert files to base64
      const conversionResult = await validateAndConvert(selectedFiles);
      
      if (!conversionResult.success) {
        throw new Error(conversionResult.errors.join('\n'));
      }

      // Prepare image data for API
      const imageData = conversionResult.data.length === 1 
        ? conversionResult.data[0].base64  // Single image
        : conversionResult.data.map(item => item.base64); // Multiple images

      // Process the images
      const response = await processRecipeImage(
        imageData,
        {
          format_type: 'structured', // Use structured format for better organization
          max_retries: 3,
          timeout: 60
        },
        abortControllerRef.current.signal
      );
      
      // Increment usage after successful processing
      await incrementUsage();
      
      setResult(response);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.details?.cancelled) {
          setError(t('errors.cancelled'));
        } else if (err.details?.offline) {
          setError(t('errors.offline'));
        } else if (err.details?.networkError) {
          setError(t('errors.networkError'));
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message || t('errors.unexpected'));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setResult(null);
    setError(null);
    setSelectedFiles([]);
    clearErrors();
  };

  // Show result if we have one
  if (result) {
    return (
      <ResultDisplay 
        result={result} 
        onStartOver={handleStartOver}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: ANIMATION_CONFIG.CONTENT_FADE_IN / 1000,
        ease: ANIMATION_CONFIG.CONTENT_EASE 
      }}
      className="w-full"
    >
      {showQuotaExceeded && (
        <QuotaExceeded onClose={() => setShowQuotaExceeded(false)} />
      )}
      
      {showSignInModal && (
        <SignInModal 
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          customMessage={t('auth.signInToProcess')}
        />
      )}
      
      {!showQuotaExceeded && (
        <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className={`text-center mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h2 className="text-xl font-bold text-[#1b0e0e] mb-2">
              {t('imageProcessor.title')}
            </h2>
            <p className="text-sm text-[#994d51] mb-2">
              {t('imageProcessor.description')}
            </p>
            <p className="text-xs text-gray-600">
              {t('imageProcessor.formatInfo', {
                formats: getSupportedFormats().join(', '),
                maxSize: getMaxFileSizeMB(),
                maxFiles: maxFiles
              })}
            </p>
          </div>

          {/* File Input */}
          <ImageFileInput
            onFilesSelected={handleFilesSelected}
            maxFiles={maxFiles}
            disabled={isLoading}
          />

          {/* Image Preview */}
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <ImagePreview
                  files={selectedFiles}
                  onRemoveFile={handleRemoveFile}
                  onClearAll={handleClearAll}
                  onReorderFiles={handleReorderFiles}
                  isProcessing={isLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing Tips */}
          <AnimatePresence>
            {selectedFiles.length > 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  <h4 className="font-medium text-blue-900 mb-2">{t('imageProcessor.tips.title')}</h4>
                  <ul className={`text-blue-800 space-y-1 list-disc ${isRTL ? 'list-inside pr-4' : 'list-inside'}`}>
                    {(() => {
                      const tipItems = t('imageProcessor.tips.items', { returnObjects: true });
                      if (!Array.isArray(tipItems)) return null;
                      return tipItems.map((tip, index) => {
                        // Skip the reorder tip if we don't have multiple files
                        if (index === 2 && selectedFiles.length <= 1) return null;
                        return <li key={index}>{tip}</li>;
                      });
                    })()}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 whitespace-pre-line"
            >
              {error}
            </motion.div>
          )}

          {/* Action buttons */}
          <div className={`flex flex-col ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'} gap-3`}>
            {!isLoading ? (
              <>
                <button
                  type="submit"
                  disabled={selectedFiles.length === 0}
                  className="
                    flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium
                    hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    transition-colors duration-200
                  "
                >
                  {t('imageProcessor.buttons.processImages')}
                </button>
                
                {selectedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="
                      px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium
                      hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                      transition-colors duration-200
                    "
                  >
                    {t('imageProcessor.buttons.clearAll')}
                  </button>
                )}
              </>
            ) : (
              <div className={`flex-1 flex items-center justify-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">
                  {t('imageProcessor.processing')}
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="
                    px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md
                    hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                    transition-colors duration-200
                  "
                >
                  {t('imageProcessor.buttons.cancel')}
                </button>
              </div>
            )}
          </div>
        </form>
        </Card>
      )}
    </motion.div>
  );
};

export default ImageProcessor;