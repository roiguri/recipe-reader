import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatFileSize } from '../../utils/imageUtils';

/**
 * Upload progress component with individual file progress tracking
 * Supports batch uploads with detailed progress information
 */
const UploadProgress = ({
  uploads = [],
  onCancel,
  onRetry,
  onComplete,
  showIndividualProgress = true,
  showOverallProgress = true,
  showFileDetails = true,
  showETA = true,
  className = '',
  variant = 'default' // default, compact, minimal
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [overallProgress, setOverallProgress] = useState(0);
  const [eta, setEta] = useState(null);
  const [startTime] = useState(Date.now());

  // Calculate overall progress and ETA
  useEffect(() => {
    if (uploads.length === 0) return;

    const totalProgress = uploads.reduce((sum, upload) => sum + (upload.progress || 0), 0);
    const overall = Math.round(totalProgress / uploads.length);
    setOverallProgress(overall);

    // Calculate ETA
    if (showETA && overall > 0 && overall < 100) {
      const elapsed = Date.now() - startTime;
      const estimatedTotal = (elapsed / overall) * 100;
      const remaining = estimatedTotal - elapsed;
      setEta(remaining > 0 ? remaining : null);
    } else {
      setEta(null);
    }
  }, [uploads, startTime, showETA]);

  // Handle completion
  useEffect(() => {
    const allComplete = uploads.length > 0 && uploads.every(upload => 
      upload.status === 'completed' || upload.status === 'error'
    );

    if (allComplete && onComplete) {
      onComplete(uploads);
    }
  }, [uploads, onComplete]);

  const formatETA = (milliseconds) => {
    if (!milliseconds) return '';
    
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return (
          <div className="w-4 h-4 border-2 border-[#994d51] border-t-transparent rounded-full animate-spin" />
        );
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploading':
        return 'text-[#994d51]';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'pending':
      default:
        return 'text-gray-500';
    }
  };

  const getProgressBarColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'uploading':
      default:
        return 'bg-[#994d51]';
    }
  };

  const ProgressBar = ({ progress, status, animated = true }) => (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${getProgressBarColor(status)}`}
        initial={{ width: 0 }}
        animate={{ width: `${progress || 0}%` }}
        transition={animated ? { duration: 0.3, ease: 'easeOut' } : { duration: 0 }}
      />
    </div>
  );

  const IndividualUpload = ({ upload, index }) => {
    const { file, progress = 0, status = 'pending', error, speed, loaded, total } = upload;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white border border-[#f3e7e8] rounded-lg p-4 space-y-3"
      >
        {/* File info header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getStatusIcon(status)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-[#1b0e0e] truncate" title={file.name}>
              {file.name}
            </h4>
            {showFileDetails && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="capitalize">{file.type.split('/')[1] || 'Unknown'}</span>
                {speed && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(speed)}/s</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className={`text-right ${getStatusColor(status)}`}>
            <div className="text-sm font-medium">
              {status === 'completed' ? '100%' : `${progress}%`}
            </div>
            {loaded && total && status === 'uploading' && (
              <div className="text-xs">
                {formatFileSize(loaded)} / {formatFileSize(total)}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar progress={progress} status={status} />

        {/* Error message */}
        {status === 'error' && error && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p>{error}</p>
              {onRetry && (
                <button
                  onClick={() => onRetry(index)}
                  className="mt-1 text-sm font-medium text-red-600 hover:text-red-700 underline"
                >
                  {t('uploadProgress.retry', { defaultValue: 'Retry' })}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cancel button for pending/uploading */}
        {(status === 'pending' || status === 'uploading') && onCancel && (
          <div className="flex justify-end">
            <button
              onClick={() => onCancel(index)}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              {t('uploadProgress.cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  const OverallProgress = () => {
    const completedCount = uploads.filter(u => u.status === 'completed').length;
    const errorCount = uploads.filter(u => u.status === 'error').length;
    const uploadingCount = uploads.filter(u => u.status === 'uploading').length;

    return (
      <div className="bg-[#fcf8f8] border border-[#f3e7e8] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#1b0e0e]">
            {t('uploadProgress.overall', { defaultValue: 'Upload Progress' })}
          </h3>
          <div className="text-sm font-medium text-[#994d51]">
            {overallProgress}%
          </div>
        </div>

        <ProgressBar progress={overallProgress} status="uploading" />

        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>
              {t('uploadProgress.completed', { count: completedCount, defaultValue: `${completedCount} completed` })}
            </span>
            {uploadingCount > 0 && (
              <span>
                {t('uploadProgress.uploading', { count: uploadingCount, defaultValue: `${uploadingCount} uploading` })}
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-600">
                {t('uploadProgress.failed', { count: errorCount, defaultValue: `${errorCount} failed` })}
              </span>
            )}
          </div>
          
          {eta && (
            <span>
              {t('uploadProgress.eta', { time: formatETA(eta), defaultValue: `${formatETA(eta)} remaining` })}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (uploads.length === 0) return null;

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Overall progress */}
      {showOverallProgress && uploads.length > 1 && <OverallProgress />}

      {/* Individual file progress */}
      {showIndividualProgress && (
        <div className="space-y-3">
          <AnimatePresence>
            {uploads.map((upload, index) => (
              <IndividualUpload
                key={upload.file.name + index}
                upload={upload}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Compact view for single file */}
      {!showIndividualProgress && uploads.length === 1 && variant === 'compact' && (
        <div className="bg-white border border-[#f3e7e8] rounded-lg p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0">
              {getStatusIcon(uploads[0].status)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-[#1b0e0e] truncate">
                {uploads[0].file.name}
              </span>
            </div>
            <div className={`text-sm font-medium ${getStatusColor(uploads[0].status)}`}>
              {uploads[0].progress || 0}%
            </div>
          </div>
          <ProgressBar progress={uploads[0].progress} status={uploads[0].status} />
        </div>
      )}
    </div>
  );
};

export default UploadProgress;