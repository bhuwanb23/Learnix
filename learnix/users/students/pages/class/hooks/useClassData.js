import { useState, useEffect } from 'react';
import {
  mockTodaySchedule,
  mockSubjects,
  mockUpcomingTests,
  mockPendingTopics,
  mockAIRecommendations,
} from '../constants/classData';

export const useClassData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [pendingTopics, setPendingTopics] = useState([]);
  const [aiRecommendations, setAIRecommendations] = useState([]);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set mock data
      setTodaySchedule(mockTodaySchedule);
      setSubjects(mockSubjects);
      setUpcomingTests(mockUpcomingTests);
      setPendingTopics(mockPendingTopics);
      setAIRecommendations(mockAIRecommendations);

    } catch (err) {
      setError(err.message || 'Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassData();
  }, []);

  const refreshData = async () => {
    await fetchClassData();
  };

  return {
    todaySchedule,
    subjects,
    upcomingTests,
    pendingTopics,
    aiRecommendations,
    loading,
    error,
    refreshData,
  };
};
