import React, { useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ANIMATION_CONFIG } from '../utils/animationConfig';
import OptionsGrid from './OptionsGrid.jsx';
import Button from './ui/Button.jsx';

const ExpandableCardGrid = ({ 
  items = [],
  onCardClick, 
  expandedCard, 
  showBackButton = true,
  onBackClick,
  enableKeyboardSupport = true,
  gridClassName = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-4"
}) => {
  
  const handleBackClick = useCallback(() => {
    try {
      if (onBackClick && typeof onBackClick === 'function') {
        onBackClick();
      }
    } catch (error) {
      console.error('Error handling back click:', error);
    }
  }, [onBackClick]);

  // Keyboard support for ESC key
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && expandedCard && enableKeyboardSupport) {
      event.preventDefault();
      handleBackClick();
    }
  }, [expandedCard, enableKeyboardSupport, handleBackClick]);

  useEffect(() => {
    if (enableKeyboardSupport) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enableKeyboardSupport]);

  // Validate items array
  if (!Array.isArray(items)) {
    console.error('ExpandableCardGrid: items prop must be an array');
    return null;
  }

  return (
    <div className="relative" style={{ overflow: expandedCard ? 'visible' : 'hidden' }}>
      {/* Back Button */}
      {showBackButton && (
        <AnimatePresence>
          {expandedCard && (
            <Button
              variant="ghost"
              animated
              animationProps={{
                initial: { opacity: 0, x: 20 },
                animate: { opacity: 1, x: 0 },
                exit: { opacity: 0, x: 20 },
                transition: { 
                  duration: ANIMATION_CONFIG.CONTENT_FADE_IN / 1000, 
                  ease: ANIMATION_CONFIG.CONTENT_EASE 
                }
              }}
              onClick={handleBackClick}
              aria-label="Go back to options (Press ESC)"
              className="absolute -top-16 sm:-top-12 right-0 z-60 px-2 py-1"
              leftIcon={
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16px" 
                  height="16px" 
                  fill="currentColor" 
                  viewBox="0 0 256 256"
                  aria-hidden="true"
                >
                  <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
                </svg>
              }
            >
              <span className="hidden sm:inline">Back to options</span>
              <span className="sm:hidden">Back</span>
            </Button>
          )}
        </AnimatePresence>
      )}

      {/* Grid Container */}
      <div className={gridClassName} style={{ overflow: expandedCard ? 'visible' : 'hidden' }}>
        {items.length > 0 ? (
          <OptionsGrid
            cardItems={items}
            expandedCard={expandedCard}
            onCardClick={onCardClick}
          />
        ) : (
          <div className="col-span-full text-center py-8 text-[#994d51]">
            No items available
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandableCardGrid;