import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ANIMATION_CONFIG } from '../utils/animationConfig';
import OptionsGrid from './OptionsGrid';

const ExpandableCardGrid = ({ 
  items, 
  onCardClick, 
  expandedCard, 
  showBackButton = true,
  onBackClick,
  gridClassName = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4"
}) => {
  
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    }
  };

  return (
    <div className="relative">
      {/* Back Button */}
      {showBackButton && (
        <AnimatePresence>
          {expandedCard && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ 
                duration: ANIMATION_CONFIG.CONTENT_FADE_IN / 1000, 
                ease: ANIMATION_CONFIG.CONTENT_EASE 
              }}
              onClick={handleBackClick}
              className="absolute -top-16 right-0 text-[#994d51] text-sm font-medium leading-normal bg-transparent border-none cursor-pointer hover:text-[#1b0e0e] transition-colors duration-200 flex items-center gap-2 z-60"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16px" 
                height="16px" 
                fill="currentColor" 
                viewBox="0 0 256 256"
              >
                <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
              </svg>
              Back to options
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* Grid Container */}
      <div className={gridClassName}>
        <OptionsGrid
          cardItems={items}
          expandedCard={expandedCard}
          onCardClick={onCardClick}
        />
      </div>
    </div>
  );
};

export default ExpandableCardGrid;