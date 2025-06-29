import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRateLimit } from '../hooks/useRateLimit';

const QuotaProgress = ({ showLabel = true, size = 'default' }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const {
    requestsUsed,
    requestsLimit,
    isAdmin,
    loading,
    error,
    usagePercentage,
    remainingRequests,
    usageColor
  } = useRateLimit();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse w-24 h-2 bg-gray-200 rounded"></div>
        {showLabel && (
          <span className="text-sm text-gray-500">
            {t('quota.loading')}
          </span>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        {showLabel && (
          <span className="text-sm text-red-600">
            {t('quota.error')}
          </span>
        )}
      </div>
    );
  }

  // Admin users show unlimited status
  if (isAdmin) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          <svg className={`w-4 h-4 text-green-500 ${isRTL ? 'ml-1' : 'mr-1'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {showLabel && (
            <span className="text-sm font-medium text-green-600">
              {t('quota.unlimited')}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Determine size classes
  const sizeClasses = {
    small: 'h-1',
    default: 'h-2',
    large: 'h-3'
  };

  const progressHeight = sizeClasses[size] || sizeClasses.default;

  // Determine color classes
  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  const progressColor = colorClasses[usageColor];

  return (
    <div className="flex flex-col space-y-2">
      {/* Progress Bar and Label */}
      <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
        {/* Progress Bar */}
        <div className="flex-1 min-w-24">
          <div className={`w-full ${progressHeight} bg-gray-200 rounded-full overflow-hidden`}>
            <div
              className={`${progressHeight} ${progressColor} transition-all duration-300 ease-out`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

        {/* Label */}
        {showLabel && (
          <div className={`flex items-center ${isRTL ? 'mr-4' : 'ml-4'}`}>
            <span className="text-sm font-medium text-gray-700">
              {requestsUsed}/{requestsLimit}
            </span>
          </div>
        )}
      </div>

      {/* Quota Exceeded Message */}
      {remainingRequests === 0 && (
        <span className="text-xs text-red-600 font-medium">
          {t('quota.exceededShort')}
        </span>
      )}
    </div>
  );
};

export default QuotaProgress;