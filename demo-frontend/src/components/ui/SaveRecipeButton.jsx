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
        flex items-center justify-center h-8 md:h-10
        ${isSaved 
          ? 'bg-green-500 text-white border border-green-500' 
          : 'bg-[#994d51] text-white border border-[#994d51] hover:bg-[#7a3c40]'
        }
        ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {isSaving ? (
        t('saveRecipe.saving')
      ) : isSaved ? (
        t('saveRecipe.saved')
      ) : (
        t('saveRecipe.save')
      )}
    </button>
  );
};

export default SaveRecipeButton;