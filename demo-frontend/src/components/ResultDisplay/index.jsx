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

const ResultDisplay = ({ result, onStartOver }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('recipe');
  const [copyToClipboard, copiedSection] = useClipboard();

  const { recipe, confidence_score, processing_time } = result;

  // Define tabs
  const tabs = [
    { id: 'recipe', icon: '🍽️' },
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
        recipe={recipe}
        confidenceScore={confidence_score}
        processingTime={processing_time}
        onStartOver={onStartOver}
      />

      {/* Tabs container */}
      <Card className="overflow-hidden min-h-[600px] flex flex-col" noPadding>
        {/* Tab navigation */}
        <TabNavigation 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
        />

        {/* Tab content */}
        <div className="p-6 flex-1 overflow-hidden">
          {activeTab === 'recipe' && (
            <div className="space-y-6 h-full overflow-y-auto">
              {/* Recipe metadata */}
              <Metadata recipe={recipe} />
              
              {/* Ingredients section */}
              <IngredientsSection 
                ingredients={recipe.ingredients}
                onCopyToClipboard={copyToClipboard}
                copiedSection={copiedSection}
              />
              
              {/* Instructions section */}
              <InstructionsSection 
                instructions={recipe.instructions}
                stages={recipe.stages}
                onCopyToClipboard={copyToClipboard}
                copiedSection={copiedSection}
              />

              {/* Tags section */}
              <TagList tags={recipe.tags} />
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
                  {JSON.stringify(recipe, null, 2)}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton
                    content={JSON.stringify(recipe, null, 2)}
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
                recipe={recipe} 
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