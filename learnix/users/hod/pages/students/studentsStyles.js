/**
 * HD-05 — The HOD's Students desk: the shared stylesheet.
 * Docs: 11-hod.md §3.4
 *
 * It is its own file because a stylesheet is not a component: the atoms in `studentsUi.js`, the
 * panels and the screens all draw the same surfaces, and a `StyleSheet` that lives inside one of
 * them has to be imported out of it.
 */
import { StyleSheet } from 'react-native';
import { theme } from '../../../../constants/theme';

export const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: 32 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  flex: { flex: 1 },

  section: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  sectionBlurb: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeNone: { backgroundColor: '#f8fafc' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  signalWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },

  statRow: { flexDirection: 'row', gap: theme.spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileValue: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  tileLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2, textAlign: 'center' },
  tileHint: { fontSize: 9, color: '#94a3b8', marginTop: 2, textAlign: 'center' },

  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 10, fontWeight: '700' },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailLabel: { fontSize: 12, color: theme.colors.textMuted },
  detailValue: { fontSize: 12, fontWeight: '700', color: theme.colors.text },

  barWrap: { marginTop: 6 },
  barTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  barFill: { height: 7, borderRadius: 4 },
  barLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 3 },

  empty: { alignItems: 'center', paddingVertical: 26 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  emptyMessage: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 18,
    lineHeight: 16,
  },

  note: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  noteText: { fontSize: 11, lineHeight: 15 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: theme.colors.text, padding: 0 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 4 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 11, fontWeight: '700' },

  loader: { paddingVertical: 24, alignItems: 'center' },
});
