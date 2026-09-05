import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import CourseDetail from './pages/course_detail/course_detail';

const courses = [
  { id: 'C1', code: 'CS301', name: 'Data Structures', program: 'B.Tech CSE', semester: 5, credits: 4, teacher: 'Dr. Meera Iyer', syllabus: 'Approved', color: '#2563eb' },
  { id: 'C2', code: 'CS302', name: 'Operating Systems', program: 'B.Tech CSE', semester: 5, credits: 4, teacher: 'Dr. Sunita Rao', syllabus: 'Approved', color: '#3b82f6' },
  { id: 'C3', code: 'CS304', name: 'DBMS', program: 'B.Tech CSE', semester: 5, credits: 4, teacher: 'Dr. Sunita Rao', syllabus: 'Pending', color: '#059669' },
  { id: 'C4', code: 'CS305', name: 'Computer Networks', program: 'B.Tech CSE', semester: 5, credits: 3, teacher: 'Dr. Sunita Rao', syllabus: 'Approved', color: '#0891b2' },
  { id: 'C5', code: 'CS306', name: 'Artificial Intelligence', program: 'B.Tech CSE', semester: 6, credits: 4, teacher: 'Dr. Arjun Nair', syllabus: 'Draft', color: '#d97706' },
];

const syllabusStyle = (s) => {
  if (s === 'Approved') return { bg: '#dcfce7', color: '#059669' };
  if (s === 'Pending') return { bg: '#fef3c7', color: '#d97706' };
  return { bg: '#e0e7ff', color: '#4f46e5' };
};

export default function CoursesModule({ navigation }) {
  const [selectedCourse, setSelectedCourse] = useState(null);

  if (selectedCourse) {
    return <CourseDetail course={selectedCourse} onBack={() => setSelectedCourse(null)} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>32</Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>27</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Semester 5 & 6 Courses</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('New Course', 'Course creation form opens here — code, credits and teacher.')}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>New Course</Text>
        </TouchableOpacity>
      </View>

      {courses.map((c) => {
        const st = syllabusStyle(c.syllabus);
        return (
          <TouchableOpacity
            key={c.id}
            style={styles.card}
            onPress={() => setSelectedCourse(c)}
          >
            <View style={[styles.courseIcon, { backgroundColor: c.color + '1a' }]}>
              <Text style={[styles.courseCode, { color: c.color }]}>{c.code}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.meta}>
                {c.program} · Sem {c.semester} · {c.credits} credits
              </Text>
              <Text style={styles.teacher}>{c.teacher}</Text>
            </View>
            <View style={[styles.syllabusChip, { backgroundColor: st.bg }]}>
              <Text style={[styles.syllabusText, { color: st.color }]}>{c.syllabus}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  courseIcon: {
    width: 46,
    height: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courseCode: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  teacher: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.primary,
    marginTop: 3,
  },
  syllabusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syllabusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});