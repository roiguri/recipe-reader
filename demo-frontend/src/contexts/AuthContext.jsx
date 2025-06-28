import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'SET_SESSION':
      return { 
        ...state, 
        session: action.payload, 
        user: action.payload?.user || null, 
        loading: false,
        sessionExpiry: action.payload?.expires_at ? new Date(action.payload.expires_at * 1000) : null
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SIGN_OUT':
      return { ...state, user: null, session: null, loading: false, error: null, sessionExpiry: null };
    case 'SET_SESSION_STATUS':
      return { ...state, sessionStatus: action.payload };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  session: null,
  loading: true,
  error: null,
  sessionExpiry: null,
  sessionStatus: 'checking' // 'checking', 'valid', 'expired', 'invalid', 'refreshing'
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const refreshTimerRef = React.useRef(null);
  const sessionCheckRef = React.useRef(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            dispatch({ type: 'SET_ERROR', payload: error.message });
            dispatch({ type: 'SET_SESSION_STATUS', payload: 'invalid' });
          }
        } else if (mounted) {
          dispatch({ type: 'SET_SESSION', payload: session });
          if (session) {
            dispatch({ type: 'SET_SESSION_STATUS', payload: 'valid' });
          } else {
            dispatch({ type: 'SET_SESSION_STATUS', payload: 'invalid' });
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          dispatch({ type: 'SET_ERROR', payload: error.message });
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session?.user?.email);
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          dispatch({ type: 'SET_SESSION', payload: session });
          dispatch({ type: 'SET_SESSION_STATUS', payload: 'valid' });
          break;
        case 'SIGNED_OUT':
          dispatch({ type: 'SIGN_OUT' });
          dispatch({ type: 'SET_SESSION_STATUS', payload: 'invalid' });
          break;
        default:
          dispatch({ type: 'SET_SESSION', payload: session });
          dispatch({ type: 'SET_SESSION_STATUS', payload: session ? 'valid' : 'invalid' });
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Session management utilities
  const clearTimers = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }
  };

  const isSessionExpired = (session) => {
    if (!session?.expires_at) return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= session.expires_at;
  };

  const getSessionTimeRemaining = (session) => {
    if (!session?.expires_at) return 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, session.expires_at - now);
  };

  const scheduleTokenRefresh = (session) => {
    clearTimers();
    
    if (!session?.expires_at) return;
    
    const timeRemaining = getSessionTimeRemaining(session);
    // Refresh 5 minutes before expiry or immediately if less than 5 minutes
    const refreshBuffer = 5 * 60; // 5 minutes in seconds
    const refreshTime = Math.max(1000, (timeRemaining - refreshBuffer) * 1000);

    console.log(`Scheduling token refresh in ${Math.round(refreshTime / 1000)} seconds`);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        dispatch({ type: 'SET_SESSION_STATUS', payload: 'refreshing' });
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Token refresh failed:', error);
          dispatch({ type: 'SET_SESSION_STATUS', payload: 'expired' });
          dispatch({ type: 'SET_ERROR', payload: 'Session expired. Please sign in again.' });
          await signOut();
        } else {
          console.log('Token refreshed successfully');
          dispatch({ type: 'SET_SESSION', payload: data.session });
          dispatch({ type: 'SET_SESSION_STATUS', payload: 'valid' });
          // Schedule next refresh
          scheduleTokenRefresh(data.session);
        }
      } catch (error) {
        console.error('Token refresh error:', error);
        dispatch({ type: 'SET_SESSION_STATUS', payload: 'invalid' });
        dispatch({ type: 'SET_ERROR', payload: 'Session refresh failed. Please sign in again.' });
      }
    }, refreshTime);
  };

  const validateSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session validation error:', error);
        dispatch({ type: 'SET_SESSION_STATUS', payload: 'invalid' });
        return false;
      }

      if (!session) {
        dispatch({ type: 'SET_SESSION_STATUS', payload: 'invalid' });
        return false;
      }

      if (isSessionExpired(session)) {
        console.log('Session expired, attempting refresh...');
        dispatch({ type: 'SET_SESSION_STATUS', payload: 'expired' });
        
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !data.session) {
          console.error('Session refresh failed:', refreshError);
          dispatch({ type: 'SET_SESSION_STATUS', payload: 'invalid' });
          await signOut();
          return false;
        }
        
        dispatch({ type: 'SET_SESSION', payload: data.session });
        dispatch({ type: 'SET_SESSION_STATUS', payload: 'valid' });
        scheduleTokenRefresh(data.session);
        return true;
      }

      dispatch({ type: 'SET_SESSION_STATUS', payload: 'valid' });
      scheduleTokenRefresh(session);
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      dispatch({ type: 'SET_SESSION_STATUS', payload: 'invalid' });
      return false;
    }
  };

  // Periodic session check every 30 seconds
  useEffect(() => {
    if (!state.session) return;

    sessionCheckRef.current = setInterval(() => {
      if (state.sessionStatus === 'refreshing') return; // Don't check while refreshing
      
      const timeRemaining = getSessionTimeRemaining(state.session);
      if (timeRemaining < 60) { // Less than 1 minute remaining
        validateSession();
      }
    }, 30000);

    return () => {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }
    };
  }, [state.session, state.sessionStatus]);

  // Schedule initial token refresh when session is set
  useEffect(() => {
    if (state.session && state.sessionStatus === 'valid') {
      scheduleTokenRefresh(state.session);
    } else {
      clearTimers();
    }

    return clearTimers;
  }, [state.session, state.sessionStatus]);

  const signInWithOAuth = async (provider) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return { error };
      }

      return { data };
    } catch (error) {
      console.error('OAuth sign-in error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      // Clear all session management timers
      clearTimers();

      const { error } = await supabase.auth.signOut();

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return { error };
      }

      dispatch({ type: 'SIGN_OUT' });
      dispatch({ type: 'SET_SESSION_STATUS', payload: 'invalid' });
      return {};
    } catch (error) {
      console.error('Sign-out error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { error };
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    user: state.user,
    session: state.session,
    loading: state.loading,
    error: state.error,
    sessionExpiry: state.sessionExpiry,
    sessionStatus: state.sessionStatus,
    signInWithOAuth,
    signOut,
    clearError,
    validateSession,
    isAuthenticated: !!state.user,
    isSessionValid: state.sessionStatus === 'valid',
    isSessionExpiring: state.session ? getSessionTimeRemaining(state.session) < 300 : false, // Less than 5 minutes
    sessionTimeRemaining: state.session ? getSessionTimeRemaining(state.session) : 0
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};