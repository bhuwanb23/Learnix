import { useState, useEffect } from 'react';
import {
  mockUserStats,
  mockQuickActions,
  mockSubjects,
  mockWeakTopics,
  mockLeaderboard,
  mockAchievements
} from '../constants/quizData';

export default function useQuizData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [userStats, setUserStats] = useState(mockUserStats);
  const [quickActions, setQuickActions] = useState(mockQuickActions);
  const [subjects, setSubjects] = useState(mockSubjects);
  const [weakTopics, setWeakTopics] = useState(mockWeakTopics);
  const [leaderboard, setLeaderboard] = useState(mockLeaderboard);
  const [achievements, setAchievements] = useState(mockAchievements);

  const fetchQuizData = async () => {
    try {
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, these would be API calls
      setUserStats(mockUserStats);
      setQuickActions(mockQuickActions);
      setSubjects(mockSubjects);
      setWeakTopics(mockWeakTopics);
      setLeaderboard(mockLeaderboard);
      setAchievements(mockAchievements);
      
    } catch (err) {
      setError('Failed to load quiz data');
      console.error('Error fetching quiz data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchQuizData();
  };

  useEffect(() => {
    fetchQuizData();
  }, []);

  return {
    loading,
    error,
    refreshing,
    userStats,
    quickActions,
    subjects,
    weakTopics,
    leaderboard,
    achievements,
    refreshData
  };
}
