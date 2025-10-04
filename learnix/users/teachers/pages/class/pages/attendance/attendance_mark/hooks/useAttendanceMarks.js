import { useState, useEffect, useCallback } from 'react';
import { 
  STUDENTS, 
  CLASS_INFO,
  ATTENDANCE_TABS,
  QUICK_ACTIONS,
  FRAUD_ALERT,
  getAttendanceStats,
  markAllPresent,
  markAllAbsent,
  toggleStudentStatus,
  getProgressPercentage
} from '../constants/attendanceData';

export const useAttendanceMarks = () => {
  const [students, setStudents] = useState(STUDENTS);
  const [classInfo, setClassInfo] = useState(CLASS_INFO);
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFraudAlert, setShowFraudAlert] = useState(FRAUD_ALERT.show);
  const [stats, setStats] = useState(null);

  // Calculate stats whenever students change
  useEffect(() => {
    const calculatedStats = getAttendanceStats(students);
    setStats(calculatedStats);
    
    // Update class info with new stats
    setClassInfo(prev => ({
      ...prev,
      presentToday: calculatedStats.presentCount,
      absentToday: calculatedStats.absentCount,
      attendanceRate: calculatedStats.attendanceRate
    }));
  }, [students]);

  // Load students (simulate API call)
  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStudents(STUDENTS);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save attendance (simulate API call)
  const saveAttendance = useCallback(async () => {
    setSaving(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Attendance saved:', students);
      // Show success message or navigate back
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setSaving(false);
    }
  }, [students]);

  // Handle tab change
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Handle student status change
  const handleStudentStatusChange = useCallback((studentId, newStatus) => {
    setStudents(prev => toggleStudentStatus(prev, studentId, newStatus));
  }, []);

  // Handle mark all present
  const handleMarkAllPresent = useCallback(() => {
    setStudents(prev => markAllPresent(prev));
  }, []);

  // Handle mark all absent
  const handleMarkAllAbsent = useCallback(() => {
    setStudents(prev => markAllAbsent(prev));
  }, []);

  // Handle auto-mark (simulate AI-based marking)
  const handleAutoMark = useCallback(() => {
    // Simulate AI-based attendance marking
    const autoMarkedStudents = students.map(student => {
      // Simple logic: mark students with high attendance rate as present
      const shouldBePresent = student.attendanceRate > 80;
      return {
        ...student,
        status: shouldBePresent ? 'present' : 'absent'
      };
    });
    setStudents(autoMarkedStudents);
  }, [students]);

  // Handle quick action
  const handleQuickAction = useCallback((actionId) => {
    switch (actionId) {
      case 'mark-all':
        handleMarkAllPresent();
        break;
      case 'auto-mark':
        handleAutoMark();
        break;
      default:
        console.log('Unknown action:', actionId);
    }
  }, [handleMarkAllPresent, handleAutoMark]);

  // Handle back navigation
  const handleBack = useCallback((navigation) => {
    console.log('Navigate back to class list');
    if (navigation && navigation.navigate) {
      navigation.navigate('Attendance');
    }
  }, []);

  // Handle menu press
  const handleMenuPress = useCallback(() => {
    console.log('Menu pressed');
    // Show menu options
  }, []);

  // Handle fraud alert dismiss
  const handleDismissFraudAlert = useCallback(() => {
    setShowFraudAlert(false);
  }, []);

  // Get progress percentage
  const progressPercentage = getProgressPercentage(stats?.presentCount || 0, stats?.totalStudents || 0);

  return {
    // Data
    students,
    classInfo,
    activeTab,
    loading,
    saving,
    showFraudAlert,
    stats,
    progressPercentage,
    tabs: ATTENDANCE_TABS,
    quickActions: QUICK_ACTIONS,
    fraudAlert: FRAUD_ALERT,
    
    // Actions
    loadStudents,
    saveAttendance,
    handleTabChange,
    handleStudentStatusChange,
    handleQuickAction,
    handleBack,
    handleMenuPress,
    handleDismissFraudAlert
  };
};
