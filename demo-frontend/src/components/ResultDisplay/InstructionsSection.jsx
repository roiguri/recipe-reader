import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew, formatInstructions } from '../../utils/formatters';
import Card from '../ui/Card';
import CopyButton from '../ui/CopyButton';

/**
 * InstructionsSection component displays recipe instructions
 * @param {Object} props - Component props
 * @param {Array} props.instructions - Array of instruction strings
 * @param {Array} [props.stages] - Array of instruction stages (optional)
 * @param {Function} props.onCopyToClipboard - Function to copy text to clipboard
 * @param {string|null} props.copiedSection - Currently copied section ID
 */
const InstructionsSection = ({ instructions, stages, onCopyToClipboard, copiedSection }) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-2 md:mb-4 flex-shrink-0">
        <h3 className="text-base md:text-lg font-bold text-[#1b0e0e]">{t('resultDisplay.sections.instructions')}</h3>
        <CopyButton
          content={formatInstructions(instructions, stages)}
          sectionId="instructions"
          copiedSection={copiedSection}
          onCopy={onCopyToClipboard}
          title={t('resultDisplay.copy.instructions')}
        />
      </div>
      <div className="overflow-y-auto max-h-96">
        {stages ? (
          <div className="space-y-2 md:space-y-4">
            {stages.map((stage, stageIdx) => (
              <div key={stageIdx}>
                <h4 className="text-sm md:text-base font-semibold text-[#994d51] mb-1 md:mb-2" style={{ direction: isHebrew(stage.title) ? 'rtl' : 'ltr' }}>
                  {stage.title}
                </h4>
                <ol className="space-y-2">
                  {(stage.instructions || []).map((instruction, instIdx) => (
                    <li key={instIdx} className="flex items-start">
                      <span className={`flex-shrink-0 w-6 h-6 bg-[#994d51] text-white rounded-full text-xs flex items-center justify-center ${direction === 'rtl' ? 'ml-3' : 'mr-3'} mt-0.5`} aria-hidden="true">
                        {instIdx + 1}
                      </span>
                      <span className="text-xs md:text-sm text-[#1b0e0e] flex-1" style={{ direction: isHebrew(instruction) ? 'rtl' : 'ltr' }}>
                        {instruction}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <ol className="space-y-3">
            {(instructions || []).map((instruction, idx) => (
              <li key={idx} className="flex items-start">
                <span className={`flex-shrink-0 w-6 h-6 bg-[#994d51] text-white rounded-full text-xs flex items-center justify-center ${direction === 'rtl' ? 'ml-3' : 'mr-3'} mt-0.5`}>
                  {idx + 1}
                </span>
                <span className="text-sm text-[#1b0e0e] flex-1" style={{ direction: isHebrew(instruction) ? 'rtl' : 'ltr' }}>
                  {instruction}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
};

export default InstructionsSection; 