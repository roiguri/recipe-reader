import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

const LanguageToggle = ({ className = '' }) => {
  const { currentLanguage, toggleLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();

  const languages = {
    en: { code: 'en', label: 'EN', name: 'English' },
    he: { code: 'he', label: 'עב', name: 'עברית' }
  };

  const currentLang = languages[currentLanguage];
  const nextLang = languages[currentLanguage === 'en' ? 'he' : 'en'];

  return (
    <motion.button
      onClick={toggleLanguage}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        bg-white/50 hover:bg-white/70 
        border border-[#e7d3d4] hover:border-[#d4b5b7]
        text-[#1b0e0e] text-sm font-medium
        transition-all duration-200
        ${isRTL ? 'flex-row-reverse' : 'flex-row'}
        ${className}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={t('language.switchTo', { language: nextLang.name })}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs opacity-70">
          {isRTL ? '←' : '→'}
        </span>
        <span className="font-bold">
          {nextLang.label}
        </span>
      </div>
      <div className="w-px h-4 bg-[#e7d3d4]" />
      <span className="font-bold">
        {currentLang.label}
      </span>
    </motion.button>
  );
};

export default LanguageToggle;