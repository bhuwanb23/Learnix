import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import LectureNotesPage from './lecture_notes';

export default function LectureNotesContainer({ navigation, onBack }) {
  return (
    <View style={styles.container}>
      <LectureNotesPage navigation={{ ...navigation, goBack: onBack }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
