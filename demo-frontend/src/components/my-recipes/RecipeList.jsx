import React, { useState, useMemo } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import RecipeCard from './RecipeCard';

/**
 * RecipeList component - Displays a filterable and sortable list of recipes
 * 
 * @param {Object} props
 * @param {Array} props.recipes - Array of recipe objects
 * @param {Function} props.onRecipeClick - Recipe click handler
 * @param {Function} props.onRecipeAction - Recipe action handler (action, recipe)
 * @param {Object} props.filter - Filter configuration { search, category, sourceType }
 * @param {string} props.sort - Sort configuration ('newest', 'oldest', 'name', 'category')
 * @param {Object} props.expandedRecipe - Expanded recipe state for animations
 * @param {boolean} props.showCards - Animation state for card visibility
 * @param {string} props.className - Additional CSS classes
 */
const RecipeList = ({ 
  recipes, 
  onRecipeClick, 
  onRecipeAction,
  filter = { search: '', category: '', sourceType: '' },
  sort = 'newest',
  expandedRecipe = null,
  showCards = true,
  className = ""
}) => {
  const { t } = useTranslation();
  
  // Filter and sort recipes
  const filteredAndSortedRecipes = useMemo(() => {
    let filtered = [...recipes];
    
    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(recipe => {
        const title = recipe.title || recipe.processed_recipe?.name || '';
        const category = recipe.processed_recipe?.category || recipe.processed_recipe?.cuisine || '';
        return title.toLowerCase().includes(searchLower) || 
               category.toLowerCase().includes(searchLower);
      });
    }
    
    // Apply category filter
    if (filter.category) {
      filtered = filtered.filter(recipe => {
        const category = recipe.processed_recipe?.category || recipe.processed_recipe?.cuisine || '';
        return category.toLowerCase().includes(filter.category.toLowerCase());
      });
    }
    
    // Apply source type filter
    if (filter.sourceType) {
      filtered = filtered.filter(recipe => recipe.source_type === filter.sourceType);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name':
          const nameA = a.title || a.processed_recipe?.name || '';
          const nameB = b.title || b.processed_recipe?.name || '';
          return nameA.localeCompare(nameB);
        case 'category':
          const catA = a.processed_recipe?.category || a.processed_recipe?.cuisine || '';
          const catB = b.processed_recipe?.category || b.processed_recipe?.cuisine || '';
          return catA.localeCompare(catB);
        case 'newest':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
    
    return filtered;
  }, [recipes, filter, sort]);

  // Create action handlers for recipe cards
  const createRecipeActions = (recipe) => [
    {
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
        </svg>
      ),
      label: t('myRecipes.viewSource'),
      onClick: () => onRecipeAction('viewSource', recipe),
      className: 'text-[#4b2c2c] hover:bg-[#e7d0d1]'
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
        </svg>
      ),
      label: t('myRecipes.delete'),
      onClick: () => onRecipeAction('delete', recipe),
      className: 'text-red-600 hover:bg-red-50'
    }
  ];

  if (filteredAndSortedRecipes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[200px] p-8 ${className}`}>
        <div className="text-center">
          <svg className="w-16 h-16 text-[#994d51] opacity-50 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V9H7V7M7,11H17V13H7V11M7,15H13V17H7V15Z"/>
          </svg>
          <h3 className="text-lg font-semibold text-[#1b0e0e] mb-2">
            {filter.search || filter.category || filter.sourceType ? 
              t('myRecipes.noResultsFound') : 
              t('myRecipes.empty')
            }
          </h3>
          <p className="text-[#4b2c2c] text-sm">
            {filter.search || filter.category || filter.sourceType ? 
              t('myRecipes.tryDifferentFilter') : 
              t('myRecipes.emptyDesc')
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Recipes Grid */}
      <div className="relative" style={{ overflow: expandedRecipe ? 'visible' : 'hidden' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-2 md:p-4">
          <LayoutGroup>
            {filteredAndSortedRecipes.map((recipe) => {
              const isExpanded = expandedRecipe === recipe.id;
              
              if (isExpanded) {
                // Don't render the card version when expanded - parent handles expanded view
                return null;
              }
              
              return (
                <motion.div
                  key={`card-${recipe.id}`}
                  animate={{
                    opacity: showCards ? 1 : 0,
                    scale: showCards ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <RecipeCard
                    recipe={recipe}
                    onClick={() => onRecipeClick(recipe.id)}
                    layoutId={recipe.id}
                    actions={createRecipeActions(recipe)}
                  />
                </motion.div>
              );
            })}
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
};

export default RecipeList;