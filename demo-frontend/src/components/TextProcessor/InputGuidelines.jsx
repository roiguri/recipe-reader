import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * InputGuidelines component displays guidelines for text input
 * @param {Object} props - Component props
 * @param {number} props.charCount - Current character count
 * @param {number} props.minChars - Minimum character count
 * @param {number} props.recommendedChars - Recommended character count
 */
const InputGuidelines = ({ charCount, minChars, recommendedChars }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  
  return (
    <div className={`flex flex-wrap items-center gap-4 text-xs text-[#994d51]/80 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      <span className={`flex items-center gap-1 ${charCount >= minChars ? 'text-green-600' : ''} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <span className={`w-2 h-2 rounded-full ${charCount >= minChars ? 'bg-green-500' : 'bg-gray-300'}`}></span>
        {t('textProcessor.guidelines.items.0')} {minChars}
      </span>
      <span className={`flex items-center gap-1 ${charCount >= recommendedChars ? 'text-green-600' : ''} ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <span className={`w-2 h-2 rounded-full ${charCount >= recommendedChars ? 'bg-green-500' : 'bg-gray-300'}`}></span>
        {t('textProcessor.guidelines.items.3', { min: recommendedChars })}
      </span>
      <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        {t('textProcessor.guidelines.items.1')} & {t('textProcessor.guidelines.items.2')}
      </span>
    </div>
  );
};

export default InputGuidelines; 