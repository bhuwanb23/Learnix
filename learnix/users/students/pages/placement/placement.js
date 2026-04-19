import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useStudentResponsive, STUDENT_MAX_CONTENT_WIDTH } from '../../hooks/useStudentResponsive';

// Import components
import PlacementHeader from './components/PlacementHeader';
import QuickActions from './components/QuickActions';
import ProfileStrength from './components/ProfileStrength';
import RecommendedJobs from './components/RecommendedJobs';
import UpcomingDrives from './components/UpcomingDrives';

export default function PlacementPage({ navigation, studentHeader }) {
  const { isDesktop, horizontalPadding } = useStudentResponsive();

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding },
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {studentHeader}
        {/* Dashboard Header */}
        <PlacementHeader />

        {/* Quick Actions */}
        <QuickActions navigation={navigation} />

        {/* Profile Strength & Stats */}
        <ProfileStrength />

        {/* Recommended Jobs */}
        <RecommendedJobs navigation={navigation} />

        {/* Upcoming Drives */}
        <UpcomingDrives navigation={navigation} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    maxWidth: STUDENT_MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
});
