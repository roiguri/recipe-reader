import React from 'react';
import { useTranslation } from 'react-i18next';
import { isHebrew, formatTime } from '../../utils/formatters';
import Card from '../ui/Card';

/**
 * Metadata component displays recipe metadata
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data object
 */
const Metadata = ({ recipe }) => {
  const { t, i18n } = useTranslation();
  const { description, servings, prepTime, cookTime, totalTime, difficulty } = recipe;
  
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {difficulty && (
                <div className={`text-center ${!servings ? 'md:col-span-2' : ''}`}>
                  <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.difficulty')}</div>
                  <div className="text-sm text-[#1b0e0e]">{t(`resultDisplay.difficulties.${difficulty}`, difficulty)}</div>
                </div>
              )}
              {servings && (
                <div className={`text-center ${!difficulty ? 'md:col-span-2' : ''}`}>
                  <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.servings')}</div>
                  <div className="text-sm text-[#1b0e0e]">{servings}</div>
                </div>
              )}
            </div>
          )}
          
          {/* Second row: all time fields */}
          {(prepTime || cookTime || totalTime) && (
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${(difficulty || servings) ? 'pt-4 border-t border-[#f3e7e8]' : ''}`}>
              {prepTime && (
                <div className={`text-center ${(() => {
                  const timeFieldsCount = [prepTime, cookTime, totalTime].filter(Boolean).length;
                  if (timeFieldsCount === 1) return 'md:col-span-3';
                  if (timeFieldsCount === 2) return 'md:col-span-1';
                  return '';
                })()}`}>
                  <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.prepTime')}</div>
                  <div className="text-sm text-[#1b0e0e]">{formatTime(prepTime, t)}</div>
                </div>
              )}
              {cookTime && (
                <div className={`text-center ${(() => {
                  const timeFieldsCount = [prepTime, cookTime, totalTime].filter(Boolean).length;
                  if (timeFieldsCount === 1) return 'md:col-span-3';
                  if (timeFieldsCount === 2 && !prepTime) return 'md:col-span-2';
                  if (timeFieldsCount === 2 && !totalTime) return 'md:col-span-2';
                  return '';
                })()}`}>
                  <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.cookTime')}</div>
                  <div className="text-sm text-[#1b0e0e]">{formatTime(cookTime, t)}</div>
                </div>
              )}
              {totalTime && (
                <div className={`text-center ${(() => {
                  const timeFieldsCount = [prepTime, cookTime, totalTime].filter(Boolean).length;
                  if (timeFieldsCount === 1) return 'md:col-span-3';
                  if (timeFieldsCount === 2) return 'md:col-span-2';
                  return '';
                })()}`}>
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