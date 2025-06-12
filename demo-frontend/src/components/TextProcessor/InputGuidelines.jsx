import React from 'react';

/**
 * InputGuidelines component displays guidelines for text input
 * @param {Object} props - Component props
 * @param {number} props.charCount - Current character count
 * @param {number} props.minChars - Minimum character count
 * @param {number} props.recommendedChars - Recommended character count
 */
const InputGuidelines = ({ charCount, minChars, recommendedChars }) => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-[#994d51]/80">
      <span className={`flex items-center gap-1 ${charCount >= minChars ? 'text-green-600' : ''}`}>
        <span className={`w-2 h-2 rounded-full ${charCount >= minChars ? 'bg-green-500' : 'bg-gray-300'}`}></span>
        Minimum {minChars} characters
      </span>
      <span className={`flex items-center gap-1 ${charCount >= recommendedChars ? 'text-green-600' : ''}`}>
        <span className={`w-2 h-2 rounded-full ${charCount >= recommendedChars ? 'bg-green-500' : 'bg-gray-300'}`}></span>
        Recommended {recommendedChars}+ characters
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        Hebrew & English supported
      </span>
    </div>
  );
};

export default InputGuidelines; 