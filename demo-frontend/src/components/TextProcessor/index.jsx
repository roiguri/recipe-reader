import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { createRequestController, APIError } from '../../utils/api';
import { secureProcessRecipeText, checkRequestPermission, getErrorDisplayInfo, ExtractionError } from '../../utils/secureApi';
import ResultDisplay from '../ResultDisplay/index';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';
import Card from '../ui/Card';
import QuotaExceeded from '../QuotaExceeded';
import SignInModal from '../auth/SignInModal';
import { useRateLimit } from '../../hooks/useRateLimit';

// Import sub-components
import RecipeTextarea from './RecipeTextarea';
import InputGuidelines from './InputGuidelines';
import ActionButtons from './ActionButtons';
import useFormValidation from './useFormValidation';

const TextProcessor = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const auth = useAuth();
  const rateLimit = useRateLimit();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showQuotaExceeded, setShowQuotaExceeded] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [savedFormData, setSavedFormData] = useState(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  const MIN_CHARS = 50;
  const MAX_CHARS = 10000;
  const RECOMMENDED_CHARS = 500;

  // Use the form validation hook
  const { 
    error, 
    setError, 
    charCount, 
    isTextValid, 
    showCharWarning,
    validateForSubmission 
  } = useFormValidation(text, MIN_CHARS, MAX_CHARS);

  // Restore form data after sign-in
  useEffect(() => {
    if (auth.isAuthenticated && typeof sessionStorage !== 'undefined') {
      // Check for saved form data in sessionStorage
      const savedData = sessionStorage.getItem('textProcessor_formData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setText(parsedData.text || '');
          sessionStorage.removeItem('textProcessor_formData');
          // Focus the textarea after restoration
          setTimeout(() => textareaRef.current?.focus(), 100);
        } catch (error) {
          console.error('Error parsing saved form data:', error);
        }
      }
      // Clear local state as well
      setSavedFormData(null);
    }
  }, [auth.isAuthenticated]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForSubmission()) {
      return;
    }

    // Check authentication and rate limiting with secure API
    const permission = checkRequestPermission(auth, rateLimit);
    if (!permission.canMakeRequest) {
      if (permission.errorType === 'AuthenticationError') {
        // Save current form state to sessionStorage (persists across re-renders)
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('textProcessor_formData', JSON.stringify({ text }));
          // Save that this card should be expanded after OAuth redirect
          sessionStorage.setItem('app_expandedCard', 'text');
        }
        setSavedFormData({ text });
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
    abortControllerRef.current = createRequestController(30000);

    try {
      const response = await secureProcessRecipeText(
        text,
        {},
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
        setError(t('errors.extractionFailedText'));
      } else if (err instanceof APIError) {
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
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setResult(null);
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
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
          setTimeout(() => textareaRef.current?.focus(), 100);
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className={`text-center mb-6 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
            <h2 className="text-xl font-bold text-[#1b0e0e] mb-2">
              {t('textProcessor.title')}
            </h2>
            <p className="text-sm text-[#994d51] mb-4">
              {t('textProcessor.description')}
            </p>
          </div>

          {/* Textarea with character counter */}
          <RecipeTextarea 
            value={text}
            onChange={handleTextChange}
            disabled={isLoading}
            maxChars={MAX_CHARS}
            ref={textareaRef}
          />

          {/* Input guidelines */}
          <InputGuidelines 
            charCount={charCount}
            minChars={MIN_CHARS}
            recommendedChars={RECOMMENDED_CHARS}
          />

          {/* Warning messages */}
          {showCharWarning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {text.length < MIN_CHARS ? (
                t('textProcessor.validation.tooShort', { count: MIN_CHARS - text.length })
              ) : (
                t('textProcessor.validation.tooLong', { count: text.length - MAX_CHARS })
              )}
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
          <div className="flex flex-col sm:flex-row gap-3">
            <ActionButtons
              isLoading={isLoading}
              isTextValid={isTextValid}
              hasText={text.length > 0}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onClear={handleClear}
            />
          </div>
        </form>
        </Card>
      )}
    </motion.div>
  );
};

export default TextProcessor; 