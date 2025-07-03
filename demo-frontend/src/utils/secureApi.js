/**
 * Secure API service that enforces authentication and rate limiting
 * This wraps the base API service with security guards
 */

import { processRecipeText, processRecipeUrl, processRecipeImage, APIError, isFailedExtraction } from './api';

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class RateLimitError extends Error {
  constructor(message, remainingRequests = 0) {
    super(message);
    this.name = 'RateLimitError';
    this.remainingRequests = remainingRequests;
  }
}

class ExtractionError extends Error {
  constructor(message, processingType = 'generic') {
    super(message);
    this.name = 'ExtractionError';
    this.processingType = processingType; // 'text', 'url', 'image'
  }
}

/**
 * Check if user is authenticated and has valid session
 * @param {Object} auth - Auth context object
 * @returns {boolean} True if authenticated with valid session
 */
function validateAuthentication(auth) {
  if (!auth) {
    throw new AuthenticationError('Authentication context not available');
  }

  if (auth.loading || auth.sessionStatus === 'checking') {
    throw new AuthenticationError('Checking authentication status...');
  }

  if (!auth.isAuthenticated) {
    throw new AuthenticationError('Please sign in to process recipes');
  }

  if (!auth.isSessionValid) {
    throw new AuthenticationError('Session expired. Please sign in again');
  }

  if (!auth.user || !auth.session) {
    throw new AuthenticationError('Invalid user session. Please sign in again');
  }

  return true;
}

/**
 * Secure wrapper for processRecipeText with authentication and rate limiting
 * @param {string} text - Recipe text to process
 * @param {Object} options - Processing options
 * @param {Object} auth - Auth context from useAuth hook
 * @param {Object} rateLimit - Rate limit context from useRateLimit hook
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object>} Processed recipe response
 */
export async function secureProcessRecipeText(text, options = {}, auth, rateLimit, signal = null) {
  validateAuthentication(auth);

  try {
    const result = await processRecipeText(text, options, signal, auth.session.access_token);
    
    // Check if extraction failed and throw appropriate error
    if (isFailedExtraction(result)) {
      throw new ExtractionError('Extraction failed', 'text');
    }
    return result;
  } catch (error) {
    // Re-throw specific error types as-is
    if (error instanceof APIError || error instanceof ExtractionError) {
      throw error;
    }
    throw new Error(`Recipe processing failed: ${error.message}`);
  }
}

/**
 * Secure wrapper for processRecipeUrl with authentication and rate limiting
 * @param {string} url - Recipe URL to process
 * @param {Object} options - Processing options
 * @param {Object} auth - Auth context from useAuth hook
 * @param {Object} rateLimit - Rate limit context from useRateLimit hook
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object>} Processed recipe response
 */
export async function secureProcessRecipeUrl(url, options = {}, auth, rateLimit, signal = null) {
  validateAuthentication(auth);

  try {
    const result = await processRecipeUrl(url, options, signal, auth.session.access_token);
    
    // Check if extraction failed and throw appropriate error
    if (isFailedExtraction(result)) {
      throw new ExtractionError('Extraction failed', 'url');
    }
    return result;
  } catch (error) {
    // Re-throw specific error types as-is
    if (error instanceof APIError || error instanceof ExtractionError) {
      throw error;
    }
    throw new Error(`Recipe processing failed: ${error.message}`);
  }
}

/**
 * Secure wrapper for processRecipeImage with authentication and rate limiting
 * @param {string|Array<string>} imageData - Base64 image data
 * @param {Object} options - Processing options
 * @param {Object} auth - Auth context from useAuth hook
 * @param {Object} rateLimit - Rate limit context from useRateLimit hook
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object>} Processed recipe response
 */
export async function secureProcessRecipeImage(imageData, options = {}, auth, rateLimit, signal = null) {
  // Validate authentication (server handles rate limiting)
  validateAuthentication(auth);

  try {
    const result = await processRecipeImage(imageData, options, signal, auth?.session?.access_token);
    
    // Check if extraction failed and throw appropriate error
    if (isFailedExtraction(result)) {
      throw new ExtractionError('Extraction failed', 'image');
    }    
    return result;
  } catch (error) {
    // Re-throw specific error types as-is
    if (error instanceof APIError || error instanceof ExtractionError) {
      throw error;
    }
    throw new Error(`Recipe processing failed: ${error.message}`);
  }
}

/**
 * Check if user can make a request (for UI state management)
 * @param {Object} auth - Auth context
 * @param {Object} rateLimit - Rate limit context
 * @returns {Object} Status object with canMakeRequest flag and reason
 */
export function checkRequestPermission(auth, rateLimit) {
  try {
    validateAuthentication(auth);
    return {
      canMakeRequest: true,
      reason: null
    };
  } catch (error) {
    return {
      canMakeRequest: false,
      reason: error.message,
      errorType: error.name
    };
  }
}

/**
 * Get user-friendly error message for display
 * @param {Error} error - Error from secure API functions
 * @returns {Object} Display-friendly error information
 */
export function getErrorDisplayInfo(error) {
  if (error instanceof AuthenticationError) {
    return {
      type: 'authentication',
      title: 'Authentication Required',
      message: error.message,
      actionText: 'Sign In',
      actionType: 'signin'
    };
  }

  if (error instanceof RateLimitError) {
    return {
      type: 'rateLimit',
      title: 'Request Limit Reached',
      message: error.message,
      actionText: 'Contact Us',
      actionType: 'contact',
      remainingRequests: error.remainingRequests
    };
  }

  if (error instanceof ExtractionError) {
    return {
      type: 'extraction',
      title: 'Extraction Failed',
      message: error.message,
      processingType: error.processingType,
      actionText: 'Try Again',
      actionType: 'retry'
    };
  }

  if (error instanceof APIError) {
    return {
      type: 'api',
      title: 'Processing Error',
      message: error.message,
      actionText: 'Try Again',
      actionType: 'retry'
    };
  }

  return {
    type: 'unknown',
    title: 'Error',
    message: error.message || 'An unexpected error occurred',
    actionText: 'Try Again',
    actionType: 'retry'
  };
}

export { AuthenticationError, RateLimitError, ExtractionError };