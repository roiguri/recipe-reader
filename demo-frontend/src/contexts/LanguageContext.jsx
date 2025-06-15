import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isRTL, getDirection, updateDocumentDirection } from '../i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [direction, setDirection] = useState(getDirection());

  const changeLanguage = async (language) => {
    try {
      await i18n.changeLanguage(language);
      setCurrentLanguage(language);
      setDirection(getDirection());
      updateDocumentDirection();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'en' ? 'he' : 'en';
    changeLanguage(newLanguage);
  };

  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setCurrentLanguage(lng);
      setDirection(getDirection());
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const value = {
    currentLanguage,
    direction,
    isRTL: isRTL(),
    changeLanguage,
    toggleLanguage,
    availableLanguages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'he', name: 'Hebrew', nativeName: 'עברית' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};