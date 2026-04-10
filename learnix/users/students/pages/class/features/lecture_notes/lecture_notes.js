import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import SubjectListPage from './subject_list/subject_list';
import UnitListPage from './unit_list/unit_list';
import { COLORS } from './subject_list/constants/lectureNotesData';

export default function LectureNotesPage({ navigation }) {
  const [currentPage, setCurrentPage] = useState('subjects'); // 'subjects' or 'units'
  const [selectedSubject, setSelectedSubject] = useState(null);

  const navigateToUnits = (subject) => {
    console.log('navigateToUnits called with:', subject);
    setSelectedSubject(subject);
    setCurrentPage('units');
    console.log('Current page changed to: units');
  };

  const navigateBackToSubjects = () => {
    console.log('navigateBackToSubjects called');
    setCurrentPage('subjects');
    setSelectedSubject(null);
  };

  // Render unit list page
  if (currentPage === 'units') {
    console.log('Rendering UnitListPage with subject:', selectedSubject);
    return (
      <UnitListPage 
        navigation={{ goBack: navigateBackToSubjects }}
        subject={selectedSubject}
      />
    );
  }

  console.log('Rendering SubjectListPage');
  // Render subject list page (default)
  return (
    <View style={styles.container}>
      <SubjectListPage 
        navigation={navigation}
        onSubjectPress={navigateToUnits}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
});
