import { supabase } from '../utils/supabase';
import { RecipesService } from './recipesService';

/**
 * Image service for managing recipe images in Supabase storage
 */
export class ImageService {
  /**
   * Convert image filenames to signed URLs for display
   * @param {string} userId - User ID 
   * @param {string} recipeId - Recipe ID
   * @param {string[]} imageFilenames - Array of image filenames (simple strings)
   * @returns {Promise<{data: Array<{filename: string, url: string}>, error: Object}>}
   */
  static async getRecipeImageUrls(userId, recipeId, imageFilenames) {
    try {
      if (!userId || !recipeId || !imageFilenames || !Array.isArray(imageFilenames) || imageFilenames.length === 0) {
        return { data: [], error: null };
      }

      const urls = [];
      const errors = [];

      for (const filename of imageFilenames) {
        try {
          // Skip if filename is not a string (for backward compatibility with objects)
          if (typeof filename !== 'string') {
            console.warn('Skipping non-string filename:', filename);
            continue;
          }

          // Construct the full path: user-id/recipe-id/filename
          const fullPath = `${userId}/${recipeId}/${filename}`;
          
          // Get signed URL for the image (expires in 1 hour)
          const { data, error } = await supabase.storage
            .from('recipe-images')
            .createSignedUrl(fullPath, 3600);

          if (error) {
            console.error(`Error getting signed URL for ${fullPath}:`, error);
            errors.push({ filename, error: error.message });
          } else if (data?.signedUrl) {
            urls.push({
              filename,
              url: data.signedUrl
            });
          }
        } catch (err) {
          console.error(`Error processing filename ${filename}:`, err);
          errors.push({ filename, error: err.message });
        }
      }

      return { 
        data: urls, 
        error: errors.length > 0 ? { 
          message: 'Some images failed to load', 
          details: errors 
        } : null 
      };
    } catch (error) {
      console.error('Error getting recipe image URLs:', error);
      return { 
        data: [], 
        error: { message: 'Failed to load recipe images. Please try again.' }
      };
    }
  }

  /**
   * Refresh recipe images from database (preferred method)
   * Gets the images array from the user_recipes table and generates signed URLs
   * @param {string} userId - User ID
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<{data: Array<{filename: string, url: string}>, error: Object}>} - Returns array of image objects with URLs
   */
  static async refreshRecipeImagesFromDatabase(userId, recipeId) {
    try {
      if (!userId || !recipeId) {
        return { 
          data: [], 
          error: { message: 'User ID and Recipe ID are required' } 
        };
      }

      // Get recipe from database
      const { data: recipeData, error: recipeError } = await RecipesService.getRecipeById(recipeId);
      
      if (recipeError || !recipeData) {
        return { 
          data: [], 
          error: { message: 'Failed to retrieve recipe from database' } 
        };
      }

      // Extract images array from the recipe data
      const images = recipeData.processed_recipe?.images || [];
      
      if (!images || images.length === 0) {
        return { data: [], error: null };
      }

      // Generate signed URLs for the images from the database
      const { data: urls, error: urlError } = await this.getRecipeImageUrls(userId, recipeId, images);
      
      return { data: urls, error: urlError };
    } catch (error) {
      console.error('Error refreshing recipe images from database:', error);
      return { 
        data: [], 
        error: { message: 'Failed to refresh recipe images from database' } 
      };
    }
  }

  /**
   * Refresh recipe images by listing current files in storage bucket
   * @param {string} userId - User ID
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<{data: string[], error: Object}>} - Returns array of filenames
   */
  static async refreshRecipeImagesFromStorage(userId, recipeId) {
    try {
      if (!userId || !recipeId) {
        return { 
          data: [], 
          error: { message: 'User ID and Recipe ID are required' } 
        };
      }

      // List all files in the user's recipe folder
      const folderPath = `${userId}/${recipeId}`;
      const { data, error } = await supabase.storage
        .from('recipe-images')
        .list(folderPath);

      if (error) {
        console.error(`Error listing images in ${folderPath}:`, error);
        return { 
          data: [], 
          error: { message: 'Failed to refresh recipe images. Please try again.' } 
        };
      }

      // Filter out directories and extract filenames only
      const imageFiles = data
        ?.filter(file => file.name && !file.name.endsWith('/') && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        ?.map(file => file.name) || [];

      return { data: imageFiles, error: null };
    } catch (error) {
      console.error('Error refreshing recipe images from storage:', error);
      return { 
        data: [], 
        error: { message: 'Failed to refresh recipe images from storage. Please try again.' } 
      };
    }
  }

  /**
   * Refresh recipe images (delegates to database-based method)
   * @param {string} userId - User ID
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<{data: Array<{filename: string, url: string}>, error: Object}>} - Returns array of image objects with URLs
   */
  static async refreshRecipeImages(userId, recipeId) {
    return this.refreshRecipeImagesFromDatabase(userId, recipeId);
  }

  /**
   * Get current user from Supabase auth
   * @returns {Promise<{data: Object, error: Object}>}
   */
  static async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        return { 
          data: null, 
          error: { message: 'Failed to get current user' } 
        };
      }

      return { data: data.user, error: null };
    } catch (error) {
      console.error('Error getting current user:', error);
      return { 
        data: null, 
        error: { message: 'Failed to get current user' } 
      };
    }
  }

  /**
   * Upload a new image to recipe folder
   * @param {string} userId - User ID
   * @param {string} recipeId - Recipe ID
   * @param {File} imageFile - Image file to upload
   * @returns {Promise<{data: string, error: Object}>}
   */
  static async uploadRecipeImage(userId, recipeId, imageFile) {
    try {
      if (!userId || !recipeId || !imageFile) {
        return { 
          data: null, 
          error: { message: 'User ID, Recipe ID, and image file are required' } 
        };
      }

      // Generate unique filename
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const filePath = `${userId}/${recipeId}/${fileName}`;

      // Upload file to storage
      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, imageFile);

      if (error) {
        console.error(`Error uploading image to ${filePath}:`, error);
        return { 
          data: null, 
          error: { message: 'Failed to upload image. Please try again.' } 
        };
      }

      return { data: fileName, error: null };
    } catch (error) {
      console.error('Error uploading recipe image:', error);
      return { 
        data: null, 
        error: { message: 'Failed to upload image. Please try again.' } 
      };
    }
  }

  /**
   * Delete an image from recipe folder
   * @param {string} userId - User ID
   * @param {string} recipeId - Recipe ID
   * @param {string} imagePath - Image filename to delete
   * @returns {Promise<{data: boolean, error: Object}>}
   */
  static async deleteRecipeImage(userId, recipeId, imagePath) {
    try {
      if (!userId || !recipeId || !imagePath) {
        return { 
          data: false, 
          error: { message: 'User ID, Recipe ID, and image path are required' } 
        };
      }

      const fullPath = `${userId}/${recipeId}/${imagePath}`;
      
      // Delete file from storage
      const { error } = await supabase.storage
        .from('recipe-images')
        .remove([fullPath]);

      if (error) {
        console.error(`Error deleting image ${fullPath}:`, error);
        return { 
          data: false, 
          error: { message: 'Failed to delete image. Please try again.' } 
        };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error deleting recipe image:', error);
      return { 
        data: false, 
        error: { message: 'Failed to delete image. Please try again.' } 
      };
    }
  }

  /**
   * Upload multiple images to recipe folder
   * @param {string} userId - User ID
   * @param {string} recipeId - Recipe ID
   * @param {File[]} imageFiles - Array of image files to upload
   * @returns {Promise<{data: string[], error: Object}>} - Returns array of uploaded filenames
   */
  static async uploadMultipleImages(userId, recipeId, imageFiles) {
    try {
      if (!userId || !recipeId || !imageFiles || !Array.isArray(imageFiles) || imageFiles.length === 0) {
        return { 
          data: [], 
          error: { message: 'User ID, Recipe ID, and image files array are required' } 
        };
      }

      const uploadResults = [];
      const errors = [];

      for (const imageFile of imageFiles) {
        const { data: filename, error } = await this.uploadRecipeImage(userId, recipeId, imageFile);
        
        if (error) {
          errors.push({ file: imageFile.name, error: error.message });
        } else if (filename) {
          uploadResults.push(filename);
        }
      }

      return { 
        data: uploadResults, 
        error: errors.length > 0 ? { 
          message: 'Some images failed to upload', 
          details: errors 
        } : null 
      };
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      return { 
        data: [], 
        error: { message: 'Failed to upload images. Please try again.' } 
      };
    }
  }

  /**
   * Delete multiple images from recipe folder
   * @param {string} userId - User ID
   * @param {string} recipeId - Recipe ID
   * @param {string[]} imagePaths - Array of image filenames to delete
   * @returns {Promise<{data: boolean, error: Object}>}
   */
  static async deleteMultipleImages(userId, recipeId, imagePaths) {
    try {
      if (!userId || !recipeId || !imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
        return { 
          data: true, 
          error: null 
        };
      }

      const fullPaths = imagePaths.map(path => `${userId}/${recipeId}/${path}`);
      
      // Delete files from storage
      const { error } = await supabase.storage
        .from('recipe-images')
        .remove(fullPaths);

      if (error) {
        console.error(`Error deleting images:`, error);
        return { 
          data: false, 
          error: { message: 'Failed to delete some images. Please try again.' } 
        };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      return { 
        data: false, 
        error: { message: 'Failed to delete images. Please try again.' } 
      };
    }
  }
}