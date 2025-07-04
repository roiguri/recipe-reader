import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';

import Button from '../ui/Button';
import SourceViewModal from '../SourceViewModal';

import TabNavigation from './TabNavigation';
import SearchAndFilters from './SearchAndFilters';
import SavedRecipesSection from './SavedRecipesSection';
import HistorySection from './HistorySection';
import ExpandedRecipeOverlay from './ExpandedRecipeOverlay';
import { useMyRecipes } from './useMyRecipes';

/**
 * MyRecipesPage component - Organized with tabs for saved recipes and history
 */
const MyRecipesPage = ({ onNavigateHome }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  const {
    // State
    recipes,
    historyRecipes,
    loading,
    historyLoading,
    error,
    sourceViewModal,
    setSourceViewModal,
    showCards,
    showExpandedContent,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedSourceType,
    setSelectedSourceType,
    sortBy,
    setSortBy,
    
    // Computed values
    availableCategories,
    expandedRecipeData,
    
    // Handlers
    handleDeleteRecipe,
    handleCardClick,
    handleViewSource,
    handleRecipeAction,
    handleSaveToCollection,
    onRecipeUpdated,
    
    // Utility functions
    createResultForDisplay,
    translateCategory,
    groupRecipesByTime,
    getStatusIndicator
  } = useMyRecipes();

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
            <Button variant="secondary" onClick={() => window.location.reload()}>
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

  // Main recipes display  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION_CONFIG.DEFAULT}
      className="w-full max-w-6xl mx-auto p-4 md:p-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1b0e0e] mb-2">
            {t('myRecipes.title')}
          </h1>
        </div>
        <Button variant="secondary" onClick={onNavigateHome}>
          {t('myRecipes.backToHome')}
        </Button>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={recipes.length}
        historyCount={historyRecipes.length}
      />

      {/* Search and Filter Controls */}
      {((activeTab === 'saved' && recipes.length > 0) || (activeTab === 'history' && historyRecipes.length > 0)) && (
        <SearchAndFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedSourceType={selectedSourceType}
          setSelectedSourceType={setSelectedSourceType}
          sortBy={sortBy}
          setSortBy={setSortBy}
          availableCategories={availableCategories}
          translateCategory={translateCategory}
          showSortBy={activeTab === 'saved'}
        />
      )}

      {/* Expanded Recipe Overlay */}
      {expandedRecipeData && (
        <ExpandedRecipeOverlay
          expandedRecipeData={expandedRecipeData}
          showExpandedContent={showExpandedContent}
          handleCardClick={handleCardClick}
          handleViewSource={handleViewSource}
          handleDeleteRecipe={handleDeleteRecipe}
          createResultForDisplay={createResultForDisplay}
          onRecipeUpdated={onRecipeUpdated}
        />
      )}

      {/* Tab Content */}
      {activeTab === 'saved' && (
        <SavedRecipesSection
          recipes={recipes}
          loading={loading}
          onNavigateHome={onNavigateHome}
          handleCardClick={handleCardClick}
          handleRecipeAction={handleRecipeAction}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          selectedSourceType={selectedSourceType}
          sortBy={sortBy}
          expandedRecipe={expandedRecipeData?.id}
          showCards={showCards}
        />
      )}

      {activeTab === 'history' && (
        <HistorySection
          historyRecipes={historyRecipes}
          historyLoading={historyLoading}
          groupRecipesByTime={groupRecipesByTime}
          handleSaveToCollection={handleSaveToCollection}
          handleCardClick={handleCardClick}
          getStatusIndicator={getStatusIndicator}
          onNavigateHome={onNavigateHome}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          selectedSourceType={selectedSourceType}
        />
      )}

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