import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Reusable Toast notification component
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether to show the toast
 * @param {string} props.message - Toast message to display
 * @param {string} props.type - Toast type: 'success', 'error', 'info', 'warning'
 * @param {number} props.duration - Auto-hide duration in milliseconds (default: 5000)
 * @param {function} props.onClose - Callback when toast closes
 * @param {string} props.position - Toast position: 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
 */
const Toast = ({ 
  show = false, 
  message = '', 
  type = 'info',
  duration = 5000,
  onClose,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      // Delay the onClose callback to allow exit animation
      setTimeout(onClose, 200);
    }
  };

  // Toast type styles
  const typeStyles = {
    success: {
      bg: 'bg-green-500',
      icon: '✅',
      textColor: 'text-white'
    },
    error: {
      bg: 'bg-red-500',
      icon: '❌',
      textColor: 'text-white'
    },
    warning: {
      bg: 'bg-yellow-500',
      icon: '⚠️',
      textColor: 'text-white'
    },
    info: {
      bg: 'bg-blue-500',
      icon: 'ℹ️',
      textColor: 'text-white'
    }
  };

  // Position styles
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const currentStyle = typeStyles[type] || typeStyles.info;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed z-50 ${positionStyles[position]} max-w-sm w-full mx-4`}
        >
          <div
            className={`${currentStyle.bg} ${currentStyle.textColor} px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-h-[48px]`}
          >
            <div className="flex items-center space-x-3 flex-1">
              <span className="text-lg flex-shrink-0">
                {currentStyle.icon}
              </span>
              <span className="text-sm font-medium leading-tight break-words">
                {message}
              </span>
            </div>
            
            <button
              onClick={handleClose}
              className={`${currentStyle.textColor} hover:opacity-80 transition-opacity ml-3 flex-shrink-0`}
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;