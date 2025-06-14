import React from 'react';

const ComingSoonContent = ({ feature = "this feature" }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
      <div className="text-[#994d51] mb-4">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="48px" 
          height="48px" 
          fill="currentColor" 
          viewBox="0 0 256 256"
          aria-hidden="true"
        >
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"></path>
        </svg>
      </div>
      <h3 className="text-[#1b0e0e] text-lg font-bold leading-tight mb-2">
        Coming Soon
      </h3>
      <p className="text-[#994d51] text-sm font-normal leading-normal max-w-sm">
        We're currently working on {feature}. This feature will be available soon!
      </p>
    </div>
  );
};

export default ComingSoonContent;