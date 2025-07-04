import React, { useState, useEffect } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import OptionCard from './OptionCard.jsx';

const OptionsGrid = ({ cardItems, expandedCard, onCardClick }) => {
  const { t } = useTranslation();
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
    <LayoutGroup>
      {cardItems.map((item) => {
        const isExpanded = expandedCard === item.id;
        
        return (
          <React.Fragment key={item.id}>
            {isExpanded ? (
              <motion.div
                layoutId={item.id}
                className="absolute inset-x-0 top-0 z-50 p-2 md:p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`expanded-title-${item.id}`}
              >
                <div className="bg-[#fcf8f8] rounded-lg border border-[#e7d0d1] p-3 md:p-6 min-h-0">
                  {/* Header with blur effect */}
                  <motion.div
                    className="flex items-center gap-3 mb-3 md:mb-6"
                    animate={{
                      filter: showExpandedContent ? "blur(0px)" : "blur(4px)",
                      opacity: showExpandedContent ? 1 : 0.7
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="text-[#1b0e0e] flex-shrink-0" aria-hidden="true">
                      {item.preview.icon}
                    </div>
                    <h2 
                      id={`expanded-title-${item.id}`}
                      className="text-[#1b0e0e] text-base md:text-lg lg:text-xl font-bold break-words"
                    >
                      {item.preview.title}
                    </h2>
                  </motion.div>

                  {/* Content area with blur effect */}
                  <motion.div
                    className="w-full min-h-0"
                    animate={{
                      filter: showExpandedContent ? "blur(0px)" : "blur(4px)",
                      opacity: showExpandedContent ? 1 : 0.7
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {item.expanded || (
                      <div className="text-[#994d51] text-center py-8">
                        {t('optionsGrid.noContent')}
                      </div>
                    )}
                  </motion.div>
                </div>
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
          </React.Fragment>
        );
      })}
    </LayoutGroup>
  );
};

export default OptionsGrid;