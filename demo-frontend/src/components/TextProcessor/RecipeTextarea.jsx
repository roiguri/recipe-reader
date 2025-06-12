import React from 'react';
import CharacterCounter from './CharacterCounter';

/**
 * RecipeTextarea component for recipe text input
 * @param {Object} props - Component props
 * @param {string} props.value - Current textarea value
 * @param {Function} props.onChange - Function to handle text changes
 * @param {boolean} props.disabled - Disable textarea if true
 * @param {number} props.maxChars - Maximum character limit
 * @param {React.RefObject} props.textareaRef - Ref for the textarea element
 */
const RecipeTextarea = ({ 
  value, 
  onChange, 
  disabled = false, 
  maxChars = 10000,
  textareaRef
}) => {
  const isHebrew = text => /[\u0590-\u05FF]/.test(text);
  
  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder="Paste your recipe text here...

Example:
Classic Chocolate Chip Cookies

Ingredients:
- 2 cups all-purpose flour
- 1 tsp baking soda
- 1 tsp salt
- 1 cup butter, softened
- 3/4 cup brown sugar
- 1/2 cup granulated sugar
- 2 large eggs
- 2 tsp vanilla extract
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F...
2. Mix dry ingredients...
3. Cream butter and sugars..."
        className="w-full min-h-[400px] max-h-[600px] p-4 border border-[#f3e7e8] rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:border-transparent transition-all duration-200 text-[#1b0e0e] placeholder-[#994d51]/60"
        style={{
          direction: value && isHebrew(value) ? 'rtl' : 'ltr',
          fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif'
        }}
        disabled={disabled}
      />
      
      <CharacterCounter charCount={value.length} maxChars={maxChars} />
    </div>
  );
};

export default RecipeTextarea; 