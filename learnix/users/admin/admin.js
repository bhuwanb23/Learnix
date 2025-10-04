import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import components
import AdminHeader from './components/AdminHeader';
import AdminBottomNavbar from './components/AdminBottomNavbar';

// Import pages
import AcademicsExaminations from './pages/AcademicsExaminations/academicsExaminations';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

export default function AdminScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentScreen, setCurrentScreen] = useState('main');
  const insets = useSafeAreaInsetsWithPadding();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentScreen('main');
  };

  const handleBackPress = () => {
    setCurrentScreen('main');
  };

  const renderDashboardContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Quick Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="people" size={24} color="#7c3aed" />
          </View>
          <Text style={styles.statNumber}>1,234</Text>
          <Text style={styles.statLabel}>Total Students</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="school" size={24} color="#059669" />
          </View>
          <Text style={styles.statNumber}>89</Text>
          <Text style={styles.statLabel}>Teachers</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="book" size={24} color="#dc2626" />
          </View>
          <Text style={styles.statNumber}>156</Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="analytics" size={24} color="#d97706" />
          </View>
          <Text style={styles.statNumber}>98.5%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="person-add" size={32} color="#7c3aed" />
            <Text style={styles.quickActionLabel}>Add Student</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="school" size={32} color="#059669" />
            <Text style={styles.quickActionLabel}>Add Teacher</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="book" size={32} color="#dc2626" />
            <Text style={styles.quickActionLabel}>Create Course</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => setCurrentScreen('AcademicsExaminations')}
            activeOpacity={0.8}
          >
            <Ionicons name="school" size={32} color="#7c3aed" />
            <Text style={styles.quickActionLabel}>Academics & Exams</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="document-text" size={32} color="#d97706" />
            <Text style={styles.quickActionLabel}>Generate Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivityContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="person-add" size={16} color="#059669" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New student enrolled</Text>
              <Text style={styles.activityTime}>2 minutes ago</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="book" size={16} color="#7c3aed" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Course updated</Text>
              <Text style={styles.activityTime}>15 minutes ago</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="analytics" size={16} color="#d97706" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Monthly report generated</Text>
              <Text style={styles.activityTime}>1 hour ago</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    // Handle sub-screens first
    if (currentScreen === 'AcademicsExaminations') {
      return <AcademicsExaminations navigation={{ navigate: setCurrentScreen }} />;
    }

    // Handle main tabs
    switch (activeTab) {
      case 'Dashboard':
        return renderDashboardContent();
      case 'Students':
        return (
          <View style={styles.placeholderContent}>
            <Ionicons name="people" size={64} color="#7c3aed" />
            <Text style={styles.placeholderTitle}>Student Management</Text>
            <Text style={styles.placeholderDescription}>
              Manage student enrollments, profiles, and academic records
            </Text>
          </View>
        );
      case 'Teachers':
        return (
          <View style={styles.placeholderContent}>
            <Ionicons name="school" size={64} color="#059669" />
            <Text style={styles.placeholderTitle}>Teacher Management</Text>
            <Text style={styles.placeholderDescription}>
              Manage faculty profiles, schedules, and course assignments
            </Text>
          </View>
        );
      case 'Courses':
        return (
          <View style={styles.placeholderContent}>
            <Ionicons name="book" size={64} color="#dc2626" />
            <Text style={styles.placeholderTitle}>Course Management</Text>
            <Text style={styles.placeholderDescription}>
              Create and manage courses, curriculum, and academic programs
            </Text>
          </View>
        );
      case 'Reports':
        return (
          <View style={styles.placeholderContent}>
            <Ionicons name="analytics" size={64} color="#d97706" />
            <Text style={styles.placeholderTitle}>Reports & Analytics</Text>
            <Text style={styles.placeholderDescription}>
              Generate reports, view analytics, and track system performance
            </Text>
          </View>
        );
      default:
        return renderDashboardContent();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} edges={['left', 'right', 'bottom']}>
      <AdminHeader
        activeTab={activeTab}
        currentScreen={currentScreen === 'main' ? null : currentScreen}
        onBackPress={currentScreen === 'main' ? null : handleBackPress}
      />
      
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
      
      <AdminBottomNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statNumber: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  quickActionsContainer: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  quickActionLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  recentActivityContainer: {
    marginBottom: SPACING.xl,
  },
  activityList: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  placeholderTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  placeholderDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
