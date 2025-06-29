import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { createRequestController, APIError } from '../../utils/api';
import { secureProcessRecipeUrl, checkRequestPermission, getErrorDisplayInfo, ExtractionError } from '../../utils/secureApi';
import ResultDisplay from '../ResultDisplay/index';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';
import Card from '../ui/Card';
import Button from '../ui/Button';
import QuotaExceeded from '../QuotaExceeded';
import SignInModal from '../auth/SignInModal';
import { useRateLimit } from '../../hooks/useRateLimit';

// Import sub-components
import UrlInput from './UrlInput';
import useUrlValidation from './useUrlValidation';

const UrlProcessor = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const auth = useAuth();
  const rateLimit = useRateLimit();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showQuotaExceeded, setShowQuotaExceeded] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [savedFormData, setSavedFormData] = useState(null);
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

  // Restore form data after sign-in
  useEffect(() => {
    if (auth.isAuthenticated && typeof sessionStorage !== 'undefined') {
      // Check for saved form data in sessionStorage
      const savedData = sessionStorage.getItem('urlProcessor_formData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setUrl(parsedData.url || '');
          sessionStorage.removeItem('urlProcessor_formData');
          // Focus the input after restoration
          setTimeout(() => urlInputRef.current?.focus(), 100);
        } catch (error) {
          console.error('Error parsing saved form data:', error);
        }
      }
      // Clear local state as well
      setSavedFormData(null);
    }
  }, [auth.isAuthenticated]);

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForSubmission()) {
      return;
    }

    // Prevent duplicate requests
    if (isLoading) {
      return;
    }

    // Check authentication and rate limiting with secure API
    const permission = checkRequestPermission(auth, rateLimit);
    if (!permission.canMakeRequest) {
      if (permission.errorType === 'AuthenticationError') {
        // Save current form state to sessionStorage (persists across re-renders)
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('urlProcessor_formData', JSON.stringify({ url }));
          // Save that this card should be expanded after OAuth redirect
          sessionStorage.setItem('app_expandedCard', 'url');
        }
        setSavedFormData({ url });
        setShowSignInModal(true);
        return;
      } else if (permission.errorType === 'RateLimitError') {
        setShowQuotaExceeded(true);
        return;
      } else {
        setError(permission.reason);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    // Create abort controller for timeout and cancellation
    abortControllerRef.current = createRequestController(60000); // 60 seconds for URL processing with retries

    try {
      const response = await secureProcessRecipeUrl(
        url,
        {
          timeout: 30,
          max_retries: 3
        },
        auth,
        rateLimit,
        abortControllerRef.current.signal
      );
      
      setResult(response);
    } catch (err) {
      const errorInfo = getErrorDisplayInfo(err);
      
      if (errorInfo.type === 'authentication') {
        setShowSignInModal(true);
      } else if (errorInfo.type === 'rateLimit') {
        setShowQuotaExceeded(true);
      } else if (err instanceof ExtractionError) {
        setError(t('errors.extractionFailed'));
      } else if (err instanceof APIError) {
        if (err.details?.cancelled) {
          setError(t('errors.cancelled'));
        } else if (err.details?.offline) {
          setError(t('errors.offline'));
        } else if (err.details?.networkError) {
          setError(t('errors.networkError'));
        } else {
          console.error('URL processing error:', err.message);
          setError(t('errors.processingFailed'));
        }
      } else {
        setError(errorInfo.message || t('errors.unexpected'));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
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
        <form onSubmit={handleSubmit} className="space-y-2 md:space-y-4">
          {/* Header */}
          <div className={`text-center mb-3 md:mb-6 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
            <h2 className="text-lg md:text-xl font-bold text-[#1b0e0e] mb-1 md:mb-2">
              {t('urlProcessor.title')}
            </h2>
            <p className="text-xs md:text-sm text-[#994d51] mb-2 md:mb-4">
              {t('urlProcessor.description')}
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
              } ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {validationMessage}
            </motion.div>
          )}

          {/* Error display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 ${isRTL ? 'text-right' : 'text-left'}`}
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCancel();
                  }}
                  className="w-full"
                >
                  {t('urlProcessor.buttons.cancel')}
                </Button>
                <div className={`flex items-center justify-center gap-2 text-[#994d51] text-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="animate-spin w-5 h-5 border-2 border-[#994d51] border-t-transparent rounded-full"></div>
                  {t('urlProcessor.buttons.extracting')}
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
                  {t('urlProcessor.buttons.extract')}
                </Button>
                {url.length > 0 && (
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={handleClear}
                    className="w-full"
                  >
                    {t('urlProcessor.buttons.clear')}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Processing tips */}
          <div className={`mt-6 p-4 bg-[#fcf8f8] border border-[#f3e7e8] rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            <h3 className="font-medium text-[#1b0e0e] mb-2">{t('urlProcessor.tips.title')}</h3>
            <ul className={`text-sm text-[#994d51] space-y-1 ${isRTL ? 'list-disc list-inside' : 'list-disc list-inside'}`}>
              <li>{t('urlProcessor.tips.items.0')}</li>
              <li>{t('urlProcessor.tips.items.1')}</li>
              <li>{t('urlProcessor.tips.items.2')}</li>
              <li>{t('urlProcessor.tips.items.3')}</li>
            </ul>
          </div>
        </form>
        </Card>
      )}
    </motion.div>
  );
};

export default UrlProcessor;