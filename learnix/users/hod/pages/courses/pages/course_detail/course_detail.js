import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const units = [
  { id: '1', title: 'Unit 1 — Arrays & Linked Lists', hours: 8, status: 'Completed' },
  { id: '2', title: 'Unit 2 — Stacks & Queues', hours: 7, status: 'Completed' },
  { id: '3', title: 'Unit 3 — Trees & Graphs', hours: 10, status: 'In Progress' },
  { id: '4', title: 'Unit 4 — Sorting & Searching', hours: 8, status: 'Pending' },
  { id: '5', title: 'Unit 5 — Hashing & Heaps', hours: 6, status: 'Pending' },
];

export default function CourseDetail({ course, onBack }) {
  const [syllabus, setSyllabus] = useState(course.syllabus);

  const handleApprove = () => {
    setSyllabus('Approved');
    Alert.alert('Approved', `${course.name} syllabus approved and forwarded to Admin.`);
  };

  const handleChanges = () => {
    Alert.alert('Changes Requested', `Feedback sent to ${course.teacher} for syllabus revision.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroTop}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{course.code}</Text>
            </View>
            <Text style={styles.courseName}>{course.name}</Text>
            <Text style={styles.courseMeta}>
              {course.program} · Sem {course.semester} · {course.credits} credits
            </Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{course.credits}</Text>
              <Text style={styles.heroStatLabel}>Credits</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>62</Text>
              <Text style={styles.heroStatLabel}>Students</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>76%</Text>
              <Text style={styles.heroStatLabel}>Pass Rate</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.teacherCard}>
          <View style={[styles.teacherAvatar, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.teacherAvatarText}>{course.teacher.charAt(0)}</Text>
          </View>
          <View style={styles.teacherBody}>
            <Text style={styles.teacherLabel}>Course Teacher</Text>
            <Text style={styles.teacherName}>{course.teacher}</Text>
          </View>
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => Alert.alert('Message', `Opening chat with ${course.teacher}...`)}
          >
            <Ionicons name="chatbubble-outline" size={15} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.syllabusCard}>
          <View style={styles.syllabusTop}>
            <Text style={styles.syllabusTitle}>Syllabus Status</Text>
            <View
              style={[
                styles.syllabusChip,
                {
                  backgroundColor:
                    syllabus === 'Approved' ? '#dcfce7' : syllabus === 'Pending' ? '#fef3c7' : '#e0e7ff',
                },
              ]}
            >
              <Text
                style={[
                  styles.syllabusChipText,
                  { color: syllabus === 'Approved' ? '#059669' : syllabus === 'Pending' ? '#d97706' : '#4f46e5' },
                ]}
              >
                {syllabus}
              </Text>
            </View>
          </View>
          {syllabus !== 'Approved' && (
            <View style={styles.syllabusActions}>
              <TouchableOpacity style={styles.changesBtn} onPress={handleChanges}>
                <Ionicons name="create-outline" size={14} color="#d97706" />
                <Text style={styles.changesText}>Request Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}>
                <Ionicons name="checkmark-outline" size={14} color="#fff" />
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Syllabus Units</Text>
        {units.map((u) => (
          <View key={u.id} style={styles.unitCard}>
            <View
              style={[
                styles.unitDot,
                {
                  backgroundColor:
                    u.status === 'Completed' ? '#059669' : u.status === 'In Progress' ? '#d97706' : '#e5e7eb',
                },
              ]}
            />
            <View style={styles.unitBody}>
              <Text style={styles.unitTitle}>{u.title}</Text>
              <Text style={styles.unitMeta}>{u.hours} hours</Text>
            </View>
            <Text
              style={[
                styles.unitStatus,
                {
                  color:
                    u.status === 'Completed' ? '#059669' : u.status === 'In Progress' ? '#d97706' : '#9ca3af',
                },
              ]}
            >
              {u.status}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTop: { alignItems: 'flex-start' },
  codeBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  courseName: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 8,
  },
  courseMeta: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  teacherAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teacherAvatarText: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  teacherBody: { flex: 1 },
  teacherLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  teacherName: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 1,
  },
  msgBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syllabusCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  syllabusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syllabusTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  syllabusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syllabusChipText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  syllabusActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  changesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingVertical: 10,
    marginRight: 8,
  },
  changesText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
    marginLeft: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  approveText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  unitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  unitBody: { flex: 1 },
  unitTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  unitMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  unitStatus: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});