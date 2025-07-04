import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import QuotaProgress from '../QuotaProgress';

// Simple cache to avoid repeated avatar requests
const avatarCache = new Map();

const UserMenu = ({ onNavigateToMyRecipes }) => {
  const { t } = useTranslation();
  const { user, signOut, loading } = useAuth();
  const { isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  const getUserInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  const getAvatarUrl = () => {
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    
    if (!avatarUrl) return null;
    
    // Check cache first
    if (avatarCache.has(avatarUrl)) {
      return avatarCache.get(avatarUrl);
    }
    
    let processedUrl = avatarUrl;
    
    // Fix Google avatar URLs to prevent 429 errors
    if (avatarUrl.includes('googleusercontent.com')) {
      // Remove existing size parameters and add our own to ensure consistency
      const baseUrl = avatarUrl.split('=')[0];
      processedUrl = `${baseUrl}=s80-c`; // s80 = 80px size, c = crop to square
    }
    
    // Cache the processed URL
    avatarCache.set(avatarUrl, processedUrl);
    
    return processedUrl;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#994d51] text-white flex items-center justify-center text-xs font-medium overflow-hidden">
          {getAvatarUrl() ? (
            <img 
              src={getAvatarUrl()} 
              alt={user?.email}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(e) => {
                console.warn('UserMenu: Profile image failed to load:', e.target.src);
                // Hide the image on error and show initials instead
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ display: getAvatarUrl() ? 'none' : 'flex' }}
          >
            {getUserInitials()}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[100]">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user?.email}
            </p>
            <p className="text-xs text-gray-500">
              {t('auth.signedIn')}
            </p>
          </div>
          
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs text-gray-500 mb-2">
              {t('auth.quotaStatus')}
            </div>
            <QuotaProgress size="small" />
          </div>

          {/* Mobile navigation - My Recipes only show on mobile */}
          <div className="md:hidden border-b border-gray-100 py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigateToMyRecipes?.();
              }}
              className={`w-full px-4 py-2 ${isRTL ? 'text-right' : 'text-left'} text-sm text-gray-700 hover:bg-gray-50 transition-colors`}
            >
              {t('appHeader.myRecipes')}
            </button>
          </div>

          <div className="border-t border-gray-100 py-2">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {loading ? t('auth.signingOut') : t('auth.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;