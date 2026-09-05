import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ActionButton from '../../../../components/ui/ActionButton';
import SectionHeader from '../../../../components/ui/SectionHeader';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const EXAM_SCHEDULE = [
  { id: 'E1', subject: 'Mathematics', code: 'MA301', date: 'Dec 15, 2026', time: '10:00 AM - 1:00 PM', room: 'Hall A', students: 120, status: 'Scheduled' },
  { id: 'E2', subject: 'Data Structures', code: 'CS301', date: 'Dec 16, 2026', time: '10:00 AM - 1:00 PM', room: 'Hall B', students: 110, status: 'Scheduled' },
  { id: 'E3', subject: 'Physics', code: 'PH302', date: 'Dec 17, 2026', time: '2:00 PM - 5:00 PM', room: 'Hall A', students: 125, status: 'Scheduled' },
  { id: 'E4', subject: 'Operating Systems', code: 'CS302', date: 'Dec 18, 2026', time: '10:00 AM - 1:00 PM', room: 'Hall C', students: 105, status: 'Scheduled' },
  { id: 'E5', subject: 'Chemistry', code: 'CH301', date: 'Dec 19, 2026', time: '2:00 PM - 5:00 PM', room: 'Hall B', students: 118, status: 'Scheduled' },
  { id: 'E6', subject: 'DBMS', code: 'CS304', date: 'Dec 20, 2026', time: '10:00 AM - 1:00 PM', room: 'Hall A', students: 108, status: 'Scheduled' },
];

export default function ExamTimetable({ onBack }) {
  const handlePublish = () => {
    Alert.alert(
      'Publish Timetable',
      'Publish this exam timetable to all students and staff?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: () => Alert.alert('Published', 'Exam timetable is now live for all students.') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Exam Timetable</Text>
            <Text style={styles.headerSubtitle}>Semester 1 Final Exams • Dec 15-20, 2026</Text>
          </View>
        </View>

        <SectionHeader title="6 Exams Scheduled" actionLabel="Edit" actionIcon="create" onAction={() => Alert.alert('Edit Timetable', 'Adjust exam dates, rooms, or invigilators.')} />

        {EXAM_SCHEDULE.map((exam) => (
          <TouchableOpacity
            key={exam.id}
            style={styles.examCard}
            activeOpacity={0.8}
            onPress={() => Alert.alert(exam.subject, `${exam.code}\n${exam.date} • ${exam.time}\nRoom: ${exam.room} • ${exam.students} students`)}
          >
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{exam.date.split(' ')[1]}</Text>
              <Text style={styles.dateMonth}>{exam.date.split(' ')[0]}</Text>
            </View>
            <View style={styles.examInfo}>
              <Text style={styles.examSubject}>{exam.subject}</Text>
              <Text style={styles.examCode}>{exam.code} • {exam.room}</Text>
              <Text style={styles.examTime}>{exam.time}</Text>
            </View>
            <View style={styles.studentsBox}>
              <Ionicons name="people" size={14} color="#2563eb" />
              <Text style={styles.studentsText}>{exam.students}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <ActionButton label="Publish Timetable" icon="megaphone" onPress={handlePublish} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  dateBox: {
    width: 48,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#2563eb1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  dateDay: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#2563eb',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  dateMonth: {
    fontSize: 9,
    color: '#2563eb',
    fontFamily: 'Manrope-Medium',
  },
  examInfo: {
    flex: 1,
  },
  examSubject: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  examCode: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  examTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  studentsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef1f3',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  studentsText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#475569',
    fontFamily: 'Manrope-SemiBold',
  },
});