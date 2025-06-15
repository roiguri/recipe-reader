import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from '../ui/Button';

/**
 * ActionButtons component for text processor form actions
 * @param {Object} props - Component props
 * @param {boolean} props.isLoading - Loading state
 * @param {boolean} props.isTextValid - Whether text is valid for submission
 * @param {boolean} props.hasText - Whether there is any text
 * @param {Function} props.onSubmit - Form submission handler
 * @param {Function} props.onCancel - Cancel handler for loading state
 * @param {Function} props.onClear - Clear text handler
 */
const ActionButtons = ({ 
  isLoading, 
  isTextValid, 
  hasText,
  onSubmit, 
  onCancel, 
  onClear 
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <Button
          variant="cancel"
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          {t('textProcessor.buttons.cancel')}
        </Button>
        <div className={`flex items-center gap-2 text-[#994d51] text-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="animate-spin w-5 h-5 border-2 border-[#994d51] border-t-transparent rounded-full"></div>
          {t('textProcessor.buttons.processing')}
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        type="submit"
        disabled={!isTextValid}
        className="flex-1 sm:flex-none px-8"
        onClick={onSubmit}
      >
        {t('textProcessor.buttons.process')}
      </Button>
      {hasText && (
        <Button
          variant="cancel"
          type="button"
          onClick={onClear}
          className="flex-1 sm:flex-none"
        >
          {t('textProcessor.buttons.clear')}
        </Button>
      )}
    </>
  );
};

export default ActionButtons; 