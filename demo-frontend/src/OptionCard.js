import React from 'react';

const OptionCard = ({ icon, title, description, onClick }) => {
  return (
    <div 
      className="flex flex-1 gap-3 rounded-lg border border-[#e7d0d1] bg-[#fcf8f8] p-4 flex-col cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={onClick}
    >
      <div className="text-[#1b0e0e]">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-[#1b0e0e] text-base font-bold leading-tight">{title}</h2>
        <p className="text-[#994d51] text-sm font-normal leading-normal">{description}</p>
      </div>
    </div>
  );
};

export default OptionCard; 