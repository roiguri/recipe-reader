import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew } from '../../utils/formatters';
import Card from '../ui/Card';

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

  // Generate stable IDs for ingredients
  const ingredientsWithIds = ingredients.map((ingredient, index) => ({
    ...ingredient,
    id: ingredient.id || `ingredient-${index}`
  }));

  // Start editing an ingredient field
  const startEditing = (index, field) => {
    const ingredient = ingredients[index];
    const fieldKey = `${index}-${field}`;
    onStartEdit(componentName, fieldKey, ingredient[field] || '');
  };

  // Stop editing (save)
  const stopEditing = () => {
    if (globalEditingState.component === componentName && globalEditingState.field) {
      const [indexStr, field] = globalEditingState.field.split('-');
      const index = parseInt(indexStr);
      const value = globalEditingState.tempValues[globalEditingState.field];
      const trimmedValue = value?.trim() || '';
      
      // Update the ingredient field
      updateIngredient(index, field, trimmedValue);
      
      // Check if ingredient should be removed (all fields empty)
      setTimeout(() => {
        const updatedIngredient = {
          ...ingredients[index],
          [field]: trimmedValue
        };
        
        const isEmpty = !updatedIngredient.item?.trim() && 
                       !updatedIngredient.amount?.trim() && 
                       !updatedIngredient.unit?.trim();
        
        if (isEmpty) {
          // Remove the entire ingredient if all fields are empty
          const newIngredients = ingredients.filter((_, i) => i !== index);
          onUpdate({ ingredients: newIngredients });
        }
      }, 0);
      
      onSaveEdit();
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    onCancelEdit();
  };

  // Update ingredient field directly
  const updateIngredient = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    onUpdate({ ingredients: newIngredients });
  };

  // Handle input changes with dynamic direction/alignment
  const handleInputChange = (e, index, field) => {
    const value = e.target.value;
    const fieldKey = `${index}-${field}`;
    
    // Update the global edit state
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
    // Start editing the first field (amount) of the new ingredient
    const newIndex = newIngredients.length - 1;
    const fieldKey = `${newIndex}-amount`;
    onStartEdit(componentName, fieldKey, '');
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
      
      // First save the current field
      stopEditing();
      
      // Simple tab order: amount -> unit -> item -> next ingredient
      if (field === 'amount') {
        startEditing(index, 'unit');
      } else if (field === 'unit') {
        startEditing(index, 'item');
      } else if (field === 'item') {
        // Move to next ingredient or add new one
        if (index < ingredients.length - 1) {
          startEditing(index + 1, 'amount');
        } else {
          addNewIngredient();
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
          {t('resultDisplay.sections.ingredients')} ({ingredients.length})
        </h3>
      </div>
      
      <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-80">
        {ingredientsWithIds.map((ingredient, index) => {
          const isEmpty = !ingredient.item && !ingredient.amount && !ingredient.unit;
          
          // Check if any field of this ingredient is being edited
          const isEditingAmount = globalEditingState.component === componentName && globalEditingState.field === `${index}-amount`;
          const isEditingUnit = globalEditingState.component === componentName && globalEditingState.field === `${index}-unit`;
          const isEditingItem = globalEditingState.component === componentName && globalEditingState.field === `${index}-item`;
          const isEditing = isEditingAmount || isEditingUnit || isEditingItem;

          if (isEditing) {
            // Editing mode - inline inputs
            return (
              <div key={ingredient.id} className="flex items-center gap-2 p-2 border border-[#994d51] rounded bg-[#fcf8f8]">
                <span className={`w-2 h-2 bg-[#994d51] rounded-full flex-shrink-0 ${direction === 'rtl' ? 'ml-3' : 'mr-3'}`}></span>
                
                <input
                  type="text"
                  value={isEditingAmount ? (globalEditingState.tempValues[`${index}-amount`] || '') : (ingredient.amount || '')}
                  onChange={isEditingAmount ? (e) => handleInputChange(e, index, 'amount') : undefined}
                  onKeyDown={isEditingAmount ? (e) => handleKeyDown(e, index, 'amount') : undefined}
                  onBlur={isEditingAmount ? stopEditing : undefined}
                  onClick={!isEditingAmount ? () => startEditing(index, 'amount') : undefined}
                  placeholder={t('resultDisplay.edit.placeholders.amount')}
                  className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none ${
                    isEditingAmount 
                      ? 'border-[#994d51] focus:border-[#7a3c40]' 
                      : 'border-gray-300 cursor-pointer hover:bg-gray-50'
                  }`}
                  readOnly={!isEditingAmount}
                  data-ingredient={index}
                  data-field="amount"
                  style={{ 
                    direction: direction === 'rtl' ? 'rtl' : 'ltr',
                    textAlign: direction === 'rtl' ? 'right' : 'left' 
                  }}
                  autoFocus={isEditingAmount}
                />
                
                <input
                  type="text"
                  value={isEditingUnit ? (globalEditingState.tempValues[`${index}-unit`] || '') : (ingredient.unit || '')}
                  onChange={isEditingUnit ? (e) => handleInputChange(e, index, 'unit') : undefined}
                  onKeyDown={isEditingUnit ? (e) => handleKeyDown(e, index, 'unit') : undefined}
                  onBlur={isEditingUnit ? stopEditing : undefined}
                  onClick={!isEditingUnit ? () => startEditing(index, 'unit') : undefined}
                  placeholder={t('resultDisplay.edit.placeholders.unit')}
                  className={`w-24 px-2 py-1 border rounded text-sm focus:outline-none ${
                    isEditingUnit 
                      ? 'border-[#994d51] focus:border-[#7a3c40]' 
                      : 'border-gray-300 cursor-pointer hover:bg-gray-50'
                  }`}
                  readOnly={!isEditingUnit}
                  data-ingredient={index}
                  data-field="unit"
                  style={{ 
                    direction: direction === 'rtl' ? 'rtl' : 'ltr',
                    textAlign: direction === 'rtl' ? 'right' : 'left' 
                  }}
                  autoFocus={isEditingUnit}
                />
                
                <input
                  type="text"
                  value={isEditingItem ? (globalEditingState.tempValues[`${index}-item`] || '') : (ingredient.item || '')}
                  onChange={isEditingItem ? (e) => handleInputChange(e, index, 'item') : undefined}
                  onKeyDown={isEditingItem ? (e) => handleKeyDown(e, index, 'item') : undefined}
                  onBlur={isEditingItem ? stopEditing : undefined}
                  onClick={!isEditingItem ? () => startEditing(index, 'item') : undefined}
                  placeholder={t('resultDisplay.edit.placeholders.ingredient')}
                  className={`flex-1 px-2 py-1 border rounded text-sm focus:outline-none ${
                    isEditingItem 
                      ? 'border-[#994d51] focus:border-[#7a3c40]' 
                      : 'border-gray-300 cursor-pointer hover:bg-gray-50'
                  }`}
                  readOnly={!isEditingItem}
                  data-ingredient={index}
                  data-field="item"
                  style={{ 
                    direction: direction === 'rtl' ? 'rtl' : 'ltr',
                    textAlign: direction === 'rtl' ? 'right' : 'left' 
                  }}
                  autoFocus={isEditingItem}
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
              <div key={ingredient.id} className="flex items-center p-2 hover:bg-[#fcf8f8] rounded group">
                <span className={`w-2 h-2 bg-[#994d51] rounded-full ${direction === 'rtl' ? 'ml-3' : 'mr-3'} flex-shrink-0`}></span>
                
                <div 
                  className={`flex-1 text-sm text-[#1b0e0e] cursor-pointer ${isEmpty ? 'text-gray-400 italic' : ''}`}
                  onClick={() => startEditing(index, 'item')}
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
                      onClick={() => startEditing(index, 'item')}
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
          onClick={addNewIngredient}
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