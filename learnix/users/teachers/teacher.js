import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TeacherHeader from './components/TeacherHeader';
import TeacherBottomNavbar from './components/TeacherBottomNavbar';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';
import TeacherDashboard from './pages/dashboard/dashboard';

export default function TeacherScreen() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const insets = useSafeAreaInsetsWithPadding();

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <TeacherDashboard />;
      case 'Classes':
        {
          const TeacherClassPage = require('./pages/class/class').default;
          return <TeacherClassPage />;
        }
      case 'Assignments':
        {
          const AssignmentExamsPage = require('./pages/assignment_exams/assignment_exams').default;
          return <AssignmentExamsPage />;
        }
      case 'Profile':
        {
          const TeacherProfilePage = require('./pages/profile/profile').default;
          return <TeacherProfilePage />;
        }
      case 'Performance':
        {
          const StudentPerformancePage = require('./pages/student_performance/student_performance').default;
          return <StudentPerformancePage />;
        }
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

