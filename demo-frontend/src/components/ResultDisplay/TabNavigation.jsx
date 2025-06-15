import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from '../ui/Button';

/**
 * TabNavigation component for switching between result tabs
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab ID
 * @param {Function} props.setActiveTab - Function to change the active tab
 * @param {Array} props.tabs - Array of tab definitions with id, label and icon
 */
const TabNavigation = ({ activeTab, setActiveTab, tabs }) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  
  return (
    <div className="flex border-b border-[#f3e7e8] flex-shrink-0" role="tablist">
      {tabs.map((tab, index, array) => {
        const getTabVariant = () => {
          if (array.length === 1) return 'tab'; // Single tab, use default
          
          // For RTL, swap left and right positioning
          if (direction === 'rtl') {
            if (index === 0) return 'tab-right'; // First tab in RTL gets right border
            if (index === array.length - 1) return 'tab-left'; // Last tab in RTL gets left border
          } else {
            if (index === 0) return 'tab-left'; // First tab in LTR gets left border
            if (index === array.length - 1) return 'tab-right'; // Last tab in LTR gets right border
          }
          
          return 'tab-inner'; // Middle tabs
        };

        return (
          <Button
            key={tab.id}
            variant={getTabVariant()}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id
              ? 'bg-[#994d51] text-white'
              : 'text-[#994d51] hover:bg-[#f3e7e8]'
            }
            leftIcon={<span>{tab.icon}</span>}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {t(`resultDisplay.tabs.${tab.id}`)}
          </Button>
        );
      })}
    </div>
  );
};

export default TabNavigation; 