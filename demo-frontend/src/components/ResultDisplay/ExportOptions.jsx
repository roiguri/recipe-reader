import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { isHebrew, formatTime, generatePdfFilename, detectBrowserPrintCapabilities, getTotalTime } from '../../utils/formatters';
import { ImageService } from '../../services/imageService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { useGlobalToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import Card from '../ui/Card';

/**
 * ExportOptions component displays PDF export interface with preview
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data object
 * @param {string} props.recipeId - Recipe ID for image loading
 * @param {boolean} props.hasUnsavedChanges - Whether recipe has unsaved changes
 * @param {function} props.onSaveRecipe - Callback to save recipe
 */
const ExportOptions = ({ recipe, recipeId, hasUnsavedChanges = false, onSaveRecipe }) => {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  const auth = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isSharingCookbook, setIsSharingCookbook] = useState(false);
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Global toast notifications
  const { showSuccess, showError } = useGlobalToast();
  
  // Global modal system
  const { showConfirmation } = useModal();
  
  const totalTime = getTotalTime(recipe);
  
  // Load first image URL for export display
  const loadFirstImage = useCallback(async () => {
    // Check if recipe has images and we have a recipeId
    if (!recipe?.images?.length || !recipeId) {
      setFirstImageUrl(null);
      return;
    }

    setImageLoading(true);
    try {
      // Get current user
      const { data: user, error: userError } = await ImageService.getCurrentUser();
      
      if (userError || !user) {
        setFirstImageUrl(null);
        setImageLoading(false);
        return;
      }

      // Get signed URL for just the first image
      const { data: urls, error: urlError } = await ImageService.getRecipeImageUrls(
        user.id, 
        recipeId, 
        [recipe.images[0]]  // Only load first image
      );

      if (!urlError && urls?.length === 1) {
        setFirstImageUrl(urls[0].url);
      } else {
        setFirstImageUrl(null);
      }
    } catch (err) {
      console.error('Error loading first image for export:', err);
      setFirstImageUrl(null);
    } finally {
      setImageLoading(false);
    }
  }, [recipe?.images, recipeId]);

  // Load first image when component mounts or dependencies change
  useEffect(() => {
    loadFirstImage();
  }, [loadFirstImage]);
  
  // Helper function to get appropriate grid class based on time field count
  const getTimeGridClass = () => {
    const timeFieldsCount = [recipe.prepTime, recipe.cookTime, totalTime].filter(time => time != null).length;
    switch (timeFieldsCount) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      default: return 'grid-cols-1';
    }
  };
  
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
            
            /* Base print styles with web-safe fonts */
            html, body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
            
            /* Critical Tailwind CSS Grid and Layout Utilities */
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .gap-4 { gap: 1rem; }
            .gap-2 { gap: 0.5rem; }
            
            /* Responsive grid for print media */
            @media print {
              .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .md\\:col-span-2 { grid-column: span 2 / span 2; }
              .md\\:col-span-3 { grid-column: span 3 / span 3; }
            }
            
            /* Essential Tailwind utilities */
            .flex { display: flex; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            .text-center { text-align: center; }
            .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
            .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
            .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem; }
            
            /* Typography */
            .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
            .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .leading-relaxed { line-height: 1.625; }
            
            /* Spacing */
            .mb-8 { margin-bottom: 2rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .pb-6 { padding-bottom: 1.5rem; }
            .pb-2 { padding-bottom: 0.5rem; }
            .pt-6 { padding-top: 1.5rem; }
            .pt-4 { padding-top: 1rem; }
            .p-2 { padding: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            
            /* Layout */
            .max-w-4xl { max-width: 56rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .w-8 { width: 2rem; }
            .h-8 { height: 2rem; }
            .w-6 { width: 1.5rem; }
            .h-6 { height: 1.5rem; }
            .w-2 { width: 0.5rem; }
            .h-2 { height: 0.5rem; }
            .flex-shrink-0 { flex-shrink: 0; }
            
            /* Borders and background */
            .border-b { border-bottom-width: 1px; }
            .border-t { border-top-width: 1px; }
            .border-gray-200 { border-color: #e5e7eb; }
            .rounded-full { border-radius: 9999px; }
            .rounded-lg { border-radius: 0.5rem; }
            .bg-white { background-color: #fff; }
            
            /* Colors - using safe color values */
            .text-gray-600 { color: #4b5563; }
            .text-gray-500 { color: #6b7280; }
            .bg-\\[\\#994d51\\] { background-color: #994d51; }
            .text-\\[\\#994d51\\] { color: #994d51; }
            .text-\\[\\#1b0e0e\\] { color: #1b0e0e; }
            .bg-\\[\\#fcf8f8\\] { background-color: #fcf8f8; }
            .text-white { color: #fff; }
            
            /* Instruction numbering circles - matching InstructionsSection.jsx size */
            .w-8.h-8.bg-\\[\\#994d51\\].text-white.rounded-full.flex.items-center.justify-center,
            .w-8.h-8.bg-\\[\\#994d51\\],
            .w-6.h-6.bg-\\[\\#994d51\\].text-white.rounded-full.flex.items-center.justify-center,
            .w-6.h-6.bg-\\[\\#994d51\\] {
              width: 1.5rem !important;  /* w-6 size */
              height: 1.5rem !important; /* h-6 size */
              background-color: #994d51 !important;
              color: #fff !important;
              border-radius: 9999px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              font-weight: 600 !important;
              font-size: 0.75rem !important; /* text-xs size */
              flex-shrink: 0 !important;
              text-align: center !important;
              line-height: 1 !important;
            }
            
            /* Ingredient bullet points */
            .w-2.h-2.bg-\\[\\#994d51\\].rounded-full {
              width: 0.5rem !important;
              height: 0.5rem !important;
              background-color: #994d51 !important;
              border-radius: 9999px !important;
              flex-shrink: 0 !important;
            }
            
            /* Include minimal existing styles (fallback) */
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
            
            /* Comments section specific styles */
            .comments-section {
              margin-bottom: 2rem;
              page-break-inside: avoid;
            }
            
            .comments-section h2 {
              font-size: 1.5rem;
              font-weight: 700;
              color: #1b0e0e;
              margin-bottom: 1rem;
              padding-bottom: 0.5rem;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .comments-content {
              color: #1b0e0e;
              line-height: 1.625;
              word-wrap: break-word;
            }
            
            .comments-content p {
              margin: 0;
            }
            
            .comments-content p + p {
              margin-top: 0.5rem;
            }
            
            /* Recipe images section specific styles */
            .print-images-section {
              margin-bottom: 2rem;
              page-break-inside: avoid;
            }
            
            .print-image {
              max-width: 100% !important;
              height: auto !important;
              max-height: 300px !important;
              object-fit: cover !important;
              border-radius: 0.5rem !important;
              border: 1px solid #e5e7eb !important;
              display: block !important;
            }
            
            /* Ensure images work well in print */
            @media print {
              .print-images-section {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              
              .print-image {
                max-height: 250px !important;
                width: auto !important;
                max-width: 100% !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              
              /* Ensure image grid works in print */
              .print-images-section .grid {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 1.5rem !important;
              }
              
              /* Single column layout for smaller prints */
              @page {
                @media (max-width: 600px) {
                  .print-images-section .grid {
                    grid-template-columns: 1fr !important;
                  }
                }
              }
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
            
            /* Improved grid fallbacks - only for very old browsers */
            ${browserInfo.browser.isIE ? `
            /* IE-specific grid fallbacks */
            .grid {
              display: block !important;
            }
            .grid > * {
              display: block;
              margin-bottom: 0.5rem;
            }
            ` : `
            /* Modern browsers - ensure grid works in print */
            @media print {
              .grid {
                display: grid !important;
              }
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
              .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            }
            `}
            
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

      // Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      // Write the print HTML to the iframe
      iframe.contentDocument.open();
      iframe.contentDocument.write(printHTML);
      iframe.contentDocument.close();

      // Wait for content to load, then print
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          document.body.removeChild(iframe); // Clean up the iframe
          setIsExporting(false);
        }, 250);
      };

    } catch (error) {
      console.error('Print failed:', error);
      alert(t('errors.unexpected'));
    } finally {
      setIsExporting(false);
    }
  };

  // Check if cookbook transfer is enabled
  const isCookbookEnabled = import.meta.env.VITE_ENABLE_COOKBOOK_TRANSFER === 'true';
  const cookbookIconUrl = import.meta.env.VITE_COOKBOOK_ICON_URL;
  const cookbookName = import.meta.env.VITE_COOKBOOK_NAME || 'Cookbook';

  // Handle cookbook export
  const handleCookbookExport = async () => {
    try {
      // Check if user is authenticated
      if (!auth?.isAuthenticated || !auth?.user) {
        showError(t('recipes.authRequired'));
        return;
      }

      // Check if recipe needs to be saved first
      if (hasUnsavedChanges) {
        const shouldSave = await showConfirmation({
          title: t('common.save'),
          message: t('resultDisplay.export.cookbook.unsavedChanges'),
          confirmText: t('common.save'),
          cancelText: t('common.cancel'),
          confirmVariant: 'primary'
        });
        if (!shouldSave) {
          return;
        }
        
        // Try to save the recipe first
        if (onSaveRecipe) {
          const saveResult = await onSaveRecipe();
          if (!saveResult || !saveResult.success) {
            showError(t('resultDisplay.export.cookbook.saveFirst'));
            return;
          }
        } else {
          showError(t('resultDisplay.export.cookbook.saveFirst'));
          return;
        }
      }

      // Check if we have a recipe ID
      if (!recipeId) {
        showError(t('resultDisplay.export.cookbook.saveFirst'));
        return;
      }

      // Show confirmation dialog
      const confirmed = await showConfirmation({
        title: cookbookName,
        message: t('resultDisplay.export.cookbook.confirm'),
        confirmText: t('resultDisplay.export.cookbook.button'),
        cancelText: t('common.cancel'),
        confirmVariant: 'success'
      });
      if (!confirmed) {
        return;
      }

      setIsSharingCookbook(true);

      // Call the cookbook transfer edge function
      const { data, error } = await supabase.functions.invoke('cookbook-transfer', {
        body: {
          recipeId: recipeId,
          userId: auth.user.id
        }
      });

      if (error) {
        showError(t('resultDisplay.export.cookbook.error'));
      } else {
        showSuccess(t('resultDisplay.export.cookbook.success'));
      }
    } catch (err) {
      showError(t('resultDisplay.export.cookbook.error'));
    } finally {
      setIsSharingCookbook(false);
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
          <div className="text-sm text-gray-500">
            {t('resultDisplay.export.pdf.format')}
          </div>

          <div className="flex gap-4 items-center">
            {/* Cookbook Export Icon */}
            {isCookbookEnabled && (
              <button
                onClick={handleCookbookExport}
                disabled={isSharingCookbook}
                className="hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed h-[40px] flex items-center justify-center"
                title={isSharingCookbook ? t('resultDisplay.export.cookbook.sharing') : t('resultDisplay.export.cookbook.button')}
              >
                {isSharingCookbook ? (
                  <div className="w-8 h-8 border-2 border-[#994d51] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {cookbookIconUrl ? (
                      <img 
                        src={cookbookIconUrl} 
                        alt={cookbookName}
                        className="h-8 w-auto"
                      />
                    ) : (
                      <span className="text-3xl leading-none">📖</span>
                    )}
                  </>
                )}
              </button>
            )}

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
            {(recipe.difficulty || recipe.servings || recipe.prepTime || recipe.cookTime || totalTime) && (
              <div className={`mb-8 text-center ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                {/* First row: difficulty and servings */}
                {(recipe.difficulty || recipe.servings) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {recipe.difficulty && (
                      <div className={`border border-gray-200 rounded-lg p-3 ${!recipe.servings ? 'md:col-span-2' : ''}`}>
                        <div className="text-sm text-gray-500 mb-1">{t('resultDisplay.metadata.difficulty')}</div>
                        <div className="font-semibold text-[#1b0e0e]">{t(`resultDisplay.difficulties.${recipe.difficulty}`, recipe.difficulty)}</div>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className={`border border-gray-200 rounded-lg p-3 ${!recipe.difficulty ? 'md:col-span-2' : ''}`}>
                        <div className="text-sm text-gray-500 mb-1">{t('resultDisplay.metadata.servings')}</div>
                        <div className="font-semibold text-[#1b0e0e]">{recipe.servings}</div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Second row: all time fields */}
                {(recipe.prepTime || recipe.cookTime || totalTime) && (
                  <div className={`grid ${getTimeGridClass()} gap-4`}>
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
                    {totalTime != null && (
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="text-sm text-gray-500 mb-1">{t('resultDisplay.metadata.totalTime')}</div>
                        <div className="font-semibold text-[#1b0e0e]">{formatTime(totalTime, t)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Images Section - only show first image */}
            {(firstImageUrl || imageLoading) && (
              <div className="mb-8 print-images-section">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ingredients in first column */}
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold text-[#1b0e0e] mb-4 pb-2 border-b border-gray-200">
                        {t('resultDisplay.sections.ingredients')}
                      </h2>
                      <div className="space-y-2">
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
                  
                  {/* First image in second column */}
                  <div className="flex justify-center">
                    <div className="max-w-md w-full">
                      {imageLoading ? (
                        <div className="w-full h-64 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                        </div>
                      ) : firstImageUrl ? (
                        <img
                          src={firstImageUrl}
                          alt={`${recipe.name || t('resultDisplay.images.dishImage')}`}
                          className="w-full h-auto rounded-lg border border-gray-200 print-image"
                          style={{ maxHeight: '300px', objectFit: 'cover' }}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ingredients Section - only when no images */}
            {!firstImageUrl && recipe.ingredients && recipe.ingredients.length > 0 && (
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
                              <div className="w-6 h-6 bg-[#994d51] text-white rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
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
                        <div className="w-6 h-6 bg-[#994d51] text-white rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
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

            {/* Comments Section */}
            {recipe.comments && recipe.comments.trim() !== '' && (
              <div className="mb-8 comments-section">
                <h2 className="text-2xl font-bold text-[#1b0e0e] mb-4 pb-2 border-b border-gray-200">
                  {t('resultDisplay.metadata.comments')}
                </h2>
                <div className="text-[#1b0e0e] leading-relaxed comments-content" style={{ direction: isHebrew(recipe.comments) ? 'rtl' : 'ltr' }}>
                  {recipe.comments.split('\n').map((line, index) => (
                    <p key={index} className={index > 0 ? 'mt-2' : ''}>
                      {line}
                    </p>
                  ))}
                </div>
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