import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Custom hook for URL validation
 * @param {string} url - URL to validate
 * @returns {Object} - Validation state and functions
 */
const useUrlValidation = (url) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);

  // Validate URL format
  const isValidUrl = useMemo(() => {
    if (!url || url.trim().length === 0) return false;
    
    try {
      const urlObj = new URL(url.trim());
      // Only allow http and https protocols
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }, [url]);

  // Check if URL looks like it could contain a recipe
  const isLikelyRecipeUrl = useMemo(() => {
    if (!isValidUrl) return false;
    
    const urlLower = url.toLowerCase();
    const recipeKeywords = [
      'recipe', 'cooking', 'kitchen', 'food', 'chef', 'bake', 'cook',
      'ingredient', 'meal', 'dish', 'allrecipes', 'foodnetwork', 'tasty',
      'epicurious', 'simplyrecipes', 'delish', 'food52'
    ];
    
    return recipeKeywords.some(keyword => urlLower.includes(keyword));
  }, [url, isValidUrl]);

  // Get URL validation message
  const getValidationMessage = useMemo(() => {
    if (!url || url.trim().length === 0) {
      return null;
    }
    
    if (!isValidUrl) {
      return t('urlProcessor.validation.invalidUrl');
    }
    
    if (!isLikelyRecipeUrl) {
      return t('urlProcessor.validation.notRecipeUrl');
    }
    
    return null;
  }, [url, isValidUrl, isLikelyRecipeUrl, t]);

  // Validate for form submission
  const validateForSubmission = () => {
    if (!url || url.trim().length === 0) {
      setError(t('urlProcessor.validation.invalidUrl'));
      return false;
    }
    
    if (!isValidUrl) {
      setError(t('urlProcessor.validation.invalidUrl'));
      return false;
    }
    
    setError(null);
    return true;
  };

  // Clear validation error when URL changes and becomes valid
  // Only clear if it's a validation error, not a processing error
  useEffect(() => {
    if (error && isValidUrl && 
        (error.includes('invalid URL') || error.includes('כתובת URL לא תקינה'))) {
      setError(null);
    }
  }, [url, isValidUrl, error]);

  return {
    error,
    setError,
    isValidUrl,
    isLikelyRecipeUrl,
    validationMessage: getValidationMessage,
    validateForSubmission,
    showWarning: isValidUrl && !isLikelyRecipeUrl
  };
};

export default useUrlValidation;