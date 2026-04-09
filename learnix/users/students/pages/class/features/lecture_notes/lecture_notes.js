import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import SubjectListPage from './subject_list/subject_list';
import { COLORS } from './subject_list/constants/lectureNotesData';

export default function LectureNotesPage({ navigation }) {
  return (
    <View style={styles.container}>
      <SubjectListPage navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
});
