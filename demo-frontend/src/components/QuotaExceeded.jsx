import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import Button from './ui/Button';
import { useRateLimit } from '../hooks/useRateLimit';

const QuotaExceeded = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const { requestsUsed, remainingRequests } = useRateLimit();
  const isRTL = i18n.language === 'he';

  const handleContactUs = () => {
    // Get contact email from environment variable with fallback
    const contactEmail = import.meta.env.REACT_APP_CONTACT_EMAIL || 'contact@recipe-api.com';
    const subject = encodeURIComponent('API Access Request');
    const body = encodeURIComponent('Hello, I would like to request API access for recipe processing.');
    
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <Card className="my-6">
      <div className="p-6 text-center">
        {/* Warning Icon */}
        <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <svg 
            className="w-8 h-8 text-orange-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className={`text-xl font-bold text-gray-900 mb-2 leading-relaxed text-center`}>
          {t('quota.exceeded.title')}
        </h3>

        {/* Description */}
        <p className={`text-gray-600 mb-6 max-w-md mx-auto leading-relaxed text-center`}>
          {t('quota.exceeded.description')}
        </p>

        {/* Stats */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600">{requestsUsed}</div>
              <div className="text-sm text-gray-600">{t('quota.exceeded.used')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">{remainingRequests}</div>
              <div className="text-sm text-gray-600">{t('quota.exceeded.remaining')}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex flex-col sm:flex-row gap-3 justify-center`}>
          {onClose && (
            <Button 
              onClick={onClose}
              variant="secondary"
              className="whitespace-nowrap"
            >
              {t('quota.exceeded.close')}
            </Button>
          )}
          
          <Button 
            onClick={handleContactUs}
            variant="primary"
            className="whitespace-nowrap"
          >
            {t('quota.exceeded.contactUs')}
          </Button>
        </div>

        {/* Additional Info */}
        <div className={`mt-6 text-sm text-gray-500 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
          <p>
            {t('quota.exceeded.resetInfo')}
          </p>
          <p className="mt-2">
            {t('quota.exceeded.upgradeInfo')}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default QuotaExceeded;