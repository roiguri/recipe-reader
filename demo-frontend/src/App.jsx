import React, { useState, useMemo, useEffect } from 'react';
import AppHeader from './components/AppHeader.jsx';
import MainContent from './components/MainContent.jsx';
import ComingSoonContent from './components/ComingSoonContent.jsx';
import TextProcessor from './components/TextProcessor/index';
import UrlProcessor from './components/UrlProcessor/index';
import ImageProcessor from './components/ImageProcessor/index';
import { MyRecipesPage } from './components/my-recipes';
import { useCardConfigs } from './config/cardConfigs.jsx';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [expandedCard, setExpandedCard] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // 'home' or 'my-recipes'
  const cardConfigs = useCardConfigs();

  // Restore expanded card state on page load (after OAuth redirect)
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      const savedExpandedCard = sessionStorage.getItem('app_expandedCard');
      const manuallyClosed = sessionStorage.getItem('app_cardManuallyClosed');
      
      // Only restore if there's a saved card AND it wasn't manually closed by the user
      if (savedExpandedCard && savedExpandedCard !== 'null' && savedExpandedCard !== manuallyClosed) {
        setExpandedCard(savedExpandedCard);
        // Clean up after restoration with delay to ensure processors have time to restore form data
        setTimeout(() => {
          sessionStorage.removeItem('app_expandedCard');
        }, 1000);
      }
      
      // Clean up the manually closed flag after checking
      if (manuallyClosed) {
        sessionStorage.removeItem('app_cardManuallyClosed');
      }
    }
  }, []);

  const handleCardClick = (cardId) => {
    const newExpandedCard = expandedCard === cardId ? null : cardId;
    setExpandedCard(newExpandedCard);
    
    if (typeof sessionStorage !== 'undefined') {
      if (newExpandedCard) {
        sessionStorage.setItem('app_expandedCard', newExpandedCard);
        sessionStorage.removeItem('app_cardManuallyClosed');
      } else {
        sessionStorage.removeItem('app_expandedCard');
        sessionStorage.setItem('app_cardManuallyClosed', expandedCard);
      }
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

  const handleNavigateToMyRecipes = () => {
    setCurrentView('my-recipes');
    setExpandedCard(null); // Close any expanded cards
  };

  const handleNavigateHome = () => {
    setCurrentView('home');
    setExpandedCard(null);
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#fcf8f8]" style={{fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif'}}>
      <div className="layout-container flex min-h-screen grow flex-col">
        <ErrorBoundary>
          <AppHeader 
            currentView={currentView}
            onNavigateToMyRecipes={handleNavigateToMyRecipes}
            onNavigateHome={handleNavigateHome}
          />
          {currentView === 'home' ? (
            <MainContent 
              cardItems={cardItems}
              expandedCard={expandedCard}
              onCardClick={handleCardClick}
              onBackClick={() => {
                // When using back button, also mark as manually closed
                if (typeof sessionStorage !== 'undefined' && expandedCard) {
                  sessionStorage.removeItem('app_expandedCard');
                  sessionStorage.setItem('app_cardManuallyClosed', expandedCard);
                }
                setExpandedCard(null);
              }}
            />
          ) : (
            <MyRecipesPage onNavigateHome={handleNavigateHome} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;
