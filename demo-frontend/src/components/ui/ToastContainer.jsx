import React from 'react';
import Toast from './Toast';

/**
 * Container component for managing multiple toast notifications
 * @param {Object} props - Component props
 * @param {Array} props.toasts - Array of toast objects
 * @param {function} props.onRemoveToast - Callback to remove a toast
 */
const ToastContainer = ({ toasts = [], onRemoveToast }) => {
  // Group toasts by position for better organization
  const toastsByPosition = toasts.reduce((acc, toast) => {
    const position = toast.position || 'top-right';
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(toast);
    return acc;
  }, {});

  return (
    <>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div key={position} className="toast-position-container">
          {positionToasts.map((toast) => (
            <Toast
              key={toast.id}
              show={toast.show}
              message={toast.message}
              type={toast.type}
              duration={0}
              position={position}
              onClose={() => onRemoveToast(toast.id)}
            />
          ))}
        </div>
      ))}
    </>
  );
};

export default ToastContainer;