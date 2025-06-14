import { useState } from 'react';
import { processRecipeText, createRequestController, APIError } from '../utils/api';

/**
 * Custom hook for recipe processing API operations
 * @returns {Object} - API state and functions
 */
const useRecipeProcessor = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [controller, setController] = useState(null);

  /**
   * Process recipe text
   * @param {string} text - Recipe text to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processing result or null if error
   */
  const processRecipe = async (text, options = {}) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    // Create abort controller for timeout and cancellation
    const abortController = createRequestController(30000);
    setController(abortController);
    
    try {
      const response = await processRecipeText(
        text,
        options,
        abortController.signal
      );
      
      setResult(response);
      return response;
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
      return null;
    } finally {
      setIsLoading(false);
      setController(null);
    }
  };
  
  /**
   * Cancel ongoing request
   */
  const cancelRequest = () => {
    if (controller) {
      controller.abort();
    }
  };
  
  /**
   * Reset the state
   */
  const reset = () => {
    setResult(null);
    setError(null);
  };
  
  return {
    processRecipe,
    cancelRequest,
    reset,
    isLoading,
    result,
    error,
    setError,
  };
};

export default useRecipeProcessor; 