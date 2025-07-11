import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import imageCompression from 'browser-image-compression';

import { useAuth } from '../../contexts/AuthContext';
import { 
  uploadImage, 
  addImageToRecipe, 
  removeImageFromRecipe,
  getRecipeImages,
  getSignedImageUrl,
  deleteImage 
} from '../../utils/imageManagementService';
import { getImagePreview } from '../../utils/imageValidation';
import ImageUploadArea from './ImageUploadArea';

const SortableImageItem = ({ 
  image, 
  onDelete, 
  isUploading = false 
}) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="relative group"
    >
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors">
        {/* Image */}
        <img
          src={image.preview || image.url}
          alt={image.fileName || 'Recipe image'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Try to reload with just the URL if preview failed
            if (image.preview && image.url && e.target.src === image.preview) {
              e.target.src = image.url;
            }
          }}
        />
        
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
          title={t('imageEditor.dragToReorder')}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zM3 16a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zM8 4a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM8 10a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H9a1 1 0 01-1-1v-1zM8 16a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H9a1 1 0 01-1-1v-1z"/>
          </svg>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(image.id)}
          disabled={isUploading}
          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
          title={t('imageEditor.deleteImage')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Upload progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {/* Status indicator */}
        <div className="absolute bottom-2 right-2">
          {image.status === 'saved' || (image.uploaded && image.isExisting) ? (
            <div className="bg-green-500 text-white p-1 rounded-full" title={t('imageEditor.uploaded')}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          ) : image.error || image.status === 'failed' ? (
            <div className="bg-red-500 text-white p-1 rounded-full" title={image.error}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div className="bg-yellow-500 text-white p-1 rounded-full" title={t('imageEditor.pending')}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
      
      {/* Image info */}
      <div className="mt-2 text-xs text-gray-600 text-center truncate">
        {image.fileName || 'Uploaded image'}
      </div>
    </motion.div>
  );
};

const ImageEditor = ({ 
  recipeId, 
  initialImages = [], 
  onImagesChange,
  maxImages = 5,
  disabled = false 
}) => {
  const { t } = useTranslation();
  const auth = useAuth();
  
  // State management
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [lastRecipeKey, setLastRecipeKey] = useState('');
  const [hasUserMadeChanges, setHasUserMadeChanges] = useState(false);

  // All images for display (existing + new)
  const allImages = [...existingImages, ...newImages];
  

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load existing images from recipe
  useEffect(() => {
    const currentRecipeKey = `${recipeId}-${initialImages?.length || 0}`;
    
    // Reset initialization when recipe changes
    if (currentRecipeKey !== lastRecipeKey) {
      setInitialized(false);
      setLastRecipeKey(currentRecipeKey);
      // Clear existing state
      setExistingImages([]);
      setNewImages([]);
      setError(null);
      setHasUserMadeChanges(false);
    }
  }, [recipeId, initialImages, lastRecipeKey]);

  // Initialize images after reset
  useEffect(() => {
    if (!initialized) {
      const initializeImages = async () => {
        if (initialImages && initialImages.length > 0) {
          // Use provided initial images and fix URLs if needed
          const formattedImages = await Promise.all(initialImages.map(async (img, index) => {
            // Handle different possible image structures
            const imageUrl = img.url || img;
            const imagePath = img.path || img;
            const uniqueId = `existing-${index}-${imageUrl?.split('/').pop() || imagePath?.split('/').pop() || Math.random().toString(36).substr(2, 9)}`;
            
            let workingUrl = typeof img === 'string' ? img : img.url;
            
            // Try to get working URL for initial images too
            if (img.path && workingUrl) {
              try {
                const testResponse = await fetch(workingUrl, { method: 'HEAD' });
                if (!testResponse.ok) {
                  workingUrl = await getSignedImageUrl(img.path);
                }
              } catch (error) {
                workingUrl = await getSignedImageUrl(img.path);
              }
            }
            
            return {
              id: uniqueId,
              url: workingUrl,
              path: typeof img === 'string' ? img : img.path,
              fileName: img.fileName || img.name || `image-${index + 1}`,
              uploaded: true,
              isExisting: true,
              status: 'saved', // Existing images are already saved
              uploadedAt: img.uploadedAt || new Date().toISOString()
            };
          }));
          setExistingImages(formattedImages);
          setInitialized(true);
        } else if (recipeId) {
          // Load from database if no initial images provided
          await loadExistingImages();
          setInitialized(true);
        } else {
          // Clear existing images if no initial images and no recipe ID
          setExistingImages([]);
          setInitialized(true);
        }
      };
      
      initializeImages();
    }
  }, [initialized, recipeId, initialImages]);


  const loadExistingImages = async () => {
    if (!recipeId) return;
    
    try {
      const images = await getRecipeImages(recipeId);
      
      // Process images and try to get working URLs
      const formattedImages = await Promise.all(images.map(async (img, index) => {
        const imageUrl = img.url || img.path;
        const uniqueId = `existing-${index}-${imageUrl?.split('/').pop() || Date.now()}`;
        
        let workingUrl = img.url;
        
        // If public URL fails, try signed URL as fallback
        if (img.path) {
          try {
            // Test if public URL works first
            const testResponse = await fetch(img.url, { method: 'HEAD' });
            if (!testResponse.ok) {
              workingUrl = await getSignedImageUrl(img.path);
            }
          } catch (error) {
            workingUrl = await getSignedImageUrl(img.path);
          }
        }
        
        return {
          id: uniqueId,
          url: workingUrl,
          path: img.path,
          fileName: img.fileName || `image-${index + 1}`,
          uploaded: true,
          isExisting: true,
          status: 'saved',
          uploadedAt: img.uploadedAt || new Date().toISOString()
        };
      }));
      
      setExistingImages(formattedImages);
    } catch (err) {
      console.error('Failed to load existing images:', err);
    }
  };

  const compressImage = async (file) => {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Image compression failed:', error);
      return file; // Return original if compression fails
    }
  };

  const handleFilesAdded = useCallback(async (files, errors) => {
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setError(null);
    setIsLoading(true);
    setHasUserMadeChanges(true); // Mark that user has made actual changes

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageId = `new-${Date.now()}-${i}`;

      try {
        // Create preview
        const preview = await getImagePreview(file);
        
        // Add to new images with pending status - show immediately
        const newImage = {
          id: imageId,
          file: file,
          fileName: file.name,
          preview: preview,
          uploaded: false,
          isNew: true,
          status: 'pending' // Add status tracking
        };
        
        setNewImages(prev => [...prev, newImage]);

        // Compress image
        const compressedFile = await compressImage(file);
        
        // Upload if we have a recipe ID (but don't add to database yet)
        if (recipeId && auth?.user?.id) {
          const uploadResult = await uploadImage(compressedFile, auth.user.id, recipeId);
          

          // Update the image with upload result but keep as pending
          setNewImages(prev => prev.map(img => 
            img.id === imageId 
              ? { 
                  ...img, 
                  uploaded: true, 
                  url: uploadResult.url, 
                  path: uploadResult.path,
                  status: 'pending' // Keep as pending until save
                }
              : img
          ));

          // Don't add to recipe database yet - wait for save button
        }
        
      } catch (err) {
        console.error('Upload failed:', err);
        
        // Mark image as failed
        setNewImages(prev => prev.map(img => 
          img.id === imageId 
            ? { ...img, error: err.message, status: 'failed' }
            : img
        ));
      }
    }

    setIsLoading(false);
  }, [recipeId, auth?.user?.id]);

  const handleDeleteImage = useCallback(async (imageId) => {
    setHasUserMadeChanges(true); // Mark that user has made actual changes
    
    const existingImage = existingImages.find(img => img.id === imageId);
    const newImage = newImages.find(img => img.id === imageId);

    if (existingImage) {
      // Handle existing image deletion (already in database)
      setImagesToDelete(prev => [...prev, existingImage.path]);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      
      // Remove from database if we have a recipe ID
      if (recipeId) {
        try {
          await removeImageFromRecipe(recipeId, existingImage.path);
        } catch (err) {
          console.error('Failed to remove image from database:', err);
          // Revert the deletion on error
          setExistingImages(prev => [...prev, existingImage]);
          setImagesToDelete(prev => prev.filter(path => path !== existingImage.path));
        }
      }
    } else if (newImage) {
      // Handle new image deletion (not yet added to database)
      setNewImages(prev => prev.filter(img => img.id !== imageId));
      
      // For new images, we only need to remove from storage if uploaded
      // No need to call removeImageFromRecipe since they're not in database yet
      if (newImage.uploaded && newImage.path) {
        try {
          // Only remove from storage, not from database
          await deleteImage(newImage.path);
        } catch (err) {
          console.error('Failed to remove uploaded image from storage:', err);
        }
      }
    }
  }, [existingImages, newImages, recipeId]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setHasUserMadeChanges(true); // Mark that user has made actual changes
      const oldIndex = allImages.findIndex(img => img.id === active.id);
      const newIndex = allImages.findIndex(img => img.id === over.id);
      
      const reorderedImages = arrayMove(allImages, oldIndex, newIndex);
      
      // Split back into existing and new
      const newExisting = reorderedImages.filter(img => img.isExisting);
      const newNew = reorderedImages.filter(img => img.isNew);
      
      setExistingImages(newExisting);
      setNewImages(newNew);
    }
  };

  // Function to mark all pending images as saved (called from parent on save)
  const markImagesAsSaved = useCallback(async () => {
    // Only process images that are still in the newImages array (not deleted)
    // and have been uploaded successfully
    const pendingImages = newImages.filter(img => 
      img.status === 'pending' && 
      img.uploaded && 
      img.path && 
      img.url
    );
    
    // Add pending images to recipe database
    for (const image of pendingImages) {
      if (recipeId) {
        try {
          await addImageToRecipe(recipeId, {
            url: image.url,
            path: image.path,
            fileName: image.fileName
          });
        } catch (err) {
          console.error('Failed to add image to recipe:', err);
        }
      }
    }
    
    // Update status to saved only for images that were successfully processed
    setNewImages(prev => prev.map(img => 
      img.status === 'pending' && img.uploaded && img.path && img.url
        ? { ...img, status: 'saved' }
        : img
    ));
  }, [newImages, recipeId]);

  // Expose the markImagesAsSaved function to parent component via callback
  React.useEffect(() => {
    if (onImagesChange && initialized) {
      // Only notify parent about changes after we've finished initialization
      // Check if this is just URL fixing (no actual content changes)
      const hasRealChanges = newImages.length > 0 || imagesToDelete.length > 0 || hasUserMadeChanges;
      
      onImagesChange({
        existing: existingImages,
        new: newImages,
        toDelete: imagesToDelete,
        total: allImages.length,
        markImagesAsSaved, // Expose the function
        isInitialLoad: !hasRealChanges // Flag to indicate this is just initial loading
      });
    }
  }, [existingImages, newImages, imagesToDelete, allImages.length, onImagesChange, markImagesAsSaved, initialized, hasUserMadeChanges]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          {t('imageEditor.title')}
        </h3>
        <span className="text-sm text-gray-500">
          {allImages.length}/{maxImages} {t('imageEditor.imagesCount')}
        </span>
      </div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
        >
          {error}
        </motion.div>
      )}

      {/* Upload area */}
      <ImageUploadArea
        onFilesAdded={handleFilesAdded}
        disabled={disabled || isLoading}
        maxFiles={maxImages}
        currentCount={allImages.length}
      />

      {/* Images grid */}
      <AnimatePresence>
        {allImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={allImages.map((img, index) => img.id || `image-${index}-${img.url || img.path || Date.now()}`)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {allImages.map((image, index) => (
                    <SortableImageItem
                      key={image.id || `image-${index}-${image.url || image.path || Date.now()}`}
                      image={image}
                      onDelete={handleDeleteImage}
                      isUploading={isLoading && !image.uploaded && !image.error}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {allImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg"
        >
          <p>{t('imageEditor.instructions.dragToReorder')}</p>
          <p>{t('imageEditor.instructions.clickToDelete')}</p>
        </motion.div>
      )}
    </div>
  );
};

export default ImageEditor;