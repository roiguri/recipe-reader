import React from 'react';
import { useTranslation } from 'react-i18next';
import { isHebrew } from '../../utils/formatters';
import Card from '../ui/Card';

/**
 * EditableTagList component displays and allows editing of recipe tags
 * @param {Object} props - Component props
 * @param {Array} props.tags - Array of tag strings
 * @param {Function} props.onUpdate - Function to update tags
 * @param {Object} props.globalEditingState - Global editing state
 * @param {Function} props.onStartEdit - Function to start editing globally
 * @param {Function} props.onUpdateEdit - Function to update edit value globally
 * @param {Function} props.onSaveEdit - Function to save edit globally
 * @param {Function} props.onCancelEdit - Function to cancel edit globally
 */
const EditableTagList = ({ 
  tags, 
  onUpdate, 
  globalEditingState, 
  onStartEdit, 
  onUpdateEdit, 
  onSaveEdit, 
  onCancelEdit 
}) => {
  const { t } = useTranslation();
  const componentName = 'tags';

  // Ensure we have an array to work with
  const displayTags = tags || [];

  const addTag = () => {
    const fieldKey = 'new-tag';
    const value = globalEditingState.tempValues[fieldKey];
    const trimmed = value?.trim();
    if (trimmed && !displayTags.includes(trimmed)) {
      onUpdate({ tags: [...displayTags, trimmed] });
    }
    onSaveEdit();
  };

  const removeTag = (index) => {
    const newTags = displayTags.filter((_, i) => i !== index);
    onUpdate({ tags: newTags });
  };

  const startEditing = (fieldKey, currentValue) => {
    onStartEdit(componentName, fieldKey, currentValue || '');
  };

  const saveEdit = () => {
    if (globalEditingState.component === componentName && globalEditingState.field) {
      const fieldKey = globalEditingState.field;
      const value = globalEditingState.tempValues[fieldKey];
      
      if (fieldKey === 'new-tag') {
        // Adding new tag
        const trimmed = value?.trim();
        if (trimmed && !displayTags.includes(trimmed)) {
          onUpdate({ tags: [...displayTags, trimmed] });
        }
      } else if (fieldKey.startsWith('edit-')) {
        // Editing existing tag
        const index = parseInt(fieldKey.replace('edit-', ''));
        const trimmed = value?.trim();
        if (trimmed && !displayTags.includes(trimmed)) {
          // Update the tag with new value
          const newTags = [...displayTags];
          newTags[index] = trimmed;
          onUpdate({ tags: newTags });
        } else if (!trimmed) {
          // Remove empty tag
          const newTags = displayTags.filter((_, i) => i !== index);
          onUpdate({ tags: newTags });
        }
        // If trimmed value already exists, do nothing (keep original)
      }
      
      onSaveEdit();
    }
  };

  const cancelEdit = () => {
    onCancelEdit();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Show section even if no tags exist (to allow adding)
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-[#1b0e0e]">
          {t('resultDisplay.sections.tags')} ({displayTags.length})
        </h3>
        {!(globalEditingState.component === componentName && globalEditingState.field === 'new-tag') && (
          <button
            onClick={() => startEditing('new-tag', '')}
            className="px-3 py-1 text-sm bg-[#994d51] text-white rounded hover:bg-[#7a3c40] flex items-center gap-1"
          >
            <span>+</span> {t('resultDisplay.edit.addTag')}
          </button>
        )}
      </div>

      {displayTags.length > 0 || (globalEditingState.component === componentName && globalEditingState.field === 'new-tag') ? (
        <div className="flex flex-wrap gap-2">
          {/* Existing tags */}
          {displayTags.map((tag, index) => {
            const fieldKey = `edit-${index}`;
            const isEditing = globalEditingState.component === componentName && globalEditingState.field === fieldKey;
            
            return (
              <div key={index} className="group relative">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={globalEditingState.tempValues[fieldKey] || ''}
                      onChange={(e) => onUpdateEdit(fieldKey, e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEdit}
                      className="px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none"
                      style={{ minWidth: '60px' }}
                      dir="auto"
                      autoFocus
                    />
                    <button
                      onClick={cancelEdit}
                      className="text-red-600 hover:text-red-800 text-xs"
                      title={t('common.cancel')}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#f3e7e8] text-[#994d51] hover:bg-[#e8d7d9] cursor-pointer transition-colors"
                    onClick={() => startEditing(fieldKey, tag)}
                    style={{ direction: isHebrew(tag) ? 'rtl' : 'ltr' }}
                    title={t('resultDisplay.edit.clickToEdit')}
                  >
                    {tag}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag(index);
                      }}
                      className="ml-2 text-[#994d51] hover:text-[#7a3c40] opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('resultDisplay.edit.removeTag')}
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            );
          })}

          {/* Add new tag input */}
          {globalEditingState.component === componentName && globalEditingState.field === 'new-tag' && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={globalEditingState.tempValues['new-tag'] || ''}
                onChange={(e) => onUpdateEdit('new-tag', e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveEdit}
                placeholder={t('resultDisplay.edit.placeholders.newTag')}
                className="px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none"
                style={{ minWidth: '80px' }}
                dir="auto"
                autoFocus
              />
              <button
                onClick={cancelEdit}
                className="text-red-600 hover:text-red-800 text-xs"
                title={t('common.cancel')}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ) : (
        // Empty state
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <span className="text-2xl">🏷️</span>
          </div>
          <p className="text-gray-500 mb-4">{t('resultDisplay.edit.noTags')}</p>
          <button
            onClick={() => startEditing('new-tag', '')}
            className="px-4 py-2 bg-[#994d51] text-white rounded hover:bg-[#7a3c40] transition-colors"
          >
            {t('resultDisplay.edit.addFirstTag')}
          </button>
        </div>
      )}

      {/* Helper text */}
      {(displayTags.length > 0 || (globalEditingState.component === componentName && globalEditingState.field === 'new-tag')) && (
        <div className="text-xs text-gray-500 mt-4 pt-2 border-t border-[#f3e7e8]">
          {t('resultDisplay.edit.helper.tags')}
        </div>
      )}
    </Card>
  );
};

export default EditableTagList;