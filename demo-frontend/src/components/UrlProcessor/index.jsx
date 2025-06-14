import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { processRecipeUrl, createRequestController, APIError } from '../../utils/api';
import ResultDisplay from '../ResultDisplay/index';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';
import Card from '../ui/Card';
import Button from '../ui/Button';

// Import sub-components
import UrlInput from './UrlInput';
import useUrlValidation from './useUrlValidation';

const UrlProcessor = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const urlInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Use the URL validation hook
  const { 
    error, 
    setError, 
    isValidUrl, 
    validationMessage,
    showWarning,
    validateForSubmission 
  } = useUrlValidation(url);

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForSubmission()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    // Create abort controller for timeout and cancellation
    abortControllerRef.current = createRequestController(45000); // Longer timeout for URL processing

    try {
      const response = await processRecipeUrl(
        url,
        {
          timeout: 30,
          max_retries: 3
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
        setError('An unexpected error occurred. Please try again.');
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

  const handleClear = () => {
    setUrl('');
    setResult(null);
    setError(null);
    if (urlInputRef.current) {
      urlInputRef.current.focus();
    }
  };

  // Show result if we have one
  if (result) {
    return (
      <ResultDisplay 
        result={result} 
        onStartOver={() => {
          setResult(null);
          setError(null);
          setTimeout(() => urlInputRef.current?.focus(), 100);
        }}
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[#1b0e0e] mb-2">
              Extract Recipe from URL
            </h2>
            <p className="text-sm text-[#994d51] mb-4">
              Paste a recipe URL and we'll extract the structured recipe data. Supports most popular recipe websites.
            </p>
          </div>

          {/* URL Input */}
          <UrlInput 
            value={url}
            onChange={handleUrlChange}
            disabled={isLoading}
            isValid={isValidUrl}
            ref={urlInputRef}
          />

          {/* Validation message */}
          {validationMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-3 border rounded-lg text-sm ${
                showWarning 
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {validationMessage}
            </motion.div>
          )}

          {/* Error display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
            >
              {error}
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {isLoading ? (
              <>
                <Button
                  variant="cancel"
                  type="button"
                  onClick={handleCancel}
                  className="w-full"
                >
                  Cancel
                </Button>
                <div className="flex items-center justify-center gap-2 text-[#994d51] text-sm">
                  <div className="animate-spin w-5 h-5 border-2 border-[#994d51] border-t-transparent rounded-full"></div>
                  Extracting recipe from URL...
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={!isValidUrl}
                  className="w-full"
                >
                  Extract from URL
                </Button>
                {url.length > 0 && (
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={handleClear}
                    className="w-full"
                  >
                    Clear URL
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Processing tips */}
          <div className="mt-6 p-4 bg-[#fcf8f8] border border-[#f3e7e8] rounded-lg">
            <h3 className="font-medium text-[#1b0e0e] mb-2">Tips for best results:</h3>
            <ul className="text-sm text-[#994d51] space-y-1 list-disc list-inside">
              <li>Use direct links to recipe pages, not search results or category pages</li>
              <li>Popular recipe websites work best (AllRecipes, Food Network, etc.)</li>
              <li>Processing may take 15-30 seconds depending on the website</li>
              <li>Some websites may require multiple attempts due to rate limiting</li>
            </ul>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

export default UrlProcessor;