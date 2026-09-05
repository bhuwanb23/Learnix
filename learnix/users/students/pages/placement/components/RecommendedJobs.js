import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

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

export default function RecommendedJobs({ navigation }) {
  const handleJobPress = (job) => {
    if (navigation) {
      navigation.navigate('JobDetails', { job });
    }
  };

  const handleViewAll = () => {
    if (navigation) {
      navigation.navigate('BrowseJobs');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recommended for You</Text>
          <Text style={styles.subtitle}>Based on your tech stack and performance</Text>
        </View>
        <TouchableOpacity onPress={handleViewAll} activeOpacity={0.7}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {jobs.map((job) => (
          <TouchableOpacity key={job.id} style={styles.jobCard} activeOpacity={0.95} onPress={() => handleJobPress(job)}>
            <View style={styles.jobHeader}>
              <View style={styles.logoContainer}>
                <Image source={{ uri: job.logo }} style={styles.logo} resizeMode="contain" />
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
                <MaterialIcons name="payments" size={18} color="#595c5e" />
                <Text style={styles.detailText}>{job.salary}</Text>
              </View>
              <View style={styles.detailItem}>
                <MaterialIcons name="location-on" size={18} color="#595c5e" />
                <Text style={styles.detailText}>{job.location}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.applyButton} activeOpacity={0.9} onPress={() => handleJobPress(job)}>
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
    marginBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
  viewAll: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#0050d4',
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  jobCard: {
    width: 300,
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    marginRight: 24,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#e5e9eb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  badge: {
    backgroundColor: '#dcc9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#5b00c7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    marginBottom: 16,
  },
  jobDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
  applyButton: {
    backgroundColor: '#dfe3e6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
});
