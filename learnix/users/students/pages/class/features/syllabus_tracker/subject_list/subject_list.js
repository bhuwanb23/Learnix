import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SYLLABUS_TRACKER_COLORS, ACADEMIC_DATA, SUBJECTS_DATA, MILESTONE_DATA } from './constants/syllabusData';
import ProgressChart from './components/ProgressChart';
import SubjectCard from './components/SubjectCard';
import MilestoneCard from './components/MilestoneCard';

export default function SubjectListPage({ navigation }) {
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleSubjectPress = (subject) => {
    if (navigation?.navigateToUnits) {
      navigation.navigateToUnits(subject);
    }
  };

  const handleReviewProgress = () => {
    Alert.alert('Milestone Review', 'Your upcoming milestones and deadlines will open here.');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={SYLLABUS_TRACKER_COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={SYLLABUS_TRACKER_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Progress</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroTextSection}>
              <Text style={styles.heroLabel}>{ACADEMIC_DATA.progressLabel}</Text>
              <Text style={styles.heroTitle}>{ACADEMIC_DATA.title}</Text>
              <Text style={styles.heroDescription}>{ACADEMIC_DATA.description}</Text>
            </View>
            <ProgressChart percentage={ACADEMIC_DATA.overallProgress} />
          </View>
        </View>

        {/* Subjects Grid */}
        <View style={styles.subjectsSection}>
          {SUBJECTS_DATA.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onPress={handleSubjectPress}
            />
          ))}
        </View>

        {/* Milestone Section */}
        <MilestoneCard 
          data={MILESTONE_DATA}
          onPress={handleReviewProgress}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SYLLABUS_TRACKER_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 52,
    backgroundColor: SYLLABUS_TRACKER_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: `${SYLLABUS_TRACKER_COLORS.outlineVariant}26`,
    gap: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: SYLLABUS_TRACKER_COLORS.onSurface,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: SYLLABUS_TRACKER_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroTextSection: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: SYLLABUS_TRACKER_COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: SYLLABUS_TRACKER_COLORS.onSurface,
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: SYLLABUS_TRACKER_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  subjectsSection: {
    marginBottom: 8,
  },
});
