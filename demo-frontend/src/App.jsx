import React, { useState } from 'react';
import AppHeader from './components/AppHeader.jsx';
import MainContent from './components/MainContent.jsx';
import ComingSoonContent from './components/ComingSoonContent.jsx';
import TextProcessor from './components/TextProcessor/index';
import { CARD_CONFIGS } from './config/cardConfigs.jsx';
import ErrorBoundary from './components/ErrorBoundary';

function App() {

  const [expandedCard, setExpandedCard] = useState(null);

  const handleCardClick = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const getCardItems = () => {
    return Object.entries(CARD_CONFIGS).map(([id, config]) => ({
      id,
      preview: {
        icon: config.icon,
        title: config.title,
        description: config.description
      },
      expanded: config.isComingSoon 
        ? <ComingSoonContent feature={config.title.toLowerCase()} />
        : id === 'text' 
          ? <ErrorBoundary><TextProcessor /></ErrorBoundary>
          : <ComingSoonContent feature={config.title.toLowerCase()} />
    }));
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#fcf8f8]" style={{fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif'}}>
      <div className="layout-container flex min-h-screen grow flex-col">
        <ErrorBoundary>
          <AppHeader />
          <MainContent 
            cardItems={getCardItems()}
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
