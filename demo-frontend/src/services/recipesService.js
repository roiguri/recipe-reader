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
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async saveRecipe(recipeData, sourceType = 'text', sourceData = '', userId = null) {
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
            confidence_score: recipeData.confidence_score || null
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