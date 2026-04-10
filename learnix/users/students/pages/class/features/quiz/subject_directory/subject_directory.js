import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { QUIZ_COLORS, SUBJECTS_DATA, PERFORMANCE_DATA } from './constants/quizData';
import SubjectCard from './components/SubjectCard';
import PerformanceInsights from './components/PerformanceInsights';

export default function SubjectDirectoryPage({ navigation }) {
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleSubjectPress = (subject) => {
    console.log('Subject pressed:', subject.title);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2563eb" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Practice Quizzes</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Subject Directory</Text>
          <Text style={styles.heroSubtitle}>
            Continue your academic journey by selecting a subject to challenge your knowledge.
          </Text>
        </View>

        {/* Subject Cards */}
        <View style={styles.subjectsGrid}>
          {SUBJECTS_DATA.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onPress={() => handleSubjectPress(subject)}
            />
          ))}
        </View>

        {/* Performance Insights */}
        <PerformanceInsights data={PERFORMANCE_DATA} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: QUIZ_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    backgroundColor: '#2563eb',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroSection: {
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_COLORS.onSurface,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  subjectsGrid: {
    marginBottom: 18,
  },
});
