import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import SaveRecipeButton from '../ui/SaveRecipeButton';

/**
 * RecipeInfoCard component displays the recipe metadata
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data
 * @param {number} props.confidenceScore - Confidence score of extraction (0-1)
 * @param {number} props.processingTime - Processing time in seconds
 * @param {Function} props.onStartOver - Function to start over
 * @param {string} props.sourceType - Source type: 'text', 'url', or 'image'
 * @param {string} props.sourceData - Original input data
 * @param {boolean} props.showActionButtons - Whether to show process another/save buttons (default: true)
 * @param {Function} props.onRecipeSaved - Callback when recipe is saved successfully
 * @param {Object} props.images - Images data from processing result
 */
const RecipeInfoCard = ({ 
  recipe, 
  confidenceScore, 
  processingTime, 
  onStartOver,
  sourceType = 'text',
  sourceData = '',
  showActionButtons = true,
  onRecipeSaved = null,
  images = null
}) => {
  const { t } = useTranslation();
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageType, setSaveMessageType] = useState(''); // 'success' or 'error'
  
  const isHebrew = text => /[\u0590-\u05FF]/.test(text);
  const hasHebrewContent = isHebrew(recipe.name) || (Array.isArray(recipe.ingredients) && recipe.ingredients.some(ing => isHebrew(ing.item)));

  const handleSaveSuccess = (data) => {
    setSaveMessage(t('saveRecipe.saveSuccess'));
    setSaveMessageType('success');
    
    // Notify parent component with saved recipe data
    if (onRecipeSaved && data && data[0]) {
      onRecipeSaved(data[0]);
    }
    
    setTimeout(() => {
      setSaveMessage('');
      setSaveMessageType('');
    }, 4000);
  };

  const handleSaveError = (error) => {
    setSaveMessage(error);
    setSaveMessageType('error');
    setTimeout(() => {
      setSaveMessage('');
      setSaveMessageType('');
    }, 4000);
  };
  
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
        {showActionButtons && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onStartOver}
              className="px-3 py-1 md:px-6 md:py-2 text-sm md:text-base bg-white border border-[#994d51] text-[#994d51] rounded-md hover:bg-[#fcf8f8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#994d51]"
            >
              {t('common.processAnother')}
            </button>
            <SaveRecipeButton
              recipe={recipe}
              sourceType={sourceType}
              sourceData={sourceData}
              images={images}
              onSaveSuccess={handleSaveSuccess}
              onSaveError={handleSaveError}
            />
          </div>
        )}
      </div>
      
      {/* Save message feedback */}
      {saveMessage && (
        <div className={`
          mt-3 p-3 rounded-md text-sm font-medium
          ${saveMessageType === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
          }
        `}>
          {saveMessage}
        </div>
      )}
    </Card>
  );
};

export default RecipeInfoCard; 