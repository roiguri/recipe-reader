import React from 'react';
import Card from '../ui/Card';

/**
 * Metadata component displays recipe metadata
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data object
 */
const Metadata = ({ recipe }) => {
  const { description, servings, prepTime, cookTime, totalTime } = recipe;
  const isHebrew = text => /[\u0590-\u05FF]/.test(text);
  const formatTime = (minutes) => {
    if (!minutes) return 'Not specified';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };
  
  // If there are no metadata items to display, return null
  if (!description && !servings && !prepTime && !cookTime && !totalTime) {
    return null;
  }
  
  return (
    <Card variant="highlight" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {description && (
        <div className="lg:col-span-2">
          <div className="text-sm font-medium text-[#994d51] mb-1">Description</div>
          <div className="text-sm text-[#1b0e0e]" style={{ direction: isHebrew(description) ? 'rtl' : 'ltr' }}>
            {description}
          </div>
        </div>
      )}
      {servings && (
        <div>
          <div className="text-sm font-medium text-[#994d51] mb-1">Servings</div>
          <div className="text-sm text-[#1b0e0e]">{servings}</div>
        </div>
      )}
      {prepTime && (
        <div>
          <div className="text-sm font-medium text-[#994d51] mb-1">Prep Time</div>
          <div className="text-sm text-[#1b0e0e]">{formatTime(prepTime)}</div>
        </div>
      )}
      {cookTime && (
        <div>
          <div className="text-sm font-medium text-[#994d51] mb-1">Cook Time</div>
          <div className="text-sm text-[#1b0e0e]">{formatTime(cookTime)}</div>
        </div>
      )}
      {totalTime && (
        <div>
          <div className="text-sm font-medium text-[#994d51] mb-1">Total Time</div>
          <div className="text-sm text-[#1b0e0e]">{formatTime(totalTime)}</div>
        </div>
      )}
    </Card>
  );
};

export default Metadata; 