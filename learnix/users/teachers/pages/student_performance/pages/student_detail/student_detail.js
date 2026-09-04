import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DetailHeader from './components/DetailHeader';
import ProfileHeader from './components/ProfileHeader';
import BreakdownCard from './components/BreakdownCard';
import SkillsCard from './components/SkillsCard';
import NoteCard from './components/NoteCard';
import SelectionChips from '../../components/SelectionChips';
import {
  SUBJECTS,
  CLASSES,
  subjectsForClass,
  getStudentDetail,
} from '../../constants/performanceData';

export default function StudentDetail({ route, navigation }) {
  const { subjectId, classId, student } = route?.params || {};
  const [activeSubject, setActiveSubject] = useState(subjectId);

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const subject = SUBJECTS.find((s) => s.id === activeSubject) || SUBJECTS[0];
  const classItem = CLASSES.find((c) => c.id === classId) || CLASSES[0];
  const subjectTabs = subjectsForClass(classId);
  const detail = getStudentDetail(activeSubject, classId, student?.id);

  if (!student || !detail) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DetailHeader title="Student Profile" subtitle="Select a student first" onBack={handleBack} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DetailHeader
        title={student.name}
        subtitle={`${subject.name} · ${classItem.label}`}
        onBack={handleBack}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader student={detail} />

        {subjectTabs.length > 1 && (
          <SelectionChips
            label="Subject"
            options={subjectTabs}
            selected={activeSubject}
            onChange={setActiveSubject}
          />
        )}

        <BreakdownCard detail={detail} />
        <SkillsCard strengths={detail.strengths} improvements={detail.improvements} />
        <NoteCard note={detail.note} />
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