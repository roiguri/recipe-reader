import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { processRecipeImage, createRequestController, APIError } from '../../utils/api';
import ResultDisplay from '../ResultDisplay/index';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';
import Card from '../ui/Card';

// Import sub-components
import ImageFileInput from './ImageFileInput';
import ImagePreview from './ImagePreview';
import { useImageValidation } from './useImageValidation';

const ImageProcessor = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
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
      setError('Please select at least one image to process');
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
      
      setResult(response);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.details?.cancelled) {
          setError('Request was cancelled');
        } else if (err.details?.offline) {
          setError('No internet connection. Please check your network and try again.');
        } else if (err.details?.networkError) {
          setError('Cannot connect to the recipe processing service. Please make sure the server is running.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
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
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[#1b0e0e] mb-2">
              Upload Recipe Images
            </h2>
            <p className="text-sm text-[#994d51] mb-2">
              Upload photos of recipe cards, cookbook pages, or handwritten recipes.
            </p>
            <p className="text-xs text-gray-600">
              Supports {getSupportedFormats().join(', ')} • Max {getMaxFileSizeMB()}MB each • Up to {maxFiles} images
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
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <h4 className="font-medium text-blue-900 mb-2">Tips for better results:</h4>
                  <ul className="text-blue-800 space-y-1 list-disc list-inside">
                    <li>Ensure images are clear and well-lit</li>
                    <li>Make sure all text is readable</li>
                    {selectedFiles.length > 1 && (
                      <li>Drag and drop images to reorder pages</li>
                    )}
                    <li>Supports both Hebrew and English text</li>
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
          <div className="flex flex-col sm:flex-row gap-3">
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
                  Process Images
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
                    Clear All
                  </button>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">
                  Processing images... This may take a moment.
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
                  Cancel
                </button>
              </div>
            )}
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

export default ImageProcessor;