/**
 * Secure API service that enforces authentication and rate limiting
 * This wraps the base API service with security guards
 */

import { processRecipeText, processRecipeUrl, processRecipeImage, APIError } from './api';

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

/**
 * Check if user is authenticated and has valid session
 * @param {Object} auth - Auth context object
 * @returns {boolean} True if authenticated with valid session
 */
function validateAuthentication(auth) {
  if (!auth) {
    throw new AuthenticationError('Authentication context not available');
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
 * Check if user has available quota for requests
 * @param {Object} rateLimit - Rate limit context object
 * @returns {boolean} True if user has quota or is admin
 */
function validateRateLimit(rateLimit) {
  if (!rateLimit) {
    throw new RateLimitError('Rate limiting service not available');
  }

  if (rateLimit.loading) {
    throw new RateLimitError('Checking usage quota...');
  }

  if (rateLimit.error) {
    throw new RateLimitError(`Rate limiting error: ${rateLimit.error}`);
  }

  // Admin users have unlimited access
  if (rateLimit.isAdmin) {
    return true;
  }

  // Check if user has remaining quota
  if (!rateLimit.hasQuota) {
    throw new RateLimitError(
      `You have reached your limit of ${rateLimit.requestsLimit} requests. Contact us for API access.`,
      rateLimit.remainingRequests
    );
  }

  return true;
}

/**
 * Perform pre-request security checks
 * @param {Object} auth - Auth context
 * @param {Object} rateLimit - Rate limit context
 * @throws {AuthenticationError|RateLimitError} If security checks fail
 */
function performSecurityChecks(auth, rateLimit) {
  // Check authentication first
  validateAuthentication(auth);
  
  // Then check rate limiting
  validateRateLimit(rateLimit);
}

/**
 * Handle post-request quota increment
 * @param {Object} rateLimit - Rate limit context
 * @param {Function} incrementUsage - Function to increment usage
 * @returns {Promise<void>}
 */
async function handleQuotaIncrement(rateLimit, incrementUsage) {
  // Skip increment for admin users
  if (rateLimit.isAdmin) {
    return;
  }

  try {
    const result = await incrementUsage();
    if (!result.success) {
      console.error('Failed to increment usage:', result.error);
      // Don't throw error here as the API request already succeeded
      // Just log for monitoring purposes
    }
  } catch (error) {
    console.error('Error incrementing usage:', error);
    // Don't throw error here as the API request already succeeded
  }
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
  // Perform security checks before making request
  performSecurityChecks(auth, rateLimit);

  try {
    // Make the API request using existing service
    const result = await processRecipeText(text, options, signal);
    
    // Increment usage quota after successful request
    await handleQuotaIncrement(rateLimit, rateLimit.incrementUsage);
    
    return result;
  } catch (error) {
    // Re-throw API errors as-is, but wrap other errors
    if (error instanceof APIError) {
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
  // Perform security checks before making request
  performSecurityChecks(auth, rateLimit);

  try {
    // Make the API request using existing service
    const result = await processRecipeUrl(url, options, signal);
    
    // Increment usage quota after successful request
    await handleQuotaIncrement(rateLimit, rateLimit.incrementUsage);
    
    return result;
  } catch (error) {
    // Re-throw API errors as-is, but wrap other errors
    if (error instanceof APIError) {
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
  // Perform security checks before making request
  performSecurityChecks(auth, rateLimit);

  try {
    // Make the API request using existing service
    const result = await processRecipeImage(imageData, options, signal);
    
    // Increment usage quota after successful request
    await handleQuotaIncrement(rateLimit, rateLimit.incrementUsage);
    
    return result;
  } catch (error) {
    // Re-throw API errors as-is, but wrap other errors
    if (error instanceof APIError) {
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
    performSecurityChecks(auth, rateLimit);
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

export { AuthenticationError, RateLimitError };