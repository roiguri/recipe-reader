import { supabase } from '../utils/supabase';

/**
 * Recipe service for managing user recipes in Supabase
 */
export class RecipesService {
  /**
   * Save a recipe to the user's collection
   * @param {Object} recipeData - The recipe data to save
   * @param {string} recipeData.name - Recipe name/title
   * @param {Object} recipeData - Complete recipe object
   * @param {string} sourceType - Source type: 'text', 'url', or 'image'
   * @param {string} sourceData - Original input data (text, URL, or image path)
   * @param {string} userId - User ID (optional, will use current user if not provided)
   * @param {string} status - Recipe status (optional, defaults to 'processed')
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async saveRecipe(recipeData, sourceType = 'text', sourceData = '', userId = null, status = 'processed') {
    try {
      // Get current user if userId not provided
      const currentUser = userId || (await supabase.auth.getUser()).data.user;
      
      if (!currentUser) {
        return { 
          data: null, 
          error: { message: 'User must be authenticated to save recipes' } 
        };
      }

      // Validate required parameters
      if (!sourceType || !['text', 'url', 'image'].includes(sourceType)) {
        return {
          data: null,
          error: { message: 'Invalid source type. Must be text, url, or image.' }
        };
      }

      if (!sourceData) {
        return {
          data: null,
          error: { message: 'Source data is required.' }
        };
      }

      const { data, error } = await supabase
        .from('user_recipes')
        .insert([
          {
            user_id: currentUser.id,
            source_type: sourceType,
            source_data: sourceData,
            processed_recipe: recipeData,
            title: recipeData.name || 'Untitled Recipe',
            confidence_score: recipeData.confidence_score || null,
            recipe_status: status,
            processed_at: new Date().toISOString()
          }
        ])
        .select();

      return { data, error };
    } catch (error) {
      console.error('Error saving recipe:', error);
      return { 
        data: null, 
        error: { message: 'Failed to save recipe. Please try again.' } 
      };
    }
  }

  /**
   * Get all recipes for the current user
   * @param {string} userId - User ID (optional, will use current user if not provided)
   * @returns {Promise<{data: Array, error: Object}>}
   */
  static async getUserRecipes(userId = null) {
    try {
      // Get current user if userId not provided
      const currentUser = userId || (await supabase.auth.getUser()).data.user;
      
      if (!currentUser) {
        return { 
          data: [], 
          error: { message: 'User must be authenticated to view recipes' } 
        };
      }

      const { data, error } = await supabase
        .from('user_recipes')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Error fetching user recipes:', error);
      return { 
        data: [], 
        error: { message: 'Failed to load recipes. Please try again.' } 
      };
    }
  }

  /**
   * Get a specific recipe by ID
   * @param {string} recipeId - The ID of the recipe to retrieve
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async getRecipeById(recipeId) {
    try {
      if (!recipeId) {
        return { 
          data: null, 
          error: { message: 'Recipe ID is required' } 
        };
      }

      const { data, error } = await supabase
        .from('user_recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (error) {
        console.error('Error getting recipe by ID:', error);
        return { 
          data: null, 
          error: { message: 'Failed to retrieve recipe. Please try again.' } 
        };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error getting recipe by ID:', error);
      return { 
        data: null, 
        error: { message: 'Failed to retrieve recipe. Please try again.' } 
      };
    }
  }

  /**
   * Delete a recipe by ID
   * @param {string} recipeId - The ID of the recipe to delete
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async deleteRecipe(recipeId) {
    try {
      const { data, error } = await supabase
        .from('user_recipes')
        .delete()
        .eq('id', recipeId)
        .select();

      return { data, error };
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return { 
        data: null, 
        error: { message: 'Failed to delete recipe. Please try again.' } 
      };
    }
  }

  /**
   * Update a recipe by ID
   * @param {string} recipeId - The ID of the recipe to update
   * @param {Object} recipeData - The updated recipe data
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async updateRecipe(recipeId, recipeData) {
    try {
      const { data, error } = await supabase
        .from('user_recipes')
        .update({
          title: recipeData.name || 'Untitled Recipe',
          processed_recipe: recipeData,
          confidence_score: recipeData.confidence_score || null
        })
        .eq('id', recipeId)
        .select();

      return { data, error };
    } catch (error) {
      console.error('Error updating recipe:', error);
      return { 
        data: null, 
        error: { message: 'Failed to update recipe. Please try again.' } 
      };
    }
  }

  /**
   * Get saved recipes for the current user (status = 'saved')
   * @param {string} userId - User ID (optional, will use current user if not provided)
   * @returns {Promise<{data: Array, error: Object}>}
   */
  static async getSavedRecipes(userId = null) {
    return this.getRecipesByStatus(userId, 'saved');
  }

  /**
   * Get recipes filtered by status
   * @param {string} userId - User ID (optional, will use current user if not provided)
   * @param {string} status - Recipe status to filter by
   * @returns {Promise<{data: Array, error: Object}>}
   */
  static async getRecipesByStatus(userId = null, status = 'saved') {
    try {
      // Get current user if userId not provided
      const currentUser = userId || (await supabase.auth.getUser()).data.user;
      
      if (!currentUser) {
        return { 
          data: [], 
          error: { message: 'User must be authenticated to view recipes' } 
        };
      }

      const { data, error } = await supabase
        .from('user_recipes')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('recipe_status', status)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Error fetching recipes by status:', error);
      return { 
        data: [], 
        error: { message: 'Failed to load recipes. Please try again.' } 
      };
    }
  }

  /**
   * Get all recipes with full history for the current user
   * @param {string} userId - User ID (optional, will use current user if not provided)
   * @returns {Promise<{data: Array, error: Object}>}
   */
  static async getAllRecipesWithHistory(userId = null) {
    try {
      // Get current user if userId not provided
      const currentUser = userId || (await supabase.auth.getUser()).data.user;
      
      if (!currentUser) {
        return { 
          data: [], 
          error: { message: 'User must be authenticated to view recipes' } 
        };
      }

      const { data, error } = await supabase
        .from('user_recipes')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Error fetching all recipes:', error);
      return { 
        data: [], 
        error: { message: 'Failed to load recipes. Please try again.' } 
      };
    }
  }

  /**
   * Save a shared URL immediately without processing
   * @param {string} url - The shared URL
   * @param {string} userId - User ID (optional, will use current user if not provided)
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async saveSharedUrl(url, userId = null) {
    try {
      // Get current user if userId not provided
      const currentUser = userId || (await supabase.auth.getUser()).data.user;
      
      if (!currentUser) {
        return { 
          data: null, 
          error: { message: 'User must be authenticated to save shared URLs' } 
        };
      }

      if (!url) {
        return {
          data: null,
          error: { message: 'URL is required.' }
        };
      }

      const { data, error } = await supabase
        .from('user_recipes')
        .insert([
          {
            user_id: currentUser.id,
            source_type: 'url',
            source_data: url,
            processed_recipe: { name: 'Processing...' },
            title: 'Processing shared URL...',
            recipe_status: 'processing',
            processed_at: new Date().toISOString()
          }
        ])
        .select();

      return { data, error };
    } catch (error) {
      console.error('Error saving shared URL:', error);
      return { 
        data: null, 
        error: { message: 'Failed to save shared URL. Please try again.' } 
      };
    }
  }

  /**
   * Update processing status of a recipe
   * @param {string} recipeId - The ID of the recipe to update
   * @param {string} status - New status ('processing', 'processed', 'failed', etc.)
   * @param {string} error - Error message if status is 'failed'
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async updateProcessingStatus(recipeId, status, error = null) {
    try {
      const updateData = {
        recipe_status: status,
        processed_at: new Date().toISOString()
      };

      if (error) {
        updateData.extraction_error = error;
      }

      const { data, error: dbError } = await supabase
        .from('user_recipes')
        .update(updateData)
        .eq('id', recipeId)
        .select();

      return { data, error: dbError };
    } catch (error) {
      console.error('Error updating processing status:', error);
      return { 
        data: null, 
        error: { message: 'Failed to update processing status. Please try again.' } 
      };
    }
  }

  /**
   * Increment retry count and set status to processing for retry
   * @param {string} recipeId - The ID of the recipe to retry
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async retryExtraction(recipeId) {
    try {
      const { data, error } = await supabase
        .from('user_recipes')
        .update({
          retry_count: supabase.raw('retry_count + 1'),
          recipe_status: 'processing',
          extraction_error: null,
          processed_at: new Date().toISOString()
        })
        .eq('id', recipeId)
        .select();

      return { data, error };
    } catch (error) {
      console.error('Error retrying extraction:', error);
      return { 
        data: null, 
        error: { message: 'Failed to retry extraction. Please try again.' } 
      };
    }
  }

  /**
   * Promote a recipe from 'processed' to 'saved' status
   * @param {string} recipeId - The ID of the recipe to promote
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async promoteToSaved(recipeId) {
    try {
      const { data, error } = await supabase
        .from('user_recipes')
        .update({
          recipe_status: 'saved',
          processed_at: new Date().toISOString()
        })
        .eq('id', recipeId)
        .select();

      return { data, error };
    } catch (error) {
      console.error('Error promoting recipe to saved:', error);
      return { 
        data: null, 
        error: { message: 'Failed to save recipe. Please try again.' } 
      };
    }
  }

  /**
   * Increment retry count for a recipe
   * @param {string} recipeId - The ID of the recipe
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async incrementRetryCount(recipeId) {
    try {
      const { data, error } = await supabase
        .from('user_recipes')
        .update({
          retry_count: supabase.raw('retry_count + 1')
        })
        .eq('id', recipeId)
        .select();

      return { data, error };
    } catch (error) {
      console.error('Error incrementing retry count:', error);
      return { 
        data: null, 
        error: { message: 'Failed to update retry count. Please try again.' } 
      };
    }
  }

  /**
   * Search recipes by title or ingredients
   * @param {string} query - Search query
   * @param {string} userId - User ID (optional, will use current user if not provided)
   * @returns {Promise<{data: Array, error: Object}>}
   */
  static async searchRecipes(query, userId = null) {
    try {
      // Get current user if userId not provided
      const currentUser = userId || (await supabase.auth.getUser()).data.user;
      
      if (!currentUser) {
        return { 
          data: [], 
          error: { message: 'User must be authenticated to search recipes' } 
        };
      }

      const { data, error } = await supabase
        .from('user_recipes')
        .select('*')
        .eq('user_id', currentUser.id)
        .or(`title.ilike.%${query}%,processed_recipe->name.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Error searching recipes:', error);
      return { 
        data: [], 
        error: { message: 'Failed to search recipes. Please try again.' } 
      };
    }
  }
}