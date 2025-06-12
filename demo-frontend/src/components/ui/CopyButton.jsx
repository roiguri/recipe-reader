import React from 'react';
import Button from './Button';

/**
 * A reusable button component for copying content to clipboard
 * @param {Object} props
 * @param {string} props.content - The content to copy
 * @param {string} props.sectionId - Unique identifier for the section being copied
 * @param {string} props.copiedSection - The section ID that was last copied
 * @param {Function} props.onCopy - Function to handle the copy action
 * @param {string} [props.title] - Optional tooltip text
 * @param {string} [props.className] - Optional additional classes
 */
const CopyButton = ({ 
  content, 
  sectionId, 
  copiedSection, 
  onCopy, 
  title = 'Copy to clipboard',
  className = ''
}) => {
  return (
    <Button
      variant="icon"
      onClick={() => onCopy(content, sectionId)}
      title={title}
      className={className}
    >
      {copiedSection === sectionId ? (
        <span className="text-green-600 text-sm">✓ Copied!</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
          <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path>
        </svg>
      )}
    </Button>
  );
};

export default CopyButton; 