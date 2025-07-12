import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ImageThumbnail = ({ imageUrl, imagePath, alt, onClick, className = '' }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleClick = () => {
    if (onClick && !hasError) {
      onClick();
    }
  };

  return (
    <div 
      className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 ${
        !hasError ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      } ${className}`}
      onClick={handleClick}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-2">
          <div className="text-2xl mb-1">📷</div>
          <div className="text-xs text-center">
            {t('resultDisplay.images.loadError')}
          </div>
        </div>
      )}

      {/* Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt || imagePath || t('resultDisplay.images.dishImage')}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-opacity ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}

      {/* Hover overlay */}
      {!hasError && !isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <div className="text-white opacity-0 hover:opacity-100 transition-opacity duration-200">
            <div className="text-lg">🔍</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageThumbnail;