import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageService } from '../../services/imageService';
import { isHebrew } from '../../utils/formatters';
import ImageThumbnail from './ImageThumbnail';
import ImageModal from './ImageModal';

const RecipeImageSection = ({ 
  recipe, 
  recipeId, 
  className = '' 
}) => {
  const { t } = useTranslation();
  const [imageUrls, setImageUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get images array from recipe
  const images = recipe?.images || [];
  
  // Don't render anything if no images
  if (!images || images.length === 0) {
    return null;
  }
  
  // Load image URLs when component mounts or images change
  const loadImageUrls = useCallback(async () => {
    if (!recipeId) {
      setImageUrls([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: user, error: userError } = await ImageService.getCurrentUser();
      
      if (userError || !user) {
        setError(userError?.message || t('resultDisplay.images.authError'));
        setIsLoading(false);
        return;
      }

      // Get signed URLs for all images (expects string array of filenames)
      const { data: urls, error: urlError } = await ImageService.getRecipeImageUrls(
        user.id, 
        recipeId, 
        images
      );

      if (urlError) {
        setError(urlError.message);
        setImageUrls(urls || []); // Show whatever we got
      } else {
        setImageUrls(urls || []);
      }
    } catch (err) {
      console.error('Error loading recipe images:', err);
      setError(t('resultDisplay.images.loadError'));
      setImageUrls([]);
    } finally {
      setIsLoading(false);
    }
  }, [images, recipeId, t]);


  // Load images on mount and when dependencies change
  useEffect(() => {
    loadImageUrls();
  }, [loadImageUrls]);

  // Handle thumbnail click
  const handleThumbnailClick = (index) => {
    setSelectedImageIndex(index);
    setIsModalOpen(true);
  };

  // Handle modal navigation
  const handleModalPrevious = () => {
    if (selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const handleModalNext = () => {
    if (selectedImageIndex < imageUrls.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedImageIndex(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Section header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900" style={{ direction: isHebrew(t('resultDisplay.images.title')) ? 'rtl' : 'ltr' }}>
          {t('resultDisplay.images.title')}
        </h3>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="text-red-600">⚠️</div>
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Image grid */}
      {!isLoading && imageUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {imageUrls.map((imageData, index) => (
            <ImageThumbnail
              key={imageData.filename}
              imageUrl={imageData.url}
              imagePath={imageData.filename}
              alt={`${recipe.name || t('resultDisplay.images.dishImage')} ${index + 1}`}
              onClick={() => handleThumbnailClick(index)}
              className="w-full h-32 md:h-40"
            />
          ))}
        </div>
      )}

      {/* No images loaded state */}
      {!isLoading && !error && imageUrls.length === 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <div className="text-gray-500 mb-2">📷</div>
          <div className="text-sm text-gray-600">
            {t('resultDisplay.images.noImagesLoaded')}
          </div>
        </div>
      )}

      {/* Image modal */}
      {isModalOpen && selectedImageIndex !== null && imageUrls[selectedImageIndex] && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          imageUrl={imageUrls[selectedImageIndex].url}
          imagePath={imageUrls[selectedImageIndex].filename}
          alt={`${recipe.name || t('resultDisplay.images.dishImage')} ${selectedImageIndex + 1}`}
          currentIndex={selectedImageIndex}
          totalImages={imageUrls.length}
          onPrevious={handleModalPrevious}
          onNext={handleModalNext}
        />
      )}
    </div>
  );
};

export default RecipeImageSection;