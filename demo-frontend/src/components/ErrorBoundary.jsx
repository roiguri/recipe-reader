import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import Card from './ui/Card';
import Button from './ui/Button';

/**
 * ErrorBoundary component catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the app
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    
    // Store errorInfo for development display, but avoid setState to prevent loops
    this.errorInfo = errorInfo;
    
    // TODO: Send error to logging service
  }
  
  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
    // Clear the instance errorInfo as well
    this.errorInfo = null;
  };
  
  render() {
    const { t, i18n } = this.props;
    const isRTL = i18n.language === 'he';
    
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <Card className="my-6 text-center">
          <div className="py-8 px-4 flex flex-col items-center">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V88a8,8,0,0,1,16,0v48a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"></path>
              </svg>
            </div>
            <h2 className={`text-xl font-bold text-[#1b0e0e] mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('errorBoundary.title')}
            </h2>
            <p className={`text-[#994d51] mb-6 max-w-md ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('errorBoundary.description')}
            </p>
            <div className={`${isRTL ? 'space-x-reverse' : ''} space-x-4`}>
              <Button variant="primary" onClick={this.handleReset}>
                {t('errorBoundary.tryAgain')}
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                {t('errorBoundary.reloadPage')}
              </Button>
            </div>
            
            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className={`mt-8 w-full ${isRTL ? 'text-right' : 'text-left'}`}>
                <details className="bg-gray-50 p-4 rounded-lg text-sm">
                  <summary className={`cursor-pointer font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('errorBoundary.errorDetails')}
                  </summary>
                  <p className="mb-2 text-red-600" dir="ltr" style={{ textAlign: 'left' }}>
                    {this.state.error?.toString()}
                  </p>
                  <pre className="whitespace-pre-wrap overflow-auto max-h-60" dir="ltr" style={{ textAlign: 'left' }}>
                    {this.errorInfo?.componentStack}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </Card>
      );
    }
    
    // If no error, render children normally
    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary); 