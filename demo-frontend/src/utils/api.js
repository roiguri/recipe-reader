/**
 * API service for communicating with the FastAPI backend
 */

const API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_VERSION = 'v1';

// Supabase configuration for Edge Functions
const SUPABASE_URL = import.meta.env.REACT_APP_SUPABASE_URL;

class APIError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Handle common API request errors
 * @param {Error} error - The caught error
 * @throws {APIError} Processed API error
 */
function handleRequestError(error) {
  if (error.name === 'AbortError') {
    throw new APIError('Request was cancelled', 0, { cancelled: true });
  }
  
  if (error instanceof APIError) {
    if (error.status === 401 || error.status === 403) {
      throw new APIError('Authentication failed. Please check API configuration.', error.status, error.details);
    }
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

/**
 * Process recipe text using the secure Edge Function proxy
 * @param {string} text - Recipe text to process
 * @param {Object} options - Optional processing parameters
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @param {string} accessToken - JWT access token for authentication
 * @returns {Promise<Object>} Processed recipe response
 */
export async function processRecipeText(text, options = {}, signal = null, accessToken = null) {
  if (!SUPABASE_URL) {
    throw new APIError('Supabase URL not configured. Please set REACT_APP_SUPABASE_URL environment variable.', 500, { configError: true });
  }
  
  const url = `${SUPABASE_URL}/functions/v1/recipe-proxy/text`;
  
  const requestBody = {
    text: text.trim(),
    options: options
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add authentication if token provided
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const requestOptions = {
    method: 'POST',
    headers,
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
        errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
        errorDetails = errorData;
      } catch (parseError) {
        // If we can't parse the error response, use the status text
      }
      
      throw new APIError(errorMessage, response.status, errorDetails);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    handleRequestError(error);
  }
}

/**
 * Process recipe URL using the secure Edge Function proxy
 * @param {string} url - Recipe URL to process
 * @param {Object} options - Optional processing parameters
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @param {string} accessToken - JWT access token for authentication
 * @returns {Promise<Object>} Processed recipe response
 */
export async function processRecipeUrl(url, options = {}, signal = null, accessToken = null) {
  if (!SUPABASE_URL) {
    throw new APIError('Supabase URL not configured. Please set REACT_APP_SUPABASE_URL environment variable.', 500, { configError: true });
  }
  
  const apiUrl = `${SUPABASE_URL}/functions/v1/recipe-proxy/url`;
  
  const requestBody = {
    url: url.trim(),
    options: options
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add authentication if token provided
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const requestOptions = {
    method: 'POST',
    headers,
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
        errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
        errorDetails = errorData;
      } catch (parseError) {
        // If we can't parse the error response, use the status text
      }
      
      throw new APIError(errorMessage, response.status, errorDetails);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    handleRequestError(error);
  }
}

/**
 * Process recipe image(s) using the secure Edge Function proxy
 * @param {string|Array<string>} imageData - Base64 encoded image data (single string or array of strings)
 * @param {Object} options - Optional processing parameters
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @param {string} accessToken - JWT access token for authentication
 * @returns {Promise<Object>} Processed recipe response
 */
export async function processRecipeImage(imageData, options = {}, signal = null, accessToken = null) {
  if (!SUPABASE_URL) {
    throw new APIError('Supabase URL not configured. Please set REACT_APP_SUPABASE_URL environment variable.', 500, { configError: true });
  }
  
  const apiUrl = `${SUPABASE_URL}/functions/v1/recipe-proxy/image`;
  
  const requestBody = {
    image_data: imageData,
    options: options
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add authentication if token provided
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const requestOptions = {
    method: 'POST',
    headers,
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
        errorMessage = errorData.message || errorData.detail || errorMessage;
        errorDetails = errorData;
      } catch (parseError) {
        // If we can't parse the error response, use the status text
      }
      
      throw new APIError(errorMessage, response.status, errorDetails);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    handleRequestError(error);
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

/**
 * Check API version compatibility between frontend and backend
 * @returns {Promise<Object|null>} Version information or null if unavailable
 */
export async function checkAPICompatibility() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/versions`);
    const versions = await response.json();
    
    if (!versions.supported_versions.includes(API_VERSION)) {
      console.warn(`API version ${API_VERSION} may not be supported. Latest: ${versions.latest_version}`);
    }
    
    return versions;
  } catch (error) {
    console.error('Failed to check API version compatibility:', error);
    return null;
  }
}

/**
 * Check if an API response indicates failed recipe extraction
 * @param {Object} response - API response object
 * @returns {boolean} True if extraction failed and fallback result was returned
 */
export function isFailedExtraction(response) {
  if (!response || !response.recipe) {
    return false;
  }

  const { recipe, confidence_score } = response;
  
  // Primary check: extraction-failed tag
  if (recipe.tags && recipe.tags.includes("extraction-failed")) {
    return true;
  }
  
  // Check for very low confidence score (0.2 or below indicates fallback)
  if (confidence_score !== undefined && confidence_score <= 0.2) {
    return true;
  }
  
  // Check for empty ingredients array (common in fallback results)
  if (recipe.ingredients && recipe.ingredients.length === 0) {
    return true;
  }
  
  // Check for specific fallback text patterns
  if (recipe.name === "Recipe Extraction Failed" ||
      (recipe.description && recipe.description.includes("extraction failed")) ||
      (recipe.instructions && Array.isArray(recipe.instructions) && 
       recipe.instructions.some(instruction => instruction.includes("processing failed")))) {
    return true;
  }
  
  // Check for null or empty name (common in pydantic validation failures)
  if (!recipe.name || recipe.name === "null" || recipe.name.trim() === "") {
    return true;
  }
  
  return false;
}

export { APIError };