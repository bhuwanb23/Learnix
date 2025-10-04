import React from 'react';
import { View, StyleSheet } from 'react-native';
import AttendanceClassList from './attendance_class/attendance_class_list';

export default function Attendance() {
  return (
    <View style={styles.container}>
      <AttendanceClassList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
