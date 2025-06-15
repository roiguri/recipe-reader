import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import heTranslations from './locales/he.json';

const resources = {
  en: {
    translation: enTranslations
  },
  he: {
    translation: heTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Configure pluralization
    pluralSeparator: '_',
    contextSeparator: '_',

    // Configure namespace
    defaultNS: 'translation',
    ns: ['translation'],

    // RTL languages
    supportedLngs: ['en', 'he'],
    nonExplicitSupportedLngs: true
  });

// Function to check if current language is RTL
export const isRTL = () => {
  const rtlLanguages = ['he', 'ar', 'fa', 'ur'];
  return rtlLanguages.includes(i18n.language);
};

// Function to get text direction
export const getDirection = () => {
  return isRTL() ? 'rtl' : 'ltr';
};

// Function to update document direction
export const updateDocumentDirection = () => {
  document.documentElement.dir = getDirection();
  document.documentElement.lang = i18n.language;
};

// Listen for language changes and update document direction
i18n.on('languageChanged', updateDocumentDirection);

// Set initial direction
updateDocumentDirection();

export default i18n;