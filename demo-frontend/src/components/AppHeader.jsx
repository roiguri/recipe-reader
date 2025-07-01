import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button.jsx';
import FlagLanguageSelector from './ui/FlagLanguageSelector.jsx';
import AuthButton from './auth/AuthButton.jsx';

const AppHeader = ({ currentView, onNavigateToMyRecipes, onNavigateHome }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { isAuthenticated } = useAuth();
  
  return (
    <header className={`flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f3e7e8] px-4 md:px-10 py-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <div className={`flex items-center gap-4 text-[#1b0e0e] ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button 
          onClick={onNavigateHome}
          className="flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="size-4">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                fill="currentColor"
              ></path>
            </svg>
          </div>
          <h2 className="text-[#1b0e0e] text-lg font-bold leading-tight tracking-[-0.015em]">Recipe Box</h2>
        </button>
        <FlagLanguageSelector />
      </div>
      <div className={`flex flex-1 justify-end gap-4 md:gap-8 ${isRTL ? 'flex-row-reverse justify-start' : ''}`}>
        <div className={`hidden md:flex items-center gap-6 lg:gap-9 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {isAuthenticated && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onNavigateToMyRecipes}
              className={currentView === 'my-recipes' ? 'text-[#994d51] font-semibold' : ''}
            >
              {t('appHeader.myRecipes')}
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onNavigateHome}
            className={currentView === 'home' ? 'text-[#994d51] font-semibold' : ''}
          >
            {t('appHeader.home')}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <AuthButton onNavigateToMyRecipes={onNavigateToMyRecipes} />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;