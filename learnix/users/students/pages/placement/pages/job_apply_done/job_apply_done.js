import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import components
import SuccessHeader from './components/SuccessHeader';
import JobSummaryCard from './components/JobSummaryCard';
import ApplicationTracker from './components/ApplicationTracker';
import ProTipCard from './components/ProTipCard';
import ActionButtons from './components/ActionButtons';
import { usePlacementLayout } from '../../placementLayout';

export default function JobApplyDone({ navigation, route }) {
  const { horizontalPadding, isCompact } = usePlacementLayout();
  const handleViewApplication = () => {
    // Navigate to view application details
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleBackToJobs = () => {
    // Navigate back to browse jobs
    if (navigation?.navigate) {
      navigation.navigate('BrowseJobs', {});
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Header */}
        <SuccessHeader compact={isCompact} />

        {/* Job Summary Card */}
        <JobSummaryCard />

        {/* Application Tracker */}
        <ApplicationTracker />

        {/* Pro Tip Card */}
        <ProTipCard compact={isCompact} />

        {/* Action Buttons */}
        <ActionButtons 
          onViewApplication={handleViewApplication}
          onBackToJobs={handleBackToJobs}
        />
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: 28,
    paddingBottom: 40,
  },
});
