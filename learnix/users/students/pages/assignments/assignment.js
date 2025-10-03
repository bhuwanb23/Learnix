import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// Import components
import TabNavigation from './components/TabNavigation';
import Dashboard from './components/Dashboard';
import AssignmentSubmission from './pages/assignment/assignment_submission';
import Exams from './pages/exams/exams';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../constants/theme';

export default function AssignmentPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
  };

  const handleQuickActionPress = (actionId) => {
    console.log('Quick action pressed:', actionId);
    // Handle quick actions from dashboard
  };

  const renderDashboardTab = () => (
    <Dashboard onQuickActionPress={handleQuickActionPress} />
  );

  const renderAssignmentsTab = () => (
    <AssignmentSubmission />
  );

  const renderExamsTab = () => (
    <Exams />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardTab();
      case 'assignments':
        return renderAssignmentsTab();
      case 'exams':
        return renderExamsTab();
      default:
        return renderDashboardTab();
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <TabNavigation
        tabs={[
          { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline' },
          { id: 'assignments', title: 'Assignments', icon: 'document-text-outline' },
          { id: 'exams', title: 'Exams', icon: 'school-outline' },
        ]}
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {renderTabContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  placeholderText: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});