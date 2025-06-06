import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { processRecipeText, createRequestController, APIError } from '../utils/api';
import ResultDisplay from './ResultDisplay';
import { ANIMATION_CONFIG } from '../utils/animationConfig';

const TextProcessor = () => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  const MIN_CHARS = 50;
  const MAX_CHARS = 10000;
  const RECOMMENDED_CHARS = 500;

  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Please enter some recipe text');
      return;
    }

    if (text.length < MIN_CHARS) {
      setError(`Please enter at least ${MIN_CHARS} characters for better results`);
      return;
    }

    if (text.length > MAX_CHARS) {
      setError(`Text is too long. Please limit to ${MAX_CHARS} characters`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    // Create abort controller for timeout and cancellation
    abortControllerRef.current = createRequestController(30000);

    try {
      const response = await processRecipeText(
        text,
        {},
        abortControllerRef.current.signal
      );
      
      setResult(response);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.details?.cancelled) {
          setError('Request was cancelled');
        } else if (err.details?.offline) {
          setError('No internet connection. Please check your network and try again.');
        } else if (err.details?.networkError) {
          setError('Cannot connect to the recipe processing service. Please make sure the server is running.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClear = () => {
    setText('');
    setResult(null);
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const isTextValid = text.trim().length >= MIN_CHARS && text.length <= MAX_CHARS;
  const showCharWarning = text.length > 0 && (text.length < MIN_CHARS || text.length > MAX_CHARS);

  // Show result if we have one
  if (result) {
    return (
      <ResultDisplay 
        result={result} 
        onStartOver={() => {
          setResult(null);
          setError(null);
          setTimeout(() => textareaRef.current?.focus(), 100);
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: ANIMATION_CONFIG.CONTENT_FADE_IN / 1000,
        ease: ANIMATION_CONFIG.CONTENT_EASE 
      }}
      className="w-full"
    >
      <div className="bg-white rounded-lg shadow-sm border border-[#f3e7e8] p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[#1b0e0e] mb-2">
              Paste Your Recipe Text
            </h2>
            <p className="text-sm text-[#994d51] mb-4">
              Copy and paste recipe text from any source. Supports Hebrew and English.
            </p>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              placeholder="Paste your recipe text here...

Example:
Classic Chocolate Chip Cookies

Ingredients:
- 2 cups all-purpose flour
- 1 tsp baking soda
- 1 tsp salt
- 1 cup butter, softened
- 3/4 cup brown sugar
- 1/2 cup granulated sugar
- 2 large eggs
- 2 tsp vanilla extract
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F...
2. Mix dry ingredients...
3. Cream butter and sugars..."
              className="w-full min-h-[400px] max-h-[600px] p-4 border border-[#f3e7e8] rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:border-transparent transition-all duration-200 text-[#1b0e0e] placeholder-[#994d51]/60"
              style={{
                direction: text && /[\u0590-\u05FF]/.test(text) ? 'rtl' : 'ltr',
                fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif'
              }}
              disabled={isLoading}
            />
            
            {/* Character count */}
            <div className="absolute bottom-2 right-2 text-xs text-[#994d51]/70 bg-white/90 px-2 py-1 rounded">
              {charCount.toLocaleString()}/{MAX_CHARS.toLocaleString()}
            </div>
          </div>

          {/* Input guidelines */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#994d51]/80">
            <span className={`flex items-center gap-1 ${charCount >= MIN_CHARS ? 'text-green-600' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${charCount >= MIN_CHARS ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              Minimum {MIN_CHARS} characters
            </span>
            <span className={`flex items-center gap-1 ${charCount >= RECOMMENDED_CHARS ? 'text-green-600' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${charCount >= RECOMMENDED_CHARS ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              Recommended {RECOMMENDED_CHARS}+ characters
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Hebrew & English supported
            </span>
          </div>

          {/* Warning messages */}
          {showCharWarning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800"
            >
              {text.length < MIN_CHARS ? (
                <>Need {MIN_CHARS - text.length} more characters for better recipe extraction</>
              ) : (
                <>Text too long by {text.length - MAX_CHARS} characters. Please shorten.</>
              )}
            </motion.div>
          )}

          {/* Error display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
            >
              {error}
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2 text-[#994d51] text-sm">
                  <div className="animate-spin w-5 h-5 border-2 border-[#994d51] border-t-transparent rounded-full"></div>
                  Processing your recipe...
                </div>
              </div>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={!isTextValid}
                  className="flex-1 sm:flex-none px-8 py-3 bg-[#994d51] text-white rounded-lg hover:bg-[#1b0e0e] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 text-sm font-bold tracking-[0.015em] focus:outline-none focus:ring-2 focus:ring-[#994d51] focus:ring-offset-2"
                >
                  Extract Recipe
                </button>
                {text && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default TextProcessor;