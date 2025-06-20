import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew } from '../../utils/formatters';
import Card from '../ui/Card';

// TODO: add content validation
/**
 * Simplified EditableIngredientsSection component with stable focus behavior
 * @param {Object} props - Component props
 * @param {Array} props.ingredients - Array of ingredient objects
 * @param {Function} props.onUpdate - Function to update ingredients
 * @param {Object} props.globalEditingState - Global editing state
 * @param {Function} props.onStartEdit - Function to start editing globally
 * @param {Function} props.onUpdateEdit - Function to update edit value globally
 * @param {Function} props.onSaveEdit - Function to save edit globally
 * @param {Function} props.onCancelEdit - Function to cancel edit globally
 */
const EditableIngredientsSection = ({ 
  ingredients, 
  onUpdate, 
  globalEditingState, 
  onStartEdit, 
  onUpdateEdit, 
  onSaveEdit, 
  onCancelEdit 
}) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  const componentName = 'ingredients';
  const shouldFocusRef = useRef(false);

  // Handle auto-focus when editing starts
  useEffect(() => {
    if (shouldFocusRef.current && globalEditingState.component === componentName && globalEditingState.field) {
      const editingIndex = parseInt(globalEditingState.field);
      const amountInput = document.querySelector(`input[data-ingredient="${editingIndex}"][data-field="amount"]`);
      if (amountInput) {
        amountInput.focus();
      }
      shouldFocusRef.current = false; // Reset the flag
    }
  }, [globalEditingState.component, globalEditingState.field]);

  // Generate stable IDs for ingredients
  const ingredientsWithIds = ingredients.map((ingredient, index) => ({
    ...ingredient,
    id: ingredient.id || `ingredient-${index}`
  }));

  // Start editing an ingredient (track by index, not field)
  const startEditing = (index, ingredientOverride = null) => {
    const ingredient = ingredientOverride || ingredients[index];
    if (!ingredient) {
      console.error(`Cannot start editing: ingredient at index ${index} does not exist`);
      return;
    }
    
    const fieldKey = `${index}`; // Track by ingredient index only
    // Initialize all field values for this ingredient in temp state
    const tempValues = {
      [`${index}-amount`]: ingredient.amount || '',
      [`${index}-unit`]: ingredient.unit || '',
      [`${index}-item`]: ingredient.item || ''
    };
    onStartEdit(componentName, fieldKey, tempValues);
    
    // Set flag to focus the amount field after the next render
    shouldFocusRef.current = true;
  };

  // Helper function to remove empty ingredients synchronously
  const removeEmptyIngredientIfNeeded = (updatedIngredients, index) => {
    const ingredient = updatedIngredients[index];
    if (!ingredient) return updatedIngredients;
    
    const isEmpty = !ingredient.item?.trim() && 
                   !ingredient.amount?.trim() && 
                   !ingredient.unit?.trim();
    
    if (isEmpty) {
      return updatedIngredients.filter((_, i) => i !== index);
    }
    
    return updatedIngredients;
  };

  const stopEditing = () => {
    if (globalEditingState.component === componentName && globalEditingState.field) {
      const index = parseInt(globalEditingState.field);
      
      // Get all field values from temp state
      const amount = globalEditingState.tempValues[`${index}-amount`]?.trim() || '';
      const unit = globalEditingState.tempValues[`${index}-unit`]?.trim() || '';
      const item = globalEditingState.tempValues[`${index}-item`]?.trim() || '';
      
      // Update the entire ingredient
      const newIngredients = [...ingredients];
      newIngredients[index] = { ...newIngredients[index], amount, unit, item };
      const finalIngredients = removeEmptyIngredientIfNeeded(newIngredients, index);
      onUpdate({ ingredients: finalIngredients });
      
      onSaveEdit();
    }
  };

  const handleClickOutside = (e) => {
    if (globalEditingState.component === componentName && globalEditingState.field) {
      const editingIndex = parseInt(globalEditingState.field);
      const clickedElement = e.target;
      
      const editingIngredient = clickedElement.closest('[data-editing-ingredient]');
      const clickedIngredientIndex = editingIngredient ? parseInt(editingIngredient.dataset.editingIngredient) : null;
      
      if (clickedIngredientIndex !== editingIndex) {
        stopEditing();
      }
    }
  };

  const handleInputClick = (e, index) => {
    e.stopPropagation();
    const editingIndex = globalEditingState.field ? parseInt(globalEditingState.field) : null;
    if (globalEditingState.component !== componentName || editingIndex !== index) {
      startEditing(index);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    onCancelEdit();
  };

  // Handle input changes with dynamic direction/alignment
  const handleInputChange = (e, index, field) => {
    const value = e.target.value;
    const fieldKey = `${index}-${field}`;
    
    // Update the global edit state for this specific field
    onUpdateEdit(fieldKey, value);
    
    // Determine direction and alignment based on content and interface language
    if (direction === 'rtl') {
      // In Hebrew mode, default to RTL unless content is clearly English
      if (value && /^[a-zA-Z0-9\s.,!?-]*$/.test(value) && !/[\u0590-\u05FF]/.test(value)) {
        // Content is English-only, switch to LTR
        e.target.style.direction = 'ltr';
        e.target.style.textAlign = 'left';
      } else {
        // Default to RTL in Hebrew mode or if Hebrew characters detected
        e.target.style.direction = 'rtl';
        e.target.style.textAlign = 'right';
      }
    } else {
      // In English mode, default to LTR unless Hebrew characters detected
      if (isHebrew(value)) {
        e.target.style.direction = 'rtl';
        e.target.style.textAlign = 'right';
      } else {
        e.target.style.direction = 'ltr';
        e.target.style.textAlign = 'left';
      }
    }
  };

  // Add new ingredient
  const addNewIngredient = () => {
    const newId = `ingredient-new-${Date.now()}`;
    const newIngredient = { id: newId, item: '', amount: '', unit: '' };
    const newIngredients = [...ingredients, newIngredient];
    onUpdate({ ingredients: newIngredients });
    setTimeout(() => {
      const newIndex = newIngredients.length - 1;
      startEditing(newIndex, newIngredient);
    }, 0);
  };

  // Delete ingredient
  const deleteIngredient = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    onUpdate({ ingredients: newIngredients });
  };

  // Move ingredient up/down
  const moveIngredient = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= ingredients.length) return;
    
    const newIngredients = [...ingredients];
    [newIngredients[index], newIngredients[newIndex]] = [newIngredients[newIndex], newIngredients[index]];
    onUpdate({ ingredients: newIngredients });
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, index, field) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      
      if (field === 'amount') {
        setTimeout(() => {
          const unitInput = document.querySelector(`input[data-ingredient="${index}"][data-field="unit"]`);
          if (unitInput) unitInput.focus();
        }, 0);
      } else if (field === 'unit') {
        setTimeout(() => {
          const itemInput = document.querySelector(`input[data-ingredient="${index}"][data-field="item"]`);
          if (itemInput) itemInput.focus();
        }, 0);
      } else if (field === 'item') {
        stopEditing();
        
        if (index < ingredients.length - 1) {
          setTimeout(() => startEditing(index + 1), 0);
        } else {
          setTimeout(() => addNewIngredient(), 0);
        }
      }
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-[#1b0e0e]">
          {t('resultDisplay.sections.ingredients')}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-80" onClick={handleClickOutside}>
        {ingredientsWithIds.map((ingredient, index) => {
          const isEmpty = !ingredient.item && !ingredient.amount && !ingredient.unit;
          
          const editingIndex = globalEditingState.field ? parseInt(globalEditingState.field) : null;
          const isEditing = globalEditingState.component === componentName && editingIndex === index;

          if (isEditing) {
            // Editing mode - inline inputs
            return (
              <div 
                key={ingredient.id} 
                className="flex items-center gap-2 p-2 border border-[#994d51] rounded bg-[#fcf8f8]" 
                data-editing-ingredient={index}
                onClick={(e) => e.stopPropagation()}
              >
                <span className={`w-2 h-2 bg-[#994d51] rounded-full flex-shrink-0 ${direction === 'rtl' ? 'ml-3' : 'mr-3'}`}></span>
                
                <input
                  type="text"
                  value={globalEditingState.tempValues[`${index}-amount`] || ''}
                  onChange={(e) => handleInputChange(e, index, 'amount')}
                  onKeyDown={(e) => handleKeyDown(e, index, 'amount')}
                  onClick={(e) => handleInputClick(e, index)}
                  placeholder={t('resultDisplay.edit.placeholders.amount')}
                  className="w-20 px-2 py-1 border border-[#994d51] focus:border-[#7a3c40] rounded text-sm focus:outline-none"
                  data-ingredient={index}
                  data-field="amount"
                  style={{ 
                    direction: direction === 'rtl' ? 'rtl' : 'ltr',
                    textAlign: direction === 'rtl' ? 'right' : 'left' 
                  }}
                />
                
                <input
                  type="text"
                  value={globalEditingState.tempValues[`${index}-unit`] || ''}
                  onChange={(e) => handleInputChange(e, index, 'unit')}
                  onKeyDown={(e) => handleKeyDown(e, index, 'unit')}
                  onClick={(e) => handleInputClick(e, index)}
                  placeholder={t('resultDisplay.edit.placeholders.unit')}
                  className="w-24 px-2 py-1 border border-[#994d51] focus:border-[#7a3c40] rounded text-sm focus:outline-none"
                  data-ingredient={index}
                  data-field="unit"
                  style={{ 
                    direction: direction === 'rtl' ? 'rtl' : 'ltr',
                    textAlign: direction === 'rtl' ? 'right' : 'left' 
                  }}
                />
                
                <input
                  type="text"
                  value={globalEditingState.tempValues[`${index}-item`] || ''}
                  onChange={(e) => handleInputChange(e, index, 'item')}
                  onKeyDown={(e) => handleKeyDown(e, index, 'item')}
                  onClick={(e) => handleInputClick(e, index)}
                  placeholder={t('resultDisplay.edit.placeholders.ingredient')}
                  className="flex-1 px-2 py-1 border border-[#994d51] focus:border-[#7a3c40] rounded text-sm focus:outline-none"
                  data-ingredient={index}
                  data-field="item"
                  style={{ 
                    direction: direction === 'rtl' ? 'rtl' : 'ltr',
                    textAlign: direction === 'rtl' ? 'right' : 'left' 
                  }}
                />
                
                <div className="flex gap-1">
                  <button
                    onClick={stopEditing}
                    className="text-green-600 hover:text-green-800 text-sm"
                    title={t('common.save')}
                  >
                    ✓
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-gray-600 hover:text-gray-800 text-sm"
                    title={t('common.cancel')}
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => deleteIngredient(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    title={t('resultDisplay.edit.delete')}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          } else {
            // Display mode - click to edit
            return (
              <div key={ingredient.id} className="flex items-center p-2 hover:bg-[#fcf8f8] rounded group" onClick={(e) => e.stopPropagation()}>
                <span className={`w-2 h-2 bg-[#994d51] rounded-full ${direction === 'rtl' ? 'ml-3' : 'mr-3'} flex-shrink-0`}></span>
                
                <div 
                  className={`flex-1 text-sm text-[#1b0e0e] cursor-pointer ${isEmpty ? 'text-gray-400 italic' : ''}`}
                  onClick={() => startEditing(index)}
                  style={{ direction: isHebrew(ingredient.item) ? 'rtl' : 'ltr' }}
                >
                  {isEmpty ? (
                    t('resultDisplay.edit.clickToAddIngredient')
                  ) : (
                    <>
                      <span className="font-medium">{ingredient.amount} {ingredient.unit}</span> {ingredient.item}
                    </>
                  )}
                </div>
                
                {!isEmpty && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Move up/down buttons */}
                    {index > 0 && (
                      <button
                        onClick={() => moveIngredient(index, 'up')}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                        title={t('resultDisplay.edit.moveUp')}
                      >
                        ↑
                      </button>
                    )}
                    {index < ingredients.length - 1 && (
                      <button
                        onClick={() => moveIngredient(index, 'down')}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                        title={t('resultDisplay.edit.moveDown')}
                      >
                        ↓
                      </button>
                    )}
                    
                    {/* Edit button */}
                    <button
                      onClick={() => startEditing(index)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                      title={t('resultDisplay.edit.edit')}
                    >
                      ✏️
                    </button>
                    
                    {/* Delete button */}
                    <button
                      onClick={() => deleteIngredient(index)}
                      className="text-red-600 hover:text-red-800 text-xs"
                      title={t('resultDisplay.edit.delete')}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            );
          }
        })}
        
        {/* Add new ingredient row */}
        <div 
          className="flex items-center p-2 border-2 border-dashed border-gray-300 rounded hover:border-[#994d51] cursor-pointer text-gray-500 hover:text-[#994d51] transition-colors"
          onClick={(e) => { e.stopPropagation(); addNewIngredient(); }}
        >
          <span className={`w-2 h-2 border-2 border-dashed border-gray-300 rounded-full ${direction === 'rtl' ? 'ml-3' : 'mr-3'} flex-shrink-0`}></span>
          <span className="text-sm italic">
            {t('resultDisplay.edit.addNewIngredient')}
          </span>
        </div>
      </div>
      
      {/* Helper text */}
      <div className="text-xs text-gray-500 mt-4 pt-2 border-t border-[#f3e7e8]">
        {t('resultDisplay.edit.helper.ingredients')}
      </div>
    </Card>
  );
};

export default EditableIngredientsSection;