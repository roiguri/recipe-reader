import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Card configuration factory that takes translation function
export const getCardConfigs = (t) => ({
  text: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M170.48,115.7A44,44,0,0,0,140,40H72a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8h80a48,48,0,0,0,18.48-92.3ZM80,56h60a28,28,0,0,1,0,56H80Zm72,136H80V128h72a32,32,0,0,1,0,64Z"></path>
      </svg>
    ),
    title: t('textProcessor.title'),
    description: t('textProcessor.description'),
    inputType: "textarea",
    placeholder: t('textProcessor.placeholder'),
    buttonText: t('textProcessor.buttons.process'),
    isComingSoon: false
  },
  url: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M137.54,186.36a8,8,0,0,1,0,11.31l-9.94,10A56,56,0,0,1,48.38,128.4L72.5,104.28A56,56,0,0,1,149.31,102a8,8,0,1,1-10.64,12,40,40,0,0,0-54.85,1.63L59.7,139.72a40,40,0,0,0,56.58,56.58l9.94-9.94A8,8,0,0,1,137.54,186.36Zm70.08-138a56.08,56.08,0,0,0-79.22,0l-9.94,9.95a8,8,0,0,0,11.32,11.31l9.94-9.94a40,40,0,0,1,56.58,56.58L172.18,140.4A40,40,0,0,1,117.33,142A8,8,0,1,0,106.69,154a56,56,0,0,0,76.81-2.26l24.12-24.12A56.08,56.08,0,0,0,207.62,48.38Z"></path>
      </svg>
    ),
    title: t('urlProcessor.title'),
    description: t('urlProcessor.description'),
    inputType: "url",
    placeholder: t('urlProcessor.placeholder'),
    buttonText: t('urlProcessor.buttons.extract'),
    isComingSoon: false
  },
  image: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"></path>
      </svg>
    ),
    title: t('imageProcessor.title'),
    description: t('imageProcessor.description'),
    inputType: "file",
    buttonText: t('imageProcessor.buttons.processImages'),
    isComingSoon: false
  },
  video: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24px" 
        height="24px" fill="currentColor" viewBox="0 0 256 256" 
        aria-hidden="true">
          <path d="M251.77,73a8,8,0,0,0-8.21.39L208,97.05V72a16,16,0,0,
        0-16-16H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H192a16,16,0,
        0,0,16-16V159l35.56,23.71A8,8,0,0,0,248,184a8,8,0,0,0,8-8V80A8,
        8,0,0,0,251.77,73ZM192,184H32V72H192V184Zm48-22.95L208,140.95v2
        5.9L240,187Z"></path>
      </svg>
    ),
    title: t('videoProcessor.title', 'Process video'),
    description: t('videoProcessor.description', 'Extract recipe from video'),
    inputType: "video",
    isComingSoon: true
  }
});

// Custom hook that memoizes card configurations based on translation changes
export const useCardConfigs = () => {
  const { t } = useTranslation();
  
  return useMemo(() => getCardConfigs(t), [t]);
};

