import { useState, useEffect, useCallback } from 'react';
import { 
  ATTENDANCE_CLASSES, 
  ATTENDANCE_TABS,
  getAttendanceStats,
  filterClassesByTab,
  searchClasses
} from '../constants/attendanceData';

export const useAttendanceClass = () => {
  const [classes, setClasses] = useState(ATTENDANCE_CLASSES);
  const [filteredClasses, setFilteredClasses] = useState(ATTENDANCE_CLASSES);
  const [activeTab, setActiveTab] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  // Calculate stats whenever classes change
  useEffect(() => {
    const calculatedStats = getAttendanceStats(classes);
    setStats(calculatedStats);
  }, [classes]);

  // Filter classes based on active tab and search query
  useEffect(() => {
    let filtered = filterClassesByTab(classes, activeTab);
    filtered = searchClasses(filtered, searchQuery);
    setFilteredClasses(filtered);
  }, [classes, activeTab, searchQuery]);

  // Load classes (simulate API call)
  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setClasses(ATTENDANCE_CLASSES);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh classes
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setClasses(ATTENDANCE_CLASSES);
    } catch (error) {
      console.error('Error refreshing classes:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Handle class press
  const handleClassPress = useCallback((classId) => {
    console.log('Class pressed:', classId);
    // Navigate to class details or attendance marking
  }, []);

  // Handle mark attendance
  const handleMarkAttendance = useCallback((classId) => {
    console.log('Mark attendance for class:', classId);
    // Navigate to attendance marking screen
  }, []);

  // Handle view reports
  const handleViewReports = useCallback((classId) => {
    console.log('View reports for class:', classId);
    // Navigate to reports screen
  }, []);

  // Handle add class
  const handleAddClass = useCallback(() => {
    console.log('Add new class');
    // Navigate to add class screen
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    // Data
    classes: filteredClasses,
    allClasses: classes,
    activeTab,
    searchQuery,
    loading,
    refreshing,
    stats,
    tabs: ATTENDANCE_TABS,
    
    // Actions
    loadClasses,
    onRefresh,
    handleTabChange,
    handleSearch,
    handleClassPress,
    handleMarkAttendance,
    handleViewReports,
    handleAddClass,
    clearSearch
  };
};
