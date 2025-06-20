import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import { isHebrew } from '../../utils/formatters';

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
  
  const { name, description, servings, prepTime, cookTime, totalTime, difficulty, category } = recipe;
  
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
  
  const formatTime = (minutes) => {
    if (!minutes) return '';
    if (minutes < 60) return minutes.toString();
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : hours.toString();
  };

  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const colonIndex = timeStr.indexOf(':');
    if (colonIndex > 0) {
      const hours = parseInt(timeStr.substring(0, colonIndex));
      const minutes = parseInt(timeStr.substring(colonIndex + 1));
      return (hours * 60) + (minutes || 0);
    }
    return parseInt(timeStr) || null;
  };

  const startEditing = (field, currentValue) => {
    let displayValue = currentValue;
    if (field.includes('Time') && currentValue) {
      displayValue = formatTime(currentValue);
    }
    onStartEdit(componentName, field, displayValue);
  };

  const cancelEditing = () => {
    onCancelEdit();
  };

  const saveField = (field) => {
    let value = globalEditingState.tempValues[field];
    
    // Parse time fields
    if (field.includes('Time')) {
      value = parseTime(value);
    }
    // Parse numeric fields
    else if (field === 'servings') {
      value = parseInt(value) || null;
    }
    // Empty strings become null
    else if (value === '') {
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
    const displayValue = field === 'category' && value 
      ? t(`resultDisplay.categories.${value}`, value) 
      : value || t('common.notSpecified');
    const isEmpty = !value;

    if (isEditing) {
      // Special handling for category field - use select dropdown
      if (field === 'category') {
        return (
          <div className="flex items-center gap-2">
            <select
              value={globalEditingState.tempValues[field] || ''}
              onChange={(e) => onUpdateEdit(field, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              onBlur={() => saveField(field)}
              className="flex-1 px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none focus:border-[#7a3c40]"
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

      const InputComponent = multiline ? 'textarea' : 'input';
      return (
        <div className="flex items-center gap-2">
          <InputComponent
            type={type}
            value={globalEditingState.tempValues[field] || ''}
            onChange={(e) => onUpdateEdit(field, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, field)}
            onBlur={() => saveField(field)}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none focus:border-[#7a3c40]"
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
        className={`cursor-pointer p-1 rounded hover:bg-[#f3e7e8] transition-colors ${
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
      
      {/* Metadata Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className="text-center">
          <div className="text-sm font-medium text-[#994d51] mb-1">
            {t('resultDisplay.metadata.prepTime')}
          </div>
          <div className="text-sm text-[#1b0e0e]">
            <EditableField
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
            <EditableField
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
          <div className="text-sm text-[#1b0e0e]">
            <EditableField
              field="totalTime"
              value={totalTime}
              placeholder="75"
            />
          </div>
        </div>
      </div>

      {/* Additional Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#f3e7e8]">
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
      </div>

      {/* Helper text */}
      <div className="text-xs text-gray-500 text-center pt-2 border-t border-[#f3e7e8]">
        {t('resultDisplay.edit.helper.clickToEdit')}
      </div>
    </Card>
  );
};

export default EditableMetadata;