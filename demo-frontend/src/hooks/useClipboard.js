import { useState } from 'react';

/**
 * Custom hook for clipboard operations with feedback
 * @param {number} resetDelay - Delay in ms before resetting copied state (default: 2000ms)
 * @returns {Array} - [copy function, copied section state]
 */
const useClipboard = (resetDelay = 2000) => {
  const [copiedSection, setCopiedSection] = useState(null);
  
  /**
   * Copy text to clipboard and set copied section
   * @param {string} text - Text to copy
   * @param {string} section - Section identifier
   * @returns {Promise<boolean>} - Success status
   */
  const copyToClipboard = async (text, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), resetDelay);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  };
  
  return [copyToClipboard, copiedSection];
};

export default useClipboard; 