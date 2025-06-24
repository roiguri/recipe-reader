import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew } from '../../utils/formatters';
import Card from '../ui/Card';

/**
 * EditableCommentsSection component allows editing of recipe comments/notes
 * @param {Object} props - Component props
 * @param {string} props.comments - Recipe comments string
 * @param {Function} props.onUpdate - Function to update recipe data
 * @param {Object} props.globalEditingState - Global editing state
 * @param {Function} props.onStartEdit - Function to start editing globally
 * @param {Function} props.onUpdateEdit - Function to update edit value globally
 * @param {Function} props.onSaveEdit - Function to save edit globally
 * @param {Function} props.onCancelEdit - Function to cancel edit globally
 */
const EditableCommentsSection = ({ 
  comments, 
  onUpdate, 
  globalEditingState, 
  onStartEdit, 
  onUpdateEdit, 
  onSaveEdit, 
  onCancelEdit 
}) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  const componentName = 'comments';
  const fieldName = 'comments';
  
  const isEditing = globalEditingState.component === componentName && globalEditingState.field === fieldName;
  
  const startEditing = () => {
    onStartEdit(componentName, fieldName, comments || '');
  };
  
  const saveField = () => {
    const newValue = globalEditingState.tempValues[fieldName] || '';
    onUpdate({ comments: newValue });
    onSaveEdit();
  };
  
  const cancelEditing = () => {
    onCancelEdit();
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      cancelEditing();
    }
    // For textarea, we don't want to save on Enter, as it's used for line breaks
  };
  
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-[#1b0e0e]">{t('resultDisplay.metadata.comments')}</h3>
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={globalEditingState.tempValues[fieldName] || ''}
            onChange={(e) => onUpdateEdit(fieldName, e.target.value)}
            onBlur={saveField}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[100px] p-3 border border-[#994d51] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#994d51] text-sm resize-vertical"
            placeholder={t('resultDisplay.metadata.comments')}
            style={{ direction: isHebrew(globalEditingState.tempValues[fieldName] || '') ? 'rtl' : 'ltr' }}
            autoFocus
          />
          <div className="flex gap-2 text-xs">
            <button
              onClick={saveField}
              className="px-2 py-1 bg-[#994d51] text-white rounded hover:bg-[#7a3c40]"
            >
              {t('common.save')}
            </button>
            <button
              onClick={cancelEditing}
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={startEditing}
          className="cursor-pointer hover:bg-[#f3e7e8] rounded p-2 transition-colors min-h-[100px]"
        >
          {comments && comments.trim() !== '' ? (
            <div className="text-sm text-[#1b0e0e]" style={{ direction: isHebrew(comments) ? 'rtl' : 'ltr' }}>
              {comments.split('\n').map((line, index) => (
                <p key={index} className={index > 0 ? 'mt-2' : ''}>
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 italic text-sm">
              {t('resultDisplay.metadata.comments')}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default EditableCommentsSection;