import { supabase } from './supabase.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const uploadImage = async (file, userId, recipeId) => {
  if (!file || !userId || !recipeId) {
    throw new Error('Missing required parameters: file, userId, or recipeId');
  }

  const fileExt = file.name.split('.').pop().toLowerCase();
  const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = `${userId}/${recipeId}/${fileName}`;

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath,
        fileName: fileName
      };
    } catch (error) {
      lastError = error;
      console.warn(`Upload attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        await wait(RETRY_DELAY * attempt);
      }
    }
  }

  throw new Error(`Failed to upload image after ${MAX_RETRIES} attempts: ${lastError.message}`);
};

export const deleteImage = async (filePath) => {
  if (!filePath) {
    throw new Error('Missing required parameter: filePath');
  }

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabase.storage
        .from('recipe-images')
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      lastError = error;
      console.warn(`Delete attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        await wait(RETRY_DELAY * attempt);
      }
    }
  }

  throw new Error(`Failed to delete image after ${MAX_RETRIES} attempts: ${lastError.message}`);
};

export const batchUpload = async (files, userId, recipeId) => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error('Missing required parameter: files array');
  }

  if (!userId || !recipeId) {
    throw new Error('Missing required parameters: userId or recipeId');
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadImage(files[i], userId, recipeId);
      results.push({
        file: files[i].name,
        result: result,
        success: true
      });
    } catch (error) {
      errors.push({
        file: files[i].name,
        error: error.message,
        success: false
      });
    }
  }

  return {
    results: results,
    errors: errors,
    successCount: results.length,
    errorCount: errors.length,
    totalCount: files.length
  };
};

export const batchDelete = async (filePaths) => {
  if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
    throw new Error('Missing required parameter: filePaths array');
  }

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabase.storage
        .from('recipe-images')
        .remove(filePaths);

      if (error) {
        throw error;
      }

      return { 
        success: true, 
        deletedCount: filePaths.length 
      };
    } catch (error) {
      lastError = error;
      console.warn(`Batch delete attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        await wait(RETRY_DELAY * attempt);
      }
    }
  }

  throw new Error(`Failed to batch delete images after ${MAX_RETRIES} attempts: ${lastError.message}`);
};

export const getImageUrl = (filePath) => {
  if (!filePath) {
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const getSignedImageUrl = async (filePath, expiresIn = 3600) => {
  if (!filePath) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      // Fallback to public URL
      return getImageUrl(filePath);
    }

    return data.signedUrl;
  } catch (error) {
    // Fallback to public URL
    return getImageUrl(filePath);
  }
};

export const listImages = async (userId, recipeId) => {
  if (!userId || !recipeId) {
    throw new Error('Missing required parameters: userId or recipeId');
  }

  const folderPath = `${userId}/${recipeId}`;

  try {
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .list(folderPath, {
        limit: 100,
        offset: 0
      });

    if (error) {
      throw error;
    }

    return data.map(file => ({
      name: file.name,
      path: `${folderPath}/${file.name}`,
      url: getImageUrl(`${folderPath}/${file.name}`),
      size: file.metadata?.size || 0,
      lastModified: file.updated_at
    }));
  } catch (error) {
    console.error('Failed to list images:', error);
    throw new Error(`Failed to list images: ${error.message}`);
  }
};

export const addImageToRecipe = async (recipeId, imageData) => {
  if (!recipeId || !imageData) {
    throw new Error('Missing required parameters: recipeId or imageData');
  }

  try {
    const { data: recipe, error: fetchError } = await supabase
      .from('user_recipes')
      .select('processed_recipe')
      .eq('id', recipeId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const updatedRecipe = { ...recipe.processed_recipe };
    if (!updatedRecipe.images) {
      updatedRecipe.images = [];
    }

    updatedRecipe.images.push({
      url: imageData.url,
      path: imageData.path,
      fileName: imageData.fileName,
      uploadedAt: new Date().toISOString()
    });

    const { data, error } = await supabase
      .from('user_recipes')
      .update({ processed_recipe: updatedRecipe })
      .eq('id', recipeId)
      .select();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to add image to recipe:', error);
    throw new Error(`Failed to add image to recipe: ${error.message}`);
  }
};

export const removeImageFromRecipe = async (recipeId, imagePath) => {
  if (!recipeId || !imagePath) {
    throw new Error('Missing required parameters: recipeId or imagePath');
  }

  try {
    const { data: recipe, error: fetchError } = await supabase
      .from('user_recipes')
      .select('processed_recipe')
      .eq('id', recipeId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const updatedRecipe = { ...recipe.processed_recipe };
    if (updatedRecipe.images) {
      updatedRecipe.images = updatedRecipe.images.filter(img => img.path !== imagePath);
    }

    const { data, error } = await supabase
      .from('user_recipes')
      .update({ processed_recipe: updatedRecipe })
      .eq('id', recipeId)
      .select();

    if (error) {
      throw error;
    }

    await deleteImage(imagePath);

    return { success: true, data };
  } catch (error) {
    console.error('Failed to remove image from recipe:', error);
    throw new Error(`Failed to remove image from recipe: ${error.message}`);
  }
};

export const getRecipeImages = async (recipeId) => {
  if (!recipeId) {
    throw new Error('Missing required parameter: recipeId');
  }

  try {
    const { data: recipe, error } = await supabase
      .from('user_recipes')
      .select('processed_recipe')
      .eq('id', recipeId)
      .single();

    if (error) {
      throw error;
    }

    return recipe.processed_recipe?.images || [];
  } catch (error) {
    console.error('Failed to get recipe images:', error);
    throw new Error(`Failed to get recipe images: ${error.message}`);
  }
};