import React from 'react';
import { useTranslation } from 'react-i18next';
import { isHebrew, formatTime, getTotalTime } from '../../utils/formatters';
import Card from '../ui/Card';

/**
 * Metadata component displays recipe metadata
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data object
 */
const Metadata = ({ recipe }) => {
  const { t, i18n } = useTranslation();
  const { description, servings, prepTime, cookTime, difficulty } = recipe;
  
  const totalTime = getTotalTime(recipe);
  
  // Helper function to get appropriate grid class based on time field count
  const getTimeGridClass = () => {
    const timeFieldsCount = [prepTime, cookTime, totalTime].filter(time => time != null).length;
    switch (timeFieldsCount) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      default: return 'grid-cols-1';
    }
  };
  
  // If there are no metadata items to display, return null
  if (!description && !servings && !prepTime && !cookTime && !totalTime && !difficulty) {
    return null;
  }
  
  return (
    <Card variant="highlight" className="space-y-4">
      {description && (
        <div className="text-center">
          <div className="text-sm text-[#1b0e0e]" style={{ direction: isHebrew(description) ? 'rtl' : 'ltr' }}>
            {description}
          </div>
        </div>
      )}
      
      {(servings || prepTime || cookTime || totalTime || difficulty) && (
        <div className="space-y-4" dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
          {/* First row: difficulty and servings */}
          {(difficulty || servings) && (
            <div className="grid grid-cols-2 gap-4">
              {difficulty && (
                <div className={`text-center ${!servings ? 'col-span-2' : ''}`}>
                  <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.difficulty')}</div>
                  <div className="text-sm text-[#1b0e0e]">{t(`resultDisplay.difficulties.${difficulty}`, difficulty)}</div>
                </div>
              )}
              {servings && (
                <div className={`text-center ${!difficulty ? 'col-span-2' : ''}`}>
                  <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.servings')}</div>
                  <div className="text-sm text-[#1b0e0e]">{servings}</div>
                </div>
              )}
            </div>
          )}
          
          {/* Second row: all time fields */}
          {(prepTime || cookTime || totalTime) && (
            <div className={`grid ${getTimeGridClass()} gap-4 ${(difficulty || servings) ? 'pt-4 border-t border-[#f3e7e8]' : ''}`}>
              {prepTime && (
                <div className="text-center">
                  <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.prepTime')}</div>
                  <div className="text-sm text-[#1b0e0e]">{formatTime(prepTime, t)}</div>
                </div>
              )}
              {cookTime && (
                <div className="text-center">
                  <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.cookTime')}</div>
                  <div className="text-sm text-[#1b0e0e]">{formatTime(cookTime, t)}</div>
                </div>
              )}
              {totalTime != null && (
                <div className="text-center">
                  <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.totalTime')}</div>
                  <div className="text-sm text-[#1b0e0e]">{formatTime(totalTime, t)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default Metadata; 