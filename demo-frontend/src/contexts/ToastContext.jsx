import React, { createContext, useContext, useState } from 'react';

/**
 * Global Toast Context for app-wide notifications
 * Provides a centralized system for showing toast notifications
 */
const ToastContext = createContext();

/**
 * ToastProvider component to wrap the app with global toast functionality
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [timeouts, setTimeouts] = useState(new Map());

  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type: 'success', 'error', 'info', 'warning'
   * @param {number} duration - Auto-hide duration in milliseconds (default: 5000)
   * @param {string} position - Toast position (default: 'top-right')
   * @returns {number} - Toast ID for manual removal
   */
  const showToast = (message, type = 'info', duration = 5000, position = 'top-right') => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration,
      position,
      show: true
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        hideToast(id);
      }, duration);
      
      setTimeouts(prev => new Map(prev.set(id, timeoutId)));
    }

    return id;
  };

  /**
   * Hide a toast (start exit animation)
   * @param {number} id - Toast ID to hide
   */
  const hideToast = (id) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, show: false } : toast
    ));
    
    setTimeout(() => {
      removeToast(id);
    }, 250);
  };

  /**
   * Remove a specific toast by ID
   * @param {number} id - Toast ID to remove
   */
  const removeToast = (id) => {
    // Clear timeout if it exists
    setTimeouts(prev => {
      const timeoutId = prev.get(id);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const newTimeouts = new Map(prev);
      newTimeouts.delete(id);
      return newTimeouts;
    });
    
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  /**
   * Clear all toasts
   */
  const clearToasts = () => {
    // Clear all active timeouts
    setTimeouts(prev => {
      prev.forEach(timeoutId => clearTimeout(timeoutId));
      return new Map();
    });
    
    setToasts([]);
  };

  // Convenience methods for different toast types
  const showSuccess = (message, duration, position) => 
    showToast(message, 'success', duration, position);

  const showError = (message, duration, position) => 
    showToast(message, 'error', duration, position);

  const showWarning = (message, duration, position) => 
    showToast(message, 'warning', duration, position);

  const showInfo = (message, duration, position) => 
    showToast(message, 'info', duration, position);

  const value = {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast: hideToast,
    clearToasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Hook to use the global toast system
 * @returns {Object} - Toast control methods and state
 */
export const useGlobalToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useGlobalToast must be used within a ToastProvider');
  }
  
  return context;
};

export default ToastContext;