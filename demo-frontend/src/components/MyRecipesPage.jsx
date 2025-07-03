import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { RecipesService } from '../services/recipesService';
import Button from './ui/Button';
import ResultDisplay from './ResultDisplay';
import SourceViewModal from './SourceViewModal';
import RecipeOptionCard from './RecipeOptionCard';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ANIMATION_CONFIG } from '../utils/animationConfig';

/**
 * MyRecipesPage component for displaying user's saved recipes
 */
const MyRecipesPage = ({ onNavigateHome }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [sourceViewModal, setSourceViewModal] = useState({ isOpen: false, recipe: null });
  const [showCards, setShowCards] = useState(true);
  const [showExpandedContent, setShowExpandedContent] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadRecipes();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Animation state management - mirrors OptionsGrid logic
  useEffect(() => {
    if (expandedRecipe) {
      // Hide cards when expanding
      setShowCards(false);
      // Delay showing expanded content until morph completes
      const timer = setTimeout(() => {
        setShowExpandedContent(true);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      // When returning, hide expanded content immediately
      setShowExpandedContent(false);
      // Then delay showing cards until container is back
      const timer = setTimeout(() => {
        setShowCards(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [expandedRecipe]);

  // Keyboard support for ESC key to close expanded recipe
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && expandedRecipe) {
        event.preventDefault();
        setExpandedRecipe(null);
      }
    };

    if (expandedRecipe) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [expandedRecipe]);

  const loadRecipes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await RecipesService.getUserRecipes();
      
      if (error) {
        setError(error.message || t('myRecipes.loadError'));
      } else {
        setRecipes(data || []);
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError(t('myRecipes.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm(t('myRecipes.deleteConfirm'))) {
      return;
    }

    try {
      const { error } = await RecipesService.deleteRecipe(recipeId);
      
      if (error) {
        alert(error.message || t('myRecipes.deleteError'));
      } else {
        // Remove from local state
        setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      }
    } catch (err) {
      console.error('Error deleting recipe:', err);
      alert(t('myRecipes.deleteError'));
    }
  };

  // Authentication guard
  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ANIMATION_CONFIG.DEFAULT}
        className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      >
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-[#1b0e0e] mb-4">
            {t('myRecipes.authRequired')}
          </h1>
          <p className="text-[#4b2c2c] mb-6">
            {t('myRecipes.authRequiredDesc')}
          </p>
          <Button onClick={onNavigateHome}>
            {t('myRecipes.goHome')}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[40vh]"
      >
        <div className="flex items-center gap-3 text-[#4b2c2c]">
          <div className="w-6 h-6 border-2 border-[#994d51] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg">{t('myRecipes.loading')}</span>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[40vh] px-4"
      >
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            {t('myRecipes.errorTitle')}
          </h2>
          <p className="text-[#4b2c2c] mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={loadRecipes}>
              {t('myRecipes.retry')}
            </Button>
            <Button onClick={onNavigateHome}>
              {t('myRecipes.goHome')}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Empty state
  if (recipes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ANIMATION_CONFIG.DEFAULT}
        className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      >
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-[#1b0e0e] mb-4">
            {t('myRecipes.empty')}
          </h1>
          <p className="text-[#4b2c2c] mb-6">
            {t('myRecipes.emptyDesc')}
          </p>
          <Button onClick={onNavigateHome}>
            {t('myRecipes.startCooking')}
          </Button>
        </div>
      </motion.div>
    );
  }

  const handleCardClick = (recipeId) => {
    setExpandedRecipe(expandedRecipe === recipeId ? null : recipeId);
  };

  const handleViewSource = (recipe) => {
    setSourceViewModal({ isOpen: true, recipe });
  };

  const createResultForDisplay = (recipe) => {
    // Transform saved recipe data back to the format expected by ResultDisplay
    return {
      recipe: recipe.processed_recipe,
      confidence_score: recipe.confidence_score || 0.8,
      processing_time: 0, // We don't store processing time for saved recipes
      source_type: recipe.source_type,
      source_data: recipe.source_data
    };
  };

  // Main recipes display  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION_CONFIG.DEFAULT}
      className="w-full max-w-6xl mx-auto p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1b0e0e] mb-2">
            {t('myRecipes.title')}
          </h1>
          <p className="text-[#4b2c2c]">
            {t('myRecipes.subtitle', { count: recipes.length })}
          </p>
        </div>
        <Button variant="secondary" onClick={onNavigateHome}>
          {t('myRecipes.backToHome')}
        </Button>
      </div>

      {/* Recipes Grid - matches ExpandableCardGrid/OptionsGrid pattern */}
      <div className="relative" style={{ overflow: expandedRecipe ? 'visible' : 'hidden' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-2 md:p-4">
          <LayoutGroup>
            {recipes.map((recipe) => {
              const isExpanded = expandedRecipe === recipe.id;
              
              return (
                <React.Fragment key={recipe.id}>
                  {isExpanded ? (
                    <>
                      {/* Overlay for click-outside-to-close */}
                      <motion.div
                        className="fixed inset-0 bg-black bg-opacity-25 z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => handleCardClick(recipe.id)}
                      />
                      
                      {/* Expanded card */}
                      <motion.div
                        layoutId={recipe.id}
                        className="absolute inset-x-0 top-0 z-50 p-2 md:p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`expanded-title-${recipe.id}`}
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                      >
                      <div className="bg-[#fcf8f8] rounded-lg border border-[#e7d0d1] p-3 md:p-6 min-h-0">
                        {/* Header with blur effect - matches OptionsGrid */}
                        <motion.div
                          className="flex items-center justify-between mb-3 md:mb-6"
                          animate={{
                            filter: showExpandedContent ? "blur(0px)" : "blur(4px)",
                            opacity: showExpandedContent ? 1 : 0.7
                          }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-[#1b0e0e] flex-shrink-0" aria-hidden="true">
                              {/* Recipe icon based on source type */}
                              {recipe.source_type === 'url' ? (
                                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                                </svg>
                              ) : recipe.source_type === 'image' ? (
                                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>
                                </svg>
                              ) : (
                                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                </svg>
                              )}
                            </div>
                            <h2 
                              id={`expanded-title-${recipe.id}`}
                              className="text-[#1b0e0e] text-base md:text-lg lg:text-xl font-bold break-words"
                            >
                              {recipe.title || recipe.processed_recipe?.name || t('myRecipes.untitled')}
                            </h2>
                          </div>
                          
                          {/* Control buttons */}
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSource(recipe);
                              }}
                              className="p-2 text-[#4b2c2c] hover:bg-[#e7d0d1] rounded-md transition-colors"
                              title={t('myRecipes.viewSource')}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(t('myRecipes.deleteConfirm'))) {
                                  handleDeleteRecipe(recipe.id);
                                  handleCardClick(recipe.id); // Close the expanded view
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title={t('myRecipes.delete')}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(recipe.id); // Close the expanded view
                              }}
                              className="p-2 text-[#4b2c2c] hover:bg-[#e7d0d1] rounded-md transition-colors"
                              title={t('common.close')}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                              </svg>
                            </button>
                          </div>
                        </motion.div>

                        {/* Content area with blur effect */}
                        <motion.div
                          className="w-full min-h-0"
                          animate={{
                            filter: showExpandedContent ? "blur(0px)" : "blur(4px)",
                            opacity: showExpandedContent ? 1 : 0.7
                          }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                          <ResultDisplay
                            result={createResultForDisplay(recipe)}
                            sourceType={recipe.source_type}
                            sourceData={recipe.source_data}
                            onStartOver={() => handleCardClick(recipe.id)} // Collapse the card
                            showActionButtons={false} // Hide process another/save buttons for saved recipes
                            recipeId={recipe.id}
                            onRecipeUpdated={(updatedRecipe) => {
                              // Update the recipe in local state
                              setRecipes(prev => prev.map(r => 
                                r.id === recipe.id ? updatedRecipe : r
                              ));
                            }}
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                    </>
                  ) : (
                    <motion.div
                      key={`card-${recipe.id}`}
                      animate={{
                        opacity: showCards ? 1 : 0,
                        scale: showCards ? 1 : 0.95,
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      <RecipeOptionCard
                        recipe={recipe}
                        onClick={() => handleCardClick(recipe.id)}
                        layoutId={recipe.id}
                        onViewSource={() => handleViewSource(recipe)}
                        onDelete={() => handleDeleteRecipe(recipe.id)}
                      />
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}
          </LayoutGroup>
        </div>
      </div>

      {/* Source View Modal */}
      <SourceViewModal
        isOpen={sourceViewModal.isOpen}
        onClose={() => setSourceViewModal({ isOpen: false, recipe: null })}
        sourceType={sourceViewModal.recipe?.source_type}
        sourceData={sourceViewModal.recipe?.source_data}
        title={sourceViewModal.recipe?.title || sourceViewModal.recipe?.processed_recipe?.name}
      />
    </motion.div>
  );
};

export default MyRecipesPage;