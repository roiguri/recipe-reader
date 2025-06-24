import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew } from '../../utils/formatters';
import Card from '../ui/Card';
import CopyButton from '../ui/CopyButton';

/**
 * CommentsSection component displays recipe comments/notes
 * @param {Object} props - Component props
 * @param {string} props.comments - Recipe comments string
 * @param {Function} props.onCopyToClipboard - Function to copy text to clipboard
 * @param {string|null} props.copiedSection - Currently copied section ID
 */
const CommentsSection = ({ comments, onCopyToClipboard, copiedSection }) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  
  if (!comments || comments.trim() === '') return null;
  
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-[#1b0e0e]">{t('resultDisplay.metadata.comments')}</h3>
        <CopyButton
          content={comments}
          sectionId="comments"
          copiedSection={copiedSection}
          onCopy={onCopyToClipboard}
          title={t('resultDisplay.copy.comments')}
        />
      </div>
      <div className="text-sm text-[#1b0e0e]" style={{ direction: isHebrew(comments) ? 'rtl' : 'ltr' }}>
        {comments.split('\n').map((line, index) => (
          <p key={index} className={index > 0 ? 'mt-2' : ''}>
            {line}
          </p>
        ))}
      </div>
    </Card>
  );
};

export default CommentsSection;