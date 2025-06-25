import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const OptionCard = ({ icon, title, description, onClick, layoutId }) => {
  const { t } = useTranslation();
  
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div 
      layoutId={layoutId}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={t('aria.optionCard', { title, description })}
      className="flex flex-1 gap-3 rounded-lg border border-[#e7d0d1] bg-[#fcf8f8] p-4 flex-col cursor-pointer min-h-[140px] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#994d51] focus-visible:ring-offset-2"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="text-[#1b0e0e] flex-shrink-0" aria-hidden="true">
        {icon}
      </div>
      <div className="flex flex-col gap-1 flex-grow">
        <h3 className="text-[#1b0e0e] text-base font-bold leading-tight break-words">{title}</h3>
        <p className="text-[#994d51] text-sm font-normal leading-normal break-words">{description}</p>
      </div>
    </motion.div>
  );
};

export default OptionCard;