import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { getSignedImageUrl } from '../../utils/imageManagementService';
import ImageLightbox from './ImageLightbox';

const ImageDisplay = ({ 
  images = [], 
  loading = false, 
  error = null,
  className = '',
  onImageClick = null
}) => {
  const { t } = useTranslation();
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Individual image loading states
  const [imageLoadingStates, setImageLoadingStates] = useState({});

  // Handle image load success
  const handleImageLoad = useCallback((index) => {
    setImageLoadingStates(prev => ({ ...prev, [index]: false }));
  }, []);

  // Handle image load error with signed URL fallback
  const handleImageError = useCallback(async (event, image, index) => {
    // Check if image is actually loaded (sometimes error fires after success)
    if (event.target.complete && event.target.naturalWidth > 0) {
      setImageLoadingStates(prev => ({ ...prev, [index]: false }));
      return;
    }
    
    // If the image has a path and this is the first failure, try signed URL
    if (image.path && !event.target.src.includes('sign')) {
      try {
        const signedUrl = await getSignedImageUrl(image.path);
        if (signedUrl && signedUrl !== event.target.src) {
          event.target.src = signedUrl;
          return;
        }
      } catch (error) {
        console.error('Failed to get signed URL:', error);
      }
    }
    
    // If we get here, the image truly failed to load
    setImageLoadingStates(prev => ({ ...prev, [index]: false }));
    event.target.style.display = 'none';
    const errorDiv = event.target.nextElementSibling;
    if (errorDiv) {
      errorDiv.style.display = 'flex';
    }
  }, []);

  // Handle image click - open lightbox
  const handleImageClickInternal = useCallback((image, index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    
    // Also call the external callback if provided
    if (onImageClick) {
      onImageClick({ image, index });
    }
  }, [onImageClick]);

  // Handle lightbox close
  const handleLightboxClose = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  // Handle lightbox navigation
  const handleLightboxNavigate = useCallback((newIndex) => {
    setCurrentImageIndex(newIndex);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">{t('imageDisplay.loading')}</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center h-32 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center">
            <svg className="mx-auto h-8 w-8 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-800 font-medium">{t('imageDisplay.error')}</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No images state
  if (!images || images.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center h-24 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-center">
            <svg className="mx-auto h-6 w-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 text-sm">{t('imageDisplay.noImages')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Images grid - simple Tailwind implementation like ImageEditor
  return (
    <>
    <div className={`${className}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      >
        {images.map((image, index) => {
          const imageUrl = image.url || image;
          const imageAlt = image.alt || image.fileName || `Recipe image ${index + 1}`;
          const isImageLoading = imageLoadingStates[index] !== false;
          
          // Initialize loading state for new images
          if (!(index in imageLoadingStates)) {
            setImageLoadingStates(prev => ({ ...prev, [index]: true }));
          }
          
          return (
            <motion.div
              key={`image-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer group"
              onClick={() => handleImageClickInternal(image, index)}
            >
              {/* Loading state */}
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
              
              <img
                src={imageUrl}
                alt={imageAlt}
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  isImageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => handleImageLoad(index)}
                onError={(e) => handleImageError(e, image, index)}
                loading="lazy"
              />
              
              {/* Error fallback (hidden by default) */}
              <div 
                className="absolute inset-0 hidden items-center justify-center bg-gray-100 flex-col"
                style={{ display: 'none' }}
              >
                <svg className="h-6 w-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-gray-600 text-xs text-center px-1">{t('imageDisplay.imageError')}</p>
              </div>

              {/* Hover overlay - only show when not loading */}
              {!isImageLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                  <svg className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>

    {/* Lightbox - positioned outside container to cover full viewport */}
    <AnimatePresence>
      {lightboxOpen && (
        <ImageLightbox
          images={images}
          currentIndex={currentImageIndex}
          onClose={handleLightboxClose}
          onNavigate={handleLightboxNavigate}
        />
      )}
    </AnimatePresence>
    </>
  );
};

export default ImageDisplay;