import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import SignInModal from './SignInModal';
import UserMenu from './UserMenu';

const AuthButton = ({ onNavigateToMyRecipes }) => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);


  if (loading) {
    return (
      <div className="px-4 py-2 bg-white border border-[#f3e7e8] text-[#994d51] text-sm font-medium rounded-lg flex items-center gap-2 shadow-sm opacity-75 cursor-not-allowed">
        <div className="w-4 h-4 border-2 border-[#994d51] border-t-transparent rounded-full animate-spin"></div>
        <span className="animate-pulse">{t('common.loading')}</span>
      </div>
    );
  }

  if (user) {
    return <UserMenu onNavigateToMyRecipes={onNavigateToMyRecipes} />;
  }

  return (
    <>
      <button
        onClick={() => setShowSignInModal(true)}
        className="px-4 py-2 bg-white border border-[#f3e7e8] text-[#994d51] text-sm font-medium rounded-lg hover:bg-[#fcf8f8] hover:border-[#994d51] transition-all duration-200 flex items-center gap-2 shadow-sm"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        {t('auth.signIn')}
      </button>
      
      <SignInModal 
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};

export default AuthButton;