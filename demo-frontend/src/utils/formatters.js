/**
 * Format minutes into human-readable time format
 * @param {number} minutes - Minutes to format
 * @param {Function} t - Translation function (optional, for localization)
 * @returns {string} - Formatted time string
 */
export const formatTime = (minutes, t = null) => {
  if (minutes == null) {
    return t ? t('common.notSpecified') : 'Not specified';
  }
  
  if (t) {
    // Localized version
    if (minutes < 60) return t('common.timeMinutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const hoursText = t('common.timeHours', { count: hours });
    const minutesText = mins > 0 ? t('common.timeMinutes', { count: mins }) : '';
    return mins > 0 
      ? t('common.timeHoursMinutes', { hours: hoursText, minutes: minutesText })
      : hoursText;
  } else {
    // Original English-only version (fallback)
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
};

/**
 * Format ingredients into a text list
 * @param {Array} ingredients - Array of ingredient objects
 * @returns {string} - Formatted ingredients text
 */
export const formatIngredients = (ingredients) => {
  return ingredients
    .map(ing => `• ${ing.amount} ${ing.unit} ${ing.item}`)
    .join('\n');
};

/**
 * Format instructions into a text list
 * @param {Array} instructions - Array of instruction strings or stages
 * @param {Array} [stages] - Array of stage objects (optional)
 * @returns {string} - Formatted instructions text
 */
export const formatInstructions = (instructions, stages) => {
  if (stages) {
    return stages
      .map((stage) => 
        `${stage.title}:\n${stage.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}`
      )
      .join('\n\n');
  }
  
  return instructions
    .map((inst, idx) => `${idx + 1}. ${inst}`)
    .join('\n');
};

/**
 * Get total time by always calculating from prepTime + cookTime
 * @param {Object} recipe - Recipe object with timing fields
 * @returns {number|null} - Calculated total time in minutes or null if both components are undefined
 */
export const getTotalTime = (recipe) => {
  const { prepTime, cookTime } = recipe;
  
  // If both are undefined/null, return null (show "Not specified")
  if (prepTime == null && cookTime == null) {
    return null;
  }
  
  // Otherwise, calculate sum (treating null/undefined as 0)
  return (prepTime || 0) + (cookTime || 0);
};

/**
 * Check if text contains Hebrew characters
 * @param {string} text - Text to check
 * @returns {boolean} - True if text contains Hebrew characters
 */
export const isHebrew = (text) => {
  if (!text) return false;
  return /[\u0590-\u05FF]/.test(text);
};

/**
 * Validate text against minimum and maximum limits
 * @param {string} text - Text to validate
 * @param {number} minChars - Minimum character count
 * @param {number} maxChars - Maximum character count
 * @returns {Object} - Validation result object
 */
export const validateText = (text, minChars, maxChars) => {
  const safeText = text || '';
  const trimmedLength = safeText.trim().length;
  const textLength = safeText.length;
  
  if (!trimmedLength) {
    return { 
      isValid: false,
      error: 'Please enter some text' 
    };
  }
  
  if (trimmedLength < minChars) {
    return { 
      isValid: false,
      error: `Please enter at least ${minChars} characters for better results` 
    };
  }
  
  if (textLength > maxChars) {
    return { 
      isValid: false,
      error: `Text is too long. Please limit to ${maxChars} characters` 
    };
  }
  
  return { isValid: true, error: null };
};

/**
 * Generate a sanitized filename for PDF export from recipe name
 * @param {string} recipeName - Recipe name to generate filename from
 * @param {boolean} includeTimestamp - Whether to include timestamp suffix
 * @returns {string} - Sanitized filename suitable for PDF export
 */
export const generatePdfFilename = (recipeName, includeTimestamp = false) => {
  // Fallback for empty or undefined recipe names
  if (!recipeName || !recipeName.trim()) {
    const baseFilename = 'recipe';
    return includeTimestamp 
      ? `${baseFilename}_${Date.now()}`
      : baseFilename;
  }

  // Start with trimmed recipe name
  let filename = recipeName.trim();
  
  // Remove or replace special characters while preserving Hebrew
  filename = filename
    // Remove characters that are problematic in filenames
    .replace(/[<>:"|?*]/g, '')
    // Replace forward/back slashes with dashes
    .replace(/[/\\]/g, '-')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Replace spaces with underscores
    .replace(/\s/g, '_')
    // Remove other special punctuation but keep Hebrew, letters, numbers, underscores, dashes
    .replace(/[^\u0590-\u05FF\w\-_]/g, '')
    // Remove multiple consecutive underscores/dashes
    .replace(/[_-]+/g, '_')
    // Remove leading/trailing underscores or dashes
    .replace(/^[_-]+|[_-]+$/g, '');

  // Limit length to 50 characters
  if (filename.length > 50) {
    filename = filename.substring(0, 50);
    // Remove trailing underscore if it was cut off mid-word
    filename = filename.replace(/[_-]+$/, '');
  }
  
  // Final fallback if sanitization resulted in empty string
  if (!filename) {
    filename = 'recipe';
  }
  
  // Add timestamp if requested
  if (includeTimestamp) {
    const timestamp = Date.now();
    filename = `${filename}_${timestamp}`;
  }
  
  return filename;
};

/**
 * Detect browser and print capabilities for cross-browser compatibility
 * @returns {Object} Browser information and print capabilities
 */
export const detectBrowserPrintCapabilities = () => {
  const userAgent = navigator.userAgent;
  // Use userAgent for platform detection to avoid deprecation warning
  const platformInfo = userAgent;
  
  // Detect browser type
  const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isEdge = /Edge/.test(userAgent) || /Edg\//.test(userAgent);
  const isIE = /MSIE|Trident/.test(userAgent);
  
  // Detect operating system from userAgent
  const isWindows = /Win/.test(platformInfo);
  const isMac = /Mac/.test(platformInfo);
  const isLinux = /Linux/.test(platformInfo);
  
  // Determine print-to-PDF capability level
  let printCapability = 'unknown';
  let printDialogSupport = 'basic';
  
  if (isChrome) {
    printCapability = 'excellent'; // Native print-to-PDF, full styling support
    printDialogSupport = 'advanced';
  } else if (isEdge) {
    printCapability = 'excellent'; // Similar to Chrome, full support
    printDialogSupport = 'advanced';
  } else if (isFirefox) {
    printCapability = 'good'; // Good print support, some CSS limitations
    printDialogSupport = 'good';
  } else if (isSafari) {
    printCapability = 'native'; // Native macOS print, good quality
    printDialogSupport = 'native';
  } else if (isIE) {
    printCapability = 'limited'; // Limited CSS support
    printDialogSupport = 'basic';
  }
  
  return {
    browser: {
      isChrome,
      isFirefox,
      isSafari,
      isEdge,
      isIE,
      name: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : isIE ? 'IE' : 'Unknown'
    },
    os: {
      isWindows,
      isMac,
      isLinux,
      name: isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : 'Unknown'
    },
    printCapability,
    printDialogSupport,
    features: {
      printColorAdjust: isChrome || isEdge || isSafari,
      flexboxPrint: isChrome || isEdge || isFirefox,
      gridPrint: isChrome || isEdge || isFirefox || isSafari, // Modern browsers support CSS Grid in print
      customFonts: !isIE,
      backgroundPrint: isChrome || isEdge || isSafari
    }
  };
}; 