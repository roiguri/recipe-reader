import React from 'react';
import Button from './ui/Button.jsx';

const AppHeader = () => {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f3e7e8] px-4 md:px-10 py-3">
      <div className="flex items-center gap-4 text-[#1b0e0e]">
        <div className="size-4">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
          <Button variant="ghost" size="sm">Home</Button>
          <Button variant="ghost" size="sm">My Recipes</Button>
        </div>
        <div className="flex items-center gap-2">
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