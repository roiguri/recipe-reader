import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';
import Button from '../ui/Button';
import HistoryRecipeCard from './HistoryRecipeCard';

/**
 * HistorySection component for displaying recipe history with time-based grouping
 */
const HistorySection = ({ 
  historyRecipes, 
  historyLoading, 
  groupRecipesByTime, 
  handleSaveToCollection, 
  handleCardClick, 
  getStatusIndicator,
  onNavigateHome,
  // Filter props
  searchTerm,
  selectedCategory,
  selectedSourceType
}) => {
  const { t } = useTranslation();

  // Filter recipes before grouping by time
  const filteredRecipes = historyRecipes.filter(recipe => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const titleMatch = (recipe.title || recipe.processed_recipe?.name || '').toLowerCase().includes(searchLower);
      const ingredientsMatch = recipe.processed_recipe?.ingredients?.some(
        ingredient => {
          // Handle both string ingredients and object ingredients
          const ingredientText = typeof ingredient === 'string' 
            ? ingredient 
            : ingredient?.name || ingredient?.ingredient || '';
          return ingredientText.toLowerCase().includes(searchLower);
        }
      ) || false;
      if (!titleMatch && !ingredientsMatch) return false;
    }

    // Category filter
    if (selectedCategory) {
      const recipeCategory = recipe.processed_recipe?.category || recipe.processed_recipe?.cuisine || '';
      if (recipeCategory !== selectedCategory) return false;
    }

    // Source type filter
    if (selectedSourceType && recipe.source_type !== selectedSourceType) {
      return false;
    }

    return true;
  });

  if (historyLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ANIMATION_CONFIG.DEFAULT}
        className="flex flex-col items-center justify-center min-h-[200px] p-8"
      >
        <div className="flex items-center gap-3 text-[#4b2c2c]">
          <div className="w-6 h-6 border-2 border-[#994d51] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg">{t('common.loading')}</span>
        </div>
      </motion.div>
    );
  }

  // Show appropriate empty state
  if (historyRecipes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ANIMATION_CONFIG.DEFAULT}
        className="flex flex-col items-center justify-center min-h-[300px] p-8"
      >
        <div className="text-center max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-[#1b0e0e] mb-4">
            {t('myRecipes.history.empty')}
          </h3>
          <p className="text-[#4b2c2c] mb-6">
            {t('myRecipes.history.emptyDesc')}
          </p>
          <Button onClick={onNavigateHome}>
            {t('myRecipes.startCooking')}
          </Button>
        </div>
      </motion.div>
    );
  }

  if (filteredRecipes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ANIMATION_CONFIG.DEFAULT}
        className="flex flex-col items-center justify-center min-h-[300px] p-8"
      >
        <div className="text-center max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-[#1b0e0e] mb-4">
            {t('myRecipes.noResultsFound')}
          </h3>
          <p className="text-[#4b2c2c] mb-6">
            {t('myRecipes.tryDifferentFilter')}
          </p>
        </div>
      </motion.div>
    );
  }

  const timeGroups = groupRecipesByTime(filteredRecipes);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION_CONFIG.DEFAULT}
      className="space-y-8"
    >
      {/* Today */}
      {timeGroups.today.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#1b0e0e] mb-4">
            {t('myRecipes.history.today')}
          </h3>
          <div className="space-y-3">
            {timeGroups.today.map(recipe => (
              <HistoryRecipeCard
                key={recipe.id}
                recipe={recipe}
                onSaveToCollection={handleSaveToCollection}
                onRecipeClick={handleCardClick}
                getStatusIndicator={getStatusIndicator}
              />
            ))}
          </div>
        </div>
      )}

      {/* Yesterday */}
      {timeGroups.yesterday.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#1b0e0e] mb-4">
            {t('myRecipes.history.yesterday')}
          </h3>
          <div className="space-y-3">
            {timeGroups.yesterday.map(recipe => (
              <HistoryRecipeCard
                key={recipe.id}
                recipe={recipe}
                onSaveToCollection={handleSaveToCollection}
                onRecipeClick={handleCardClick}
                getStatusIndicator={getStatusIndicator}
              />
            ))}
          </div>
        </div>
      )}

      {/* This Week */}
      {timeGroups.thisWeek.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#1b0e0e] mb-4">
            {t('myRecipes.history.thisWeek')}
          </h3>
          <div className="space-y-3">
            {timeGroups.thisWeek.map(recipe => (
              <HistoryRecipeCard
                key={recipe.id}
                recipe={recipe}
                onSaveToCollection={handleSaveToCollection}
                onRecipeClick={handleCardClick}
                getStatusIndicator={getStatusIndicator}
              />
            ))}
          </div>
        </div>
      )}

      {/* Older */}
      {timeGroups.older.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#1b0e0e] mb-4">
            {t('myRecipes.history.older')}
          </h3>
          <div className="space-y-3">
            {timeGroups.older.map(recipe => (
              <HistoryRecipeCard
                key={recipe.id}
                recipe={recipe}
                onSaveToCollection={handleSaveToCollection}
                onRecipeClick={handleCardClick}
                getStatusIndicator={getStatusIndicator}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default HistorySection;