import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';

/**
 * RecipeInfoCard component displays the recipe metadata
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data
 * @param {number} props.confidenceScore - Confidence score of extraction (0-1)
 * @param {number} props.processingTime - Processing time in seconds
 * @param {Function} props.onStartOver - Function to start over
 */
const RecipeInfoCard = ({ 
  recipe, 
  confidenceScore, 
  processingTime, 
  onStartOver 
}) => {
  const { t } = useTranslation();
  const isHebrew = text => /[\u0590-\u05FF]/.test(text);
  const hasHebrewContent = isHebrew(recipe.name) || (Array.isArray(recipe.ingredients) && recipe.ingredients.some(ing => isHebrew(ing.item)));
  
  return (
    <Card className="mb-3 md:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-2xl font-bold text-[#1b0e0e] mb-1" style={{ direction: hasHebrewContent ? 'rtl' : 'ltr' }}>
            {recipe.name}
          </h2>
          {recipe.category && (
            <div className="text-xs md:text-sm text-[#994d51] mb-2" style={{ direction: isHebrew(recipe.category) ? 'rtl' : 'ltr' }}>
              {t(`resultDisplay.categories.${recipe.category}`, recipe.category)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-[#994d51]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {Math.round(confidenceScore * 100)}% {t('resultDisplay.confidence')}
            </span>
            <span>{t('resultDisplay.processingTime', { time: processingTime.toFixed(2) })}</span>
          </div>
        </div>
        <button
          onClick={onStartOver}
          className="px-3 py-1 md:px-6 md:py-2 text-sm md:text-base bg-white border border-[#994d51] text-[#994d51] rounded-md hover:bg-[#fcf8f8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#994d51]"
        >
          {t('common.processAnother')}
        </button>
      </div>
    </Card>
  );
};

export default RecipeInfoCard; 