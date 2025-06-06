import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ANIMATION_CONFIG } from '../utils/animationConfig';

const ResultDisplay = ({ result, onStartOver }) => {
  const [activeTab, setActiveTab] = useState('recipe');
  const [copiedSection, setCopiedSection] = useState(null);

  const { recipe, confidence_score, processing_time } = result;

  const formatTime = (minutes) => {
    if (!minutes) return 'Not specified';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const copyToClipboard = async (text, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatIngredientsList = () => {
    return recipe.ingredients
      .map(ing => `• ${ing.amount} ${ing.unit} ${ing.item}`)
      .join('\n');
  };

  const formatInstructionsList = () => {
    if (recipe.stages) {
      return recipe.stages
        .map((stage) => 
          `${stage.title}:\n${stage.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}`
        )
        .join('\n\n');
    }
    return recipe.instructions
      .map((inst, idx) => `${idx + 1}. ${inst}`)
      .join('\n');
  };

  const isHebrew = (text) => /[\u0590-\u05FF]/.test(text);
  const hasHebrewContent = isHebrew(recipe.name) || recipe.ingredients.some(ing => isHebrew(ing.item));

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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-[#f3e7e8] p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#1b0e0e] mb-1" style={{ direction: hasHebrewContent ? 'rtl' : 'ltr' }}>
              {recipe.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#994d51]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {Math.round(confidence_score * 100)}% confidence
              </span>
              <span>Processed in {processing_time.toFixed(2)}s</span>
            </div>
          </div>
          <button
            onClick={onStartOver}
            className="px-6 py-2 bg-[#f3e7e8] text-[#994d51] rounded-lg hover:bg-[#994d51] hover:text-white transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:ring-offset-2"
          >
            Process Another Recipe
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-[#f3e7e8] overflow-hidden min-h-[600px] flex flex-col">
        <div className="flex border-b border-[#f3e7e8] flex-shrink-0">
          {[
            { id: 'recipe', label: 'Recipe', icon: '🍽️' },
            { id: 'raw', label: 'Raw Data', icon: '📋' },
            { id: 'export', label: 'Export', icon: '📤' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:ring-inset ${
                activeTab === tab.id
                  ? 'bg-[#994d51] text-white'
                  : 'text-[#994d51] hover:bg-[#f3e7e8]'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 flex-1 overflow-hidden">
          {activeTab === 'recipe' && (
            <div className="space-y-6 h-full overflow-y-auto">
              {/* Recipe Info */}
              {(recipe.description || recipe.category || recipe.servings || recipe.prepTime || recipe.cookTime || recipe.totalTime) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-[#fcf8f8] rounded-lg">
                  {recipe.description && (
                    <div className="lg:col-span-2">
                      <div className="text-sm font-medium text-[#994d51] mb-1">Description</div>
                      <div className="text-sm text-[#1b0e0e]" style={{ direction: isHebrew(recipe.description) ? 'rtl' : 'ltr' }}>
                        {recipe.description}
                      </div>
                    </div>
                  )}
                  {recipe.category && (
                    <div>
                      <div className="text-sm font-medium text-[#994d51] mb-1">Category</div>
                      <div className="text-sm text-[#1b0e0e]">{recipe.category}</div>
                    </div>
                  )}
                  {recipe.servings && (
                    <div>
                      <div className="text-sm font-medium text-[#994d51] mb-1">Servings</div>
                      <div className="text-sm text-[#1b0e0e]">{recipe.servings}</div>
                    </div>
                  )}
                  {recipe.prepTime && (
                    <div>
                      <div className="text-sm font-medium text-[#994d51] mb-1">Prep Time</div>
                      <div className="text-sm text-[#1b0e0e]">{formatTime(recipe.prepTime)}</div>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div>
                      <div className="text-sm font-medium text-[#994d51] mb-1">Cook Time</div>
                      <div className="text-sm text-[#1b0e0e]">{formatTime(recipe.cookTime)}</div>
                    </div>
                  )}
                  {recipe.totalTime && (
                    <div>
                      <div className="text-sm font-medium text-[#994d51] mb-1">Total Time</div>
                      <div className="text-sm text-[#1b0e0e]">{formatTime(recipe.totalTime)}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Ingredients */}
              <div className="bg-white border border-[#f3e7e8] rounded-lg p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="text-lg font-bold text-[#1b0e0e]">
                    Ingredients ({recipe.ingredients.length})
                  </h3>
                  <button
                    onClick={() => copyToClipboard(formatIngredientsList(), 'ingredients')}
                    className="text-[#994d51] hover:text-[#1b0e0e] transition-colors duration-200 focus:outline-none"
                    title="Copy ingredients list"
                  >
                    {copiedSection === 'ingredients' ? (
                      <span className="text-green-600 text-sm">✓ Copied!</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path>
                      </svg>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto max-h-80">
                  {recipe.ingredients.map((ingredient, idx) => (
                    <div key={idx} className="flex items-center p-2 hover:bg-[#fcf8f8] rounded">
                      <span className="w-2 h-2 bg-[#994d51] rounded-full mr-3 flex-shrink-0"></span>
                      <span className="text-sm text-[#1b0e0e]" style={{ direction: isHebrew(ingredient.item) ? 'rtl' : 'ltr' }}>
                        <span className="font-medium">{ingredient.amount} {ingredient.unit}</span> {ingredient.item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white border border-[#f3e7e8] rounded-lg p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="text-lg font-bold text-[#1b0e0e]">Instructions</h3>
                  <button
                    onClick={() => copyToClipboard(formatInstructionsList(), 'instructions')}
                    className="text-[#994d51] hover:text-[#1b0e0e] transition-colors duration-200 focus:outline-none"
                    title="Copy instructions"
                  >
                    {copiedSection === 'instructions' ? (
                      <span className="text-green-600 text-sm">✓ Copied!</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path>
                      </svg>
                    )}
                  </button>
                </div>
                <div className="overflow-y-auto max-h-96">
                  {recipe.stages ? (
                    <div className="space-y-4">
                      {recipe.stages.map((stage, stageIdx) => (
                        <div key={stageIdx}>
                          <h4 className="font-semibold text-[#994d51] mb-2" style={{ direction: isHebrew(stage.title) ? 'rtl' : 'ltr' }}>
                            {stage.title}
                          </h4>
                          <ol className="space-y-2">
                            {stage.instructions.map((instruction, instIdx) => (
                              <li key={instIdx} className="flex items-start">
                                <span className="flex-shrink-0 w-6 h-6 bg-[#994d51] text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5">
                                  {instIdx + 1}
                                </span>
                                <span className="text-sm text-[#1b0e0e] flex-1" style={{ direction: isHebrew(instruction) ? 'rtl' : 'ltr' }}>
                                  {instruction}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ol className="space-y-3">
                      {recipe.instructions.map((instruction, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="flex-shrink-0 w-6 h-6 bg-[#994d51] text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-[#1b0e0e] flex-1" style={{ direction: isHebrew(instruction) ? 'rtl' : 'ltr' }}>
                            {instruction}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>

              {/* Tags */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-[#1b0e0e] mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 bg-[#f3e7e8] text-[#994d51] rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="h-full flex flex-col space-y-4">
              <div className="flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-bold text-[#1b0e0e]">Raw JSON Data</h3>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(result, null, 2), 'json')}
                  className="px-4 py-2 bg-[#994d51] text-white rounded-lg hover:bg-[#1b0e0e] transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:ring-offset-2"
                >
                  {copiedSection === 'json' ? '✓ Copied!' : 'Copy JSON'}
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <pre className="bg-[#fcf8f8] p-4 rounded-lg text-xs text-[#1b0e0e] border border-[#f3e7e8] h-full overflow-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="h-full flex flex-col space-y-4">
              <h3 className="text-lg font-bold text-[#1b0e0e] flex-shrink-0">Export Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <button
                  onClick={() => {
                    const recipeText = `${recipe.name}\n\n${recipe.description ? `${recipe.description}\n\n` : ''}Ingredients:\n${formatIngredientsList()}\n\nInstructions:\n${formatInstructionsList()}`;
                    copyToClipboard(recipeText, 'formatted');
                  }}
                  className="p-6 border border-[#f3e7e8] rounded-lg hover:bg-[#fcf8f8] transition-colors duration-200 text-left focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:ring-offset-2 h-fit"
                >
                  <div className="text-lg font-medium text-[#1b0e0e] mb-2">📝 Formatted Text</div>
                  <div className="text-sm text-[#994d51]">
                    {copiedSection === 'formatted' ? '✓ Copied to clipboard!' : 'Copy as formatted text'}
                  </div>
                </button>

                <button
                  onClick={() => copyToClipboard(JSON.stringify(result, null, 2), 'json-export')}
                  className="p-6 border border-[#f3e7e8] rounded-lg hover:bg-[#fcf8f8] transition-colors duration-200 text-left focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:ring-offset-2 h-fit"
                >
                  <div className="text-lg font-medium text-[#1b0e0e] mb-2">🔧 JSON Data</div>
                  <div className="text-sm text-[#994d51]">
                    {copiedSection === 'json-export' ? '✓ Copied to clipboard!' : 'Copy raw JSON data'}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ResultDisplay;