import React from 'react';
import { motion } from 'framer-motion';

const OptionCard = ({ icon, title, description, onClick, isSelected }) => {
  return (
    <motion.div 
      className="flex flex-1 gap-3 rounded-lg border border-[#e7d0d1] bg-[#fcf8f8] p-4 flex-col cursor-pointer min-h-[120px] touch-manipulation"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      <div className="text-[#1b0e0e] flex-shrink-0">
        {icon}
      </div>
      <div className="flex flex-col gap-1 flex-grow">
        <h2 className="text-[#1b0e0e] text-base font-bold leading-tight break-words">{title}</h2>
        <p className="text-[#994d51] text-sm font-normal leading-normal break-words">{description}</p>
      </div>
    </motion.div>
  );
};

export default OptionCard; 