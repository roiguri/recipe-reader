import React from 'react';
import Button from '../ui/Button';

/**
 * ActionButtons component for text processor form actions
 * @param {Object} props - Component props
 * @param {boolean} props.isLoading - Loading state
 * @param {boolean} props.isTextValid - Whether text is valid for submission
 * @param {boolean} props.hasText - Whether there is any text
 * @param {Function} props.onSubmit - Form submission handler
 * @param {Function} props.onCancel - Cancel handler for loading state
 * @param {Function} props.onClear - Clear text handler
 */
const ActionButtons = ({ 
  isLoading, 
  isTextValid, 
  hasText,
  onSubmit, 
  onCancel, 
  onClear 
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Button
          variant="cancel"
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          Cancel
        </Button>
        <div className="flex items-center gap-2 text-[#994d51] text-sm">
          <div className="animate-spin w-5 h-5 border-2 border-[#994d51] border-t-transparent rounded-full"></div>
          Processing your recipe...
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        type="submit"
        disabled={!isTextValid}
        className="flex-1 sm:flex-none px-8"
        onClick={onSubmit}
      >
        Extract Recipe
      </Button>
      {hasText && (
        <Button
          variant="cancel"
          type="button"
          onClick={onClear}
          className="flex-1 sm:flex-none"
        >
          Clear Text
        </Button>
      )}
    </>
  );
};

export default ActionButtons; 