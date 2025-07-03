import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

export const useRateLimit = () => {
  const { user, isAuthenticated } = useAuth();
  const [rateLimit, setRateLimit] = useState({
    requestsUsed: 0,
    requestsLimit: 5,
    isAdmin: false,
    loading: true,
    error: null
  });

  // Fetch initial rate limit data
  const fetchRateLimit = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setRateLimit(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setRateLimit(prev => ({ ...prev, loading: true, error: null }));

      // Get admin status from secure app_metadata (JWT)
      const isAdmin = user.app_metadata?.is_admin === true;

      const { data, error } = await supabase
        .from('demo_rate_limits')
        .select('requests_used, requests_limit')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching rate limit:', error);
        // Provide fallback data for development
        setRateLimit({
          requestsUsed: 0,
          requestsLimit: 5,
          isAdmin,
          loading: false,
          error: error.message
        });
        return;
      }

      setRateLimit({
        requestsUsed: data.requests_used,
        requestsLimit: data.requests_limit,
        isAdmin,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Rate limit fetch error:', error);
      // Provide fallback data for development
      setRateLimit({
        requestsUsed: 0,
        requestsLimit: 5,
        isAdmin: user.app_metadata?.is_admin === true,
        loading: false,
        error: error.message
      });
    }
  }, [user?.id, user?.app_metadata?.is_admin, isAuthenticated]);

  // Check if user has remaining quota
  const hasQuota = useCallback(() => {
    if (rateLimit.isAdmin) return true;
    return rateLimit.requestsUsed < rateLimit.requestsLimit;
  }, [rateLimit.requestsUsed, rateLimit.requestsLimit, rateLimit.isAdmin]);

  // Get usage percentage
  const getUsagePercentage = useCallback(() => {
    if (rateLimit.isAdmin) return 0; // Admins show no usage
    return Math.round((rateLimit.requestsUsed / rateLimit.requestsLimit) * 100);
  }, [rateLimit.requestsUsed, rateLimit.requestsLimit, rateLimit.isAdmin]);

  // Get remaining requests
  const getRemainingRequests = useCallback(() => {
    if (rateLimit.isAdmin) return Infinity;
    return Math.max(0, rateLimit.requestsLimit - rateLimit.requestsUsed);
  }, [rateLimit.requestsUsed, rateLimit.requestsLimit, rateLimit.isAdmin]);

  // Get usage color based on percentage
  const getUsageColor = useCallback(() => {
    if (rateLimit.isAdmin) return 'green';
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'yellow';
    return 'green';
  }, [getUsagePercentage, rateLimit.isAdmin]);

  // Fetch data when user changes
  useEffect(() => {
    fetchRateLimit();
  }, [fetchRateLimit]);

  // Set up real-time subscription for rate limit changes
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const channel = supabase
      .channel('rate-limit-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'demo_rate_limits',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Rate limist updated via real-time subscription
          const newData = payload.new;
          setRateLimit({
            requestsUsed: newData.requests_used,
            requestsLimit: newData.requests_limit,
            isAdmin: user.app_metadata?.is_admin === true,
            loading: false,
            error: null
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.app_metadata?.is_admin, isAuthenticated]);

  return {
    // State
    requestsUsed: rateLimit.requestsUsed,
    requestsLimit: rateLimit.requestsLimit,
    isAdmin: rateLimit.isAdmin,
    loading: rateLimit.loading,
    error: rateLimit.error,
    
    // Computed values
    hasQuota: hasQuota(),
    usagePercentage: getUsagePercentage(),
    remainingRequests: getRemainingRequests(),
    usageColor: getUsageColor(),
    
    // Actions
    refreshRateLimit: fetchRateLimit
  };
};

export default useRateLimit;