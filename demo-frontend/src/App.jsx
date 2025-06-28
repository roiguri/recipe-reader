import React, { useState, useMemo, useEffect } from 'react';
import AppHeader from './components/AppHeader.jsx';
import MainContent from './components/MainContent.jsx';
import ComingSoonContent from './components/ComingSoonContent.jsx';
import TextProcessor from './components/TextProcessor/index';
import UrlProcessor from './components/UrlProcessor/index';
import ImageProcessor from './components/ImageProcessor/index';
import { useCardConfigs } from './config/cardConfigs.jsx';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [expandedCard, setExpandedCard] = useState(null);
  const cardConfigs = useCardConfigs();

  // Restore expanded card state on page load (after OAuth redirect)
  useEffect(() => {
    const savedExpandedCard = sessionStorage.getItem('app_expandedCard');
    if (savedExpandedCard && savedExpandedCard !== 'null') {
      setExpandedCard(savedExpandedCard);
      // Clean up after restoration with delay to ensure processors have time to restore form data
      setTimeout(() => {
        sessionStorage.removeItem('app_expandedCard');
      }, 1000);
    }
  }, []);

  const handleCardClick = (cardId) => {
    const newExpandedCard = expandedCard === cardId ? null : cardId;
    setExpandedCard(newExpandedCard);
    
    // Save expanded card state when changing
    if (newExpandedCard) {
      sessionStorage.setItem('app_expandedCard', newExpandedCard);
    } else {
      sessionStorage.removeItem('app_expandedCard');
    }
  };

  const getExpandedContent = (id, config) => {
    if (config.isComingSoon) {
      return <ComingSoonContent feature={config.title.toLowerCase()} />;
    }

    const processors = {
      text: <ErrorBoundary><TextProcessor /></ErrorBoundary>,
      url: <ErrorBoundary><UrlProcessor /></ErrorBoundary>,
      image: <ErrorBoundary><ImageProcessor /></ErrorBoundary>
    };

    return processors[id] || <ComingSoonContent feature={config.title.toLowerCase()} />;
  };

  const cardItems = useMemo(() => {
    return Object.entries(cardConfigs).map(([id, config]) => ({
      id,
      preview: {
        icon: config.icon,
        title: config.title,
        description: config.description
      },
      expanded: getExpandedContent(id, config)
    }));
  }, [cardConfigs]);

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#fcf8f8]" style={{fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif'}}>
      <div className="layout-container flex min-h-screen grow flex-col">
        <ErrorBoundary>
          <AppHeader />
          <MainContent 
            cardItems={cardItems}
            expandedCard={expandedCard}
            onCardClick={handleCardClick}
            onBackClick={() => setExpandedCard(null)}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;
