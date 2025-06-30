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
    debug: import.meta.env.MODE === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      // Normalize detected languages to supported ones
      convertDetectedLanguage: (lng) => {
        // Extract base language code (e.g., 'en-US' -> 'en')
        const baseLng = lng.split('-')[0];
        return ['en', 'he'].includes(baseLng) ? baseLng : 'en';
      }
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
    nonExplicitSupportedLngs: false
  });

// Function to check if current language is RTL
export const isRTL = () => {
  const rtlLanguages = ['he', 'ar', 'fa', 'ur'];
  const baseLanguage = i18n.language.split('-')[0];
  return rtlLanguages.includes(baseLanguage);
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