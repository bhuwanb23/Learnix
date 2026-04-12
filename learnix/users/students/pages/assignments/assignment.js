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
import UpcomingAssignmentPage from './features/upcoming/upcoming_assignment';
import CompletedReviewPage from './features/completed_review/completed_review';
import CompletedResultsPage from './features/completed_results/completed_results';
import AssignmentDetailsPage from './features/active/assignment_details/assignment_details';

// Import theme
import { COLORS, SPACING } from '../../../../constants/theme';

// Import data
import {
  weeklyVelocity,
  subjectAllocation,
  statsCards,
  activeAssignments,
  upcomingAssignments,
  completedAssignments,
  recentCompletions,
} from './constants/dashboardData';

export default function AssignmentPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [currentView, setCurrentView] = useState('list'); // 'list', 'upcoming-detail', 'completed-review', 'completed-results', or 'active-detail'
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Select assignments based on active tab
  const getAssignmentsForTab = () => {
    switch (activeTab.toLowerCase()) {
      case 'active':
        return activeAssignments;
      case 'upcoming':
        return upcomingAssignments;
      case 'completed':
        return completedAssignments;
      default:
        return activeAssignments;
    }
  };

  const currentAssignments = getAssignmentsForTab();

  // Handle assignment card press
  const handleAssignmentPress = (assignment) => {
    const tab = activeTab.toLowerCase();
    if (tab === 'active') {
      setSelectedAssignment(assignment);
      setCurrentView('active-detail');
    } else if (tab === 'upcoming') {
      setSelectedAssignment(assignment);
      setCurrentView('upcoming-detail');
    } else if (tab === 'completed') {
      setSelectedAssignment(assignment);
      if (assignment.underReview) {
        setCurrentView('completed-review');
      } else {
        setCurrentView('completed-results');
      }
    }
  };

  // Navigate back to list
  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedAssignment(null);
  };

  return (
    <View style={styles.container}>
      {/* Show Assignment Detail Pages */}
      {currentView === 'active-detail' ? (
        <AssignmentDetailsPage
          navigation={{ goBack: handleBackToList }}
          route={{ params: { assignment: selectedAssignment } }}
        />
      ) : currentView === 'upcoming-detail' ? (
        <UpcomingAssignmentPage
          navigation={{ goBack: handleBackToList }}
          route={{ params: { assignment: selectedAssignment } }}
        />
      ) : currentView === 'completed-review' ? (
        <CompletedReviewPage
          navigation={{ goBack: handleBackToList }}
          route={{ params: { assignment: selectedAssignment } }}
        />
      ) : currentView === 'completed-results' ? (
        <CompletedResultsPage
          navigation={{ goBack: handleBackToList }}
          route={{ params: { assignment: selectedAssignment } }}
        />
      ) : (
        <>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
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
                tabs={['Active', 'Upcoming', 'Completed']}
                activeTab={activeTab}
                onTabPress={setActiveTab}
              />

              {/* Main Content Grid */}
              <View style={[styles.contentGrid, isDesktop && styles.contentGridDesktop]}>
                {/* Assignment Cards List */}
                <View style={[styles.assignmentsColumn, isDesktop && styles.assignmentsColumnDesktop]}>
                  <AssignmentList 
                    assignments={currentAssignments}
                    onAssignmentPress={handleAssignmentPress}
                    activeTab={activeTab}
                  />
                </View>

                {/* Recent Completions Sidebar */}
                <View style={[styles.sidebarColumn, isDesktop && styles.sidebarColumnDesktop]}>
                  <RecentCompletionsSidebar completions={recentCompletions} />
                </View>
              </View>
            </View>
          </ScrollView>
        </>
      )}
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
