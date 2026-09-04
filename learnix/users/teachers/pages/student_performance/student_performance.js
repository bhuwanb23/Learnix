import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PerformanceHeader from './components/PerformanceHeader';
import PickerCard from './components/PickerCard';
import OverviewCards from './components/OverviewCards';
import CompareCards from './components/CompareCards';
import PerformanceFilters from './components/PerformanceFilters';
import StudentCard from './components/StudentCard';
import GapAnalysis from './components/GapAnalysis';
import AISuggestions from './components/AISuggestions';
import StudentDetail from './pages/student_detail/student_detail';
import Comparison from './pages/comparison/comparison';
import {
  HEADER,
  CLASSES,
  SUBJECTS,
  subjectsForClass,
  getStudentsFor,
  getOverviewFor,
  getFiltersFor,
  filterStudents,
  SUBJECT_GAPS,
  SUBJECT_SUGGESTIONS,
  compareSubjectsInClass,
  compareClassesForSubject,
} from './constants/performanceData';

export default function StudentPerformancePage({ navigation }) {
  const [currentScreen, setCurrentScreen] = useState('hub');
  const [selectedClass, setSelectedClass] = useState('sec-a');
  const [selectedSubject, setSelectedSubject] = useState(subjectsForClass('sec-a')[0].id);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [comparisonType, setComparisonType] = useState('class');

  const selectClass = (classId) => {
    const subjects = subjectsForClass(classId);
    setSelectedClass(classId);
    setSelectedSubject(subjects.length > 0 ? subjects[0].id : null);
    setActiveFilter('all');
  };

  const selectSubject = (subjectId) => {
    setSelectedSubject(subjectId);
    setActiveFilter('all');
  };

  const handleNavigate = (screen, params = {}) => {
    if (screen === 'StudentDetail') {
      setSelectedStudent(params.student);
      setCurrentScreen('StudentDetail');
    } else if (screen === 'Comparison') {
      setComparisonType(params.type || 'class');
      setCurrentScreen('Comparison');
    } else if (screen === 'SubjectClass') {
      setSelectedClass(params.classId);
      setSelectedSubject(params.subjectId);
      setActiveFilter('all');
      setCurrentScreen('hub');
    } else if (screen === 'hub') {
      setCurrentScreen('hub');
    }
  };

  const subNavigation = {
    goBack: () => setCurrentScreen('hub'),
    navigate: handleNavigate,
  };

  if (currentScreen === 'StudentDetail') {
    return (
      <StudentDetail
        route={{ params: { subjectId: selectedSubject, classId: selectedClass, student: selectedStudent } }}
        navigation={subNavigation}
      />
    );
  }

  if (currentScreen === 'Comparison') {
    return (
      <Comparison
        route={{ params: { type: comparisonType, subjectId: selectedSubject, classId: selectedClass } }}
        navigation={subNavigation}
      />
    );
  }

  const subject = SUBJECTS.find((s) => s.id === selectedSubject) || SUBJECTS[0];
  const classItem = CLASSES.find((c) => c.id === selectedClass) || CLASSES[0];
  const classSubjects = subjectsForClass(selectedClass);
  const students = filterStudents(getStudentsFor(selectedSubject, selectedClass), activeFilter);
  const overview = getOverviewFor(selectedSubject, selectedClass);
  const filters = getFiltersFor(selectedSubject, selectedClass);
  const gaps = SUBJECT_GAPS[selectedSubject] || [];
  const suggestions = SUBJECT_SUGGESTIONS[selectedSubject] || [];

  const classCompare = {
    title: `Subjects in ${classItem.label}`,
    subtitle: `${classSubjects.length} subject${classSubjects.length > 1 ? 's' : ''} · avg ${overview.classAverage.value}%`,
    color: classItem.color,
  };
  const subjectCompare = {
    title: `${subject.name} across classes`,
    subtitle: `${compareClassesForSubject(selectedSubject).length} sections · avg ${overview.classAverage.value}%`,
    color: subject.color,
  };

  const handleSuggestionAction = (suggestion) => {
    Alert.alert(suggestion.action, suggestion.text);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PerformanceHeader header={HEADER} />

        <PickerCard
          classOptions={CLASSES}
          selectedClass={selectedClass}
          onSelectClass={selectClass}
          subjectOptions={classSubjects}
          selectedSubject={selectedSubject}
          onSelectSubject={selectSubject}
        />

        <OverviewCards
          overview={overview}
          subjectName={subject.name}
          classLabel={classItem.label}
          color={subject.color}
        />

        <CompareCards
          classCompare={classCompare}
          subjectCompare={subjectCompare}
          onPress={(type) => handleNavigate('Comparison', { type })}
        />

        <PerformanceFilters
          filters={filters}
          activeFilter={activeFilter}
          onChange={setActiveFilter}
        />

        <View style={styles.studentsSection}>
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onPress={() => handleNavigate('StudentDetail', { student })}
            />
          ))}
        </View>

        <GapAnalysis gaps={gaps} />
        <AISuggestions suggestions={suggestions} onAction={handleSuggestionAction} />
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
    paddingHorizontal: 20,
    marginBottom: 28,
  },
});