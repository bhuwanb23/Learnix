import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import components
import DriveCard from './components/DriveCard';
import InsightsSection from './components/InsightsSection';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../constants/theme';
import { STUDENT_HOME_FONT } from '../../../../constants/studentHomeTypography';

const drives = [
  {
    id: '1',
    company: 'Google',
    initial: 'G',
    role: 'Software Engineering Intern',
    date: 'Oct 24, 2026',
    location: 'Virtual',
    locationType: 'virtual',
    status: 'Open',
    statusType: 'open',
    buttonText: 'View Details',
    buttonType: 'primary',
  },
  {
    id: '2',
    company: 'Microsoft',
    initial: 'M',
    role: 'Cloud Solutions Architect',
    date: 'Oct 28, 2026',
    location: 'Main Auditorium',
    locationType: 'location',
    status: 'Registered',
    statusType: 'registered',
    buttonText: 'Applied',
    buttonType: 'secondary',
  },
  {
    id: '3',
    company: 'Amazon',
    initial: 'A',
    role: 'Full Stack Developer',
    date: 'Nov 05, 2026',
    location: 'Engineering Block C',
    locationType: 'location',
    status: 'Closing Soon',
    statusType: 'closing',
    buttonText: 'Register Now',
    buttonType: 'primary',
  },
  {
    id: '4',
    company: 'Adobe',
    initial: 'Ad',
    role: 'Product Designer',
    date: 'Nov 12, 2026',
    location: 'Seminar Hall',
    locationType: 'location',
    status: 'Upcoming',
    statusType: 'upcoming',
    buttonText: 'Not Yet Open',
    buttonType: 'disabled',
  },
];

export default function PlacementDrive({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Placement Drives</Text>
        </View>
        <View style={styles.profileImage}>
          <Ionicons name="person" size={20} color={COLORS.primary} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View style={styles.heroHeader}>
          <Text style={styles.subtitle}>Placement Directory</Text>
          <Text style={styles.title}>Upcoming Drives</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies or roles..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <Ionicons name="tune-outline" size={18} color={COLORS.textPrimary} />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Drives Grid */}
        <View style={styles.drivesGrid}>
          {drives.map((drive) => (
            <DriveCard key={drive.id} drive={drive} />
          ))}
        </View>

        {/* Insights Section */}
        <InsightsSection />
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
    fontSize: STUDENT_HOME_FONT.sectionTitle,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  heroHeader: {
    marginBottom: SPACING.xl,
  },
  subtitle: {
    fontSize: STUDENT_HOME_FONT.captionWide,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: STUDENT_HOME_FONT.heroTitle,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  filterButtonText: {
    fontSize: STUDENT_HOME_FONT.cardMeta,
    fontFamily: 'Manrope-Bold',
    color: COLORS.textPrimary,
  },
  drivesGrid: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
});
