import React from 'react';

/**
 * TagList component displays recipe tags
 * @param {Object} props - Component props
 * @param {Array} props.tags - Array of tag strings
 */
const TagList = ({ tags }) => {
  const isHebrew = text => /[\u0590-\u05FF]/.test(text);
  
  if (!tags || tags.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="px-3 py-1 bg-[#994d51]/10 text-[#994d51] rounded-full text-sm"
          style={{ direction: isHebrew(tag) ? 'rtl' : 'ltr' }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
};

export default TagList; 