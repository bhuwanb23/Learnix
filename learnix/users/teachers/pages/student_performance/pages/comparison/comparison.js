import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ComparisonHeader from './components/ComparisonHeader';
import CompareBarList from './components/CompareBarList';
import {
  SUBJECTS,
  CLASSES,
  compareSubjectsInClass,
  compareClassesForSubject,
} from '../../constants/performanceData';

export default function Comparison({ route, navigation }) {
  const { type, subjectId, classId } = route?.params || {};
  const subject = SUBJECTS.find((s) => s.id === subjectId) || SUBJECTS[0];
  const classItem = CLASSES.find((c) => c.id === classId) || CLASSES[0];

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const isSubjectMode = type === 'subject';

  const title = isSubjectMode
    ? `${subject.name} — Across Classes`
    : `Subjects in ${classItem.label}`;
  const subtitle = isSubjectMode
    ? `${compareClassesForSubject(subjectId).length} sections you teach`
    : 'How this class performs in each subject';

  const rows = isSubjectMode
    ? compareClassesForSubject(subjectId).map((entry) => ({
        key: entry.class.id,
        name: `${subject.name} · ${entry.class.label}`,
        color: entry.class.color,
        avg: entry.avg,
        total: entry.total,
        atRisk: entry.atRisk,
        subjectId,
        classId: entry.class.id,
      }))
    : compareSubjectsInClass(classId).map((entry) => ({
        key: entry.subject.id,
        name: entry.subject.name,
        color: entry.subject.color,
        avg: entry.avg,
        total: entry.total,
        atRisk: entry.atRisk,
        subjectId: entry.subject.id,
        classId,
      }));

  const handlePressRow = (row) => {
    if (navigation?.navigate) {
      navigation.navigate('SubjectClass', { subjectId: row.subjectId, classId: row.classId });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ComparisonHeader title={title} subtitle={subtitle} onBack={handleBack} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CompareBarList rows={rows} onPressRow={handlePressRow} />
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
  scrollContent: {
    paddingTop: 4,
  },
});