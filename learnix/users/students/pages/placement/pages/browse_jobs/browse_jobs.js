import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import components
import FilterChips from './components/FilterChips';
import JobCard from './components/JobCard';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY } from '../../../../../../constants/theme';

export default function BrowseJobs({ navigation }) {
  const [activeFilters, setActiveFilters] = useState(['All Roles']);

  const handleFilterPress = (filter) => {
    if (filter === 'All Roles') {
      setActiveFilters(['All Roles']);
    } else {
      const newFilters = activeFilters.includes('All Roles')
        ? [filter]
        : activeFilters.includes(filter)
        ? activeFilters.filter((f) => f !== filter)
        : [...activeFilters, filter];
      setActiveFilters(newFilters.length > 0 ? newFilters : ['All Roles']);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Job Opportunities</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={() => Alert.alert('Search', 'Type a role or company to filter the job list below.')}>
            <Ionicons name="search-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.profileImage}>
            <Ionicons name="person" size={20} color={COLORS.primary} />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Header */}
        <View style={styles.editorialHeader}>
          <Text style={styles.headerTitle}>Find Your Next Step</Text>
          <Text style={styles.headerSubtitle}>
            Curated career paths for ambitious students. Filter through premium internships
            and full-time roles from top-tier organizations.
          </Text>
        </View>

        {/* Filter Chips */}
        <FilterChips
          activeFilters={activeFilters}
          onFilterPress={handleFilterPress}
        />

        {/* Job List */}
        <View style={styles.jobList}>
          <JobCard
            company="Stellar Tech Systems"
            title="Product Designer Intern"
            location="San Francisco, CA"
            type="Full-time Internship"
            package="$45 - $60 / hour"
            eligibility="3rd/4th Year Students"
            deadline="Oct 15, 2024"
            isUrgent={true}
            navigation={navigation}
          />
          <JobCard
            company="Vortex AI Labs"
            title="Junior ML Engineer"
            location="Remote (Worldwide)"
            type="Entry Level"
            package="$120k - $145k / year"
            eligibility="Graduates (CS/Math)"
            deadline="Nov 2, 2024"
            isUrgent={false}
            navigation={navigation}
          />
          <JobCard
            company="Beam Finance"
            title="Data Analyst"
            location="New York, NY"
            type="Contractual"
            package="$80k - $95k / year"
            eligibility="Open to All Majors"
            deadline="Dec 20, 2024"
            isUrgent={false}
            navigation={navigation}
          />
        </View>
      </ScrollView>
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
  backButton: {
    padding: SPACING.xs,
  },
  topBarTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  editorialHeader: {
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: SPACING.md,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(44, 47, 49, 0.7)',
    lineHeight: 22,
  },
  jobList: {
    gap: SPACING.lg,
  },
});
