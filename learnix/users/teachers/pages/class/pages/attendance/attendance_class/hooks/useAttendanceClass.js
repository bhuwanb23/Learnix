import { useState, useEffect } from 'react';
import { TEACHER_CLASSES, getClassStats } from '../constants/attendanceData';

export const useAttendanceClass = () => {
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalPresent: 0,
    averageAttendance: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredClasses, setFilteredClasses] = useState([]);

  // Load initial data
  useEffect(() => {
    loadClasses();
  }, []);

  // Filter classes based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClasses(classes);
    } else {
      const filtered = classes.filter(cls => 
        cls.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.classCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredClasses(filtered);
    }
  }, [searchQuery, classes]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setClasses(TEACHER_CLASSES);
      const classStats = getClassStats(TEACHER_CLASSES);
      setStats(classStats);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClasses();
    setRefreshing(false);
  };

  const handleClassPress = (classItem) => {
    console.log('Class pressed:', classItem.className);
    // Navigate to class attendance details
  };

  const handleMarkAttendance = (classItem) => {
    console.log('Mark attendance for:', classItem.className);
    // Navigate to mark attendance screen
  };

  const handleViewReports = (classItem) => {
    console.log('View reports for:', classItem.className);
    // Navigate to reports screen
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return {
    classes: filteredClasses,
    stats,
    loading,
    refreshing,
    searchQuery,
    onRefresh,
    handleClassPress,
    handleMarkAttendance,
    handleViewReports,
    handleSearch,
    clearSearch
  };
};
