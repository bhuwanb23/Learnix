import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

// Import components
import AssignmentHeader from './components/AssignmentHeader';
import ProgressOverviewBento from './components/ProgressOverviewBento';
import StatsCardsRow from './components/StatsCardsRow';
import AssignmentTabs from './components/AssignmentTabs';
import AssignmentList from './components/AssignmentList';
import RecentCompletionsSidebar from './components/RecentCompletionsSidebar';
import FloatingAddButton from './components/FloatingAddButton';

// Import data
import {
  weeklyVelocity,
  subjectAllocation,
  statsCards,
  assignments,
  recentCompletions,
} from './constants/dashboardData';

export default function AssignmentPage() {
  const [activeTab, setActiveTab] = useState('active');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <AssignmentHeader />

        {/* Progress Overview Bento Grid */}
        <ProgressOverviewBento
          velocity={weeklyVelocity}
          allocation={subjectAllocation}
        />

        {/* Stats Cards Row */}
        <StatsCardsRow stats={statsCards} />

        {/* Tabbed Navigation */}
        <AssignmentTabs
          tabs={['Active Tasks', 'Upcoming', 'Archived']}
          activeTab={activeTab}
          onTabPress={setActiveTab}
        />

        {/* Main Content Grid */}
        <View style={styles.contentGrid}>
          {/* Assignment Cards List */}
          <View style={styles.assignmentsColumn}>
            <AssignmentList assignments={assignments} />
          </View>

          {/* Recent Completions Sidebar */}
          <View style={styles.sidebarColumn}>
            <RecentCompletionsSidebar completions={recentCompletions} />
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingAddButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9', // bg-surface
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // pb-32 space for FAB and bottom nav
  },
  contentGrid: {
    marginHorizontal: 24, // px-6 from main
    marginTop: 32, // mt-8
    flexDirection: 'column', // lg:grid-cols-3
    gap: 32, // gap-8
  },
  assignmentsColumn: {
    // lg:col-span-2 in HTML, but for mobile we stack
  },
  sidebarColumn: {
    // sidebar space-y-6 handled inside component
  },
});
