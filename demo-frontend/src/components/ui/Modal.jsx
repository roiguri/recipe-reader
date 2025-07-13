import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Generic reusable Modal component
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether to show the modal
 * @param {function} props.onClose - Callback when modal closes (clicking backdrop/ESC)
 * @param {string} props.title - Modal title (optional)
 * @param {React.ReactNode} props.children - Modal content
 * @param {Array} props.actions - Array of action button configs
 * @param {boolean} props.showCloseButton - Whether to show X close button (default: true)
 * @param {string} props.size - Modal size: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {boolean} props.closeOnBackdrop - Whether clicking backdrop closes modal (default: true)
 */
const Modal = ({
  show = false,
  onClose,
  title,
  children,
  actions = [],
  showCloseButton = true,
  size = 'md',
  closeOnBackdrop = true
}) => {
  // Handle ESC key press and body scroll lock
  React.useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27 && onClose) {
        onClose();
      }
    };
    
    if (show) {
      document.addEventListener('keydown', handleEsc, false);
      
      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // Store original styles
      const originalStyle = window.getComputedStyle(document.body);
      const originalOverflow = originalStyle.overflow;
      const originalPaddingRight = originalStyle.paddingRight;
      
      // Prevent body scroll and compensate for scrollbar
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${parseInt(originalPaddingRight) + scrollbarWidth}px`;
      
      return () => {
        document.removeEventListener('keydown', handleEsc, false);
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc, false);
    };
  }, [show, onClose]);

  // Size configurations
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop && onClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                {title && (
                  <h3 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close modal"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-4 overflow-y-auto">
              {children}
            </div>

            {/* Actions */}
            {actions.length > 0 && (
              <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      action.variant === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300'
                        : action.variant === 'danger'
                        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300'
                        : action.variant === 'success'
                        ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-400'
                    } ${action.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {action.loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span>{action.loadingText || action.text}</span>
                      </div>
                    ) : (
                      action.text
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;