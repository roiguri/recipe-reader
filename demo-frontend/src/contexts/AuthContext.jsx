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
      return { ...state, session: action.payload, user: action.payload?.user || null, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SIGN_OUT':
      return { ...state, user: null, session: null, loading: false, error: null };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  session: null,
  loading: true,
  error: null
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

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
          }
        } else if (mounted) {
          dispatch({ type: 'SET_SESSION', payload: session });
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
          break;
        case 'SIGNED_OUT':
          dispatch({ type: 'SIGN_OUT' });
          break;
        default:
          dispatch({ type: 'SET_SESSION', payload: session });
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithOAuth = async (provider) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
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

      const { error } = await supabase.auth.signOut();

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return { error };
      }

      dispatch({ type: 'SIGN_OUT' });
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
    signInWithOAuth,
    signOut,
    clearError,
    isAuthenticated: !!state.user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};