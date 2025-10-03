import { useState, useEffect } from 'react';
import { mockDashboardData } from '../constants/dashboardData';

export const useDashboardData = () => {
  const [dashboardData, setDashboardData] = useState({
    profile: null,
    quickActions: [],
    progress: [],
    pendingAssignments: [],
    upcomingExams: [],
    recentCompletions: [],
    notifications: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDashboardData(mockDashboardData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (actionId) => {
    // Handle different quick actions
    switch (actionId) {
      case 'upload':
        console.log('Navigate to upload assignment');
        break;
      case 'join':
        console.log('Navigate to join exam');
        break;
      case 'results':
        console.log('Navigate to check results');
        break;
      default:
        console.log('Unknown action:', actionId);
    }
  };

  const handlePendingAssignmentPress = (assignment) => {
    console.log('Navigate to assignment:', assignment.id);
    // Navigate to assignment detail or submission page
  };

  const handleExamPress = (exam) => {
    console.log('Navigate to exam:', exam.id);
    // Navigate to exam or preparation page
  };

  const handleNotificationPress = (notification) => {
    console.log('Handle notification:', notification.id);
    // Mark as read or navigate to relevant page
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const diffInMs = dueDate - now;
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) return 'Overdue';
    if (diffInDays === 0) return 'Due Today';
    if (diffInDays === 1) return 'Due Tomorrow';
    return `Due in ${diffInDays} days`;
  };

  const getDaysUntilExam = (examDate) => {
    const now = new Date();
    const diffInMs = examDate - now;
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60));
    
    if (diffInDays < 0) return 'Past due';
    if (diffInDays === 0) {
      const hours = Math.ceil(diffInHours);
      return hours > 0 ? `${hours} hours` : 'Today';
    }
    if (diffInDays === 1) return `1 day ${24 - Math.floor(diffInHours)} hours`;
    return `${diffInDays} days ${24 - Math.floor(diffInHours)} hours`;
  };

  const refresh = () => {
    loadDashboardData();
  };

  return {
    dashboardData,
    loading,
    error,
    handleQuickAction,
    handlePendingAssignmentPress,
    handleExamPress,
    handleNotificationPress,
    getTimeAgo,
    getDaysUntilDue,
    getDaysUntilExam,
    refresh
  };
};
