import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../constants/theme';

const jobs = [
  {
    id: '1',
    title: 'Software Engineer',
    company: 'CloudNexus Systems',
    salary: '$120k - $140k',
    location: 'Remote',
    isTopMatch: true,
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpskx4aCzaMNQVueRUfFkKkSJLJc2KjObIZh5qlscrrC9y20r1N8Ui-Xfdjl2F3bA5X_pkxF0ssEReobToUWYfGoezOpNQDM7zpmiOXXRRp_fW5c2YINvM7ZOTh9iLUjK1YF5AuKLiLoTgs36_RKoPlnguUOvETZYNf_oIk0quOtlN419OqVwpreJVflHGt41avnZMqspUoJiC9XihDmxsiAu0kHCAzDCKhY2TXT2X5EIw04-eMck69hM37mPVaB0HX-ok0SM6EEI',
  },
  {
    id: '2',
    title: 'Data Analyst',
    company: 'InsightCore Analytics',
    salary: '$95k - $110k',
    location: 'Austin, TX',
    isTopMatch: false,
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAt5qCuZsmc3dmSNTmMg6_3n5MjKQS6bRi3YkLA_HAFxGcyITAFyG7ZYKCYUcd7AMamQd-z8hGqWek9yX_RYt_G-hLgtAtVwGMAcAriZkX3ylebZs_-oqozjF0ikKxBiKLnlxsQhJp5hnbAeQ9Tk420HgIf8MwS3bmp-ZJYO8a6Zrl6W4ZPSfunSmLc-9gqnWxlF59d_Mm8OmF79X_SUWhRuv9C00uYA7pVblu9p3KaKJ41UlatFFOEWwrn4tgCdDlmcM',
  },
];

export default function RecommendedJobs() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recommended for You</Text>
          <Text style={styles.subtitle}>Based on your tech stack and performance</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {jobs.map((job) => (
          <TouchableOpacity key={job.id} style={styles.jobCard} activeOpacity={0.8}>
            <View style={styles.jobHeader}>
              <View style={styles.logoContainer}>
                <Ionicons name="business-outline" size={24} color={COLORS.textSecondary} />
              </View>
              {job.isTopMatch && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Top Match</Text>
                </View>
              )}
            </View>

            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.companyName}>{job.company}</Text>

            <View style={styles.jobDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{job.salary}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{job.location}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.applyButton} activeOpacity={0.8}>
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl + 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(44, 47, 49, 0.7)',
  },
  viewAll: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xs,
  },
  jobCard: {
    width: 300,
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    marginRight: SPACING.lg,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  badge: {
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: COLORS.onSecondaryContainer,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(44, 47, 49, 0.7)',
    marginBottom: SPACING.lg,
  },
  jobDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
  },
  applyButton: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
