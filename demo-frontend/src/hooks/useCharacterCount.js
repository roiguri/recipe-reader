import { useState, useEffect } from 'react';

/**
 * Custom hook for character counting with validation
 * @param {string} text - Text to count
 * @param {Object} options - Options object
 * @param {number} options.minChars - Minimum character count
 * @param {number} options.maxChars - Maximum character count
 * @param {number} options.recommendedChars - Recommended character count
 * @returns {Object} - Character count state and validation
 */
const useCharacterCount = (
  text, 
  { 
    minChars = 50, 
    maxChars = 10000, 
    recommendedChars = 500 
  } = {}
) => {
  const [charCount, setCharCount] = useState(0);
  const [isValid, setIsValid] = useState(false);
  const [warningMessage, setWarningMessage] = useState(null);
  
  // Update character count
  useEffect(() => {
    setCharCount(text.length);
  }, [text]);
  
  // Validate and set messages
  useEffect(() => {
    const trimmedLength = text.trim().length;
    const textLength = text.length;
    
    // Update validity
    setIsValid(trimmedLength >= minChars && textLength <= maxChars);
    
    // Set warning message
    if (textLength === 0) {
      setWarningMessage(null);
    } else if (textLength < minChars) {
      setWarningMessage(`Need ${minChars - textLength} more characters for better results`);
    } else if (textLength > maxChars) {
      setWarningMessage(`Text too long by ${textLength - maxChars} characters. Please shorten.`);
    } else {
      setWarningMessage(null);
    }
  }, [text, minChars, maxChars]);
  
  return {
    charCount,
    isValid,
    warningMessage,
    isBelowMin: text.length > 0 && text.length < minChars,
    isAboveMax: text.length > maxChars,
    isRecommended: text.length >= recommendedChars,
  };
};

export default useCharacterCount; 