import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew } from '../../utils/formatters';
import Card from '../ui/Card';

// TODO: add content validation
/**
 * EditableIngredientsSection component with support for flat and staged ingredients
 * @param {Object} props - Component props
 * @param {Array} props.ingredients - Array of ingredient objects (flat format)
 * @param {Array} props.ingredient_stages - Array of ingredient stages (structured format)
 * @param {Function} props.onUpdate - Function to update ingredients/ingredient_stages
 * @param {Object} props.globalEditingState - Global editing state
 * @param {Function} props.onStartEdit - Function to start editing globally
 * @param {Function} props.onUpdateEdit - Function to update edit value globally
 * @param {Function} props.onSaveEdit - Function to save edit globally
 * @param {Function} props.onCancelEdit - Function to cancel edit globally
 */
const EditableIngredientsSection = ({
  ingredients,
  ingredient_stages,
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
  const [isStructured, setIsStructured] = useState(!!ingredient_stages);

  // Handle auto-focus when editing starts
  useEffect(() => {
    if (shouldFocusRef.current && globalEditingState.component === componentName && globalEditingState.field) {
      const fieldKey = globalEditingState.field;
      let amountInput = null;

      if (fieldKey.startsWith('ingredient-')) {
        const index = parseInt(fieldKey.replace('ingredient-', ''));
        amountInput = document.querySelector(`input[data-ingredient="${index}"][data-field="amount"]`);
      } else if (fieldKey.startsWith('stage-') && fieldKey.includes('-ingredient-')) {
        const parts = fieldKey.split('-');
        const stageIdx = parseInt(parts[1]);
        const ingIdx = parseInt(parts[3]);
        amountInput = document.querySelector(`input[data-stage="${stageIdx}"][data-ingredient="${ingIdx}"][data-field="amount"]`);
      }

      if (amountInput) {
        amountInput.focus();
      }
      shouldFocusRef.current = false;
    }
  }, [globalEditingState.component, globalEditingState.field]);

  // Toggle between flat and structured formats
  const toggleFormat = () => {
    if (isStructured) {
      // Check if we have stage titles that will be lost
      const hasStageTitles = ingredient_stages?.some(stage => stage.title?.trim());

      if (hasStageTitles) {
        const confirmed = window.confirm(t('resultDisplay.edit.confirmLoseTitles'));
        if (!confirmed) return;
      }

      // Convert ingredient_stages to flat ingredients
      const flatIngredients = ingredient_stages ?
        ingredient_stages.flatMap(stage => stage.ingredients || []) :
        [];
      onUpdate({ ingredients: flatIngredients, ingredient_stages: null });
    } else {
      // Convert flat ingredients to ingredient_stages
      const newStages = ingredients?.length > 0 ?
        [{ title: t('resultDisplay.edit.defaultStageTitle'), ingredients: [...ingredients] }] :
        [{ title: '', ingredients: [] }];
      onUpdate({ ingredient_stages: newStages, ingredients: null });
    }
    setIsStructured(!isStructured);
    onCancelEdit(); // Clear global editing state
  };

  // ===== FLAT INGREDIENTS FUNCTIONS =====

  // Generate stable IDs for ingredients
  const ingredientsWithIds = (ingredients || []).map((ingredient, index) => ({
    ...ingredient,
    id: ingredient.id || `ingredient-${index}`
  }));

  // Start editing a flat ingredient
  const startEditingFlat = (index, ingredientOverride = null) => {
    const ingredient = ingredientOverride || ingredients[index];
    if (!ingredient) {
      console.error(`Cannot start editing: ingredient at index ${index} does not exist`);
      return;
    }

    const fieldKey = `ingredient-${index}`;
    const tempValues = {
      [`${fieldKey}-amount`]: ingredient.amount || '',
      [`${fieldKey}-unit`]: ingredient.unit || '',
      [`${fieldKey}-item`]: ingredient.item || ''
    };
    onStartEdit(componentName, fieldKey, tempValues);
    shouldFocusRef.current = true;
  };

  // Helper function to remove empty ingredients
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

  const stopEditingFlat = () => {
    if (globalEditingState.component === componentName && globalEditingState.field) {
      const fieldKey = globalEditingState.field;
      const index = parseInt(fieldKey.replace('ingredient-', ''));

      const amount = globalEditingState.tempValues[`${fieldKey}-amount`]?.trim() || '';
      const unit = globalEditingState.tempValues[`${fieldKey}-unit`]?.trim() || '';
      const item = globalEditingState.tempValues[`${fieldKey}-item`]?.trim() || '';

      const newIngredients = [...ingredients];
      newIngredients[index] = { ...newIngredients[index], amount, unit, item };
      const finalIngredients = removeEmptyIngredientIfNeeded(newIngredients, index);
      onUpdate({ ingredients: finalIngredients });

      onSaveEdit();
    }
  };

  const addNewIngredientFlat = () => {
    const newId = `ingredient-new-${Date.now()}`;
    const newIngredient = { id: newId, item: '', amount: '', unit: '' };
    const newIngredients = [...ingredients, newIngredient];
    onUpdate({ ingredients: newIngredients });
    setTimeout(() => {
      const newIndex = newIngredients.length - 1;
      startEditingFlat(newIndex, newIngredient);
    }, 0);
  };

  const deleteIngredientFlat = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    onUpdate({ ingredients: newIngredients });
  };

  const moveIngredientFlat = (index, dir) => {
    const newIndex = dir === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= ingredients.length) return;

    const newIngredients = [...ingredients];
    [newIngredients[index], newIngredients[newIndex]] = [newIngredients[newIndex], newIngredients[index]];
    onUpdate({ ingredients: newIngredients });
  };

  // ===== STAGED INGREDIENTS FUNCTIONS =====

  // Start editing a staged ingredient or stage title
  const startEditingStaged = (stageIndex, ingredientIndex = null, isTitle = false) => {
    if (isTitle) {
      const stage = ingredient_stages[stageIndex];
      const fieldKey = `stage-${stageIndex}-title`;
      const tempValues = { [fieldKey]: stage.title || '' };
      onStartEdit(componentName, fieldKey, tempValues);
    } else {
      const ingredient = ingredient_stages[stageIndex]?.ingredients?.[ingredientIndex];
      if (!ingredient) {
        console.error(`Cannot start editing: ingredient at stage ${stageIndex}, index ${ingredientIndex} does not exist`);
        return;
      }

      const fieldKey = `stage-${stageIndex}-ingredient-${ingredientIndex}`;
      const tempValues = {
        [`${fieldKey}-amount`]: ingredient.amount || '',
        [`${fieldKey}-unit`]: ingredient.unit || '',
        [`${fieldKey}-item`]: ingredient.item || ''
      };
      onStartEdit(componentName, fieldKey, tempValues);
      shouldFocusRef.current = true;
    }
  };

  const stopEditingStaged = () => {
    if (globalEditingState.component === componentName && globalEditingState.field) {
      const fieldKey = globalEditingState.field;

      // Handle stage title editing
      if (fieldKey.includes('-title')) {
        const stageIndex = parseInt(fieldKey.split('-')[1]);
        const title = globalEditingState.tempValues[fieldKey]?.trim() || '';
        const newStages = [...ingredient_stages];
        newStages[stageIndex] = { ...newStages[stageIndex], title };
        onUpdate({ ingredient_stages: newStages });
      }
      // Handle ingredient editing
      else if (fieldKey.includes('-ingredient-')) {
        const parts = fieldKey.split('-');
        const stageIndex = parseInt(parts[1]);
        const ingredientIndex = parseInt(parts[3]);

        const amount = globalEditingState.tempValues[`${fieldKey}-amount`]?.trim() || '';
        const unit = globalEditingState.tempValues[`${fieldKey}-unit`]?.trim() || '';
        const item = globalEditingState.tempValues[`${fieldKey}-item`]?.trim() || '';

        const newStages = [...ingredient_stages];
        const newIngredients = [...(newStages[stageIndex]?.ingredients || [])];
        newIngredients[ingredientIndex] = { ...newIngredients[ingredientIndex], amount, unit, item };

        // Remove empty ingredients
        const finalIngredients = removeEmptyIngredientIfNeeded(newIngredients, ingredientIndex);
        newStages[stageIndex] = { ...newStages[stageIndex], ingredients: finalIngredients };
        onUpdate({ ingredient_stages: newStages });
      }

      onSaveEdit();
    }
  };

  const addNewStage = () => {
    const newStages = [...(ingredient_stages || []), { title: '', ingredients: [] }];
    onUpdate({ ingredient_stages: newStages });
  };

  const deleteStage = (stageIndex) => {
    const newStages = ingredient_stages.filter((_, i) => i !== stageIndex);
    onUpdate({ ingredient_stages: newStages });
  };

  const addNewIngredientStaged = (stageIndex) => {
    const newId = `ingredient-new-${Date.now()}`;
    const newIngredient = { id: newId, item: '', amount: '', unit: '' };
    const newStages = [...ingredient_stages];
    const newIngredients = [...(newStages[stageIndex]?.ingredients || []), newIngredient];
    newStages[stageIndex] = { ...newStages[stageIndex], ingredients: newIngredients };
    onUpdate({ ingredient_stages: newStages });

    setTimeout(() => {
      const newIndex = newIngredients.length - 1;
      startEditingStaged(stageIndex, newIndex);
    }, 0);
  };

  const deleteIngredientStaged = (stageIndex, ingredientIndex) => {
    const newStages = [...ingredient_stages];
    const newIngredients = newStages[stageIndex].ingredients.filter((_, i) => i !== ingredientIndex);
    newStages[stageIndex] = { ...newStages[stageIndex], ingredients: newIngredients };
    onUpdate({ ingredient_stages: newStages });
  };

  const moveIngredientStaged = (stageIndex, ingredientIndex, dir) => {
    const newIndex = dir === 'up' ? ingredientIndex - 1 : ingredientIndex + 1;
    const stageIngredients = ingredient_stages[stageIndex]?.ingredients || [];
    if (newIndex < 0 || newIndex >= stageIngredients.length) return;

    const newStages = [...ingredient_stages];
    const newIngredients = [...stageIngredients];
    [newIngredients[ingredientIndex], newIngredients[newIndex]] = [newIngredients[newIndex], newIngredients[ingredientIndex]];
    newStages[stageIndex] = { ...newStages[stageIndex], ingredients: newIngredients };
    onUpdate({ ingredient_stages: newStages });
  };

  // ===== SHARED FUNCTIONS =====

  const cancelEditing = () => {
    onCancelEdit();
  };

  const handleClickOutside = (e) => {
    if (globalEditingState.component === componentName && globalEditingState.field) {
      const clickedElement = e.target;
      const editingContainer = clickedElement.closest('[data-editing-ingredient]') || clickedElement.closest('[data-editing-title]');

      if (!editingContainer) {
        if (isStructured) {
          stopEditingStaged();
        } else {
          stopEditingFlat();
        }
      }
    }
  };

  const handleInputChange = (e, fieldKey, field) => {
    const value = e.target.value;
    const fullFieldKey = `${fieldKey}-${field}`;

    onUpdateEdit(fullFieldKey, value);

    // Dynamic text direction
    if (direction === 'rtl') {
      if (value && /^[a-zA-Z0-9\s.,!?-]*$/.test(value) && !/[\u0590-\u05FF]/.test(value)) {
        e.target.style.direction = 'ltr';
        e.target.style.textAlign = 'left';
      } else {
        e.target.style.direction = 'rtl';
        e.target.style.textAlign = 'right';
      }
    } else {
      if (isHebrew(value)) {
        e.target.style.direction = 'rtl';
        e.target.style.textAlign = 'right';
      } else {
        e.target.style.direction = 'ltr';
        e.target.style.textAlign = 'left';
      }
    }
  };

  const handleTitleChange = (e, fieldKey) => {
    const value = e.target.value;
    onUpdateEdit(fieldKey, value);

    // Dynamic text direction
    if (direction === 'rtl') {
      if (value && /^[a-zA-Z0-9\s.,!?-]*$/.test(value) && !/[\u0590-\u05FF]/.test(value)) {
        e.target.style.direction = 'ltr';
        e.target.style.textAlign = 'left';
      } else {
        e.target.style.direction = 'rtl';
        e.target.style.textAlign = 'right';
      }
    } else {
      if (isHebrew(value)) {
        e.target.style.direction = 'rtl';
        e.target.style.textAlign = 'right';
      } else {
        e.target.style.direction = 'ltr';
        e.target.style.textAlign = 'left';
      }
    }
  };

  const handleKeyDown = (e, fieldKey, field, stageIndex = null) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();

      if (field === 'amount') {
        setTimeout(() => {
          let unitInput;
          if (stageIndex !== null) {
            const parts = fieldKey.split('-');
            const ingIdx = parseInt(parts[3]);
            unitInput = document.querySelector(`input[data-stage="${stageIndex}"][data-ingredient="${ingIdx}"][data-field="unit"]`);
          } else {
            const index = parseInt(fieldKey.replace('ingredient-', ''));
            unitInput = document.querySelector(`input[data-ingredient="${index}"][data-field="unit"]`);
          }
          if (unitInput) unitInput.focus();
        }, 0);
      } else if (field === 'unit') {
        setTimeout(() => {
          let itemInput;
          if (stageIndex !== null) {
            const parts = fieldKey.split('-');
            const ingIdx = parseInt(parts[3]);
            itemInput = document.querySelector(`input[data-stage="${stageIndex}"][data-ingredient="${ingIdx}"][data-field="item"]`);
          } else {
            const index = parseInt(fieldKey.replace('ingredient-', ''));
            itemInput = document.querySelector(`input[data-ingredient="${index}"][data-field="item"]`);
          }
          if (itemInput) itemInput.focus();
        }, 0);
      } else if (field === 'item') {
        if (isStructured) {
          stopEditingStaged();
        } else {
          stopEditingFlat();
        }
      } else if (field === 'title') {
        if (isStructured) {
          stopEditingStaged();
        }
      }
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // ===== RENDER HELPERS =====

  const renderIngredientInputs = (fieldKey, ingredient, stageIndex = null) => {
    const isEditing = globalEditingState.component === componentName && globalEditingState.field === fieldKey;

    if (isEditing) {
      return (
        <div
          className="flex items-center gap-2 p-2 border border-[#994d51] rounded bg-[#fcf8f8] min-w-max"
          data-editing-ingredient={fieldKey}
          onClick={(e) => e.stopPropagation()}
        >
          <span className={`w-2 h-2 bg-[#994d51] rounded-full flex-shrink-0 ${direction === 'rtl' ? 'ml-3' : 'mr-3'}`}></span>

          <input
            type="text"
            value={globalEditingState.tempValues[`${fieldKey}-amount`] || ''}
            onChange={(e) => handleInputChange(e, fieldKey, 'amount')}
            onKeyDown={(e) => handleKeyDown(e, fieldKey, 'amount', stageIndex)}
            placeholder={t('resultDisplay.edit.placeholders.amount')}
            className="w-20 px-2 py-1 border border-[#994d51] focus:border-[#7a3c40] rounded text-sm focus:outline-none"
            data-stage={stageIndex}
            data-ingredient={stageIndex !== null ? parseInt(fieldKey.split('-')[3]) : parseInt(fieldKey.replace('ingredient-', ''))}
            data-field="amount"
            style={{
              direction: direction === 'rtl' ? 'rtl' : 'ltr',
              textAlign: direction === 'rtl' ? 'right' : 'left'
            }}
          />

          <input
            type="text"
            value={globalEditingState.tempValues[`${fieldKey}-unit`] || ''}
            onChange={(e) => handleInputChange(e, fieldKey, 'unit')}
            onKeyDown={(e) => handleKeyDown(e, fieldKey, 'unit', stageIndex)}
            placeholder={t('resultDisplay.edit.placeholders.unit')}
            className="w-24 px-2 py-1 border border-[#994d51] focus:border-[#7a3c40] rounded text-sm focus:outline-none"
            data-stage={stageIndex}
            data-ingredient={stageIndex !== null ? parseInt(fieldKey.split('-')[3]) : parseInt(fieldKey.replace('ingredient-', ''))}
            data-field="unit"
            style={{
              direction: direction === 'rtl' ? 'rtl' : 'ltr',
              textAlign: direction === 'rtl' ? 'right' : 'left'
            }}
          />

          <input
            type="text"
            value={globalEditingState.tempValues[`${fieldKey}-item`] || ''}
            onChange={(e) => handleInputChange(e, fieldKey, 'item')}
            onKeyDown={(e) => handleKeyDown(e, fieldKey, 'item', stageIndex)}
            placeholder={t('resultDisplay.edit.placeholders.ingredient')}
            className="flex-1 min-w-32 px-2 py-1 border border-[#994d51] focus:border-[#7a3c40] rounded text-sm focus:outline-none"
            data-stage={stageIndex}
            data-ingredient={stageIndex !== null ? parseInt(fieldKey.split('-')[3]) : parseInt(fieldKey.replace('ingredient-', ''))}
            data-field="item"
            style={{
              direction: direction === 'rtl' ? 'rtl' : 'ltr',
              textAlign: direction === 'rtl' ? 'right' : 'left'
            }}
          />

          <div className="flex gap-1">
            <button
              onClick={() => isStructured ? stopEditingStaged() : stopEditingFlat()}
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
          </div>
        </div>
      );
    }

    const isEmpty = !ingredient.item && !ingredient.amount && !ingredient.unit;

    return (
      <div className="flex items-center p-2 hover:bg-[#fcf8f8] rounded group" onClick={(e) => e.stopPropagation()}>
        <span className={`w-2 h-2 bg-[#994d51] rounded-full ${direction === 'rtl' ? 'ml-3' : 'mr-3'} flex-shrink-0`}></span>

        <div
          className={`flex-1 text-sm text-[#1b0e0e] cursor-pointer ${isEmpty ? 'text-gray-400 italic' : ''}`}
          onClick={() => {
            if (isStructured) {
              const parts = fieldKey.split('-');
              const stageIdx = parseInt(parts[1]);
              const ingIdx = parseInt(parts[3]);
              startEditingStaged(stageIdx, ingIdx);
            } else {
              const index = parseInt(fieldKey.replace('ingredient-', ''));
              startEditingFlat(index);
            }
          }}
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
            {isStructured ? (
              <>
                {stageIndex !== null && (
                  <>
                    {(() => {
                      const parts = fieldKey.split('-');
                      const stageIdx = parseInt(parts[1]);
                      const ingIdx = parseInt(parts[3]);
                      const stageIngredients = ingredient_stages[stageIdx]?.ingredients || [];
                      return (
                        <>
                          {ingIdx > 0 && (
                            <button
                              onClick={() => moveIngredientStaged(stageIdx, ingIdx, 'up')}
                              className="text-gray-400 hover:text-gray-600 text-xs"
                              title={t('resultDisplay.edit.moveUp')}
                            >
                              ↑
                            </button>
                          )}
                          {ingIdx < stageIngredients.length - 1 && (
                            <button
                              onClick={() => moveIngredientStaged(stageIdx, ingIdx, 'down')}
                              className="text-gray-400 hover:text-gray-600 text-xs"
                              title={t('resultDisplay.edit.moveDown')}
                            >
                              ↓
                            </button>
                          )}
                          <button
                            onClick={() => startEditingStaged(stageIdx, ingIdx)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            title={t('resultDisplay.edit.edit')}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteIngredientStaged(stageIdx, ingIdx)}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title={t('resultDisplay.edit.delete')}
                          >
                            🗑️
                          </button>
                        </>
                      );
                    })()}
                  </>
                )}
              </>
            ) : (
              <>
                {(() => {
                  const index = parseInt(fieldKey.replace('ingredient-', ''));
                  return (
                    <>
                      {index > 0 && (
                        <button
                          onClick={() => moveIngredientFlat(index, 'up')}
                          className="text-gray-400 hover:text-gray-600 text-xs"
                          title={t('resultDisplay.edit.moveUp')}
                        >
                          ↑
                        </button>
                      )}
                      {index < ingredients.length - 1 && (
                        <button
                          onClick={() => moveIngredientFlat(index, 'down')}
                          className="text-gray-400 hover:text-gray-600 text-xs"
                          title={t('resultDisplay.edit.moveDown')}
                        >
                          ↓
                        </button>
                      )}
                      <button
                        onClick={() => startEditingFlat(index)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                        title={t('resultDisplay.edit.edit')}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteIngredientFlat(index)}
                        className="text-red-600 hover:text-red-800 text-xs"
                        title={t('resultDisplay.edit.delete')}
                      >
                        🗑️
                      </button>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-[#1b0e0e]">
          {t('resultDisplay.sections.ingredients')}
        </h3>
        <button
          onClick={toggleFormat}
          className="px-3 py-1 text-sm border border-[#994d51] text-[#994d51] rounded hover:bg-[#fcf8f8] transition-colors"
          title={isStructured ? t('resultDisplay.edit.switchToFlat') : t('resultDisplay.edit.switchToStructured')}
        >
          {isStructured ? '📋' : '📑'}
        </button>
      </div>

      <div className="overflow-y-auto overflow-x-auto max-h-80" onClick={handleClickOutside}>
        {isStructured ? (
          // Structured view with stages
          <div className="space-y-4">
            {(ingredient_stages || []).map((stage, stageIdx) => (
              <div key={stageIdx} className="border border-gray-200 rounded p-3">
                {/* Stage title */}
                <div className="mb-2 flex items-center justify-between">
                  {globalEditingState.component === componentName && globalEditingState.field === `stage-${stageIdx}-title` ? (
                    <input
                      type="text"
                      value={globalEditingState.tempValues[`stage-${stageIdx}-title`] || ''}
                      onChange={(e) => handleTitleChange(e, `stage-${stageIdx}-title`)}
                      onKeyDown={(e) => handleKeyDown(e, `stage-${stageIdx}-title`, 'title')}
                      placeholder={t('resultDisplay.edit.placeholders.stageTitle')}
                      className="flex-1 px-2 py-1 border border-[#994d51] focus:border-[#7a3c40] rounded text-sm font-semibold focus:outline-none"
                      data-editing-title={`stage-${stageIdx}-title`}
                      style={{
                        direction: direction === 'rtl' ? 'rtl' : 'ltr',
                        textAlign: direction === 'rtl' ? 'right' : 'left'
                      }}
                      autoFocus
                    />
                  ) : (
                    <h4
                      className="text-base font-semibold text-[#994d51] cursor-pointer flex-1"
                      onClick={() => startEditingStaged(stageIdx, null, true)}
                      style={{ direction: isHebrew(stage.title) ? 'rtl' : 'ltr' }}
                    >
                      {stage.title || t('resultDisplay.edit.clickToAddTitle')}
                    </h4>
                  )}
                  <button
                    onClick={() => deleteStage(stageIdx)}
                    className="text-red-600 hover:text-red-800 text-xs ml-2"
                    title={t('resultDisplay.edit.deleteStage')}
                  >
                    🗑️
                  </button>
                </div>

                {/* Stage ingredients */}
                <div className="grid grid-cols-1 gap-2">
                  {(stage.ingredients || []).map((ingredient, ingIdx) => {
                    const fieldKey = `stage-${stageIdx}-ingredient-${ingIdx}`;
                    return (
                      <div key={ingIdx}>
                        {renderIngredientInputs(fieldKey, ingredient, stageIdx)}
                      </div>
                    );
                  })}

                  {/* Add new ingredient to stage */}
                  <div
                    className="flex items-center p-2 border-2 border-dashed border-gray-300 rounded hover:border-[#994d51] cursor-pointer text-gray-500 hover:text-[#994d51] transition-colors"
                    onClick={(e) => { e.stopPropagation(); addNewIngredientStaged(stageIdx); }}
                  >
                    <span className={`w-2 h-2 border-2 border-dashed border-gray-300 rounded-full ${direction === 'rtl' ? 'ml-3' : 'mr-3'} flex-shrink-0`}></span>
                    <span className="text-sm italic">
                      {t('resultDisplay.edit.addNewIngredient')}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add new stage */}
            <button
              onClick={addNewStage}
              className="w-full p-2 border-2 border-dashed border-gray-300 rounded hover:border-[#994d51] text-gray-500 hover:text-[#994d51] transition-colors text-sm"
            >
              + {t('resultDisplay.edit.addNewStage')}
            </button>
          </div>
        ) : (
          // Flat view
          <div className="grid grid-cols-1 gap-2">
            {ingredientsWithIds.map((ingredient, index) => {
              const fieldKey = `ingredient-${index}`;
              return (
                <div key={ingredient.id}>
                  {renderIngredientInputs(fieldKey, ingredient)}
                </div>
              );
            })}

            {/* Add new ingredient row */}
            <div
              className="flex items-center p-2 border-2 border-dashed border-gray-300 rounded hover:border-[#994d51] cursor-pointer text-gray-500 hover:text-[#994d51] transition-colors"
              onClick={(e) => { e.stopPropagation(); addNewIngredientFlat(); }}
            >
              <span className={`w-2 h-2 border-2 border-dashed border-gray-300 rounded-full ${direction === 'rtl' ? 'ml-3' : 'mr-3'} flex-shrink-0`}></span>
              <span className="text-sm italic">
                {t('resultDisplay.edit.addNewIngredient')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="text-xs text-gray-500 mt-4 pt-2 border-t border-[#f3e7e8]">
        {t('resultDisplay.edit.helper.ingredients')}
      </div>
    </Card>
  );
};

export default EditableIngredientsSection;
