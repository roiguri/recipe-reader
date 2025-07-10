import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import ImageUploadArea from '../ui/ImageUploadArea';
import RecipeImageGallery from '../ui/RecipeImageGallery';
import { uploadRecipeImage, processImagesForDisplay } from '../../utils/imageService';
import { useAuth } from '../../contexts/AuthContext';

/**
 * EditableImagesSection component for managing recipe images in edit mode
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data object
 * @param {Object} props.processedImages - Processed images with fresh URLs
 * @param {boolean} props.imagesLoading - Loading state for image processing
 * @param {Function} props.onUpdate - Function to update recipe data
 * @param {Object} props.globalEditingState - Global editing state
 * @param {Function} props.onStartEdit - Function to start editing globally
 * @param {Function} props.onUpdateEdit - Function to update edit value globally
 * @param {Function} props.onSaveEdit - Function to save edit globally
 * @param {Function} props.onCancelEdit - Function to cancel edit globally
 */
const EditableImagesSection = ({ 
  recipe, 
  processedImages,
  imagesLoading,
  onUpdate, 
  globalEditingState, 
  onStartEdit, 
  onUpdateEdit, 
  onSaveEdit, 
  onCancelEdit 
}) => {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [uploadingImages, setUploadingImages] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [workingImages, setWorkingImages] = useState({ uploaded: [], processed: [] });
  const [displayImages, setDisplayImages] = useState({ uploaded: [], processed: [] });
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  
  // Initialize working images from recipe on mount
  useEffect(() => {
    const initialImages = recipe?.images || { uploaded: [], processed: [] };
    setWorkingImages(initialImages);
  }, [recipe?.images]);
  
  // Process working images for display whenever they change
  useEffect(() => {
    const processImages = async () => {
      if (workingImages.uploaded?.length > 0 || workingImages.processed?.length > 0) {
        setIsProcessingImages(true);
        try {
          const processed = await processImagesForDisplay(workingImages);
          setDisplayImages(processed);
        } catch (error) {
          console.error('Failed to process working images:', error);
          setDisplayImages({ uploaded: [], processed: [] });
        } finally {
          setIsProcessingImages(false);
        }
      } else {
        setDisplayImages({ uploaded: [], processed: [] });
      }
    };

    processImages();
  }, [workingImages]);
  
  // Handle file selection from ImageUploadArea
  const handleFilesSelected = useCallback(async (files, validationResult) => {
    if (!files || files.length === 0) return;
    
    setUploadError(null);
    setUploadingImages(files.map(f => f.name));
    
    try {
      const uploadPromises = files.map(async (file) => {
        try {
          const result = await uploadRecipeImage(file, {
            folder: 'uploads',
            compress: true,
            onProgress: (progress) => {
              // Progress tracking handled internally
            }
          });
          
          return {
            id: `uploaded-${Date.now()}-${Math.random()}`,
            url: result.publicUrl || result.url,
            publicUrl: result.publicUrl || result.url,
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
            storagePath: result.storagePath || result.path
          };
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw error;
        }
      });
      
      const uploadedImages = await Promise.all(uploadPromises);
      
      // Update working images with new uploaded images
      setWorkingImages(prev => ({
        ...prev,
        uploaded: [...(prev.uploaded || []), ...uploadedImages]
      }));
      
      // Update the recipe with new working images
      const updatedImages = {
        ...workingImages,
        uploaded: [...(workingImages.uploaded || []), ...uploadedImages]
      };
      
      onUpdate({ images: updatedImages });
      
    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadError(error.message || t('editableImages.uploadError', { 
        defaultValue: 'Failed to upload images. Please try again.' 
      }));
    } finally {
      setUploadingImages([]);
    }
  }, [workingImages, onUpdate, t]);
  
  // Handle validation errors from ImageUploadArea
  const handleValidationError = useCallback((errors, validationResult) => {
    setUploadError(errors.join(', '));
  }, []);
  
  // Handle removing an image
  const handleRemoveImage = useCallback((imageId, imageType) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[EditableImagesSection] Removing image:', { imageId, imageType, workingImages });
    }
    
    const updatedImages = {
      ...workingImages,
      [imageType]: workingImages[imageType].filter(img => img.id !== imageId)
    };
    
    setWorkingImages(updatedImages);
    
    onUpdate({ images: updatedImages });
  }, [workingImages, onUpdate]);
  
  const hasImages = (displayImages.uploaded?.length > 0) || (displayImages.processed?.length > 0);
  const isUploading = uploadingImages.length > 0;
  
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#1b0e0e]">
            {t('editableImages.title', { defaultValue: 'Recipe Images' })}
          </h3>
          <span className="text-sm text-gray-500">
            {t('editableImages.subtitle', { 
              defaultValue: 'Upload images of your recipe',
              count: workingImages.uploaded?.length || 0
            })}
          </span>
        </div>
        
        {/* Current Images Display */}
        {hasImages && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              {t('editableImages.currentImages', { defaultValue: 'Current Images' })}
            </h4>
            {isProcessingImages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#994d51]"></div>
                <span className="ml-3 text-gray-600">{t('imageGallery.loadingImages', { defaultValue: 'Loading images...' })}</span>
              </div>
            ) : (
              <RecipeImageGallery
                images={displayImages}
                showProcessed={true}
                showUploaded={true}
                managementMode={true}
                onImageDelete={handleRemoveImage}
              />
            )}
          </div>
        )}
        
        {/* Image Upload Area */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            {t('editableImages.uploadNew', { defaultValue: 'Upload New Images' })}
          </h4>
          
          <ImageUploadArea
            onFilesSelected={handleFilesSelected}
            onValidationError={handleValidationError}
            maxFiles={5}
            disabled={isUploading}
            variant="compact"
            showValidationSummary={false}
          />
          
          {/* Upload Status */}
          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>
                {t('editableImages.uploading', { 
                  defaultValue: 'Uploading images...',
                  count: uploadingImages.length
                })}
              </span>
            </div>
          )}
          
          {/* Upload Error */}
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          )}
        </div>
        
        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <p>
            {t('editableImages.helpText', { 
              defaultValue: 'Supported formats: JPEG, PNG, WebP, PDF. Max file size: 50MB. You can upload up to 5 images.'
            })}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default EditableImagesSection;