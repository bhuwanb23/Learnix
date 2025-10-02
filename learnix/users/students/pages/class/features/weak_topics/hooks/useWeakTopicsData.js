import { useState, useEffect, useCallback } from 'react';
import { WEAK_TOPICS_DATA } from '../constants/weakTopicsData';

export const useWeakTopicsData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setData(WEAK_TOPICS_DATA);
    } catch (err) {
      setError(err.message || 'Failed to fetch weak topics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refreshing,
    handleRefresh,
  };
};
