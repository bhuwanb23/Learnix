/**
 * X-09 — The exam cell notification centre: the vocabulary and the styles.
 * Docs: 05-exam-cell.md §3.7
 *
 * WHY THE LABELS ARE NOT IN THE FALLBACK LIST
 * --------------------------------------------
 * The SERVER owns them. `GET /examcell/notifications/catalogue` returns the nine categories with
 * their labels, icons and colours, and the screen renders from that. A second copy in the client
 * would be a second thing to forget to update, and the symptom is a chip that says "Results" in
 * the list and "Result publication" in the composer.
 *
 * What lives HERE is the FALLBACK — what the screen shows when the catalogue call has not landed,
 * or has failed. A fallback that is wrong is better than a blank screen, and a fallback that is
 * missing entirely is not: the chips would render empty and the officer would see no categories at
 * all, which reads as "the platform has no categories" rather than "the network is down".
 */
import { StyleSheet } from 'react-native';
import { theme } from '../../../../constants/theme';

/** How many rows a page holds. */
export const PAGE_SIZE = 20;

/**
 * The nine categories, in the order the server lists them.
 *
 * The ids are the SERVER's ids, not invented ones — the filter sends this id straight back in the
 * query, and an id the server does not recognise yields an empty list rather than an error.
 */
export const FALLBACK_CATEGORIES = [
  { id: 'EXAM_SCHEDULE', label: 'Exam schedule' },
  { id: 'TIMETABLE_CHANGE', label: 'Timetable changes' },
  { id: 'HALL_TICKET', label: 'Hall tickets' },
  { id: 'EXAM_REMINDER', label: 'Exam reminders' },
  { id: 'EVALUATION_DEADLINE', label: 'Evaluation deadlines' },
  { id: 'RESULT_PUBLICATION', label: 'Result publication' },
  { id: 'REVALUATION', label: 'Revaluation' },
  { id: 'CHEATING_CASE', label: 'Cheating cases' },
  { id: 'IMPORTANT_NOTICE', label: 'Important notices' },
];

/**
 * The audiences a notice can target.
 *
 * The server lists these too, and the screen prefers the server's. The fallback is here for the
 * same reason as the categories: a picker that renders empty is a picker that cannot be used.
 */
export const FALLBACK_AUDIENCES = [
  { id: 'ALL_STUDENTS', label: 'All students' },
  { id: 'SEM_STUDENTS', label: 'Semester students' },
  { id: 'FINAL_YEAR', label: 'Final year' },
  { id: 'ALL_OFFICERS', label: 'Exam office' },
  { id: 'EVERYONE', label: 'Everyone' },
];

/** How long ago a row was written, in words. */
export function ageLabel(iso) {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  rowLeft: { flexDirection: 'row', gap: theme.spacing.sm, flex: 1 },
  link: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },

  errorCard: { borderColor: theme.colors.error, borderWidth: 1 },
  errorText: { color: theme.colors.error, fontSize: 13, flex: 1 },

  chipScroll: { marginHorizontal: -theme.spacing.md },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipImportant: { borderColor: theme.colors.error },
  chipImportantOn: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  chipText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '500' },
  chipTextOn: { color: theme.colors.white },

  card: { gap: 6 },
  cardImportant: { borderColor: theme.colors.error, borderWidth: 1 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  titleUnread: { fontWeight: '700' },
  body: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' },
  meta: { fontSize: 11, color: theme.colors.textMuted },
  metaUrgent: { fontSize: 11, color: theme.colors.error, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginTop: 4 },

  more: { alignItems: 'center', paddingVertical: theme.spacing.md },
  moreText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },

  secondaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radius.md,
  },
  secondaryText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },

  composeBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
  },
  composeText: { color: theme.colors.white, fontWeight: '700', fontSize: 14 },

  label: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  inputTall: { minHeight: 96, textAlignVertical: 'top' },

  importantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  importantLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  importantHint: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },

  sendBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  sendOff: { opacity: 0.5 },
  sendText: { color: theme.colors.white, fontWeight: '700', fontSize: 14 },
  cancel: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  cancelText: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 14 },
});
