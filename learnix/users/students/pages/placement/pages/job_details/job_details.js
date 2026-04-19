import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Ionicons } from '@expo/vector-icons';

// Import components
import JobHeader from './components/JobHeader';
import JobDescription from './components/JobDescription';
import SalaryCompensation from './components/SalaryCompensation';
import EligibilityCriteria from './components/EligibilityCriteria';
import SelectionCriteria from './components/SelectionCriteria';
import DeadlineCard from './components/DeadlineCard';
import JobMetadata from './components/JobMetadata';
import ApplyFooter from './components/ApplyFooter';
import { usePlacementLayout } from '../../placementLayout';

export default function JobDetails({ navigation, route }) {
  const { isCompact, horizontalPadding } = usePlacementLayout();
  const job = route?.job || {
    company: 'Lumina Global Systems',
    title: 'Senior Product Designer',
    type: 'Full-Time',
    isUrgent: true,
  };

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
        </TouchableOpacity>
        <View style={styles.topBarLeft}>
          <View style={styles.profileImage}>
            <Ionicons name="person" size={20} color="#0050d4" />
          </View>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            Placement Portal
          </Text>
        </View>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color="#595c5e" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <JobHeader
          company={job.company}
          title={job.title}
          type={job.type}
          isUrgent={job.isUrgent}
          compact={isCompact}
        />

        {/* Job Description */}
        <JobDescription />

        {/* Salary & Eligibility Grid */}
        <View style={[styles.twoColumnGrid, isCompact && styles.twoColumnGridStacked]}>
          <View style={[styles.gridCell, !isCompact && styles.gridCellRow]}>
            <SalaryCompensation />
          </View>
          <View style={[styles.gridCell, !isCompact && styles.gridCellRow]}>
            <EligibilityCriteria />
          </View>
        </View>

        {/* Selection Criteria */}
        <SelectionCriteria />

        {/* Deadline Card */}
        <DeadlineCard />

        {/* Job Metadata */}
        <JobMetadata />

        {/* Bottom spacing for footer */}
        <View style={{ height: isCompact ? 120 : 108 }} />
      </ScrollView>

      {/* Apply Footer */}
      <ApplyFooter navigation={navigation} compact={isCompact} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f7f9',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 80, 212, 0.2)',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#0050d4',
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    alignItems: 'stretch',
  },
  twoColumnGridStacked: {
    flexDirection: 'column',
  },
  gridCell: {
    alignSelf: 'stretch',
    width: '100%',
  },
  gridCellRow: {
    flex: 1,
    minWidth: 0,
  },
});
