import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

const AVATAR_HUES = ['#0050d4', '#702ae1', '#0b6e4f', '#a23800', '#8b1a2b', '#1a5f7a'];

function hueForCompany(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return AVATAR_HUES[Math.abs(h) % AVATAR_HUES.length];
}

/** Expanded curated suggestions — roles, stacks, locations, and match tiers */
export const RECOMMENDED_JOBS_DATA = [
  {
    id: '1',
    title: 'Software Engineer II',
    company: 'CloudNexus Systems',
    salary: '$120k – $140k',
    location: 'Remote',
    employmentType: 'Full-time',
    matchTier: 'top',
    skills: ['React', 'Node.js'],
    isNew: false,
    logoUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpskx4aCzaMNQVueRUfFkKkSJLJc2KjObIZh5qlscrrC9y20r1N8Ui-Xfdjl2F3bA5X_pkxF0ssEReobToUWYfGoezOpNQDM7zpmiOXXRRp_fW5c2YINvM7ZOTh9iLUjK1YF5AuKLiLoTgs36_RKoPlnguUOvETZYNf_oIk0quOtlN419OqVwpreJVflHGt41avnZMqspUoJiC9XihDmxsiAu0kHCAzDCKhY2TXT2X5EIw04-eMck69hM37mPVaB0HX-ok0SM6EEI',
  },
  {
    id: '2',
    title: 'Data Analyst',
    company: 'InsightCore Analytics',
    salary: '$95k – $110k',
    location: 'Austin, TX',
    employmentType: 'Full-time',
    matchTier: 'high',
    skills: ['SQL', 'Python'],
    isNew: true,
    logoUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAt5qCuZsmc3dmSNTmMg6_3n5MjKQS6bRi3YkLA_HAFxGcyITAFyG7ZYKCYUcd7AMamQd-z8hGqWek9yX_RYt_G-hLgtAtVwGMAcAriZkX3ylebZs_-oqozjF0ikKxBiKLnlxsQhJp5hnbAeQ9Tk420HgIf8MwS3bmp-ZJYO8a6Zrl6W4ZPSfunSmLc-9gqnWxlF59d_Mm8OmF79X_SUWhRuv9C00uYA7pVblu9p3KaKJ41UlatFFOEWwrn4tgCdDlmcM',
  },
  {
    id: '3',
    title: 'Frontend Engineer',
    company: 'Northwind Labs',
    salary: '$105k – $125k',
    location: 'Hybrid · Seattle',
    employmentType: 'Full-time',
    matchTier: 'high',
    skills: ['TypeScript', 'React'],
    isNew: false,
    logoUri: null,
  },
  {
    id: '4',
    title: 'ML Engineer Intern',
    company: 'Vortex AI Labs',
    salary: '$48 – $62 / hr',
    location: 'Remote · Global',
    employmentType: 'Internship',
    matchTier: 'top',
    skills: ['PyTorch', 'Python'],
    isNew: true,
    logoUri: null,
  },
  {
    id: '5',
    title: 'Product Designer',
    company: 'Stellar Interface Co.',
    salary: '$115k – $135k',
    location: 'San Francisco, CA',
    employmentType: 'Full-time',
    matchTier: 'good',
    skills: ['Figma', 'UX Research'],
    isNew: false,
    logoUri: null,
  },
  {
    id: '6',
    title: 'Backend Engineer',
    company: 'Harbor Payments',
    salary: '$130k – $155k',
    location: 'New York, NY',
    employmentType: 'Full-time',
    matchTier: 'high',
    skills: ['Go', 'Kubernetes'],
    isNew: false,
    logoUri: null,
  },
  {
    id: '7',
    title: 'Security Analyst',
    company: 'CipherShield Inc.',
    salary: '$88k – $102k',
    location: 'Remote · US',
    employmentType: 'Contract',
    matchTier: 'good',
    skills: ['SOC', 'SIEM'],
    isNew: true,
    logoUri: null,
  },
  {
    id: '8',
    title: 'DevOps Engineer',
    company: 'Atlas Infrastructure',
    salary: '$118k – $138k',
    location: 'Denver, CO',
    employmentType: 'Full-time',
    matchTier: 'high',
    skills: ['AWS', 'Terraform'],
    isNew: false,
    logoUri: null,
  },
  {
    id: '9',
    title: 'Business Analyst',
    company: 'Beam Finance',
    salary: '$82k – $96k',
    location: 'Chicago, IL',
    employmentType: 'Full-time',
    matchTier: 'good',
    skills: ['Excel', 'SQL'],
    isNew: false,
    logoUri: null,
  },
  {
    id: '10',
    title: 'Research Intern · HCI',
    company: 'Lumina Global Systems',
    salary: '$38 – $44 / hr',
    location: 'Boston, MA',
    employmentType: 'Internship',
    matchTier: 'top',
    skills: ['Research', 'Prototyping'],
    isNew: false,
    logoUri: null,
  },
];

function MatchBadge({ tier, isNew }) {
  const primary =
    tier === 'top'
      ? { label: 'Top match', wrap: styles.badgeTop, text: styles.badgeTextTop }
      : tier === 'high'
        ? { label: 'Strong fit', wrap: styles.badgeHigh, text: styles.badgeTextHigh }
        : tier === 'good'
          ? { label: 'Good fit', wrap: styles.badgeGood, text: styles.badgeTextGood }
          : null;

  return (
    <View style={styles.badgeRow}>
      {primary ? (
        <View style={[styles.badge, primary.wrap]}>
          <Text style={[styles.badgeLabelBase, primary.text]}>{primary.label}</Text>
        </View>
      ) : null}
      {isNew ? (
        <View style={[styles.badge, styles.badgeNew]}>
          <Text style={styles.badgeTextNew}>New</Text>
        </View>
      ) : null}
    </View>
  );
}

function JobLogo({ company, uri }) {
  const [failed, setFailed] = useState(false);
  const bg = hueForCompany(company);
  const initial = company.trim().charAt(0).toUpperCase();

  if (!uri || failed) {
    return (
      <View style={[styles.logoPlaceholder, { backgroundColor: `${bg}18` }]}>
        <Text style={[styles.logoLetter, { color: bg }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <View style={styles.logoContainer}>
      <Image
        source={{ uri }}
        style={styles.logo}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

function toNavigationJob(job) {
  return {
    company: job.company,
    title: job.title,
    type: job.employmentType,
    isUrgent: Boolean(job.isNew),
    location: job.location,
  };
}

export default function RecommendedJobs({ navigation }) {
  const { width } = useWindowDimensions();

  const cardWidth = useMemo(() => {
    const maxContent = width - 24 * 2;
    return Math.min(300, Math.max(248, Math.min(maxContent * 0.82, 320)));
  }, [width]);

  const handleViewAll = useCallback(() => {
    navigation?.navigate?.('BrowseJobs');
  }, [navigation]);

  const handleOpenJob = useCallback(
    (job) => {
      navigation?.navigate?.('JobDetails', { job: toNavigationJob(job) });
    },
    [navigation]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Recommended for You</Text>
          <Text style={styles.subtitle}>
            Based on your skills, coursework, and placement profile — {RECOMMENDED_JOBS_DATA.length}{' '}
            picks
          </Text>
        </View>
        <TouchableOpacity onPress={handleViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {RECOMMENDED_JOBS_DATA.map((job) => (
          <TouchableOpacity
            key={job.id}
            style={[styles.jobCard, { width: cardWidth }]}
            activeOpacity={0.92}
            onPress={() => handleOpenJob(job)}
          >
            <View style={styles.jobHeader}>
              <JobLogo company={job.company} uri={job.logoUri} />
              <MatchBadge tier={job.matchTier} isNew={job.isNew} />
            </View>

            <Text style={styles.jobTitle} numberOfLines={2}>
              {job.title}
            </Text>
            <Text style={styles.companyName} numberOfLines={1}>
              {job.company}
            </Text>

            <View style={styles.typePill}>
              <MaterialIcons name="schedule" size={14} color="#595c5e" />
              <Text style={styles.typeText}>{job.employmentType}</Text>
            </View>

            <View style={styles.skillRow}>
              {(job.skills || []).slice(0, 2).map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>

            <View style={styles.jobDetails}>
              <View style={styles.detailItem}>
                <MaterialIcons name="payments" size={18} color="#595c5e" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {job.salary}
                </Text>
              </View>
              <View style={[styles.detailItem, styles.detailItemLocation]}>
                <MaterialIcons name="location-on" size={18} color="#595c5e" />
                <Text style={styles.detailText} numberOfLines={2}>
                  {job.location}
                </Text>
              </View>
            </View>

            <View style={styles.applyButton}>
              <Text style={styles.applyButtonText}>View role</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#2c2f31" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: STUDENT_HOME_FONT.sectionTitle,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: STUDENT_HOME_FONT.cardMeta,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 20,
  },
  viewAll: {
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#0050d4',
    marginTop: 2,
  },
  scrollContent: {
    paddingLeft: 2,
    paddingRight: 12,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.18)',
    marginRight: 16,
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    minHeight: 52,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#eef1f3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: '58%',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTop: {
    backgroundColor: '#eddcff',
  },
  badgeTextTop: {
    color: '#5b00c7',
  },
  badgeHigh: {
    backgroundColor: 'rgba(0, 80, 212, 0.12)',
  },
  badgeGood: {
    backgroundColor: '#eef1f3',
  },
  badgeNew: {
    backgroundColor: 'rgba(11, 110, 79, 0.12)',
  },
  badgeLabelBase: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badgeTextHigh: {
    color: '#0050d4',
  },
  badgeTextGood: {
    color: '#595c5e',
  },
  badgeTextNew: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#0b6e4f',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  jobTitle: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
    lineHeight: 22,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    marginBottom: 10,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#f5f7f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
    color: '#595c5e',
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  skillChip: {
    backgroundColor: 'rgba(0, 80, 212, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillChipText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    fontWeight: '600',
    color: '#0050d4',
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: '42%',
  },
  detailItemLocation: {
    minWidth: '48%',
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
  applyButton: {
    flexDirection: 'row',
    backgroundColor: '#dfe3e6',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
});
