import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../utils/formatters';

/**
 * RecipeOptionCard component - styled like OptionCard but for recipes
 */
const RecipeOptionCard = ({ 
  recipe, 
  onClick, 
  layoutId,
  onViewSource,
  onDelete
}) => {
  const { t } = useTranslation();
  
  const getRecipeCategory = () => {
    return recipe.processed_recipe?.category || recipe.processed_recipe?.cuisine || t('myRecipes.uncategorized');
  };

  const getRecipeTotalTime = () => {
    const recipeData = recipe.processed_recipe;
    if (!recipeData) return t('myRecipes.timeUnknown');
    
    // Use the totalTime field directly with formatTime
    if (recipeData.totalTime != null) {
      return formatTime(recipeData.totalTime, t);
    }
    
    return t('myRecipes.timeUnknown');
  };

  const getRecipeIcon = () => {
    // Icon based on source type
    switch (recipe.source_type) {
      case 'url':
        return (
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
        );
      case 'image':
        return (
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>
          </svg>
        );
      default: // text
        return (
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
        );
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const handleActionClick = (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  const title = recipe.title || recipe.processed_recipe?.name || t('myRecipes.untitled');
  const description = `${getRecipeCategory()} • ${getRecipeTotalTime()}`;

  return (
    <motion.div 
      layoutId={layoutId}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={t('aria.optionCard', { title, description })}
      className="flex flex-1 gap-3 rounded-lg border border-[#e7d0d1] bg-[#fcf8f8] p-4 flex-col cursor-pointer min-h-[140px] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#994d51] focus-visible:ring-offset-2 relative"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Title and Action buttons in the same line */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-[#1b0e0e] text-base font-bold leading-tight break-words flex-grow">
          {title}
        </h3>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={(e) => handleActionClick(e, onViewSource)}
            className="p-1.5 text-[#4b2c2c] hover:bg-[#e7d0d1] rounded-md transition-colors"
            title={t('myRecipes.viewSource')}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
            </svg>
          </button>
          <button
            onClick={(e) => handleActionClick(e, onDelete)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title={t('myRecipes.delete')}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 flex-grow">
        <div className="text-[#994d51] text-sm font-normal leading-normal break-words space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#e7d0d1] px-2 py-0.5 rounded-full text-xs">
              {getRecipeCategory()}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
              </svg>
              {getRecipeTotalTime()}
            </span>
          </div>
          <div className="text-xs text-[#994d51] opacity-75">
            <span className="capitalize">{t(`myRecipes.sourceType.${recipe.source_type}`)}</span>
            <span className="mx-1">•</span>
            <span>{new Date(recipe.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RecipeOptionCard;