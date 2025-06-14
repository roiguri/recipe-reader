import React from 'react';

/**
 * UrlInput component for recipe URL input
 * @param {Object} props - Component props
 * @param {string} props.value - Current URL value
 * @param {Function} props.onChange - Function to handle URL changes
 * @param {boolean} props.disabled - Disable input if true
 * @param {boolean} props.isValid - Whether the URL is valid
 */
const UrlInput = React.forwardRef(({ 
  value, 
  onChange, 
  disabled = false,
  isValid = false
}, ref) => {
  
  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={ref}
          type="url"
          value={value}
          onChange={onChange}
          placeholder="https://example.com/chocolate-chip-cookies-recipe"
          className="w-full p-4 pr-12 border border-[#f3e7e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:border-transparent transition-all duration-200 text-[#1b0e0e] placeholder-[#994d51]/60"
          disabled={disabled}
          aria-label="Recipe URL input"
          aria-describedby="url-validation-status"
        />
        
        {/* URL validation indicator */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {value && value.trim().length > 0 && (
            <div 
              id="url-validation-status"
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isValid 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}
              aria-label={isValid ? 'Valid URL format' : 'Invalid URL format'}
            >
              {isValid ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

UrlInput.displayName = 'UrlInput';

export default UrlInput;