import React, { useState, useEffect } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import OptionCard from './OptionCard';

const OptionsGrid = ({ cardItems, expandedCard, onCardClick }) => {
  const [showCards, setShowCards] = useState(true);
  const [showExpandedContent, setShowExpandedContent] = useState(false);

  useEffect(() => {
    if (expandedCard) {
      // Hide cards when expanding
      setShowCards(false);
      // Delay showing expanded content until morph completes
      const timer = setTimeout(() => {
        setShowExpandedContent(true);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      // When returning, hide expanded content immediately
      setShowExpandedContent(false);
      // Then delay showing cards until container is back
      const timer = setTimeout(() => {
        setShowCards(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [expandedCard]);

  return (
    <>
      {cardItems.map((item) => {
        const isExpanded = expandedCard === item.id;
        
        return (
          <LayoutGroup key={item.id}>
            {isExpanded ? (
              <motion.div
                layoutId={item.id}
                className="absolute inset-0 bg-[#fcf8f8] rounded-lg border border-[#e7d0d1] p-6 min-h-[300px] z-50"
              >
                {/* Header with blur effect */}
                <motion.div
                  className="flex items-center gap-3 mb-6"
                  animate={{
                    filter: showExpandedContent ? "blur(0px)" : "blur(4px)",
                    opacity: showExpandedContent ? 1 : 0.7
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="text-[#1b0e0e]">
                    {item.preview.icon}
                  </div>
                  <h2 className="text-[#1b0e0e] text-lg font-bold">
                    {item.preview.title}
                  </h2>
                </motion.div>

                {/* Content area with blur effect */}
                <motion.div
                  className="flex-1"
                  animate={{
                    filter: showExpandedContent ? "blur(0px)" : "blur(4px)",
                    opacity: showExpandedContent ? 1 : 0.7
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {item.expanded}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key={`card-${item.id}`}
                animate={{
                  opacity: showCards ? 1 : 0,
                  scale: showCards ? 1 : 0.95,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <OptionCard
                  icon={item.preview.icon}
                  title={item.preview.title}
                  description={item.preview.description}
                  onClick={() => onCardClick(item.id)}
                  layoutId={item.id}
                />
              </motion.div>
            )}
          </LayoutGroup>
        );
      })}
    </>
  );
};

export default OptionsGrid;