import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { RecipesService } from '../../services/recipesService';
import { parseISO, isToday, isYesterday, isThisWeek } from 'date-fns';

/**
 * Custom hook for managing MyRecipes page state and logic
 */
export const useMyRecipes = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  // State
  const [recipes, setRecipes] = useState([]);
  const [historyRecipes, setHistoryRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [sourceViewModal, setSourceViewModal] = useState({ isOpen: false, recipe: null });
  const [showCards, setShowCards] = useState(true);
  const [showExpandedContent, setShowExpandedContent] = useState(false);
  const [activeTab, setActiveTab] = useState('saved');

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Load recipes on auth change
  useEffect(() => {
    if (isAuthenticated) {
      loadRecipes();
      loadHistoryRecipes(); // Load history immediately to get correct count
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load history recipes when switching to history tab (if not already loaded)
  useEffect(() => {
    if (isAuthenticated && activeTab === 'history' && historyRecipes.length === 0) {
      loadHistoryRecipes();
    }
  }, [activeTab, isAuthenticated]);

  // Animation state management
  useEffect(() => {
    if (expandedRecipe) {
      setShowCards(false);
      const timer = setTimeout(() => {
        setShowExpandedContent(true);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setShowExpandedContent(false);
      const timer = setTimeout(() => {
        setShowCards(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [expandedRecipe]);

  // Keyboard support for ESC key
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

  // API calls
  const loadRecipes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: savedData, error: savedError } = await RecipesService.getSavedRecipes();
      
      if (savedError) {
        setError(savedError.message || t('myRecipes.loadError'));
      } else {
        setRecipes(savedData || []);
      }
    } catch (err) {
      console.error('Error loading saved recipes:', err);
      setError(t('myRecipes.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryRecipes = async () => {
    setHistoryLoading(true);
    
    try {
      const { data, error } = await RecipesService.getAllRecipesWithHistory();
      
      if (error) {
        console.error('Error loading history:', error);
      } else {
        setHistoryRecipes(data || []);
      }
    } catch (err) {
      console.error('Error loading history recipes:', err);
    } finally {
      setHistoryLoading(false);
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
        setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
        setHistoryRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      }
    } catch (err) {
      console.error('Error deleting recipe:', err);
      alert(t('myRecipes.deleteError'));
    }
  };

  const handleCardClick = (recipeId) => {
    setExpandedRecipe(expandedRecipe === recipeId ? null : recipeId);
  };

  const handleViewSource = (recipe) => {
    setSourceViewModal({ isOpen: true, recipe });
  };

  const handleRecipeAction = (action, recipe) => {
    switch (action) {
      case 'viewSource':
        handleViewSource(recipe);
        break;
      case 'delete':
        handleDeleteRecipe(recipe.id);
        break;
      default:
        break;
    }
  };

  const handleSaveToCollection = async (recipeId) => {
    try {
      const { error } = await RecipesService.promoteToSaved(recipeId);
      
      if (error) {
        alert(error.message || t('myRecipes.saveError'));
      } else {
        setHistoryRecipes(prev => prev.map(recipe => 
          recipe.id === recipeId 
            ? { ...recipe, recipe_status: 'saved' }
            : recipe
        ));
        loadRecipes();
      }
    } catch (err) {
      console.error('Error saving recipe to collection:', err);
      alert(t('myRecipes.saveError'));
    }
  };

  // Utility functions
  const createResultForDisplay = (recipe) => {
    return {
      recipe: recipe.processed_recipe,
      confidence_score: recipe.confidence_score || 0.8,
      processing_time: 0,
      source_type: recipe.source_type,
      source_data: recipe.source_data
    };
  };

  const translateCategory = (category) => {
    if (!category) return t('myRecipes.uncategorized');
    return t(`resultDisplay.categories.${category}`, category);
  };

  const groupRecipesByTime = (recipes) => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    recipes.forEach(recipe => {
      const processedDate = parseISO(recipe.processed_at || recipe.created_at);
      
      if (isToday(processedDate)) {
        groups.today.push(recipe);
      } else if (isYesterday(processedDate)) {
        groups.yesterday.push(recipe);
      } else if (isThisWeek(processedDate)) {
        groups.thisWeek.push(recipe);
      } else {
        groups.older.push(recipe);
      }
    });

    return groups;
  };

  const getStatusIndicator = (status) => {
    switch (status) {
      case 'saved':
        return { 
          color: 'text-green-600', 
          bg: 'bg-green-100', 
          text: t('myRecipes.status.saved'),
          icon: '✓'
        };
      case 'processed':
        return { 
          color: 'text-blue-600', 
          bg: 'bg-blue-100', 
          text: t('myRecipes.status.processed'),
          icon: '🔄'
        };
      case 'processing':
        return { 
          color: 'text-yellow-600', 
          bg: 'bg-yellow-100', 
          text: t('myRecipes.status.processing'),
          icon: '⏳'
        };
      case 'failed':
        return { 
          color: 'text-red-600', 
          bg: 'bg-red-100', 
          text: t('myRecipes.status.failed'),
          icon: '❌'
        };
      case 'shared':
        return { 
          color: 'text-purple-600', 
          bg: 'bg-purple-100', 
          text: t('myRecipes.status.shared'),
          icon: '📤'
        };
      default:
        return { 
          color: 'text-gray-600', 
          bg: 'bg-gray-100', 
          text: status || t('myRecipes.status.unknown'),
          icon: '❓'
        };
    }
  };

  // Get unique categories for filtering from both saved and history recipes
  const availableCategories = [...new Set(
    [...recipes, ...historyRecipes].map(recipe => {
      const category = recipe.processed_recipe?.category || recipe.processed_recipe?.cuisine || '';
      return category;
    }).filter(Boolean)
  )].sort();

  // Get expanded recipe data from both lists
  const expandedRecipeData = expandedRecipe ? 
    [...recipes, ...historyRecipes].find(r => r.id === expandedRecipe) : null;

  const onRecipeUpdated = (updatedRecipe) => {
    setRecipes(prev => prev.map(r => 
      r.id === expandedRecipeData.id ? updatedRecipe : r
    ));
    setHistoryRecipes(prev => prev.map(r => 
      r.id === expandedRecipeData.id ? updatedRecipe : r
    ));
  };

  return {
    // State
    recipes,
    historyRecipes,
    loading,
    historyLoading,
    error,
    expandedRecipe,
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
    getStatusIndicator,
    
    // API calls
    loadRecipes,
    loadHistoryRecipes
  };
};