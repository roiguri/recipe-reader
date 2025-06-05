import React from 'react';
import OptionCard from './OptionCard';

function App() {
  const handleCardClick = (cardType) => {
    console.log(`${cardType} card clicked`);
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#fcf8f8]" style={{fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif'}}>
      <div className="layout-container flex h-full grow flex-col">
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
        <div className="px-4 sm:px-8 md:px-20 lg:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-[#1b0e0e] tracking-light text-2xl md:text-[32px] font-bold leading-tight min-w-0">Add a new recipe</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
              <OptionCard
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
                  </svg>
                }
                title="Fill out a form"
                description="Add a recipe by filling out a form"
                onClick={() => handleCardClick('form')}
              />
              <OptionCard
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M170.48,115.7A44,44,0,0,0,140,40H72a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8h80a48,48,0,0,0,18.48-92.3ZM80,56h60a28,28,0,0,1,0,56H80Zm72,136H80V128h72a32,32,0,0,1,0,64Z"></path>
                  </svg>
                }
                title="Enter text"
                description="Add a recipe by entering text"
                onClick={() => handleCardClick('text')}
              />
              <OptionCard
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M137.54,186.36a8,8,0,0,1,0,11.31l-9.94,10A56,56,0,0,1,48.38,128.4L72.5,104.28A56,56,0,0,1,149.31,102a8,8,0,1,1-10.64,12,40,40,0,0,0-54.85,1.63L59.7,139.72a40,40,0,0,0,56.58,56.58l9.94-9.94A8,8,0,0,1,137.54,186.36Zm70.08-138a56.08,56.08,0,0,0-79.22,0l-9.94,9.95a8,8,0,0,0,11.32,11.31l9.94-9.94a40,40,0,0,1,56.58,56.58L172.18,140.4A40,40,0,0,1,117.33,142,8,8,0,1,0,106.69,154a56,56,0,0,0,76.81-2.26l24.12-24.12A56.08,56.08,0,0,0,207.62,48.38Z"></path>
                  </svg>
                }
                title="Provide a URL"
                description="Add a recipe by providing a URL"
                onClick={() => handleCardClick('url')}
              />
              <OptionCard
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"></path>
                  </svg>
                }
                title="Upload an image"
                description="Add a recipe by uploading an image"
                onClick={() => handleCardClick('image')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
