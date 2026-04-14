import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

// Import components
import SuccessHeader from './components/SuccessHeader';
import JobSummaryCard from './components/JobSummaryCard';
import ApplicationTracker from './components/ApplicationTracker';
import ProTipCard from './components/ProTipCard';
import ActionButtons from './components/ActionButtons';

export default function JobApplyDone({ navigation, route }) {
  const handleViewApplication = () => {
    // Navigate to view application details
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleBackToJobs = () => {
    // Navigate back to jobs list
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Header */}
        <SuccessHeader />

        {/* Job Summary Card */}
        <JobSummaryCard />

        {/* Application Tracker */}
        <ApplicationTracker />

        {/* Pro Tip Card */}
        <ProTipCard />

        {/* Action Buttons */}
        <ActionButtons 
          onViewApplication={handleViewApplication}
          onBackToJobs={handleBackToJobs}
        />

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
});
