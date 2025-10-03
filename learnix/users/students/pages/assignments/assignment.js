import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

// Import components
import TabNavigation from './components/TabNavigation';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../constants/theme';

export default function AssignmentPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
  };

  const renderDashboardTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>Dashboard Tab</Text>
        <Text style={styles.placeholderSubtext}>Content will be added here</Text>
      </View>
    </ScrollView>
  );

  const renderAssignmentsTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>Assignments Tab</Text>
        <Text style={styles.placeholderSubtext}>Content will be added here</Text>
      </View>
    </ScrollView>
  );

  const renderExamsTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>Exams Tab</Text>
        <Text style={styles.placeholderSubtext}>Content will be added here</Text>
      </View>
    </ScrollView>
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