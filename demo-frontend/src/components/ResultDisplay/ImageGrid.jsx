import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import ImageThumbnail from './ImageThumbnail';

// Helper function for deep array comparison
const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (typeof a[i] === 'object' && typeof b[i] === 'object') {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
    } else if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const ImageGrid = memo(({
  currentImages = [],
  pendingFiles = [],
  removedImages = [],
  recipeName = '',
  onImageClick,
  onRemoveCurrentImage,
  onRemovePendingFile,
  onRestoreRemovedImage
}) => {
  const { t } = useTranslation();

  // Combine all images for display (current + pending - removed)
  const allImages = [];
  
  // Add current images (not marked for removal)
  currentImages.forEach((imageData, index) => {
    if (!removedImages.includes(imageData.filename)) {
      allImages.push({
        type: 'current',
        ...imageData,
        index: index
      });
    }
  });
  
  // Add pending images
  pendingFiles.forEach((fileData, index) => {
    allImages.push({
      type: 'pending',
      filename: fileData.file.name,
      url: fileData.previewUrl,
      fileId: fileData.id,
      index: index
    });
  });

  // Get removed images for display
  const removedImagesDisplay = currentImages.filter(imageData => 
    removedImages.includes(imageData.filename)
  ).map(imageData => ({
    type: 'removed',
    ...imageData
  }));

  return (
    <div className="space-y-6">
      {/* Current and pending images */}
      {allImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('resultDisplay.edit.images.currentImages')} ({allImages.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allImages.map((imageData, index) => (
              <div key={imageData.type === 'pending' ? imageData.fileId : imageData.filename} className="relative group">
                <ImageThumbnail
                  imageUrl={imageData.url}
                  imagePath={imageData.filename}
                  alt={`${recipeName || t('resultDisplay.images.dishImage')} ${index + 1}`}
                  onClick={() => onImageClick(index)}
                  className="w-full h-32 md:h-40"
                />
                
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (imageData.type === 'pending') {
                      onRemovePendingFile(imageData.fileId);
                    } else {
                      onRemoveCurrentImage(imageData.filename);
                    }
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title={t('resultDisplay.edit.images.removeImage')}
                >
                  ×
                </button>
                
                {/* Pending indicator */}
                {imageData.type === 'pending' && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                    {t('resultDisplay.edit.images.pending')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed images (can be restored) */}
      {removedImagesDisplay.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-600 mb-3">
            {t('resultDisplay.edit.images.markedForRemoval')} ({removedImagesDisplay.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {removedImagesDisplay.map((imageData) => (
              <div key={imageData.filename} className="relative group opacity-50">
                <ImageThumbnail
                  imageUrl={imageData.url}
                  imagePath={imageData.filename}
                  alt={`${recipeName || t('resultDisplay.images.dishImage')} (removed)`}
                  className="w-full h-32 md:h-40"
                />
                
                {/* Restore button */}
                <button
                  onClick={() => onRestoreRemovedImage(imageData.filename)}
                  className="absolute top-2 right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-600"
                  title={t('resultDisplay.edit.images.restoreImage')}
                >
                  ↺
                </button>
                
                {/* Removed indicator */}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
                  {t('resultDisplay.edit.images.removed')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No images state */}
      {allImages.length === 0 && removedImagesDisplay.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📷</div>
          <div className="text-sm">
            {t('resultDisplay.edit.images.noImages')}
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to only re-render when image arrays actually change
  return (
    arraysEqual(prevProps.currentImages, nextProps.currentImages) &&
    arraysEqual(prevProps.pendingFiles, nextProps.pendingFiles) &&
    arraysEqual(prevProps.removedImages, nextProps.removedImages) &&
    prevProps.recipeName === nextProps.recipeName
  );
});

ImageGrid.displayName = 'ImageGrid';

export default ImageGrid;