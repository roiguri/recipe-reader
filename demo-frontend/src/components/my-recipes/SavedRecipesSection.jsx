import React from 'react';
import { useTranslation } from 'react-i18next';
import RecipeSection from '../ui/RecipeSection';
import RecipeList from './RecipeList';
import Button from '../ui/Button';

/**
 * SavedRecipesSection component for displaying saved recipes
 */
const SavedRecipesSection = ({ 
  recipes, 
  loading, 
  onNavigateHome,
  handleCardClick,
  handleRecipeAction,
  searchTerm,
  selectedCategory,
  selectedSourceType,
  sortBy,
  expandedRecipe,
  showCards
}) => {
  const { t } = useTranslation();

  return (
    <RecipeSection
      title={t('myRecipes.savedRecipes')}
      count={recipes.length}
      loading={loading}
      emptyState={
        <div className="text-center max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-[#1b0e0e] mb-4">
            {t('myRecipes.empty')}
          </h3>
          <p className="text-[#4b2c2c] mb-6">
            {t('myRecipes.emptyDesc')}
          </p>
          <Button onClick={onNavigateHome}>
            {t('myRecipes.startCooking')}
          </Button>
        </div>
      }
    >
      {/* Recipe List */}
      <RecipeList
        recipes={recipes}
        onRecipeClick={handleCardClick}
        onRecipeAction={handleRecipeAction}
        filter={{
          search: searchTerm,
          category: selectedCategory,
          sourceType: selectedSourceType
        }}
        sort={sortBy}
        expandedRecipe={expandedRecipe}
        showCards={showCards}
      />
    </RecipeSection>
  );
};

export default SavedRecipesSection;