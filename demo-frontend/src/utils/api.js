/**
 * API service for communicating with the FastAPI backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class APIError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Process recipe text using the FastAPI backend
 * @param {string} text - Recipe text to process
 * @param {Object} options - Optional processing parameters
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<Object>} Processed recipe response
 */
export async function processRecipeText(text, options = {}, signal = null) {
  const url = `${API_BASE_URL}/recipe/text`;
  
  const requestBody = {
    text: text.trim(),
    options: options
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal
  };

  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails = null;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
        errorDetails = errorData;
      } catch (parseError) {
        // If we can't parse the error response, use the status text
      }
      
      throw new APIError(errorMessage, response.status, errorDetails);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new APIError('Request was cancelled', 0, { cancelled: true });
    }
    
    if (error instanceof APIError) {
      throw error;
    }
    
    // Network or other fetch errors
    if (!navigator.onLine) {
      throw new APIError('No internet connection', 0, { offline: true });
    }
    
    throw new APIError(
      `Failed to connect to server: ${error.message}`,
      0,
      { networkError: true, originalError: error }
    );
  }
}

/**
 * Process recipe URL using the FastAPI backend
 * @param {string} url - Recipe URL to process
 * @param {Object} options - Optional processing parameters
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<Object>} Processed recipe response
 */
export async function processRecipeUrl(url, options = {}, signal = null) {
  const apiUrl = `${API_BASE_URL}/recipe/url`;
  
  const requestBody = {
    url: url.trim(),
    options: options
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal
  };

  try {
    const response = await fetch(apiUrl, requestOptions);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails = null;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
        errorDetails = errorData;
      } catch (parseError) {
        // If we can't parse the error response, use the status text
      }
      
      throw new APIError(errorMessage, response.status, errorDetails);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new APIError('Request was cancelled', 0, { cancelled: true });
    }
    
    if (error instanceof APIError) {
      throw error;
    }
    
    // Network or other fetch errors
    if (!navigator.onLine) {
      throw new APIError('No internet connection', 0, { offline: true });
    }
    
    throw new APIError(
      `Failed to connect to server: ${error.message}`,
      0,
      { networkError: true, originalError: error }
    );
  }
}

/**
 * Check if the API is available
 * @returns {Promise<boolean>} True if API is available
 */
export async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/docs`, {
      method: 'HEAD',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Create an abort controller for request cancellation
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns {AbortController} Abort controller instance
 */
export function createRequestController(timeoutMs = 30000) {
  const controller = new AbortController();
  
  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  // Clear timeout when signal is aborted for other reasons
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  });
  
  return controller;
}

export { APIError };