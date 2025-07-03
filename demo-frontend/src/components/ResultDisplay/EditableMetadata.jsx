import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import { isHebrew, formatTime, getTotalTime } from '../../utils/formatters';

/**
 * EditableMetadata component displays and allows editing of recipe metadata
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data object
 * @param {Function} props.onUpdate - Function to update recipe data
 * @param {Object} props.globalEditingState - Global editing state
 * @param {Function} props.onStartEdit - Function to start editing globally
 * @param {Function} props.onUpdateEdit - Function to update edit value globally
 * @param {Function} props.onSaveEdit - Function to save edit globally
 * @param {Function} props.onCancelEdit - Function to cancel edit globally
 */
const EditableMetadata = ({ 
  recipe, 
  onUpdate, 
  globalEditingState, 
  onStartEdit, 
  onUpdateEdit, 
  onSaveEdit, 
  onCancelEdit 
}) => {
  const { t } = useTranslation();
  const componentName = 'metadata';
  
  const { name, description, servings, prepTime, cookTime, difficulty, category } = recipe;
  
  // Should match tha api modal
  const categoryOptions = [
    'appetizers',
    'main-courses', 
    'side-dishes',
    'soups',
    'stews',
    'salads',
    'desserts',
    'breakfast&brunch',
    'snacks',
    'beverages'
  ];
  
  const difficultyOptions = [
    'easy',
    'medium',
    'hard'
  ];

  const totalTime = getTotalTime(recipe);

  // Custom TimeField component that shows numbers when editing, formatted when not
  const TimeField = ({ field, value, placeholder }) => {
    const isEditing = globalEditingState.component === componentName && globalEditingState.field === field;
    
    if (isEditing) {
      // When editing, show just the number
      return (
        <input
          type="number"
          value={globalEditingState.tempValues[field] || ''}
          onChange={(e) => onUpdateEdit(field, e.target.value)}
          onBlur={() => saveField(field)}
          onKeyDown={(e) => handleKeyDown(e, field)}
          className="w-full text-center bg-transparent border border-[#994d51] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#994d51]"
          placeholder={placeholder}
          autoFocus
        />
      );
    }
    
    // When not editing, show formatted time or clickable placeholder
    return (
      <div
        onClick={() => startEditing(field, value)}
        className="w-full cursor-pointer hover:bg-[#f3e7e8] rounded px-2 py-1 transition-colors"
      >
        {value ? formatTime(value, t) : (
          <span className="text-gray-400 italic">{formatTime(parseInt(placeholder), t)}</span>
        )}
      </div>
    );
  };

  const startEditing = (field, currentValue) => {
    let displayValue = currentValue;
    // For time fields, show only the number when editing
    if (field.includes('Time') && currentValue) {
      displayValue = currentValue.toString();
    }
    onStartEdit(componentName, field, displayValue);
  };

  const cancelEditing = () => {
    onCancelEdit();
  };

  const saveField = (field) => {
    let value = globalEditingState.tempValues[field];
    
    if (field.includes('Time')) {
      value = parseInt(value) || null;
    } else if (field === 'servings') {
      value = parseInt(value) || null;
    } else if (value === '') {
      value = null;
    }

    onUpdate({ [field]: value });
    onSaveEdit();
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      saveField(field);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const EditableField = ({ field, value, placeholder, type = 'text', multiline = false }) => {
    const isEditing = globalEditingState.component === componentName && globalEditingState.field === field;
    let displayValue;
    if (field === 'category' && value) {
      displayValue = t(`resultDisplay.categories.${value}`, value);
    } else if (field === 'difficulty' && value) {
      displayValue = t(`resultDisplay.difficulties.${value}`, value);
    } else {
      displayValue = value || t('common.notSpecified');
    }
    const isEmpty = !value;

    if (isEditing) {
      // Special handling for category field - use select dropdown
      if (field === 'category') {
        return (
          <div className="w-full flex items-center gap-2" data-dropdown-container>
            <select
              value={globalEditingState.tempValues[field] || ''}
              onChange={(e) => onUpdateEdit(field, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              onBlur={() => saveField(field)}
              className="flex-1 min-w-0 px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none focus:border-[#7a3c40]"
              autoFocus
            >
              <option value="">{t('common.notSpecified')}</option>
              {categoryOptions.map(option => (
                <option key={option} value={option}>
                  {t(`resultDisplay.categories.${option}`, option)}
                </option>
              ))}
            </select>
            <button
              onClick={cancelEditing}
              className="text-gray-400 hover:text-gray-600"
              title={t('common.cancel')}
            >
              ✕
            </button>
          </div>
        );
      }
      
      // Special handling for difficulty field - use select dropdown
      if (field === 'difficulty') {
        return (
          <div className="w-full flex items-center gap-2" data-dropdown-container>
            <select
              value={globalEditingState.tempValues[field] || ''}
              onChange={(e) => onUpdateEdit(field, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              onBlur={() => saveField(field)}
              className="flex-1 min-w-0 px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none focus:border-[#7a3c40]"
              autoFocus
              aria-label={t('resultDisplay.metadata.difficulty')}
            >
              <option value="">{t('common.notSpecified')}</option>
              {difficultyOptions.map(option => (
                <option key={option} value={option}>
                  {t(`resultDisplay.difficulties.${option}`, option)}
                </option>
              ))}
            </select>
            <button
              onClick={cancelEditing}
              className="text-gray-400 hover:text-gray-600"
              title={t('common.cancel')}
            >
              ✕
            </button>
          </div>
        );
      }

      const InputComponent = multiline ? 'textarea' : 'input';
      return (
        <div className="w-full flex items-center gap-2">
          <InputComponent
            type={type}
            value={globalEditingState.tempValues[field] || ''}
            onChange={(e) => onUpdateEdit(field, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, field)}
            onBlur={() => saveField(field)}
            placeholder={placeholder}
            className="flex-1 min-w-0 px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none focus:border-[#7a3c40]"
            rows={multiline ? 2 : undefined}
            dir="auto"
            autoFocus
          />
          <button
            onClick={cancelEditing}
            className="text-gray-400 hover:text-gray-600"
            title={t('common.cancel')}
          >
            ✕
          </button>
        </div>
      );
    }

    return (
      <div
        onClick={() => startEditing(field, value)}
        className={`w-full cursor-pointer p-1 rounded hover:bg-[#f3e7e8] transition-colors ${
          isEmpty ? 'text-gray-400 italic' : ''
        }`}
        style={{ direction: multiline && isHebrew(displayValue) ? 'rtl' : 'ltr' }}
        title={t('resultDisplay.edit.clickToEdit')}
      >
        {displayValue}
      </div>
    );
  };

  return (
    <Card variant="highlight" className="space-y-4">
      {/* Recipe Title */}
      <div className="text-center border-b border-[#f3e7e8] pb-4">
        <h2 className="text-xl font-bold text-[#1b0e0e] mb-2">
          <EditableField
            field="name"
            value={name}
            placeholder={t('resultDisplay.edit.placeholders.recipeName')}
          />
        </h2>
        {(description || (globalEditingState.component === componentName && globalEditingState.field === 'description')) && (
          <EditableField
            field="description"
            value={description}
            placeholder={t('resultDisplay.edit.placeholders.description')}
            multiline={true}
          />
        )}
      </div>
      
      {/* First Row: Category, Difficulty, Servings */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-sm font-medium text-[#994d51] mb-1">
            {t('resultDisplay.metadata.category')}
          </div>
          <div className="text-sm text-[#1b0e0e]">
            <EditableField
              field="category"
              value={category}
              placeholder={t('resultDisplay.edit.placeholders.category')}
            />
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-[#994d51] mb-1">
            {t('resultDisplay.metadata.difficulty')}
          </div>
          <div className="text-sm text-[#1b0e0e]">
            <EditableField
              field="difficulty"
              value={difficulty}
              placeholder={t('resultDisplay.edit.placeholders.difficulty')}
            />
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-[#994d51] mb-1">
            {t('resultDisplay.metadata.servings')}
          </div>
          <div className="text-sm text-[#1b0e0e]">
            <EditableField
              field="servings"
              value={servings}
              placeholder="4"
              type="number"
            />
          </div>
        </div>
      </div>

      {/* Second Row: All Time Fields */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#f3e7e8]">
        <div className="text-center">
          <div className="text-sm font-medium text-[#994d51] mb-1">
            {t('resultDisplay.metadata.prepTime')}
          </div>
          <div className="text-sm text-[#1b0e0e]">
            <TimeField
              field="prepTime"
              value={prepTime}
              placeholder="30"
            />
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-[#994d51] mb-1">
            {t('resultDisplay.metadata.cookTime')}
          </div>
          <div className="text-sm text-[#1b0e0e]">
            <TimeField
              field="cookTime"
              value={cookTime}
              placeholder="45"
            />
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-[#994d51] mb-1">
            {t('resultDisplay.metadata.totalTime')}
          </div>
          <div className="text-sm py-1 text-[#1b0e0e]">
            {totalTime != null ? formatTime(totalTime, t) : (
              <span className="text-gray-400 italic">{t('common.notSpecified')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Helper text */}
      <div className="text-xs text-gray-500 text-center pt-2 border-t border-[#f3e7e8]">
        {t('resultDisplay.edit.helper.clickToEdit')}
      </div>
    </Card>
  );
};

export default EditableMetadata;