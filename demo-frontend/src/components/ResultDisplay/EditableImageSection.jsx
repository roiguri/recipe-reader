import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageService } from '../../services/imageService';
import Card from '../ui/Card';
import ImageUploader from '../ui/ImageUploader';
import ImageGrid from './ImageGrid';
import ImageSectionHeader from './ImageSectionHeader';
import ImageModal from './ImageModal';

const EditableImageSection = forwardRef(({ 
  recipe, 
  recipeId, 
  onUpdate,
  className = '' 
}, ref) => {
  const { t } = useTranslation();
  
  // Stabilize current images reference to prevent unnecessary re-renders
  const currentImages = useMemo(() => recipe?.images || [], [recipe?.images]);
  
  // Component state
  const [currentImageUrls, setCurrentImageUrls] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]); // New files to upload
  const [removedImages, setRemovedImages] = useState([]); // Images marked for removal
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load current image URLs
  const loadCurrentImages = useCallback(async () => {
    if (!recipeId || currentImages.length === 0) {
      setCurrentImageUrls([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: user, error: userError } = await ImageService.getCurrentUser();
      
      if (userError || !user) {
        setError(userError?.message || t('resultDisplay.images.authError'));
        setIsLoading(false);
        return;
      }

      const { data: urls, error: urlError } = await ImageService.getRecipeImageUrls(
        user.id, 
        recipeId, 
        currentImages
      );

      if (urlError) {
        setError(urlError.message);
        setCurrentImageUrls(urls || []);
      } else {
        setCurrentImageUrls(urls || []);
      }
    } catch (err) {
      console.error('Error loading current images:', err);
      setError(t('resultDisplay.images.loadError'));
      setCurrentImageUrls([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentImages, recipeId, t]);

  // Load current images on mount and when recipe/recipeId changes
  useEffect(() => {
    loadCurrentImages();
  }, [loadCurrentImages]);

  // Imperative reset function for parent to call after save
  const resetToSavedState = useCallback(() => {
    // Clean up pending files
    setPendingFiles(prev => {
      prev.forEach(item => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setRemovedImages([]);
    setUploadErrors([]);
    // Reload current images to reflect new state
    loadCurrentImages();
  }, [loadCurrentImages]);

  // Expose reset function to parent via ref
  useImperativeHandle(ref, () => ({
    resetToSavedState
  }), [resetToSavedState]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleFilesSelected = useCallback((files, errors) => {
    setUploadErrors(errors);
    
    if (files.length > 0) {
      // Create preview URLs for new files
      const newPendingFiles = files.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        id: `pending-${Date.now()}-${Math.random()}`
      }));
      
      setPendingFiles(prev => [...prev, ...newPendingFiles]);
    }
  }, []);

  const removePendingFile = useCallback((fileId) => {
    setPendingFiles(prev => {
      const updated = prev.filter(item => item.id !== fileId);
      // Clean up object URL
      const toRemove = prev.find(item => item.id === fileId);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }
      return updated;
    });
  }, []);

  const markImageForRemoval = useCallback((filename) => {
    setRemovedImages(prev => [...prev, filename]);
  }, []);

  const restoreRemovedImage = useCallback((filename) => {
    setRemovedImages(prev => prev.filter(name => name !== filename));
  }, []);

  // Memoized calculations
  const allImagesForDisplay = useCallback(() => {
    const images = [];
    
    // Add current images (not marked for removal)
    currentImageUrls.forEach((imageData, index) => {
      if (!removedImages.includes(imageData.filename)) {
        images.push({
          type: 'current',
          ...imageData,
          index: index
        });
      }
    });
    
    // Add pending images
    pendingFiles.forEach((fileData, index) => {
      images.push({
        type: 'pending',
        filename: fileData.file.name,
        url: fileData.previewUrl,
        fileId: fileData.id,
        index: index
      });
    });
    
    return images;
  }, [currentImageUrls, removedImages, pendingFiles]);

  // Memoized modal handlers
  const handleThumbnailClick = useCallback((index) => {
    setSelectedImageIndex(index);
    setIsModalOpen(true);
  }, []);

  const handleModalPrevious = useCallback(() => {
    setSelectedImageIndex(prev => prev > 0 ? prev - 1 : prev);
  }, []);

  const handleModalNext = useCallback(() => {
    const allImages = allImagesForDisplay();
    setSelectedImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : prev);
  }, [allImagesForDisplay]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedImageIndex(null);
  }, []);

  // Prepare final images array for save
  const getFinalImagesArray = useCallback(() => {
    // Start with current images, remove the ones marked for removal
    const remainingCurrent = currentImages.filter(filename => 
      !removedImages.includes(filename)
    );
    
    return remainingCurrent;
  }, [currentImages, removedImages]);

  const previousImagesRef = useRef(currentImages);
  
  // Expose save operation data to parent when there are changes
  useEffect(() => {
    if (pendingFiles.length > 0 || removedImages.length > 0) {
      const finalImages = getFinalImagesArray();
      const saveData = {
        pendingUploads: pendingFiles.map(item => item.file),
        imagesToRemove: removedImages,
        finalImagesList: finalImages
      };
      
      const hasImageChanges = JSON.stringify(finalImages) !== JSON.stringify(previousImagesRef.current);
      
      if (onUpdate && hasImageChanges) {
        onUpdate({ 
          images: finalImages,
          _imageSaveData: saveData 
        });
        previousImagesRef.current = finalImages;
      } else if (onUpdate && !hasImageChanges) {
        onUpdate({ 
          _imageSaveData: saveData 
        });
      }
    } else {
      previousImagesRef.current = currentImages;
    }
  }, [pendingFiles, removedImages]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach(item => {
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const allImages = allImagesForDisplay();
  const hasChanges = pendingFiles.length > 0 || removedImages.length > 0;

  return (
    <Card className={`${className}`}>
      {/* Stable header - never re-renders */}
      <ImageSectionHeader hasChanges={hasChanges} />

      {/* Upload errors - stable container */}
      <div className="min-h-0 mb-4">
        {uploadErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800 space-y-1">
              {uploadErrors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error state - stable container */}
      <div className="min-h-0 mb-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="text-red-600">⚠️</div>
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stable upload container - never re-renders */}
      <div className="mb-6">
        <div className={isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}>
          <ImageUploader
            onFilesSelected={handleFilesSelected}
            maxFiles={10}
            maxSizeMB={10}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Dynamic image grid - only re-renders when images change */}
      <div className="min-h-[200px]">
        <div className={isLoading ? 'opacity-50' : 'opacity-100'}>
          <ImageGrid
            currentImages={currentImageUrls}
            pendingFiles={pendingFiles}
            removedImages={removedImages}
            recipeName={recipe?.name}
            onImageClick={handleThumbnailClick}
            onRemoveCurrentImage={markImageForRemoval}
            onRemovePendingFile={removePendingFile}
            onRestoreRemovedImage={restoreRemovedImage}
          />
        </div>
      </div>

      {/* Image modal - only renders when open */}
      {isModalOpen && selectedImageIndex !== null && allImages[selectedImageIndex] && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          imageUrl={allImages[selectedImageIndex].url}
          imagePath={allImages[selectedImageIndex].filename}
          alt={`${recipe?.name || t('resultDisplay.images.dishImage')} ${selectedImageIndex + 1}`}
          currentIndex={selectedImageIndex}
          totalImages={allImages.length}
          onPrevious={handleModalPrevious}
          onNext={handleModalNext}
        />
      )}
    </Card>
  );
});

EditableImageSection.displayName = 'EditableImageSection';

export default EditableImageSection;