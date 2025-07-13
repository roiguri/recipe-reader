import React, { createContext, useContext, useState } from 'react';

/**
 * Global Modal Context for app-wide modal management
 * Provides a centralized system for showing various types of modals
 */
const ModalContext = createContext();

/**
 * ModalProvider component to wrap the app with global modal functionality
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState([]);

  /**
   * Show a generic modal
   * @param {Object} config - Modal configuration
   * @param {string} config.title - Modal title (optional)
   * @param {React.ReactNode} config.content - Modal content
   * @param {Array} config.actions - Array of action button configs
   * @param {boolean} config.showCloseButton - Whether to show X close button
   * @param {string} config.size - Modal size
   * @param {boolean} config.closeOnBackdrop - Whether clicking backdrop closes modal
   * @returns {Promise} - Promise that resolves with the action result
   */
  const showModal = (config) => {
    return new Promise((resolve) => {
      const id = Date.now() + Math.random();
      const modal = {
        id,
        ...config,
        resolve,
        show: true
      };
      
      setModals(prev => [...prev, modal]);
    });
  };

  /**
   * Show a confirmation modal with standard OK/Cancel buttons
   * @param {Object} config - Confirmation configuration
   * @param {string} config.title - Modal title (optional)
   * @param {string|React.ReactNode} config.message - Confirmation message
   * @param {string} config.confirmText - Confirm button text (default: "OK")
   * @param {string} config.cancelText - Cancel button text (default: "Cancel")
   * @param {string} config.confirmVariant - Confirm button variant (default: "primary")
   * @param {boolean} config.showCancel - Whether to show cancel button (default: true)
   * @param {string} config.size - Modal size (default: "md")
   * @returns {Promise<boolean>} - Promise that resolves with true if confirmed, false if cancelled
   */
  const showConfirmation = ({
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    confirmVariant = 'primary',
    showCancel = true,
    size = 'md'
  }) => {
    const actions = [];
    
    if (showCancel) {
      actions.push({
        text: cancelText,
        variant: 'secondary',
        onClick: () => closeModal(null, false)
      });
    }
    
    actions.push({
      text: confirmText,
      variant: confirmVariant,
      onClick: () => closeModal(null, true)
    });

    return showModal({
      title,
      content: typeof message === 'string' ? <p className="text-gray-700">{message}</p> : message,
      actions,
      size,
      showCloseButton: showCancel,
      closeOnBackdrop: showCancel
    });
  };

  /**
   * Show an alert modal with only an OK button
   * @param {Object} config - Alert configuration
   * @param {string} config.title - Modal title (optional)
   * @param {string|React.ReactNode} config.message - Alert message
   * @param {string} config.buttonText - Button text (default: "OK")
   * @param {string} config.variant - Button variant (default: "primary")
   * @param {string} config.size - Modal size (default: "md")
   * @returns {Promise<boolean>} - Promise that resolves when dismissed
   */
  const showAlert = ({
    title,
    message,
    buttonText = 'OK',
    variant = 'primary',
    size = 'md'
  }) => {
    return showModal({
      title,
      content: typeof message === 'string' ? <p className="text-gray-700">{message}</p> : message,
      actions: [{
        text: buttonText,
        variant,
        onClick: () => closeModal(null, true)
      }],
      size,
      showCloseButton: false,
      closeOnBackdrop: false
    });
  };

  /**
   * Close a specific modal by ID
   * @param {number} id - Modal ID to close (null for current modal)
   * @param {any} result - Result to resolve the promise with
   */
  const closeModal = (id = null, result = null) => {
    setModals(prev => {
      const modalToClose = id !== null 
        ? prev.find(modal => modal.id === id)
        : prev[prev.length - 1]; // Close latest modal if no ID specified
      
      if (modalToClose && modalToClose.resolve) {
        modalToClose.resolve(result);
      }
      
      return id !== null 
        ? prev.filter(modal => modal.id !== id)
        : prev.slice(0, -1);
    });
  };

  /**
   * Close all modals
   */
  const closeAllModals = () => {
    modals.forEach(modal => {
      if (modal.resolve) {
        modal.resolve(null);
      }
    });
    setModals([]);
  };

  const value = {
    modals,
    showModal,
    showConfirmation,
    showAlert,
    closeModal,
    closeAllModals
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

/**
 * Hook to use the global modal system
 * @returns {Object} - Modal control methods and state
 */
export const useModal = () => {
  const context = useContext(ModalContext);
  
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  
  return context;
};

export default ModalContext;