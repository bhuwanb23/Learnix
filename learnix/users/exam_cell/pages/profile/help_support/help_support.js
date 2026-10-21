/**
 * X-10 — Help & Support.
 * Docs: 05-exam-cell.md §3.8
 *
 * WAS AN ALERT. The old profile's "Help & Support" row showed a dialog that said "Contact the ERP
 * support team or view documentation" — and stopped there. There was no way to see what the
 * examination module actually does, and no way to reach anybody.
 *
 * This screen answers the question the alert could not: what does this module do, and where does
 * each of its parts live? Every row links to the screen it describes, so the help is navigable
 * rather than a paragraph.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { AnimatedCard } from '../../../../../components/ui';

/**
 * The parts of the examination module, and the screen each one lives on.
 *
 * The KEYS are the `FEATURE_MODULES` keys in `exam_cell.js`. A key that is not registered fails
 * SILENTLY — `renderContent` finds nothing and drops the officer back on the hub — so the UI audit
 * asserts every key here is present.
 */
const PARTS = [
  {
    key: 'TimetableCalendar',
    icon: 'calendar-outline',
    title: 'Examination calendar',
    body: 'Every paper on one calendar, so a clash is a thing you can see rather than discover.',
  },
  {
    key: 'TimetableExams',
    icon: 'document-text-outline',
    title: 'Exam schedules',
    body: 'Create an exam, give it its slots, and publish it. Publishing tells the students.',
  },
  {
    key: 'TimetableSlots',
    icon: 'time-outline',
    title: 'Date & time slots',
    body: 'Move a paper. A move is checked for clashes before it is written, and the students are told.',
  },
  {
    key: 'TimetableDuty',
    icon: 'people-outline',
    title: 'Invigilator duty',
    body: 'Who is on duty, where, and when. Nobody is booked into two rooms at once.',
  },
  {
    key: 'TimetableConflicts',
    icon: 'warning-outline',
    title: 'Clashes & publishing',
    body: 'Every clash the engine found, by severity. A hard clash stops the timetable going out.',
  },
  {
    key: 'HallTicketsEligibility',
    icon: 'checkbox-outline',
    title: 'Student eligibility',
    body: 'Who is cleared to sit, who is warned, and who is blocked. The same answer the desk uses.',
  },
  {
    key: 'HallTicketsGeneration',
    icon: 'flash-outline',
    title: 'Generate hall tickets',
    body: 'Issue the tickets. Seat numbers never collide, even on a second run.',
  },
  {
    key: 'HallTicketsPublication',
    icon: 'megaphone-outline',
    title: 'Hall ticket publication',
    body: 'Release the tickets to students. Releasing them is what tells the students to collect.',
  },
  {
    key: 'EvaluationsDeadlines',
    icon: 'alarm-outline',
    title: 'Evaluation deadlines',
    body: 'Set the grading deadline, and remind the office when it is close. The reminder is sent.',
  },
  {
    key: 'EvaluationsMissing',
    icon: 'alert-circle-outline',
    title: 'Missing marks',
    body: 'Papers with no marks entered, and who has them.',
  },
  {
    key: 'ResultsConsolidate',
    icon: 'git-merge-outline',
    title: 'Marks consolidation',
    body: 'Collect the papers into results. Grades and pass marks are derived on the server.',
  },
  {
    key: 'ResultsPublish',
    icon: 'megaphone-outline',
    title: 'Result publication',
    body: 'Publish the results. The students with a result are told, and only those students.',
  },
  {
    key: 'ResultsRevaluation',
    icon: 'refresh-circle-outline',
    title: 'Revaluation',
    body: 'Decide a revaluation. The student who asked is told the outcome.',
  },
  {
    key: 'CheatingCases',
    icon: 'shield-outline',
    title: 'Cheating cases',
    body: 'Report, review, decide. Every state change leaves an event, and the student is told.',
  },
  {
    key: 'Notifications',
    icon: 'notifications-outline',
    title: 'Notifications',
    body: 'The nine kinds of message the examination office sends, and the notice composer.',
  },
];

const CONTACTS = [
  {
    icon: 'mail-outline',
    title: 'Examination office',
    body: 'examcell@learnix.dev — for the timetable, hall tickets, evaluations and results.',
  },
  {
    icon: 'people-outline',
    title: 'Your administrator',
    body: 'For permissions, roles, and anything the access map says you may do but you cannot.',
  },
  {
    icon: 'information-circle-outline',
    title: 'How the exam office works',
    body: 'The examination office composes IMPORTANT notices only. Every other message is reported by the system, so a result or a cheating decision cannot be forged from a notice.',
  },
];

export default function ExamHelpSupport({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <TouchableOpacity style={styles.back} onPress={() => navigation?.goBack?.()}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Help &amp; support</Text>
      <Text style={styles.sub}>
        What each part of the examination module does, and where to find it.
      </Text>

      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>The parts of this module</Text>
        {PARTS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={styles.partRow}
            onPress={() => navigation?.navigate?.(p.key)}
            activeOpacity={0.7}
          >
            <View style={styles.partIcon}>
              <Ionicons name={p.icon} size={16} color={theme.colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.partTitle}>{p.title}</Text>
              <Text style={styles.partBody}>{p.body}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))}
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>Who to ask</Text>
        {CONTACTS.map((c) => (
          <View key={c.title} style={styles.contactRow}>
            <View style={styles.partIcon}>
              <Ionicons name={c.icon} size={16} color={theme.colors.textMuted} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.partTitle}>{c.title}</Text>
              <Text style={styles.partBody}>{c.body}</Text>
            </View>
          </View>
        ))}
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
  card: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 7,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: 7,
  },
  partIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  partBody: { fontSize: 11, color: theme.colors.textMuted, lineHeight: 16 },
});
