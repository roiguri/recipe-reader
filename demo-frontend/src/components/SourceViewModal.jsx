import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './ui/Card';

/**
 * SourceViewModal component for displaying original recipe source data
 */
const SourceViewModal = ({ isOpen, onClose, sourceType, sourceData, title }) => {
  const { t } = useTranslation();

  const renderSourceContent = () => {
    if (!sourceData) {
      return (
        <div className="text-center text-gray-500 py-8">
          {t('sourceView.noData')}
        </div>
      );
    }

    switch (sourceType) {
      case 'text':
        return (
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
              {sourceData}
            </pre>
          </div>
        );
      
      case 'url':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('sourceView.originalUrl')}
              </label>
              <a 
                href={sourceData}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                {sourceData}
              </a>
            </div>
            <div className="text-sm text-gray-500">
              {t('sourceView.urlNote')}
            </div>
          </div>
        );
      
      case 'image':
        // Base64 image data - could be multiple images separated by commas
        const images = sourceData.split(',').filter(img => img.trim());
        return (
          <div className="space-y-4">
            {images.map((imageData, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <span className="text-sm font-medium text-gray-700">
                    {t('sourceView.image')} {images.length > 1 ? `${index + 1}` : ''}
                  </span>
                </div>
                <div className="p-4">
                  <img
                    src={`data:image/jpeg;base64,${imageData.trim()}`}
                    alt={`${t('sourceView.originalImage')} ${index + 1}`}
                    className="max-w-full h-auto rounded-lg shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="hidden text-center text-gray-500 py-8">
                    {t('sourceView.imageError')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <div className="text-center text-gray-500 py-8">
            {t('sourceView.unsupportedType')}
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black bg-opacity-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            <Card className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {t('sourceView.title')}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {title && `${title} • `}
                    {t(`sourceView.type.${sourceType}`)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {renderSourceContent()}
              </div>
              
              {/* Footer */}
              <div className="flex justify-end p-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {t('common.close')}
                </button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SourceViewModal;