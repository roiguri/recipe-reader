import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { getDirection, isRTL } from '../../i18n';

const ImageModal = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  imagePath, 
  alt,
  currentIndex = 0,
  totalImages = 1,
  onPrevious,
  onNext
}) => {
  const { t } = useTranslation();
  const direction = getDirection();
  const isRtl = isRTL();

  // Handle keyboard navigation with RTL support
  const handleKeyDown = useCallback((event) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        // In RTL: ArrowLeft should go to next image, in LTR: ArrowLeft should go to previous
        if (isRtl) {
          if (onNext && currentIndex < totalImages - 1) {
            onNext();
          }
        } else {
          if (onPrevious && currentIndex > 0) {
            onPrevious();
          }
        }
        break;
      case 'ArrowRight':
        // In RTL: ArrowRight should go to previous image, in LTR: ArrowRight should go to next
        if (isRtl) {
          if (onPrevious && currentIndex > 0) {
            onPrevious();
          }
        } else {
          if (onNext && currentIndex < totalImages - 1) {
            onNext();
          }
        }
        break;
      default:
        break;
    }
  }, [isOpen, onClose, onPrevious, onNext, currentIndex, totalImages, isRtl]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75"
          onClick={handleBackdropClick}
          style={{ direction }}
        >
          {/* Modal container - Fixed size to prevent layout shifts */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl bg-white rounded-lg overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              direction,
              width: '90vw',
              maxWidth: '1024px',
              height: '85vh',
              maxHeight: '800px'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('resultDisplay.images.viewImage')}
                </h3>
                {totalImages > 1 && (
                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} / {totalImages}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                aria-label={t('common.close')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image container - Fixed height to prevent layout shifts */}
            <div className="relative bg-gray-100 flex items-center justify-center flex-1 overflow-hidden">
              <img
                src={imageUrl}
                alt={alt || imagePath || t('resultDisplay.images.dishImage')}
                className="max-w-full max-h-full object-contain transition-opacity duration-200"
                style={{ 
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
              />

              {/* Navigation buttons */}
              {totalImages > 1 && (
                <>
                  {/* Previous button - positioned based on RTL */}
                  <button
                    onClick={onPrevious}
                    disabled={currentIndex === 0}
                    className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 text-white transition-opacity hover:bg-opacity-75 ${
                      currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'opacity-75'
                    }`}
                    aria-label={t('common.previous')}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                    </svg>
                  </button>

                  {/* Next button - positioned based on RTL */}
                  <button
                    onClick={onNext}
                    disabled={currentIndex === totalImages - 1}
                    className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 text-white transition-opacity hover:bg-opacity-75 ${
                      currentIndex === totalImages - 1 ? 'opacity-50 cursor-not-allowed' : 'opacity-75'
                    }`}
                    aria-label={t('common.next')}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRtl ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {imagePath && (
                    <span>{imagePath}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {t('resultDisplay.images.pressEscapeToClose')}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ImageModal;