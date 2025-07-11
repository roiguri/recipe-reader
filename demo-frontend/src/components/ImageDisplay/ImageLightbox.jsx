import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { getSignedImageUrl } from '../../utils/imageManagementService';
import { useLanguage } from '../../contexts/LanguageContext';

const ImageLightbox = ({ 
  images = [], 
  currentIndex = 0, 
  onClose, 
  onNavigate 
}) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  // Load current image
  useEffect(() => {
    if (currentImage) {
      setLoading(true);
      setError(false);
      setImageUrl(currentImage.url || currentImage);
    }
  }, [currentImage, currentIndex]);

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  // Handle image load error with signed URL fallback
  const handleImageError = useCallback(async () => {
    if (currentImage.path && !imageUrl.includes('sign')) {
      try {
        const signedUrl = await getSignedImageUrl(currentImage.path);
        if (signedUrl && signedUrl !== imageUrl) {
          setImageUrl(signedUrl);
          return;
        }
      } catch (err) {
        console.error('Failed to get signed URL:', err);
      }
    }
    
    setLoading(false);
    setError(true);
  }, [currentImage, imageUrl]);

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (hasMultipleImages && currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, hasMultipleImages, onNavigate]);

  const goToNext = useCallback(() => {
    if (hasMultipleImages && currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, images.length, hasMultipleImages, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          // In RTL: left arrow goes to next image, in LTR: goes to previous
          isRTL ? goToNext() : goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          // In RTL: right arrow goes to previous image, in LTR: goes to next
          isRTL ? goToPrevious() : goToNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrevious, goToNext, isRTL]);

  // Prevent scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!currentImage) return null;

  const imageAlt = currentImage.alt || currentImage.fileName || `Recipe image ${currentIndex + 1}`;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Main content container */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200 ${
            isRTL ? 'left-4' : 'right-4'
          }`}
          aria-label={t('common.close')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image counter */}
        {hasMultipleImages && (
          <div className={`absolute top-4 z-10 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm ${
            isRTL ? 'right-4' : 'left-4'
          }`}>
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Previous button */}
        {hasMultipleImages && currentIndex > 0 && (
          <button
            onClick={goToPrevious}
            className={`absolute top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-200 ${
              isRTL ? 'right-4' : 'left-4'
            }`}
            aria-label={t('imageDisplay.previousImage')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRTL ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        )}

        {/* Next button */}
        {hasMultipleImages && currentIndex < images.length - 1 && (
          <button
            onClick={goToNext}
            className={`absolute top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-200 ${
              isRTL ? 'left-4' : 'right-4'
            }`}
            aria-label={t('imageDisplay.nextImage')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
            </svg>
          </button>
        )}

        {/* Image container - fixed size to prevent layout shifts */}
        <div className="relative bg-white rounded-lg overflow-hidden shadow-2xl w-[90vw] h-[80vh] max-w-4xl flex items-center justify-center">
          {/* Loading state */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <span className="text-gray-600">{t('imageDisplay.loading')}</span>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-gray-600">{t('imageDisplay.imageError')}</p>
              </div>
            </div>
          )}

          {/* Image - only rendered when imageUrl is available */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={imageAlt}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ 
                display: (loading || error) ? 'none' : 'block',
                opacity: (loading || error) ? 0 : 1 
              }}
            />
          )}
        </div>

        {/* Image title/description */}
        {currentImage.fileName && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm max-w-80 text-center truncate">
            {currentImage.fileName}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default ImageLightbox;