import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExpandableCardGrid from './ExpandableCardGrid';
import { ANIMATION_CONFIG } from '../utils/animationConfig';
import Button from './ui/Button';

const MainContent = ({ 
  cardItems, 
  expandedCard, 
  onCardClick, 
  onBackClick 
}) => {
  return (
    <div className="px-4 sm:px-8 md:px-20 lg:px-40 flex flex-1 justify-center py-5">
      <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <p className="text-[#1b0e0e] tracking-light text-2xl md:text-[32px] font-bold leading-tight min-w-0">Add a new recipe</p>
          
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
                onClick={onBackClick}
                aria-label="Go back to options (Press ESC)"
                className="px-2 py-1"
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
        </div>
        
        <ExpandableCardGrid
          items={cardItems}
          expandedCard={expandedCard}
          onCardClick={onCardClick}
          onBackClick={onBackClick}
          showBackButton={false}
        />
      </div>
    </div>
  );
};

export default MainContent;