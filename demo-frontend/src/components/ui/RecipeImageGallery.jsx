import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Simple recipe image gallery component with grid layout
 * Displays images in a clean grid with optional delete functionality
 */
const RecipeImageGallery = ({
  images = { uploaded: [], processed: [] },
  showProcessed = true,
  showUploaded = true,
  managementMode = false,
  className = '',
  onImageDelete
}) => {
  const { t } = useTranslation();

  // Combine uploaded and processed images based on props
  const allImages = React.useMemo(() => {
    const combined = [];
    
    if (showUploaded && images.uploaded) {
      combined.push(...images.uploaded.map(img => ({ ...img, type: 'uploaded' })));
    }
    
    if (showProcessed && images.processed) {
      combined.push(...images.processed.map(img => ({ ...img, type: 'processed' })));
    }
    
    return combined;
  }, [images, showUploaded, showProcessed]);

  const handleImageDelete = (imageData) => {
    if (onImageDelete) {
      onImageDelete(imageData.id, imageData.type);
    }
  };

  const ImageCard = ({ image }) => {
    const imageUrl = image.thumbnail || image.url;

    if (!imageUrl) {
      return (
        <div className="relative aspect-[4/3] bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center p-4">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-500">
              {t('imageGallery.noPreview', { defaultValue: 'No preview available' })}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden group">
        <img
          src={imageUrl}
          alt={image.filename || t('imageGallery.recipeImage', { defaultValue: 'Recipe image' })}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Delete button for management mode */}
        {managementMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleImageDelete(image);
            }}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-colors duration-200"
            aria-label={t('imageGallery.deleteImage', { defaultValue: 'Delete image' })}
            title={t('imageGallery.deleteImage', { defaultValue: 'Delete image' })}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  // Show empty state if no images
  if (allImages.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">
          {t('imageGallery.noImages', { defaultValue: 'No images available' })}
        </p>
      </div>
    );
  }

  // Main gallery grid
  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allImages.map((image, index) => (
          <ImageCard key={`${image.id || index}`} image={image} />
        ))}
      </div>
      
      {allImages.length > 1 && (
        <div className="text-center text-sm text-gray-500 mt-4">
          {allImages.length} {t('imageGallery.images', { defaultValue: 'images' })}
        </div>
      )}
    </div>
  );
};

export default RecipeImageGallery;