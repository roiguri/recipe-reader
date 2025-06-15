import React from 'react';
import { useTranslation } from 'react-i18next';
import CharacterCounter from './CharacterCounter';

/**
 * RecipeTextarea component for recipe text input
 * @param {Object} props - Component props
 * @param {string} props.value - Current textarea value
 * @param {Function} props.onChange - Function to handle text changes
 * @param {boolean} props.disabled - Disable textarea if true
 * @param {number} props.maxChars - Maximum character limit
 */
const RecipeTextarea = React.forwardRef(({ 
  value, 
  onChange, 
  disabled = false, 
  maxChars = 10000
}, ref) => {
  const { t } = useTranslation();
  const isHebrew = text => /[\u0590-\u05FF]/.test(text);
  
  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={t('textProcessor.placeholder')}
        className="w-full min-h-[400px] max-h-[600px] p-4 border border-[#f3e7e8] rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:border-transparent transition-all duration-200 text-[#1b0e0e] placeholder-[#994d51]/60"
        style={{
          direction: value && isHebrew(value) ? 'rtl' : 'ltr',
          fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif'
        }}
        disabled={disabled}
      />
      
      <CharacterCounter charCount={(value || '').length} maxChars={maxChars} />
    </div>
  );
});

export default RecipeTextarea; 