import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ANIMATION_CONFIG } from '../../utils/animationConfig';

/**
 * RecipeSection component - Container for recipe sections with title and actions
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {number} props.count - Number of items in section
 * @param {React.ReactNode} props.children - Section content
 * @param {React.ReactNode} props.actions - Action buttons/components (optional)
 * @param {React.ReactNode} props.emptyState - Empty state content (optional)
 * @param {boolean} props.loading - Loading state
 * @param {string} props.className - Additional CSS classes
 */
const RecipeSection = ({ 
  title, 
  count = 0, 
  children, 
  actions = null, 
  emptyState = null, 
  loading = false,
  className = ""
}) => {
  const { t } = useTranslation();

  // Loading state
  if (loading) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ANIMATION_CONFIG.DEFAULT}
        className={`w-full ${className}`}
      >
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
          <div className="flex items-center gap-3 text-[#4b2c2c]">
            <div className="w-6 h-6 border-2 border-[#994d51] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg">{t('common.loading')}</span>
          </div>
        </div>
      </motion.section>
    );
  }

  // Empty state
  if (count === 0 && emptyState) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ANIMATION_CONFIG.DEFAULT}
        className={`w-full ${className}`}
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1b0e0e]">
              {title}
            </h2>
            <p className="text-[#4b2c2c] text-sm mt-1">
              {t('myRecipes.subtitle', { count })}
            </p>
          </div>
          {actions && (
            <div className="flex gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
          {emptyState}
        </div>
      </motion.section>
    );
  }

  // Content state
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION_CONFIG.DEFAULT}
      className={`w-full ${className}`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#1b0e0e]">
            {title}
          </h2>
          <p className="text-[#4b2c2c] text-sm mt-1">
            {t('myRecipes.subtitle', { count })}
          </p>
        </div>
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Section Content */}
      <div className="w-full">
        {children}
      </div>
    </motion.section>
  );
};

export default RecipeSection;