import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';
import useClipboard from '../../hooks/useClipboard';
import Card from '../ui/Card';
import CopyButton from '../ui/CopyButton';
import { RecipesService } from '../../services/recipesService';
import { ImageService } from '../../services/imageService';
import { getTotalTime } from '../../utils/formatters';

// Import sub-components
import TabNavigation from './TabNavigation';
import RecipeInfoCard from './RecipeInfoCard';
import IngredientsSection from './IngredientsSection';
import InstructionsSection from './InstructionsSection';
import CommentsSection from './CommentsSection';
import Metadata from './Metadata';
import TagList from './TagList';
import ExportOptions from './ExportOptions';
import RecipeImageSection from './RecipeImageSection';

// Import editable components
import EditableMetadata from './EditableMetadata';
import EditableIngredientsSection from './EditableIngredientsSection';
import EditableInstructionsSection from './EditableInstructionsSection';
import EditableCommentsSection from './EditableCommentsSection';
import EditableTagList from './EditableTagList';
import EditableImageSection from './EditableImageSection';

const ResultDisplay = ({ result, onStartOver, sourceType = 'text', sourceData = '', showActionButtons = true, recipeId = null, onRecipeUpdated = null }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('recipe');
  const [copyToClipboard, copiedSection] = useClipboard();
  const [editedRecipe, setEditedRecipe] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [globalEditingState, setGlobalEditingState] = useState({ component: null, field: null, tempValues: {} });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedRecipeId, setSavedRecipeId] = useState(recipeId);
  const editableImageSectionRef = useRef(null);

  const { recipe, confidence_score, processing_time } = result;

  // Use edited recipe if available, otherwise use original
  const displayRecipe = editedRecipe || recipe;

  // Create normalized recipe for raw display with calculated totalTime
  const normalizedRecipe = {
    ...displayRecipe,
    totalTime: getTotalTime(displayRecipe)
  };

  // Initialize edited recipe when edit tab is first accessed
  const handleTabChange = (tabId) => {
    if (tabId === 'edit' && !editedRecipe) {
      setEditedRecipe(structuredClone(recipe)); // Deep copy
    }
    setActiveTab(tabId);
  };

  // Update edited recipe and mark as having unsaved changes
  const updateEditedRecipe = useCallback((updates) => {
    setEditedRecipe(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  // Handle recipe save success from SaveRecipeButton
  const handleRecipeSaved = useCallback((savedRecipe) => {
    setSavedRecipeId(savedRecipe.id);
    // Notify parent component if callback provided
    if (onRecipeUpdated) {
      onRecipeUpdated(savedRecipe);
    }
  }, [onRecipeUpdated]);

  // Save changes (apply edited recipe as new recipe)
  const saveChanges = async () => {
    if (!editedRecipe) return;
    
    // Clear any previous error
    setSaveError(null);
    
    // If we have a savedRecipeId, persist to database
    if (savedRecipeId) {
      setIsSaving(true);
      try {
        // Handle image operations first if there are any
        let finalRecipe = { ...editedRecipe };
        let hadImageChanges = false;
        
        if (editedRecipe._imageSaveData) {
          hadImageChanges = true;
          const { pendingUploads, imagesToRemove } = editedRecipe._imageSaveData;
          
          // Get current user for image operations
          const { data: user, error: userError } = await ImageService.getCurrentUser();
          if (userError || !user) {
            setSaveError(userError?.message || t('resultDisplay.images.authError'));
            return;
          }
          
          // Delete removed images
          if (imagesToRemove.length > 0) {
            const { error: deleteError } = await ImageService.deleteMultipleImages(
              user.id, 
              savedRecipeId, 
              imagesToRemove
            );
            if (deleteError) {
              console.error('Error deleting images:', deleteError);
              // Continue anyway, don't fail the whole save
            }
          }
          
          // Upload new images
          let uploadedFilenames = [];
          if (pendingUploads.length > 0) {
            const { data: filenames, error: uploadError } = await ImageService.uploadMultipleImages(
              user.id, 
              savedRecipeId, 
              pendingUploads
            );
            
            if (uploadError) {
              setSaveError(uploadError.message || t('resultDisplay.edit.imageUploadError'));
              return;
            }
            
            uploadedFilenames = filenames || [];
          }
          
          // Update the images array in the recipe
          const currentImages = recipe.images || []; // Use original recipe images, not edited
          const remainingImages = currentImages.filter(filename => !imagesToRemove.includes(filename));
          finalRecipe = {
            ...editedRecipe,
            images: [...remainingImages, ...uploadedFilenames]
          };
          
          // Remove the temporary save data
          delete finalRecipe._imageSaveData;
        }
        
        const { data, error } = await RecipesService.updateRecipe(savedRecipeId, finalRecipe);
        
        if (error) {
          setSaveError(error.message || t('resultDisplay.edit.saveError'));
          return;
        }
        
        // Update local state with the saved recipe
        setEditedRecipe(finalRecipe);
        
        // Notify parent component about the update
        if (onRecipeUpdated && data && data[0]) {
          onRecipeUpdated(data[0]);
        }
        
        setHasUnsavedChanges(false);
        
        // Reset image section to reflect new state
        if (hadImageChanges && editableImageSectionRef.current) {
          editableImageSectionRef.current.resetToSavedState();
        }
        
      } catch (err) {
        console.error('Error saving recipe edits:', err);
        setSaveError(t('resultDisplay.edit.saveError'));
      } finally {
        setIsSaving(false);
      }
    } else {
      // For new recipes without recipeId, just clear the unsaved changes flag
      setHasUnsavedChanges(false);
    }
  };

  // Discard changes (reset to original recipe)
  const discardChanges = () => {
    setEditedRecipe(structuredClone(recipe));
    setHasUnsavedChanges(false);
    // Reset image section as well
    if (editableImageSectionRef.current) {
      editableImageSectionRef.current.resetToSavedState();
    }
  };

  // Global editing state management
  const startGlobalEdit = (component, field, currentValue) => {
    // If already editing something else, save it first
    if (globalEditingState.component && globalEditingState.field) {
      saveCurrentEdit();
    }
    
    // Handle case where currentValue is already a tempValues object (for multi-field editing)
    const tempValues = typeof currentValue === 'object' && currentValue !== null 
      ? currentValue 
      : { [field]: currentValue || '' };
    
    setGlobalEditingState({ 
      component, 
      field, 
      tempValues
    });
  };

  const updateGlobalEditValue = (field, value) => {
    setGlobalEditingState(prev => ({
      ...prev,
      tempValues: { ...prev.tempValues, [field]: value }
    }));
  };

  const cancelGlobalEdit = () => {
    setGlobalEditingState({ component: null, field: null, tempValues: {} });
  };

  // Enhanced save function that actually saves ingredient data
  const saveCurrentEdit = useCallback(() => {
    const { component, field, tempValues } = globalEditingState;
    if (!component || !field) return;
    
    if (component === 'ingredients') {
      const index = parseInt(field);
      const amount = tempValues[`${index}-amount`]?.trim() || '';
      const unit = tempValues[`${index}-unit`]?.trim() || '';
      const item = tempValues[`${index}-item`]?.trim() || '';
      
      // Helper function to remove empty ingredients
      const removeEmptyIngredientIfNeeded = (updatedIngredients, targetIndex) => {
        const ingredient = updatedIngredients[targetIndex];
        if (!ingredient) return updatedIngredients;
        
        const isEmpty = !ingredient.item?.trim() && 
                       !ingredient.amount?.trim() && 
                       !ingredient.unit?.trim();
        
        if (isEmpty) {
          return updatedIngredients.filter((_, i) => i !== targetIndex);
        }
        
        return updatedIngredients;
      };
      
      // Update ingredient and remove if empty
      const currentIngredients = editedRecipe?.ingredients || [];
      const newIngredients = [...currentIngredients];
      // Always update the ingredient, even if it might be empty
      newIngredients[index] = { ...newIngredients[index], amount, unit, item };
      const finalIngredients = removeEmptyIngredientIfNeeded(newIngredients, index);
      updateEditedRecipe({ ingredients: finalIngredients });
    }
    
    // Clear the editing state
    setGlobalEditingState({ component: null, field: null, tempValues: {} });
  }, [globalEditingState, editedRecipe, updateEditedRecipe, setGlobalEditingState]);

  useEffect(() => {
    const handleDocumentClick = (e) => {
      // Only handle clicks when we're in edit mode and actively editing something
      if (activeTab !== 'edit' || !globalEditingState.component || !globalEditingState.field) {
        return;
      }

      // Check if the click is within a dropdown container or select element
      const isDropdownClick = e.target.closest('select') || e.target.closest('[data-dropdown-container]');
      if (isDropdownClick) {
        // Allow dropdown interactions without saving
        return;
      }
      
      // Special handling for ingredients - allow navigation within same ingredient
      if (globalEditingState.component === 'ingredients') {
        const editingIndex = parseInt(globalEditingState.field);
        
        // Check if the click is within the currently editing ingredient
        const clickedIngredientElement = e.target.closest('[data-editing-ingredient]');
        const clickedIngredientIndex = clickedIngredientElement ? 
          parseInt(clickedIngredientElement.dataset.editingIngredient) : null;
        
        // If clicking within the same ingredient, allow it (don't save)
        if (clickedIngredientIndex === editingIndex) {
          return;
        }
        
        saveCurrentEdit();
      } else {
        saveCurrentEdit();
      }
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
    };
  }, [activeTab, globalEditingState.component, globalEditingState.field, saveCurrentEdit]);

  // Define tabs
  const tabs = [
    { id: 'recipe', icon: '🍽️' },
    { id: 'edit', icon: '✏️' },
    { id: 'raw', icon: '📋' },
    { id: 'export', icon: '📤' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: ANIMATION_CONFIG.CONTENT_FADE_IN / 1000,
        ease: ANIMATION_CONFIG.CONTENT_EASE 
      }}
className="w-full max-w-6xl mx-auto p-2 md:p-6"
    >
      {/* Recipe header/metadata */}
      <RecipeInfoCard 
        recipe={displayRecipe}
        confidenceScore={confidence_score}
        processingTime={processing_time}
        onStartOver={onStartOver}
        sourceType={sourceType}
        sourceData={sourceData}
        showActionButtons={showActionButtons}
        onRecipeSaved={handleRecipeSaved}
      />

      {/* Tabs container */}
      <Card className="overflow-hidden min-h-[600px] flex flex-col" noPadding>
        {/* Tab navigation */}
        <TabNavigation 
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          tabs={tabs}
          hasUnsavedChanges={hasUnsavedChanges && activeTab === 'edit'}
        />

        {/* Tab content */}
        <div className="p-3 md:p-6 flex-1 overflow-hidden">
          {activeTab === 'recipe' && (
            <div className="space-y-3 md:space-y-6 h-full overflow-y-auto">
              {/* Recipe metadata */}
              <Metadata recipe={displayRecipe} />
              
              {/* Recipe images section */}
              <RecipeImageSection 
                recipe={displayRecipe}
                recipeId={savedRecipeId}
              />
              
              {/* Ingredients section */}
              <IngredientsSection
                ingredients={displayRecipe.ingredients}
                ingredient_stages={displayRecipe.ingredient_stages}
                onCopyToClipboard={copyToClipboard}
                copiedSection={copiedSection}
              />
              
              {/* Instructions section */}
              <InstructionsSection 
                instructions={displayRecipe.instructions}
                stages={displayRecipe.stages}
                onCopyToClipboard={copyToClipboard}
                copiedSection={copiedSection}
              />

              {/* Comments section */}
              <CommentsSection 
                comments={displayRecipe.comments}
                onCopyToClipboard={copyToClipboard}
                copiedSection={copiedSection}
              />

              {/* Tags section */}
              <TagList tags={displayRecipe.tags} />
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="space-y-3 md:space-y-6 h-full overflow-y-auto">
              {/* Edit mode header - always rendered to prevent layout shift */}
              <div className="flex items-center justify-between p-4 rounded-lg transition-colors duration-200 min-h-[74px] md:min-h-[64px]" 
                   style={{
                     backgroundColor: hasUnsavedChanges ? '#fefce8' : '#f9fafb',
                     borderColor: hasUnsavedChanges ? '#fde047' : '#e5e7eb',
                     borderWidth: '1px'
                   }}>
                {hasUnsavedChanges ? (
                  <>
                    <span className="text-sm text-yellow-800">{t('resultDisplay.edit.unsavedChanges')}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={discardChanges}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={saveChanges}
                        disabled={isSaving}
                        className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-2 ${
                          isSaving 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : 'bg-[#994d51] text-white hover:bg-[#7a3c40]'
                        }`}
                      >
                        {isSaving && (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {isSaving ? t('common.saving') : t('common.save')}
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-600">{t('resultDisplay.edit.editingTip')}</span>
                )}
              </div>

              {/* Save error display */}
              {saveError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-sm text-red-800">{saveError}</span>
                </div>
              )}

              {/* Editable Recipe metadata */}
              <EditableMetadata 
                recipe={editedRecipe}
                onUpdate={updateEditedRecipe}
                globalEditingState={globalEditingState}
                onStartEdit={startGlobalEdit}
                onUpdateEdit={updateGlobalEditValue}
                onSaveEdit={saveCurrentEdit}
                onCancelEdit={cancelGlobalEdit}
              />
              
              {/* Editable Images section */}
              <EditableImageSection 
                ref={editableImageSectionRef}
                recipe={editedRecipe}
                recipeId={savedRecipeId}
                onUpdate={updateEditedRecipe}
              />
              
              {/* Editable Ingredients section */}
              <EditableIngredientsSection
                ingredients={editedRecipe?.ingredients || []}
                ingredient_stages={editedRecipe?.ingredient_stages}
                onUpdate={updateEditedRecipe}
                globalEditingState={globalEditingState}
                onStartEdit={startGlobalEdit}
                onUpdateEdit={updateGlobalEditValue}
                onSaveEdit={saveCurrentEdit}
                onCancelEdit={cancelGlobalEdit}
              />
              
              {/* Editable Instructions section */}
              <EditableInstructionsSection 
                instructions={editedRecipe?.instructions}
                stages={editedRecipe?.stages}
                onUpdate={updateEditedRecipe}
                globalEditingState={globalEditingState}
                onStartEdit={startGlobalEdit}
                onUpdateEdit={updateGlobalEditValue}
                onSaveEdit={saveCurrentEdit}
                onCancelEdit={cancelGlobalEdit}
              />

              {/* Editable Comments section */}
              <EditableCommentsSection 
                comments={editedRecipe?.comments}
                onUpdate={updateEditedRecipe}
                globalEditingState={globalEditingState}
                onStartEdit={startGlobalEdit}
                onUpdateEdit={updateGlobalEditValue}
                onSaveEdit={saveCurrentEdit}
                onCancelEdit={cancelGlobalEdit}
              />

              {/* Editable Tags section */}
              <EditableTagList 
                tags={editedRecipe?.tags || []}
                onUpdate={updateEditedRecipe}
                globalEditingState={globalEditingState}
                onStartEdit={startGlobalEdit}
                onUpdateEdit={updateGlobalEditValue}
                onSaveEdit={saveCurrentEdit}
                onCancelEdit={cancelGlobalEdit}
              />
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="h-full overflow-y-auto" dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }}>
              <div className="relative" dir="ltr">
                <pre 
                  className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto max-w-full" 
                  dir="ltr" 
                  style={{ 
                    direction: 'ltr', 
                    textAlign: 'left', 
                    unicodeBidi: 'embed',
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {JSON.stringify(normalizedRecipe, null, 2)}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton
                    content={JSON.stringify(normalizedRecipe, null, 2)}
                    sectionId="raw"
                    copiedSection={copiedSection}
                    onCopy={copyToClipboard}
                    title={t('resultDisplay.copy.json')}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-3 md:space-y-6 h-full overflow-y-auto">
              <ExportOptions 
                recipe={displayRecipe}
                recipeId={savedRecipeId}
                hasUnsavedChanges={hasUnsavedChanges}
                onSaveRecipe={saveChanges}
              />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default ResultDisplay; 