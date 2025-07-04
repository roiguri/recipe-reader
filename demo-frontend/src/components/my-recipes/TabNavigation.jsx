import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * TabNavigation component for switching between saved and history tabs
 */
const TabNavigation = ({ activeTab, setActiveTab, savedCount, historyCount }) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <div className="flex border-b border-[#e7d0d1]">
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'saved'
              ? 'text-[#994d51] border-b-2 border-[#994d51]'
              : 'text-[#4b2c2c] hover:text-[#994d51]'
          }`}
        >
          {t('myRecipes.tabs.saved')} ({savedCount})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-[#994d51] border-b-2 border-[#994d51]'
              : 'text-[#4b2c2c] hover:text-[#994d51]'
          }`}
        >
          {t('myRecipes.tabs.history')} ({historyCount})
        </button>
      </div>
    </div>
  );
};

export default TabNavigation;