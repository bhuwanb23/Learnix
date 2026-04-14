import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
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

// Import theme
import { COLORS, SPACING, TYPOGRAPHY } from '../../../../../../constants/theme';

export default function JobDetails({ navigation, route }) {
  const job = route?.job || {
    company: 'Lumina Global Systems',
    title: 'Senior Product Designer',
    type: 'Full-Time',
    isUrgent: true,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.profileImage}>
            <Ionicons name="person" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.topBarTitle}>Placement Portal</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <JobHeader
          company={job.company}
          title={job.title}
          type={job.type}
          isUrgent={job.isUrgent}
        />

        {/* Job Description */}
        <JobDescription />

        {/* Salary & Eligibility Grid */}
        <View style={styles.twoColumnGrid}>
          <SalaryCompensation />
          <EligibilityCriteria />
        </View>

        {/* Selection Criteria */}
        <SelectionCriteria />

        {/* Deadline Card */}
        <DeadlineCard />

        {/* Job Metadata */}
        <JobMetadata />

        {/* Bottom spacing for footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Apply Footer */}
      <ApplyFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
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
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
});
