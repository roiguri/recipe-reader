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