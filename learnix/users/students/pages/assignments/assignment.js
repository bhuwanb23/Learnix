import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  StatusBar,
} from 'react-native';

// Import components
import AssignmentHeader from './components/AssignmentHeader';
import ProgressOverviewBento from './components/ProgressOverviewBento';
import StatsCardsRow from './components/StatsCardsRow';
import AssignmentTabs from './components/AssignmentTabs';
import AssignmentList from './components/AssignmentList';
import RecentCompletionsSidebar from './components/RecentCompletionsSidebar';
import FloatingAddButton from './components/FloatingAddButton';

// Import theme
import { COLORS, SPACING } from '../../../../constants/theme';

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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.gray50} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <AssignmentHeader />

        {/* Progress Overview Bento Grid */}
        <View style={isDesktop ? styles.desktopContainer : null}>
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
          <View style={[styles.contentGrid, isDesktop && styles.contentGridDesktop]}>
            {/* Assignment Cards List */}
            <View style={[styles.assignmentsColumn, isDesktop && styles.assignmentsColumnDesktop]}>
              <AssignmentList assignments={assignments} />
            </View>

            {/* Recent Completions Sidebar */}
            <View style={[styles.sidebarColumn, isDesktop && styles.sidebarColumnDesktop]}>
              <RecentCompletionsSidebar completions={recentCompletions} />
            </View>
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
    backgroundColor: COLORS.gray50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, 
  },
  desktopContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  contentGrid: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    flexDirection: 'column',
    gap: SPACING.xl,
  },
  contentGridDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  assignmentsColumn: {
    flex: 1,
  },
  assignmentsColumnDesktop: {
    flex: 2,
  },
  sidebarColumn: {
    flex: 1,
  },
  sidebarColumnDesktop: {
    flex: 1,
    marginTop: 0,
  },
});
