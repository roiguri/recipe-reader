import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const UserMenu = () => {
  const { t } = useTranslation();
  const { user, signOut, loading } = useAuth();
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
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
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
            />
          ) : (
            getUserInitials()
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user?.email}
            </p>
            <p className="text-xs text-gray-500">
              {t('auth.signedIn')}
            </p>
          </div>
          
          <div className="py-2">
            <div className="px-4 py-2 text-sm text-gray-500">
              {t('auth.quotaStatus')}: 5 {t('auth.requestsRemaining')}
            </div>
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