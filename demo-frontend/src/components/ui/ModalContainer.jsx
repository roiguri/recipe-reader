import React from 'react';
import Modal from './Modal';

/**
 * Container component that renders all active modals
 * @param {Object} props - Component props
 * @param {Array} props.modals - Array of modal configurations
 * @param {function} props.onCloseModal - Callback to close a modal
 */
const ModalContainer = ({ modals, onCloseModal }) => {
  if (!modals || modals.length === 0) {
    return null;
  }

  return (
    <>
      {modals.map((modal) => (
        <Modal
          key={modal.id}
          show={modal.show}
          title={modal.title}
          size={modal.size}
          showCloseButton={modal.showCloseButton}
          closeOnBackdrop={modal.closeOnBackdrop}
          actions={modal.actions}
          onClose={() => onCloseModal(modal.id, null)}
        >
          {modal.content}
        </Modal>
      ))}
    </>
  );
};

export default ModalContainer;