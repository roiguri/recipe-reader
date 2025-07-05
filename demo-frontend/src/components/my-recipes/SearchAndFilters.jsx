import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * SearchAndFilters component for recipe filtering and search
 */
const SearchAndFilters = ({ 
  searchTerm, 
  setSearchTerm,
  selectedCategory, 
  setSelectedCategory,
  selectedSourceType, 
  setSelectedSourceType,
  sortBy, 
  setSortBy,
  availableCategories,
  translateCategory,
  showSortBy = true // Hide sort control for history tab
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6 p-4 bg-[#fcf8f8] border border-[#e7d0d1] rounded-lg">
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${showSortBy ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-[#1b0e0e] mb-1">
            {t('myRecipes.filterLabels.search')}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('myRecipes.searchPlaceholder')}
            className="w-full px-3 py-2 border border-[#e7d0d1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-[#1b0e0e] mb-1">
            {t('myRecipes.filterLabels.category')}
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-[#e7d0d1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:border-transparent"
          >
            <option value="">{t('myRecipes.filterOptions.allCategories')}</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {translateCategory(category)}
              </option>
            ))}
          </select>
        </div>

        {/* Source Type Filter */}
        <div>
          <label className="block text-sm font-medium text-[#1b0e0e] mb-1">
            {t('myRecipes.filterLabels.source')}
          </label>
          <select
            value={selectedSourceType}
            onChange={(e) => setSelectedSourceType(e.target.value)}
            className="w-full px-3 py-2 border border-[#e7d0d1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:border-transparent"
          >
            <option value="">{t('myRecipes.filterOptions.allSources')}</option>
            <option value="text">{t('myRecipes.sourceType.text')}</option>
            <option value="url">{t('myRecipes.sourceType.url')}</option>
            <option value="image">{t('myRecipes.sourceType.image')}</option>
          </select>
        </div>

        {/* Sort - only show for saved recipes tab */}
        {showSortBy && (
          <div>
            <label className="block text-sm font-medium text-[#1b0e0e] mb-1">
              {t('myRecipes.filterLabels.sortBy')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-[#e7d0d1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:border-transparent"
            >
              <option value="newest">{t('myRecipes.filterOptions.newest')}</option>
              <option value="oldest">{t('myRecipes.filterOptions.oldest')}</option>
              <option value="name">{t('myRecipes.filterOptions.nameAZ')}</option>
              <option value="category">{t('myRecipes.filterOptions.category')}</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchAndFilters;