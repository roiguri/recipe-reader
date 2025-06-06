import React from 'react';

const AppHeader = () => {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f3e7e8] px-4 md:px-10 py-3">
      <div className="flex items-center gap-4 text-[#1b0e0e]">
        <div className="size-4">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <h2 className="text-[#1b0e0e] text-lg font-bold leading-tight tracking-[-0.015em]">Recipe Box</h2>
      </div>
      <div className="flex flex-1 justify-end gap-4 md:gap-8">
        <div className="hidden md:flex items-center gap-6 lg:gap-9">
          <button className="text-[#1b0e0e] text-sm font-medium leading-normal bg-transparent border-none cursor-pointer">Home</button>
          <button className="text-[#1b0e0e] text-sm font-medium leading-normal bg-transparent border-none cursor-pointer">My Recipes</button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-[#f3e7e8] text-[#1b0e0e] gap-2 text-sm font-bold leading-normal tracking-[0.015em] px-2.5"
          >
            <div className="text-[#1b0e0e]">
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
              </svg>
            </div>
          </button>
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
            style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBbIfpMWhSd6CAkVr95L_T5GX26-ggLnottehurep1nJWHnRlOz7U2JGvphPY_5LcBAbPh3FWicsu2lfTncM1CRqn5Jo4BAEmR1vc9ZqNds6QI4QdqLRjMedD6KIFgYgSUFiJIm2ydNYgvq0R0haXVPBTirTs5P9lY7XtID6qhwzSiAL-bmqs7cR5DbRI8OF_zTSULaKvDSwnRfsxu3Xgi7mCptQFhrSEIISTMFyO6m0haZpT1zKX5Zy-Bat9jpG2legIJ6m-Klmmj3")'}}
          ></div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;