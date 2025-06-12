import React from 'react';

/**
 * CharacterCounter component displays the current character count and limits
 * @param {Object} props - Component props
 * @param {number} props.charCount - Current character count
 * @param {number} props.maxChars - Maximum character count allowed
 */
const CharacterCounter = ({ charCount, maxChars }) => {
  return (
    <div className="absolute bottom-2 right-2 text-xs text-[#994d51]/70 bg-white/90 px-2 py-1 rounded">
      {charCount.toLocaleString()}/{maxChars.toLocaleString()}
    </div>
  );
};

export default CharacterCounter; 