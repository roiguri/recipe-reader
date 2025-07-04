import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew } from '../../utils/formatters';
import Card from '../ui/Card';

/**
 * Simplified EditableInstructionsSection component with stable text input behavior
 * @param {Object} props - Component props
 * @param {Array} props.instructions - Array of instruction strings (flat format)
 * @param {Array} props.stages - Array of instruction stages (structured format)
 * @param {Function} props.onUpdate - Function to update instructions/stages
 * @param {Object} props.globalEditingState - Global editing state
 * @param {Function} props.onStartEdit - Function to start editing globally
 * @param {Function} props.onUpdateEdit - Function to update edit value globally
 * @param {Function} props.onSaveEdit - Function to save edit globally
 * @param {Function} props.onCancelEdit - Function to cancel edit globally
 */
const EditableInstructionsSection = ({ 
  instructions, 
  stages, 
  onUpdate, 
  globalEditingState, 
  onStartEdit, 
  onUpdateEdit, 
  onSaveEdit, 
  onCancelEdit 
}) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  const [isStructured, setIsStructured] = useState(!!stages);
  const componentName = 'instructions';

  // Generate stable IDs for instructions
  const getInstructionId = (index) => `instruction-${index}`;
  const getStageId = (stageIndex, instructionIndex) => `stage-${stageIndex}-instruction-${instructionIndex}`;
  const getStageTitleId = (stageIndex) => `stage-${stageIndex}-title`;

  // Current display data
  const displayData = isStructured ? (stages || []) : (instructions || []);

  // Start editing
  const startEditing = (fieldKey, currentValue) => {
    onStartEdit(componentName, fieldKey, currentValue || '');
  };

  // Stop editing (save)
  const stopEditing = () => {
    if (globalEditingState.component === componentName && globalEditingState.field) {
      const fieldKey = globalEditingState.field;
      const value = globalEditingState.tempValues[fieldKey];
      const trimmedValue = value?.trim() || '';
      
      // Parse the field key to determine what to update
      if (fieldKey.startsWith('instruction-')) {
        const index = parseInt(fieldKey.replace('instruction-', ''));
        if (trimmedValue) {
          updateInstruction(index, trimmedValue);
        } else {
          // Remove empty instruction
          const newInstructions = (instructions || []).filter((_, i) => i !== index);
          onUpdate({ instructions: newInstructions });
        }
      } else if (fieldKey.startsWith('stage-') && fieldKey.includes('-title')) {
        const stageIndex = parseInt(fieldKey.split('-')[1]);
        // Stage titles can be empty, so just update with trimmed value
        updateStageTitle(stageIndex, trimmedValue);
      } else if (fieldKey.startsWith('stage-') && fieldKey.includes('-instruction-')) {
        const parts = fieldKey.split('-');
        const stageIndex = parseInt(parts[1]);
        const instructionIndex = parseInt(parts[3]);
        if (trimmedValue) {
          updateStageInstruction(stageIndex, instructionIndex, trimmedValue);
        } else {
          // Remove empty instruction from stage
          const newStages = [...(stages || [])];
          const newInstructions = (newStages[stageIndex]?.instructions || []).filter((_, i) => i !== instructionIndex);
          newStages[stageIndex] = { ...newStages[stageIndex], instructions: newInstructions };
          onUpdate({ stages: newStages });
        }
      }
      
      onSaveEdit();
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    onCancelEdit();
  };

  // Toggle between flat and structured formats
  const toggleFormat = () => {
    if (isStructured) {
      // Check if we have stage titles that will be lost
      const hasStageTitles = stages?.some(stage => stage.title?.trim());
      
      if (hasStageTitles) {
        const confirmed = window.confirm(t('resultDisplay.edit.confirmLoseTitles'));
        if (!confirmed) return;
      }
      
      // Convert stages to flat instructions
      const flatInstructions = stages ? 
        stages.flatMap(stage => stage.instructions || []) : 
        [''];
      onUpdate({ instructions: flatInstructions, stages: null });
    } else {
      // Convert flat instructions to stages
      const newStages = instructions?.length > 0 ? 
        [{ title: t('resultDisplay.edit.defaultStageTitle'), instructions: [...instructions] }] :
        [{ title: '', instructions: [''] }];
      onUpdate({ stages: newStages, instructions: null });
    }
    setIsStructured(!isStructured);
    onCancelEdit(); // Clear global editing state
  };

  // Flat instructions functions
  const updateInstruction = (index, value) => {
    const newInstructions = [...(instructions || [])];
    if (index >= newInstructions.length) {
      newInstructions.push(value);
    } else {
      newInstructions[index] = value;
    }
    onUpdate({ instructions: newInstructions });
  };

  const deleteInstruction = (index) => {
    const newInstructions = instructions.filter((_, i) => i !== index);
    onUpdate({ instructions: newInstructions });
  };

  const addNewInstruction = () => {
    const newIndex = (instructions || []).length;
    const newInstructions = [...(instructions || []), ''];
    onUpdate({ instructions: newInstructions });
    startEditing(getInstructionId(newIndex), '');
  };

  // Structured stages functions
  const updateStageTitle = (stageIndex, value) => {
    const newStages = [...(stages || [])];
    newStages[stageIndex] = { ...newStages[stageIndex], title: value };
    onUpdate({ stages: newStages });
  };

  const updateStageInstruction = (stageIndex, instructionIndex, value) => {
    const newStages = [...(stages || [])];
    const newInstructions = [...(newStages[stageIndex]?.instructions || [])];
    
    if (instructionIndex >= newInstructions.length) {
      newInstructions.push(value);
    } else {
      newInstructions[instructionIndex] = value;
    }
    
    newStages[stageIndex] = { ...newStages[stageIndex], instructions: newInstructions };
    onUpdate({ stages: newStages });
  };

  const deleteStageInstruction = (stageIndex, instructionIndex) => {
    const newStages = [...stages];
    newStages[stageIndex].instructions = newStages[stageIndex].instructions.filter((_, i) => i !== instructionIndex);
    onUpdate({ stages: newStages });
  };

  const addNewStage = () => {
    const newStages = [...(stages || []), { title: '', instructions: [''] }];
    onUpdate({ stages: newStages });
  };

  const deleteStage = (stageIndex) => {
    const newStages = stages.filter((_, i) => i !== stageIndex);
    onUpdate({ stages: newStages });
  };

  // Handle keyboard navigation and text alignment
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      stopEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Handle input changes with dynamic direction/alignment
  const handleInputChange = (e, fieldKey) => {
    const value = e.target.value;
    
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

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-[#1b0e0e]">
          {t('resultDisplay.sections.instructions')}
        </h3>
        
        <div className="flex items-center gap-2">
          {/* Format toggle switch */}
          <div className="flex items-center text-sm">
            {direction === 'rtl' ? (
              // RTL layout: Structured - Toggle - Simple
              <>
                <span className="ml-2">{t('resultDisplay.edit.structured')}</span>
                <button
                  onClick={toggleFormat}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:ring-offset-2 ${
                    isStructured ? 'bg-[#994d51]' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={isStructured}
                  aria-label={t('resultDisplay.edit.toggleFormat')}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isStructured ? '-translate-x-1' : '-translate-x-6'
                    }`}
                  />
                </button>
                <span className="mr-2">{t('resultDisplay.edit.simple')}</span>
              </>
            ) : (
              // LTR layout: Simple - Toggle - Structured
              <>
                <span className="mr-2">{t('resultDisplay.edit.simple')}</span>
                <button
                  onClick={toggleFormat}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:ring-offset-2 ${
                    isStructured ? 'bg-[#994d51]' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={isStructured}
                  aria-label={t('resultDisplay.edit.toggleFormat')}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isStructured ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="ml-2">{t('resultDisplay.edit.structured')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="overflow-y-auto overflow-x-auto max-h-96 -mx-3 md:-mx-6">
        {isStructured ? (
          // Structured stages view
          <div className="space-y-4 px-3 md:px-6">
            {displayData.map((stage, stageIdx) => (
              <div key={stageIdx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  {/* Stage title */}
                  {globalEditingState.component === componentName && globalEditingState.field === getStageTitleId(stageIdx) ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={globalEditingState.tempValues[getStageTitleId(stageIdx)] || ''}
                        onChange={(e) => handleInputChange(e, getStageTitleId(stageIdx))}
                        onKeyDown={handleKeyDown}
                        onBlur={stopEditing}
                        className="flex-1 px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none"
                        placeholder={t('resultDisplay.edit.placeholders.stageTitle')}
                        style={{ 
                          direction: direction === 'rtl' ? 'rtl' : 'ltr',
                          textAlign: direction === 'rtl' ? 'right' : 'left' 
                        }}
                        autoFocus
                      />
                      <button
                        onClick={stopEditing}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <h4 
                        className="font-semibold text-[#994d51] cursor-pointer hover:bg-[#f3e7e8] p-1 rounded"
                        onClick={() => startEditing(getStageTitleId(stageIdx), stage.title)}
                        style={{ direction: isHebrew(stage.title) ? 'rtl' : 'ltr' }}
                      >
                        {stage.title || t('resultDisplay.edit.clickToAddStageTitle')}
                      </h4>
                      <button
                        onClick={() => deleteStage(stageIdx)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title={t('resultDisplay.edit.deleteStage')}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
                
                <ol className="space-y-2 instructions-list">
                  {(stage.instructions || ['']).map((instruction, instIdx) => {
                    const instructionId = getStageId(stageIdx, instIdx);
                    const isEditing = globalEditingState.component === componentName && globalEditingState.field === instructionId;
                    
                    return (
                      <li key={instIdx} className="flex items-start group">
                        <span className={`flex-shrink-0 w-6 h-6 bg-[#994d51] text-white rounded-full text-xs flex items-center justify-center ${direction === 'rtl' ? 'ml-3' : 'mr-3'} mt-0.5`}>
                          {instIdx + 1}
                        </span>
                        
                        {isEditing ? (
                          <div className="flex-1 flex gap-2">
                            <textarea
                              value={globalEditingState.tempValues[instructionId] || ''}
                              onChange={(e) => handleInputChange(e, instructionId)}
                              onKeyDown={handleKeyDown}
                              onBlur={stopEditing}
                              className="flex-1 px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none resize-none"
                              rows={2}
                              style={{ 
                                direction: direction === 'rtl' ? 'rtl' : 'ltr',
                                textAlign: direction === 'rtl' ? 'right' : 'left' 
                              }}
                              autoFocus
                            />
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={stopEditing}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                ✓
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-gray-600 hover:text-gray-800 text-sm"
                              >
                                ✕
                              </button>
                              <button
                                onClick={() => deleteStageInstruction(stageIdx, instIdx)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-start justify-between">
                            <span 
                              className="text-sm text-[#1b0e0e] flex-1 cursor-pointer hover:bg-[#fcf8f8] p-1 rounded"
                              onClick={() => startEditing(instructionId, instruction)}
                              style={{ direction: isHebrew(instruction) ? 'rtl' : 'ltr' }}
                            >
                              {instruction || t('resultDisplay.edit.clickToAddInstruction')}
                            </span>
                            
                            {instruction && (
                              <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${direction === 'rtl' ? 'mr-2' : 'ml-2'}`}>
                                <button
                                  onClick={() => startEditing(instructionId, instruction)}
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                  title={t('resultDisplay.edit.edit')}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => deleteStageInstruction(stageIdx, instIdx)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                  title={t('resultDisplay.edit.delete')}
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                  
                  {/* Add new instruction to stage */}
                  <li 
                    className="flex items-start cursor-pointer text-gray-500 hover:text-[#994d51] transition-colors"
                    onClick={() => {
                      const newInstIdx = stage.instructions?.length || 0;
                      const newInstructions = [...(stage.instructions || []), ''];
                      const newStages = [...stages];
                      newStages[stageIdx] = { ...newStages[stageIdx], instructions: newInstructions };
                      onUpdate({ stages: newStages });
                      startEditing(getStageId(stageIdx, newInstIdx), '');
                    }}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 border-2 border-dashed border-gray-300 rounded-full text-xs flex items-center justify-center ${direction === 'rtl' ? 'ml-3' : 'mr-3'} mt-0.5`}>
                      +
                    </span>
                    <span className="text-sm italic">
                      {t('resultDisplay.edit.addInstruction')}
                    </span>
                  </li>
                </ol>
              </div>
            ))}
            
            {/* Add new stage */}
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer text-gray-500 hover:text-[#994d51] hover:border-[#994d51] transition-colors text-center"
              onClick={addNewStage}
            >
              <span className="text-2xl mb-2 block">+</span>
              <span className="text-sm italic">
                {t('resultDisplay.edit.addNewStage')}
              </span>
            </div>
          </div>
        ) : (
          // Flat instructions view
          <ol className="space-y-3 px-3 md:px-6 instructions-list">
            {displayData.map((instruction, idx) => {
              const instructionId = getInstructionId(idx);
              const isEditing = globalEditingState.component === componentName && globalEditingState.field === instructionId;
              
              return (
                <li key={idx} className="flex items-start group">
                  <span className={`flex-shrink-0 w-6 h-6 bg-[#994d51] text-white rounded-full text-xs flex items-center justify-center ${direction === 'rtl' ? 'ml-3' : 'mr-3'} mt-0.5`}>
                    {idx + 1}
                  </span>
                  
                  {isEditing ? (
                    <div className="flex-1 flex gap-2">
                      <textarea
                        value={globalEditingState.tempValues[instructionId] || ''}
                        onChange={(e) => handleInputChange(e, instructionId)}
                        onKeyDown={handleKeyDown}
                        onBlur={stopEditing}
                        className="flex-1 px-2 py-1 border border-[#994d51] rounded text-sm focus:outline-none resize-none"
                        rows={2}
                        style={{ 
                          direction: direction === 'rtl' ? 'rtl' : 'ltr',
                          textAlign: direction === 'rtl' ? 'right' : 'left' 
                        }}
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={stopEditing}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          ✕
                        </button>
                        <button
                          onClick={() => deleteInstruction(idx)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-start justify-between">
                      <span 
                        className="text-sm text-[#1b0e0e] flex-1 cursor-pointer hover:bg-[#fcf8f8] p-1 rounded"
                        onClick={() => startEditing(instructionId, instruction)}
                        style={{ direction: isHebrew(instruction) ? 'rtl' : 'ltr' }}
                      >
                        {instruction || t('resultDisplay.edit.clickToAddInstruction')}
                      </span>
                      
                      {instruction && (
                        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${direction === 'rtl' ? 'mr-2' : 'ml-2'}`}>
                          <button
                            onClick={() => startEditing(instructionId, instruction)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            title={t('resultDisplay.edit.edit')}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteInstruction(idx)}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title={t('resultDisplay.edit.delete')}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            
            {/* Add new instruction button */}
            <li 
              className="flex items-start cursor-pointer text-gray-500 hover:text-[#994d51] transition-colors"
              onClick={addNewInstruction}
            >
              <span className={`flex-shrink-0 w-6 h-6 border-2 border-dashed border-gray-300 rounded-full text-xs flex items-center justify-center ${direction === 'rtl' ? 'ml-3' : 'mr-3'} mt-0.5`}>
                +
              </span>
              <span className="text-sm italic">
                {t('resultDisplay.edit.addNewInstruction')}
              </span>
            </li>
          </ol>
        )}
      </div>
      
      {/* Helper text */}
      <div className="text-xs text-gray-500 mt-4 pt-2 border-t border-[#f3e7e8]">
        {t('resultDisplay.edit.helper.instructions')}
      </div>
    </Card>
  );
};

export default EditableInstructionsSection;