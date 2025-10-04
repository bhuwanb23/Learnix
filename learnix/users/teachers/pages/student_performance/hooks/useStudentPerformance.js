import { useState, useEffect } from 'react';
import { 
  PERFORMANCE_SUMMARY, 
  WEAK_TOPICS, 
  PERFORMANCE_CHART_DATA, 
  QUICK_ACTIONS, 
  RECENT_ACTIVITY,
  STUDENT_SEARCH_RESULTS 
} from '../constants/performanceData';

export const useStudentPerformance = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [performanceData, setPerformanceData] = useState({
    summary: PERFORMANCE_SUMMARY,
    weakTopics: WEAK_TOPICS,
    chartData: PERFORMANCE_CHART_DATA,
    quickActions: QUICK_ACTIONS,
    recentActivity: RECENT_ACTIVITY
  });

  // Handle search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setIsSearching(true);
      // Simulate API call
      setTimeout(() => {
        const filtered = STUDENT_SEARCH_RESULTS.filter(student =>
          student.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
        setIsSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Handle student selection
  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle quick action navigation
  const handleQuickAction = (action) => {
    console.log('Quick action selected:', action.title);
    // Navigation logic would go here
  };

  // Refresh performance data
  const refreshData = () => {
    // Simulate data refresh
    console.log('Refreshing performance data...');
  };

  // Get performance insights
  const getPerformanceInsights = () => {
    const insights = {
      totalStudents: STUDENT_SEARCH_RESULTS.length,
      averageAttendance: Math.round(
        STUDENT_SEARCH_RESULTS.reduce((sum, student) => sum + student.attendance, 0) / 
        STUDENT_SEARCH_RESULTS.length
      ),
      averageScore: Math.round(
        STUDENT_SEARCH_RESULTS.reduce((sum, student) => sum + student.averageScore, 0) / 
        STUDENT_SEARCH_RESULTS.length
      ),
      topPerformer: STUDENT_SEARCH_RESULTS.reduce((top, student) => 
        student.averageScore > top.averageScore ? student : top
      ),
      needsAttention: STUDENT_SEARCH_RESULTS.filter(student => 
        student.averageScore < 70 || student.attendance < 80
      )
    };
    return insights;
  };

  return {
    // State
    searchQuery,
    searchResults,
    isSearching,
    selectedStudent,
    performanceData,
    
    // Actions
    handleSearch,
    selectStudent,
    handleQuickAction,
    refreshData,
    getPerformanceInsights
  };
};
