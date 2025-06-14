import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for URL validation
 * @param {string} url - URL to validate
 * @returns {Object} - Validation state and functions
 */
const useUrlValidation = (url) => {
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
      return 'Please enter a valid URL (must start with http:// or https://)';
    }
    
    if (!isLikelyRecipeUrl) {
      return 'This URL doesn\'t appear to be from a recipe website, but we\'ll try to extract recipe content anyway.';
    }
    
    return null;
  }, [url, isValidUrl, isLikelyRecipeUrl]);

  // Validate for form submission
  const validateForSubmission = () => {
    if (!url || url.trim().length === 0) {
      setError('Please enter a recipe URL');
      return false;
    }
    
    if (!isValidUrl) {
      setError('Please enter a valid URL (must start with http:// or https://)');
      return false;
    }
    
    setError(null);
    return true;
  };

  // Clear error when URL changes and becomes valid
  useEffect(() => {
    if (error && isValidUrl) {
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