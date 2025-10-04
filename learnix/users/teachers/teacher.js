import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TeacherHeader from './components/TeacherHeader';
import TeacherBottomNavbar from './components/TeacherBottomNavbar';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';
import TeacherDashboard from './pages/dashboard/dashboard';
import AttendancePage from './pages/class/pages/attendance/attendance';
import AttendanceMarksPage from './pages/class/pages/attendance/attendance_mark/attendance_marks';
import UploadNotesPage from './pages/class/pages/upload_notes/upload_notes';
import TeacherClassPage from './pages/class/class';
import AssignmentExamsPage from './pages/assignment_exams/assignment_exams';
import TeacherProfilePage from './pages/profile/profile';
import StudentPerformancePage from './pages/student_performance/student_performance';

export default function TeacherScreen() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentScreen, setCurrentScreen] = useState('main');
  const insets = useSafeAreaInsetsWithPadding();

  const renderContent = () => {
    // Handle attendance screens
    if (currentScreen === 'Attendance') {
      return <AttendancePage navigation={{ navigate: setCurrentScreen }} />;
    }
    if (currentScreen === 'AttendanceMarks') {
      return <AttendanceMarksPage navigation={{ navigate: setCurrentScreen }} />;
    }
    if (currentScreen === 'UploadNotes') {
      return <UploadNotesPage navigation={{ navigate: setCurrentScreen }} />;
    }

    switch (activeTab) {
      case 'Dashboard':
        return <TeacherDashboard />;
      case 'Classes':
        return <TeacherClassPage navigation={{ navigate: setCurrentScreen }} />;
      case 'Assignments':
        return <AssignmentExamsPage />;
      case 'Profile':
        return <TeacherProfilePage />;
      case 'Performance':
        return <StudentPerformancePage />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TeacherHeader />
      <ScrollView style={[styles.content, { paddingBottom: insets.bottom + SPACING.lg }]} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
      <TeacherBottomNavbar activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
});

