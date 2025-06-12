import { useState, useEffect } from 'react';

/**
 * Custom hook for form validation in TextProcessor
 * @param {string} text - The input text to validate
 * @param {number} minChars - Minimum required characters
 * @param {number} maxChars - Maximum allowed characters
 * @returns {Object} - Validation state and error messages
 */
const useFormValidation = (text, minChars = 50, maxChars = 10000) => {
  const [error, setError] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const [isTextValid, setIsTextValid] = useState(false);
  const [showCharWarning, setShowCharWarning] = useState(false);
  
  // Update character count
  useEffect(() => {
    setCharCount(text.length);
  }, [text]);
  
  // Validate text and update state
  useEffect(() => {
    const textLength = text.length;
    const trimmedLength = text.trim().length;
    
    setIsTextValid(trimmedLength >= minChars && textLength <= maxChars);
    setShowCharWarning(textLength > 0 && (textLength < minChars || textLength > maxChars));
    
    // Clear error when text changes
    setError(null);
  }, [text, minChars, maxChars]);
  
  // Function to validate before submission
  const validateForSubmission = () => {
    if (!text.trim()) {
      setError('Please enter some recipe text');
      return false;
    }
    
    if (text.length < minChars) {
      setError(`Please enter at least ${minChars} characters for better results`);
      return false;
    }
    
    if (text.length > maxChars) {
      setError(`Text is too long. Please limit to ${maxChars} characters`);
      return false;
    }
    
    return true;
  };
  
  return {
    error,
    setError,
    charCount,
    isTextValid,
    showCharWarning,
    validateForSubmission
  };
};

export default useFormValidation; 