import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import ReactCountryFlag from 'react-country-flag';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

const FlagLanguageSelector = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState('left');
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const { currentLanguage, changeLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();

  const currentLang = SUPPORTED_LANGUAGES[currentLanguage];

  // Close dropdown when clicking outside and handle positioning
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position to prevent viewport overflow
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 144; // w-36 = 144px
      const viewportWidth = window.innerWidth;
      
      // Check if dropdown would overflow on the right
      if (buttonRect.left + dropdownWidth > viewportWidth - 20) {
        setDropdownPosition('right');
      } else {
        setDropdownPosition('left');
      }
    }
  }, [isOpen]);

  const handleLanguageSelect = (langCode) => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Current Language Button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/20 transition-all duration-200"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title={t('language.switchTo', { language: Object.values(SUPPORTED_LANGUAGES).find(lang => lang.code !== currentLanguage)?.name })}
      >
        <ReactCountryFlag
          countryCode={currentLang.countryCode}
          svg
          style={{
            width: '1.5em',
            height: '1.5em',
          }}
          title={currentLang.name}
        />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-full mt-2 w-36 bg-white rounded-lg shadow-lg border border-[#e7d3d4] overflow-hidden z-50 ${
              dropdownPosition === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
              <motion.button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[#fcf8f8] transition-colors ${
                  currentLanguage === lang.code ? 'bg-[#f8f0f1] text-[#c8797c]' : 'text-[#1b0e0e]'
                } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                whileHover={{ backgroundColor: '#fcf8f8' }}
                whileTap={{ scale: 0.98 }}
              >
                <ReactCountryFlag
                  countryCode={lang.countryCode}
                  svg
                  style={{
                    width: '1.25em',
                    height: '1.25em',
                  }}
                  title={lang.name}
                />
                <span className="text-sm font-medium">
                  {lang.label}
                </span>
                {currentLanguage === lang.code && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 bg-[#c8797c] rounded-full ml-auto"
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlagLanguageSelector;