import React, { useState } from 'react';
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

const RESULT_SUBJECTS = [
  { id: '1', name: 'Mathematics', code: 'MA301', students: 120, status: 'Ready', color: '#059669' },
  { id: '2', name: 'Data Structures', code: 'CS301', students: 110, status: 'Ready', color: '#059669' },
  { id: '3', name: 'Physics', code: 'PH302', students: 125, status: 'Ready', color: '#059669' },
  { id: '4', name: 'Operating Systems', code: 'CS302', students: 105, status: 'Grading', color: '#d97706' },
  { id: '5', name: 'Chemistry', code: 'CH301', students: 118, status: 'Grading', color: '#d97706' },
  { id: '6', name: 'DBMS', code: 'CS304', students: 108, status: 'Pending', color: '#dc2626' },
];

export default function PublishResults({ onBack }) {
  const [selectedSubject, setSelectedSubject] = useState(null);

  const handlePublish = () => {
    if (!selectedSubject) {
      Alert.alert('Select Subject', 'Choose a subject with Ready status to publish.');
      return;
    }
    const subj = RESULT_SUBJECTS.find((s) => s.id === selectedSubject);
    Alert.alert(
      'Publish Results',
      `Publish ${subj.name} results to ${subj.students} students? Marks will be visible immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: () => Alert.alert('Published', `${subj.name} results are now live for students.`) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#7c3aed" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Publish Results</Text>
            <Text style={styles.headerSubtitle}>Semester 1 Final Exam Results</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>3</Text>
            <Text style={styles.summaryLabel}>Ready</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryValue, { color: '#d97706' }]}>2</Text>
            <Text style={styles.summaryLabel}>Grading</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>1</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
        </View>

        <SectionHeader title="Subject Results" />
        {RESULT_SUBJECTS.map((subj) => (
          <TouchableOpacity
            key={subj.id}
            style={[styles.subjectCard, selectedSubject === subj.id && styles.subjectCardSelected]}
            onPress={() => setSelectedSubject(subj.id)}
            activeOpacity={0.8}
          >
            <View style={styles.subjectIcon}>
              <Ionicons
                name={subj.status === 'Ready' ? 'checkmark-circle' : subj.status === 'Grading' ? 'time' : 'lock-closed'}
                size={20}
                color={subj.color}
              />
            </View>
            <View style={styles.subjectInfo}>
              <Text style={styles.subjectName}>{subj.name}</Text>
              <Text style={styles.subjectMeta}>{subj.code} • {subj.students} students</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: subj.color + '1A' }]}>
              <Text style={[styles.statusText, { color: subj.color }]}>{subj.status}</Text>
            </View>
            {selectedSubject === subj.id ? (
              <Ionicons name="checkmark-circle" size={18} color="#7c3aed" style={styles.checkIcon} />
            ) : null}
          </TouchableOpacity>
        ))}

        <ActionButton label="Publish Selected Results" icon="megaphone" onPress={handlePublish} />
        <View style={styles.spacer} />
        <ActionButton
          label="Publish All Ready Results"
          icon="flash"
          variant="secondary"
          onPress={() => Alert.alert(
            'Publish All',
            'Publish all 3 Ready subjects at once?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Publish All', onPress: () => Alert.alert('Published', 'All ready results are now live.') },
            ]
          )}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
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
    backgroundColor: '#7c3aed1A',
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
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  subjectCardSelected: {
    borderColor: '#7c3aed',
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  subjectMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  checkIcon: {
    marginLeft: SPACING.sm,
  },
  spacer: {
    height: SPACING.sm,
  },
});