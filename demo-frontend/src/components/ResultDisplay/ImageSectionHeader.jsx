import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { isHebrew } from '../../utils/formatters';

const ImageSectionHeader = memo(({ hasChanges = false }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900" style={{ direction: isHebrew(t('resultDisplay.edit.images.title')) ? 'rtl' : 'ltr' }}>
        {t('resultDisplay.edit.images.title')}
      </h3>
      {hasChanges && (
        <span className="text-xs text-[#994d51] font-medium">
          {t('resultDisplay.edit.unsavedChanges')}
        </span>
      )}
    </div>
  );
});

ImageSectionHeader.displayName = 'ImageSectionHeader';

export default ImageSectionHeader;