import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PerformanceHeader from './components/PerformanceHeader';
import ClassSelector from './components/ClassSelector';
import OverviewCards from './components/OverviewCards';
import PerformanceFilters from './components/PerformanceFilters';
import StudentCard from './components/StudentCard';
import GapAnalysis from './components/GapAnalysis';
import AISuggestions from './components/AISuggestions';
import {
  HEADER,
  CLASS_INFO,
  OVERVIEW,
  FILTERS,
  STUDENTS,
  GAP_ANALYSIS,
  AI_SUGGESTIONS,
} from './constants/performanceData';

export default function StudentPerformancePage({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <PerformanceHeader header={HEADER} />

        {/* Class Selector */}
        <ClassSelector classInfo={CLASS_INFO} />

        {/* Overview Cards */}
        <OverviewCards overview={OVERVIEW} />

        {/* Performance Filters */}
        <PerformanceFilters filters={FILTERS} />

        {/* Student Cards */}
        <View style={styles.studentsSection}>
          {STUDENTS.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </View>

        {/* Gap Analysis */}
        <GapAnalysis gaps={GAP_ANALYSIS} />

        {/* AI Suggestions */}
        <AISuggestions suggestions={AI_SUGGESTIONS} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  studentsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
});
