import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { RecipesService } from '../../services/recipesService';

/**
 * SaveRecipeButton component for saving recipes to user's collection
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data to save
 * @param {string} props.sourceType - Source type: 'text', 'url', or 'image'
 * @param {string} props.sourceData - Original input data
 * @param {Function} props.onSaveSuccess - Callback when recipe is saved successfully
 * @param {Function} props.onSaveError - Callback when save fails
 * @param {string} props.className - Additional CSS classes
 */
const SaveRecipeButton = ({ 
  recipe, 
  sourceType = 'text',
  sourceData = '',
  onSaveSuccess, 
  onSaveError, 
  className = "" 
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveRecipe = async () => {
    if (!isAuthenticated) {
      onSaveError?.(t('saveRecipe.authRequired'));
      return;
    }

    if (!recipe) {
      onSaveError?.(t('saveRecipe.noRecipeData'));
      return;
    }

    setIsSaving(true);

    try {
      // First check if a recipe with this source data already exists
      const { data: allRecipes, error: fetchError } = await RecipesService.getAllRecipesWithHistory();
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Find existing recipe with matching source data
      const existingRecipe = allRecipes?.find(r => 
        r.source_type === sourceType && r.source_data === sourceData
      );

      let result;
      if (existingRecipe) {
        // Promote existing recipe to saved
        result = await RecipesService.promoteToSaved(existingRecipe.id);
      } else {
        // Create new recipe with saved status
        result = await RecipesService.saveRecipe(recipe, sourceType, sourceData, null, 'saved');
      }

      const { data, error } = result;

      if (error) {
        console.error('Error saving recipe:', error);
        onSaveError?.(error.message || t('saveRecipe.saveFailed'));
      } else {
        setIsSaved(true);
        onSaveSuccess?.(data);
        
        // Reset saved state after 3 seconds
        setTimeout(() => {
          setIsSaved(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Unexpected error saving recipe:', error);
      onSaveError?.(t('saveRecipe.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      onClick={handleSaveRecipe}
      disabled={isSaving || isSaved}
      className={`
        px-3 py-1 md:px-6 md:py-2 text-sm md:text-base rounded-md 
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#994d51]
        flex items-center gap-2
        ${isSaved 
          ? 'bg-green-500 text-white border border-green-500' 
          : 'bg-[#994d51] text-white border border-[#994d51] hover:bg-[#7a3c40]'
        }
        ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {isSaving ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {t('saveRecipe.saving')}
        </>
      ) : isSaved ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          {t('saveRecipe.saved')}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H11.81C11.42 20.34 11.17 19.6 11.07 18.84C9.5 18.31 8.66 16.6 9.2 15.03C9.61 13.8 10.73 12.97 12 12.97C12.69 12.97 13.33 13.22 13.85 13.66C14.66 12.85 15.8 12.41 17 12.41C18.3 12.41 19.5 12.94 20.36 13.8C20.73 14.17 21 14.64 21 15.17V19C21 20.1 20.1 21 19 21H17V19H19V15.17C19 15.06 18.95 14.96 18.86 14.86C18.37 14.38 17.7 14.1 17 14.1C16.3 14.1 15.63 14.38 15.14 14.86C15.05 14.96 15 15.06 15 15.17V19H13V15.17C13 14.64 13.27 14.17 13.64 13.8C14.22 13.22 14.97 12.91 15.76 12.91H12C11.45 12.91 11 13.36 11 13.91C11 14.46 11.45 14.91 12 14.91H13V16.59H12C10.34 16.59 9 15.25 9 13.59C9 11.93 10.34 10.59 12 10.59H17C18.66 10.59 20 11.93 20 13.59V15.17C20 16.28 19.28 17.2 18.24 17.68C18.09 18.11 17.88 18.5 17.61 18.84H19C20.1 18.84 21 17.94 21 16.84V5C21 3.9 20.1 3 19 3H17ZM12 7H7V5H12V7ZM17 9H7V11H17V9Z"/>
          </svg>
          {t('saveRecipe.save')}
        </>
      )}
    </button>
  );
};

export default SaveRecipeButton;