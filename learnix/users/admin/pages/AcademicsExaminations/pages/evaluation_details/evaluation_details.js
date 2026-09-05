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

const SUBJECT_EVALUATIONS = [
  {
    id: '1',
    subject: 'Mathematics',
    total: 120,
    completed: 112,
    pending: 8,
    status: 'Nearly Done',
    color: '#059669',
  },
  {
    id: '2',
    subject: 'Physics',
    total: 125,
    completed: 78,
    pending: 47,
    status: 'In Progress',
    color: '#d97706',
  },
  {
    id: '3',
    subject: 'Chemistry',
    total: 118,
    completed: 45,
    pending: 73,
    status: 'In Progress',
    color: '#d97706',
  },
  {
    id: '4',
    subject: 'Data Structures',
    total: 110,
    completed: 0,
    pending: 110,
    status: 'Not Started',
    color: '#dc2626',
  },
];

export default function EvaluationDetails({ subjectId, onBack }) {
  const selectedSubject = SUBJECT_EVALUATIONS.find((s) => s.id === subjectId) || null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Evaluation Details</Text>
            <Text style={styles.headerSubtitle}>Semester 1 answer-sheet evaluation</Text>
          </View>
        </View>

        {selectedSubject ? (
          <View style={styles.focusCard}>
            <Text style={styles.focusLabel}>Selected Subject</Text>
            <Text style={styles.focusName}>{selectedSubject.subject}</Text>
            <View style={styles.focusStats}>
              <View style={styles.focusStat}>
                <Text style={styles.focusValue}>{selectedSubject.completed}</Text>
                <Text style={styles.focusStatLabel}>Evaluated</Text>
              </View>
              <View style={styles.focusStat}>
                <Text style={[styles.focusValue, { color: '#d97706' }]}>{selectedSubject.pending}</Text>
                <Text style={styles.focusStatLabel}>Pending</Text>
              </View>
              <View style={styles.focusStat}>
                <Text style={[styles.focusValue, { color: '#2563eb' }]}>
                  {Math.round((selectedSubject.completed / selectedSubject.total) * 100)}%
                </Text>
                <Text style={styles.focusStatLabel}>Progress</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.hint}>All subjects across the semester are shown below.</Text>
        )}

        <SectionHeader title="Subject-wise Progress" actionLabel="Assign Evaluator" actionIcon="person-add" onAction={() => Alert.alert('Assign Evaluator', 'Assign teachers to pending answer-sheet bundles.')} />

        {SUBJECT_EVALUATIONS.map((subj) => {
          const pct = Math.round((subj.completed / subj.total) * 100);
          return (
            <TouchableOpacity
              key={subj.id}
              style={styles.subjectCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(subj.subject, `${subj.completed}/${subj.total} evaluated • ${subj.pending} pending`)}
            >
              <View style={styles.subjectHeader}>
                <Text style={styles.subjectName}>{subj.subject}</Text>
                <Text style={[styles.subjectStatus, { color: subj.color }]}>{subj.status}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: subj.color }]} />
              </View>
              <View style={styles.subjectMeta}>
                <Text style={styles.subjectMetaText}>{subj.completed}/{subj.total} evaluated</Text>
                <Text style={styles.subjectMetaText}>{pct}% complete</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <ActionButton
          label="Export Evaluation Report"
          icon="download-outline"
          variant="secondary"
          onPress={() => Alert.alert('Exported', 'Evaluation progress report downloaded as Excel.')}
        />
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
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginBottom: SPACING.md,
  },
  focusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  focusLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  focusName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 2,
  },
  focusStats: {
    flexDirection: 'row',
    marginTop: SPACING.md,
  },
  focusStat: {
    flex: 1,
  },
  focusValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  focusStatLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  subjectCard: {
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
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  subjectName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  subjectStatus: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#eef1f3',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  subjectMetaText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
});