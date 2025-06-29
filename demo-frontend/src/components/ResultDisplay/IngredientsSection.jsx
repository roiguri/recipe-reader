import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew, formatIngredients } from '../../utils/formatters';
import Card from '../ui/Card';
import CopyButton from '../ui/CopyButton';

/**
 * IngredientsSection component displays recipe ingredients
 * @param {Object} props - Component props
 * @param {Array} props.ingredients - Array of ingredient objects
 * @param {Function} props.onCopyToClipboard - Function to copy text to clipboard
 * @param {string|null} props.copiedSection - Currently copied section ID
 */
const IngredientsSection = ({ ingredients, onCopyToClipboard, copiedSection }) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-2 md:mb-4 flex-shrink-0">
        <h3 className="text-base md:text-lg font-bold text-[#1b0e0e]">
          {t('resultDisplay.sections.ingredients')}
        </h3>
        <CopyButton
          content={formatIngredients(ingredients)}
          sectionId="ingredients"
          copiedSection={copiedSection}
          onCopy={onCopyToClipboard}
          title={t('resultDisplay.copy.ingredients')}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto max-h-80">
        {ingredients.map((ingredient, idx) => (
          <div key={idx} className="flex items-center p-2 hover:bg-[#fcf8f8] rounded">
            <span className={`w-2 h-2 bg-[#994d51] rounded-full ${direction === 'rtl' ? 'ml-3' : 'mr-3'} flex-shrink-0`}></span>
            <span className="text-xs md:text-sm text-[#1b0e0e]" style={{ direction: isHebrew(ingredient.item) ? 'rtl' : 'ltr' }}>
              <span className="font-medium">{ingredient.amount} {ingredient.unit}</span> {ingredient.item}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default IngredientsSection; 