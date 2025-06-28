import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import App from './App.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </AuthProvider>
  </React.StrictMode>
);
