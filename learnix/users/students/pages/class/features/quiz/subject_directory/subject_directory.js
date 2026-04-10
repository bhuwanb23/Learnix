import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={QUIZ_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Practice Quizzes</Text>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    backgroundColor: QUIZ_COLORS.surface,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_COLORS.onSurface,
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
    fontSize: 20,
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
