import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';

/**
 * Metadata component displays recipe metadata
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data object
 */
const Metadata = ({ recipe }) => {
  const { t } = useTranslation();
  const { description, servings, prepTime, cookTime, totalTime } = recipe;
  const isHebrew = text => /[\u0590-\u05FF]/.test(text);
  
  const formatTime = (minutes) => {
    if (!minutes) return t('common.notSpecified');
    if (minutes < 60) return t('common.timeMinutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const hoursText = t('common.timeHours', { count: hours });
    const minutesText = mins > 0 ? t('common.timeMinutes', { count: mins }) : '';
    return mins > 0 
      ? t('common.timeHoursMinutes', { hours: hoursText, minutes: minutesText })
      : hoursText;
  };
  
  // If there are no metadata items to display, return null
  if (!description && !servings && !prepTime && !cookTime && !totalTime) {
    return null;
  }
  
  // Count metadata items to determine grid layout
  const metadataItems = [servings, prepTime, cookTime, totalTime].filter(Boolean);
  const getGridCols = () => {
    const count = metadataItems.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  };

  return (
    <Card variant="highlight" className="space-y-4">
      {description && (
        <div className="text-center">
          <div className="text-sm text-[#1b0e0e]" style={{ direction: isHebrew(description) ? 'rtl' : 'ltr' }}>
            {description}
          </div>
        </div>
      )}
      
      {(servings || prepTime || cookTime || totalTime) && (
        <div className={`grid ${getGridCols()} gap-4`}>
          {servings && (
            <div className="text-center">
              <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.servings')}</div>
              <div className="text-sm text-[#1b0e0e]">{servings}</div>
            </div>
          )}
          {prepTime && (
            <div className="text-center">
              <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.prepTime')}</div>
              <div className="text-sm text-[#1b0e0e]">{formatTime(prepTime)}</div>
            </div>
          )}
          {cookTime && (
            <div className="text-center">
              <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.cookTime')}</div>
              <div className="text-sm text-[#1b0e0e]">{formatTime(cookTime)}</div>
            </div>
          )}
          {totalTime && (
            <div className="text-center">
              <div className="text-sm font-medium text-[#994d51] mb-1">{t('resultDisplay.metadata.totalTime')}</div>
              <div className="text-sm text-[#1b0e0e]">{formatTime(totalTime)}</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default Metadata; 