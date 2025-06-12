import React from 'react';
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
  const isHebrew = text => /[\u0590-\u05FF]/.test(text);
  const hasHebrewContent = isHebrew(recipe.name) || recipe.ingredients.some(ing => isHebrew(ing.item));
  
  return (
    <Card className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1b0e0e] mb-1" style={{ direction: hasHebrewContent ? 'rtl' : 'ltr' }}>
            {recipe.name}
          </h2>
          {recipe.category && (
            <div className="text-sm text-[#994d51] mb-2" style={{ direction: isHebrew(recipe.category) ? 'rtl' : 'ltr' }}>
              {recipe.category}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#994d51]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {Math.round(confidenceScore * 100)}% confidence
            </span>
            <span>Processed in {processingTime.toFixed(2)}s</span>
          </div>
        </div>
        <button
          onClick={onStartOver}
          className="px-6 py-2 bg-white border border-[#994d51] text-[#994d51] rounded-md hover:bg-[#fcf8f8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#994d51]"
        >
          Process Another Recipe
        </button>
      </div>
    </Card>
  );
};

export default RecipeInfoCard; 