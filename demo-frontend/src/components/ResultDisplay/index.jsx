import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';
import useClipboard from '../../hooks/useClipboard';
import Card from '../ui/Card';
import CopyButton from '../ui/CopyButton';

// Import sub-components
import TabNavigation from './TabNavigation';
import RecipeInfoCard from './RecipeInfoCard';
import IngredientsSection from './IngredientsSection';
import InstructionsSection from './InstructionsSection';
import Metadata from './Metadata';
import TagList from './TagList';
import ExportOptions from './ExportOptions';

// Import editable components
import EditableMetadata from './EditableMetadata';
import EditableIngredientsSection from './EditableIngredientsSection';
import EditableInstructionsSection from './EditableInstructionsSection';
import EditableTagList from './EditableTagList';

const ResultDisplay = ({ result, onStartOver }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('recipe');
  const [copyToClipboard, copiedSection] = useClipboard();
  const [editedRecipe, setEditedRecipe] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [globalEditingState, setGlobalEditingState] = useState({ component: null, field: null, tempValues: {} });

  const { recipe, confidence_score, processing_time } = result;

  // Use edited recipe if available, otherwise use original
  const displayRecipe = editedRecipe || recipe;

  // Initialize edited recipe when edit tab is first accessed
  const handleTabChange = (tabId) => {
    if (tabId === 'edit' && !editedRecipe) {
      setEditedRecipe(JSON.parse(JSON.stringify(recipe))); // Deep copy
    }
    setActiveTab(tabId);
  };

  // Update edited recipe and mark as having unsaved changes
  const updateEditedRecipe = (updates) => {
    setEditedRecipe(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  // Save changes (apply edited recipe as new recipe)
  const saveChanges = () => {
    // In a real app, this would save to backend
    setHasUnsavedChanges(false);
    // For now, we keep the edited recipe as the display recipe
  };

  // Discard changes (reset to original recipe)
  const discardChanges = () => {
    setEditedRecipe(JSON.parse(JSON.stringify(recipe)));
    setHasUnsavedChanges(false);
  };

  // Global editing state management
  const startGlobalEdit = (component, field, currentValue) => {
    // If already editing something else, save it first
    if (globalEditingState.component && globalEditingState.field) {
      saveGlobalEdit();
    }
    setGlobalEditingState({ 
      component, 
      field, 
      tempValues: { [field]: currentValue || '' } 
    });
  };

  const updateGlobalEditValue = (field, value) => {
    setGlobalEditingState(prev => ({
      ...prev,
      tempValues: { ...prev.tempValues, [field]: value }
    }));
  };

  const saveGlobalEdit = () => {
    const { component, field, tempValues } = globalEditingState;
    if (!component || !field) return;
    
    // Notify the component to save the current edit
    // This will be handled by each component's onSave callback
    setGlobalEditingState({ component: null, field: null, tempValues: {} });
  };

  const cancelGlobalEdit = () => {
    setGlobalEditingState({ component: null, field: null, tempValues: {} });
  };

  // Define tabs
  const tabs = [
    { id: 'recipe', icon: '🍽️' },
    { id: 'edit', icon: '✏️' },
    { id: 'raw', icon: '📋' },
    { id: 'export', icon: '📤' }
  ];

  // TODO: Implement export functionality
  const handleExport = (type, recipeData) => {
    alert(t('resultDisplay.export.notImplemented', { type }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: ANIMATION_CONFIG.CONTENT_FADE_IN / 1000,
        ease: ANIMATION_CONFIG.CONTENT_EASE 
      }}
      className="w-full max-w-6xl mx-auto p-6"
    >
      {/* Recipe header/metadata */}
      <RecipeInfoCard 
        recipe={displayRecipe}
        confidenceScore={confidence_score}
        processingTime={processing_time}
        onStartOver={onStartOver}
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
        <div className="p-6 flex-1 overflow-hidden">
          {activeTab === 'recipe' && (
            <div className="space-y-6 h-full overflow-y-auto">
              {/* Recipe metadata */}
              <Metadata recipe={displayRecipe} />
              
              {/* Ingredients section */}
              <IngredientsSection 
                ingredients={displayRecipe.ingredients}
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

              {/* Tags section */}
              <TagList tags={displayRecipe.tags} />
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="space-y-6 h-full overflow-y-auto">
              {/* Edit mode header with save/discard buttons */}
              {hasUnsavedChanges && (
                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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
                      className="px-3 py-1 text-sm bg-[#994d51] text-white rounded hover:bg-[#7a3c40]"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              )}

              {/* Editable Recipe metadata */}
              <EditableMetadata 
                recipe={editedRecipe}
                onUpdate={updateEditedRecipe}
                globalEditingState={globalEditingState}
                onStartEdit={startGlobalEdit}
                onUpdateEdit={updateGlobalEditValue}
                onSaveEdit={saveGlobalEdit}
                onCancelEdit={cancelGlobalEdit}
              />
              
              {/* Editable Ingredients section */}
              <EditableIngredientsSection 
                ingredients={editedRecipe?.ingredients || []}
                onUpdate={updateEditedRecipe}
                globalEditingState={globalEditingState}
                onStartEdit={startGlobalEdit}
                onUpdateEdit={updateGlobalEditValue}
                onSaveEdit={saveGlobalEdit}
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
                onSaveEdit={saveGlobalEdit}
                onCancelEdit={cancelGlobalEdit}
              />

              {/* Editable Tags section */}
              <EditableTagList 
                tags={editedRecipe?.tags || []}
                onUpdate={updateEditedRecipe}
                globalEditingState={globalEditingState}
                onStartEdit={startGlobalEdit}
                onUpdateEdit={updateGlobalEditValue}
                onSaveEdit={saveGlobalEdit}
                onCancelEdit={cancelGlobalEdit}
              />
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="h-full overflow-y-auto" dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }}>
              <div className="relative" dir="ltr">
                <pre 
                  className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto" 
                  dir="ltr" 
                  style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'embed' }}
                >
                  {JSON.stringify(displayRecipe, null, 2)}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton
                    content={JSON.stringify(displayRecipe, null, 2)}
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
            <div className="space-y-6 h-full overflow-y-auto">
              <ExportOptions 
                recipe={displayRecipe} 
                onExport={handleExport}
              />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default ResultDisplay; 