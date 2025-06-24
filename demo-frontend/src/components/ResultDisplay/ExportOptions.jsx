import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew, formatTime, generatePdfFilename, detectBrowserPrintCapabilities } from '../../utils/formatters';
import Card from '../ui/Card';

/**
 * ExportOptions component displays PDF export interface with preview
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data object
 */
const ExportOptions = ({ recipe }) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  
  const browserInfo = detectBrowserPrintCapabilities();
  
  const getPrintGuidance = () => {
    const { browser, os } = browserInfo;
    
    if (browser.isChrome || browser.isEdge) {
      return {
        level: 'excellent',
        text: t('resultDisplay.export.pdf.guidance.chrome', 'In the print dialog, select "Save as PDF" as destination for best results.')
      };
    } else if (browser.isFirefox) {
      return {
        level: 'good', 
        text: t('resultDisplay.export.pdf.guidance.firefox', 'Use "Print to File" and select PDF format. Some background colors may not print.')
      };
    } else if (browser.isSafari) {
      const macGuidance = os.isMac 
        ? t('resultDisplay.export.pdf.guidance.safari_mac', 'Click "PDF" in the print dialog and select "Save as PDF".')
        : t('resultDisplay.export.pdf.guidance.safari_other', 'Print dialog options may vary. Look for "Save as PDF" option.');
      return {
        level: 'native',
        text: macGuidance
      };
    } else if (browser.isIE) {
      return {
        level: 'limited',
        text: t('resultDisplay.export.pdf.guidance.ie', 'Limited print support. Consider using a modern browser like Chrome or Edge for better results.')
      };
    } else {
      return {
        level: 'unknown',
        text: t('resultDisplay.export.pdf.guidance.unknown', 'Look for "Save as PDF" or "Print to PDF" option in your browser\'s print dialog.')
      };
    }
  };
  
  const printGuidance = getPrintGuidance();

  const extractStylesheets = () => {
    // Extract all CSS from the current page
    let styles = '';
    
    // Get all stylesheets
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const styleSheet = document.styleSheets[i];
        if (styleSheet.cssRules) {
          for (let j = 0; j < styleSheet.cssRules.length; j++) {
            styles += styleSheet.cssRules[j].cssText + '\n';
          }
        }
      } catch (e) {
        // Skip external stylesheets that can't be accessed
      }
    }
    
    return styles;
  };

  const handlePrint = () => {
    setIsExporting(true);
    
    try {
      // Detect browser capabilities for cross-browser compatibility
      const browserInfo = detectBrowserPrintCapabilities();
      
      // Generate PDF filename from recipe name
      const pdfFilename = generatePdfFilename(recipe.name);
      
      // Find the preview content
      const previewElement = document.querySelector('.max-w-4xl.mx-auto.bg-white');
      if (!previewElement) {
        console.error('Preview element not found');
        return;
      }

      // Clone the preview content
      const clonedContent = previewElement.cloneNode(true);
      
      // Remove any no-print elements from cloned content
      const noPrintElements = clonedContent.querySelectorAll('.no-print');
      noPrintElements.forEach(el => el.remove());

      // Get all styles from the current page
      const styles = extractStylesheets();

      // Create print HTML with generated filename as title for PDF suggestion
      const printHTML = `
        <!DOCTYPE html>
        <html lang="${direction === 'rtl' ? 'he' : 'en'}" dir="${direction}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${pdfFilename}</title>
          <style>
            /* Cross-browser @page rules */
            @page {
              margin: 0.5in;
              size: A4;
              /* Browser-specific page settings */
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            /* Base print styles */
            html, body {
              margin: 0;
              padding: 0;
              font-family: "Times New Roman", "Noto Sans Hebrew", serif;
              line-height: 1.4;
              background: white !important;
              color: black;
              /* Cross-browser text rendering */
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
            }
            
            body {
              padding: 20px;
            }
            
            /* Include all existing styles */
            ${styles}
            
            /* Cross-browser print color preservation */
            * {
              -webkit-print-color-adjust: exact !important;
              -moz-print-color-adjust: exact !important;
              -ms-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            /* Browser-specific print fixes */
            ${browserInfo.browser.isFirefox ? `
            /* Firefox-specific fixes */
            body {
              print-color-adjust: exact;
            }
            .bg-\\[\\#fcf8f8\\] {
              background-color: #fcf8f8 !important;
              -moz-appearance: none;
            }
            ` : ''}
            
            ${browserInfo.browser.isSafari ? `
            /* Safari-specific fixes */
            * {
              -webkit-appearance: none;
            }
            body {
              -webkit-print-color-adjust: exact;
            }
            ` : ''}
            
            ${browserInfo.browser.isIE ? `
            /* IE-specific fallbacks */
            body {
              zoom: 1;
              filter: none;
            }
            .flex {
              display: block;
            }
            .grid {
              display: block;
            }
            ` : ''}
            
            /* Ensure white background everywhere */
            html, body, div, section, article {
              background: white !important;
            }
            
            .max-w-4xl {
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            
            /* Cross-browser background color overrides */
            .bg-\\[\\#fcf8f8\\], 
            .bg-gray-50,
            .bg-gray-100 {
              background: white !important;
              background-color: white !important;
            }
            
            /* Cross-browser flexbox fallbacks */
            ${!browserInfo.features.flexboxPrint ? `
            .flex {
              display: block !important;
            }
            .flex > * {
              display: inline-block;
              vertical-align: top;
            }
            ` : ''}
            
            /* Cross-browser grid fallbacks */
            ${!browserInfo.features.gridPrint ? `
            .grid {
              display: block !important;
            }
            .grid-cols-1,
            .grid-cols-2,
            .grid-cols-3,
            .grid-cols-4 {
              display: block !important;
            }
            .grid > * {
              display: block;
              margin-bottom: 0.5rem;
            }
            ` : ''}
            
            /* Force font loading for older browsers */
            ${!browserInfo.features.customFonts ? `
            * {
              font-family: serif !important;
            }
            ` : ''}
          </style>
        </head>
        <body>
          ${clonedContent.outerHTML}
        </body>
        </html>
      `;

      // Create print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.open();
      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };

    } catch (error) {
      console.error('Print failed:', error);
      alert(t('errors.unexpected'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#1b0e0e] mb-2">
          {t('resultDisplay.export.pdf.title')}
        </h2>
        <p className="text-gray-600">
          {t('resultDisplay.export.pdf.description')}
        </p>
      </div>

      {/* Export Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={isExporting}
              className="bg-[#994d51] text-white px-6 py-2 rounded-lg hover:bg-[#7a3c40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('resultDisplay.export.pdf.exporting')}
                </>
              ) : (
                <>
                  🖨️ {t('resultDisplay.export.pdf.button')}
                </>
              )}
            </button>

          </div>

          <div className="text-sm text-gray-500">
            {t('resultDisplay.export.pdf.format')}
          </div>
        </div>
      </Card>

      {/* Browser-specific Print Guidance */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="text-xs text-gray-600">
          💡 {printGuidance.text}
        </div>
      </div>

      {/* PDF Preview */}
      <Card className="p-6 bg-white" style={{ minHeight: '600px' }}>
        <div className="max-w-4xl mx-auto bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Recipe Header */}
            <div className="mb-8 text-center border-b border-gray-200 pb-6">
              <h1 className="text-3xl font-bold text-[#1b0e0e] mb-2" style={{ direction: isHebrew(recipe.name) ? 'rtl' : 'ltr' }}>
                {recipe.name}
              </h1>
              {recipe.category && (
                <p className="text-[#994d51] text-lg font-medium mb-2">
                  {t(`resultDisplay.categories.${recipe.category}`, recipe.category)}
                </p>
              )}
              {recipe.description && (
                <p className="text-gray-600 text-lg" style={{ direction: isHebrew(recipe.description) ? 'rtl' : 'ltr' }}>
                  {recipe.description}
                </p>
              )}
            </div>

            {/* Recipe Metadata */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
              {recipe.difficulty && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">{t('resultDisplay.metadata.difficulty')}</div>
                  <div className="font-semibold text-[#1b0e0e]">{recipe.difficulty}</div>
                </div>
              )}
              {recipe.servings && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">{t('resultDisplay.metadata.servings')}</div>
                  <div className="font-semibold text-[#1b0e0e]">{recipe.servings}</div>
                </div>
              )}
              {recipe.prepTime && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">{t('resultDisplay.metadata.prepTime')}</div>
                  <div className="font-semibold text-[#1b0e0e]">{formatTime(recipe.prepTime, t)}</div>
                </div>
              )}
              {recipe.cookTime && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">{t('resultDisplay.metadata.cookTime')}</div>
                  <div className="font-semibold text-[#1b0e0e]">{formatTime(recipe.cookTime, t)}</div>
                </div>
              )}
            </div>

            {/* Ingredients Section */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#1b0e0e] mb-4 pb-2 border-b border-gray-200">
                  {t('resultDisplay.sections.ingredients')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recipe.ingredients.map((ingredient, idx) => (
                    <div key={idx} className="flex items-center p-2">
                      <span className={`w-2 h-2 bg-[#994d51] rounded-full ${direction === 'rtl' ? 'ml-3' : 'mr-3'} flex-shrink-0`}></span>
                      <span className="text-sm text-[#1b0e0e]" style={{ direction: isHebrew(ingredient.item) ? 'rtl' : 'ltr' }}>
                        <span className="font-medium">{ingredient.amount} {ingredient.unit}</span> {ingredient.item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions Section */}
            {((recipe.instructions && recipe.instructions.length > 0) || (recipe.stages && recipe.stages.length > 0)) && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#1b0e0e] mb-4 pb-2 border-b border-gray-200">
                  {t('resultDisplay.sections.instructions')}
                </h2>
                {recipe.stages ? (
                  <div className="space-y-6">
                    {recipe.stages.map((stage, stageIdx) => (
                      <div key={stageIdx}>
                        <h3 className="text-lg font-semibold text-[#994d51] mb-3" style={{ direction: isHebrew(stage.title) ? 'rtl' : 'ltr' }}>
                          {stage.title}
                        </h3>
                        <div className="space-y-3">
                          {(stage.instructions || []).map((instruction, instIdx) => (
                            <div key={instIdx} className="flex items-start gap-4">
                              <div className="w-8 h-8 bg-[#994d51] text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                {instIdx + 1}
                              </div>
                              <p className="text-[#1b0e0e] leading-relaxed" style={{ direction: isHebrew(instruction) ? 'rtl' : 'ltr' }}>
                                {instruction}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recipe.instructions.map((instruction, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-[#994d51] text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-[#1b0e0e] leading-relaxed" style={{ direction: isHebrew(instruction) ? 'rtl' : 'ltr' }}>
                          {instruction}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tags Section */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-[#1b0e0e] mb-3">{t('resultDisplay.sections.tags')}</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag, idx) => (
                    <span key={idx} className="bg-[#fcf8f8] text-[#994d51] px-3 py-1 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      </Card>
    </div>
  );
};

export default ExportOptions; 