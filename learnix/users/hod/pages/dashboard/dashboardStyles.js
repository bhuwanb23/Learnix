/**
 * HD-01 — The HOD dashboard: the stylesheet.
 * Docs: 11-hod.md §HD-01
 *
 * A SEPARATE FILE, and the reason is not tidiness: the stylesheet was a third of the UI file, and
 * every screen that draws a dashboard inherits it. Keeping it beside the components that use it
 * would mean every future change to a section's look is a change to a file that also holds the
 * fetch hook and the shell.
 *
 * THE COLOURS COME FROM THE SERVER
 * -------------------------------
 * The section colours, the alert colours and the health colours are published by the catalogue
 * and arrive with the data. The values in here are the FALLBACKS — what a tile looks like
 * before the catalogue lands — and `audit-hod-dashboard-ui.ts` asserts that the fallback palette
 * matches the server's.
 */
import { StyleSheet } from 'react-native';
import { theme } from '../../../../constants/theme';

export const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  sectionBlurb: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
    marginTop: 1,
  },

  statRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  tile: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    minWidth: 92,
    flexGrow: 1,
  },
  tileIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileValue: { fontSize: 19, fontWeight: '700', color: theme.colors.text },
  tileLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  tileHint: { fontSize: 9, color: '#94a3b8', marginTop: 1 },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.sm,
  },
  alertLabel: { fontSize: 13, fontWeight: '700' },
  alertBlurb: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  alertCount: { fontSize: 17, fontWeight: '800' },

  actionTile: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 15,
  },
  actionCount: { fontSize: 16, fontWeight: '800', marginTop: 3 },

  gauge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 4,
  },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  gaugeBand: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  gaugeScore: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: { fontSize: 24, fontWeight: '800' },
  gaugeWeakest: { fontSize: 11, color: theme.colors.text, fontWeight: '600' },
  gaugeNote: { fontSize: 10, color: theme.colors.textMuted, lineHeight: 14 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingVertical: 3,
  },
  detailLabel: { fontSize: 12, color: theme.colors.textMuted },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },

  barWrap: { gap: 3 },
  barTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, color: theme.colors.textMuted },
  barOver: { fontSize: 10, color: '#d97706', fontWeight: '600' },

  empty: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: 4,
  },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  emptyMessage: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  note: {
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.sm,
    paddingVertical: 2,
  },
  noteText: { fontSize: 11, lineHeight: 15 },

  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  stripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  stripLabel: { fontSize: 11, fontWeight: '600', maxWidth: 150 },
  stripCount: { fontSize: 12, fontWeight: '800' },
  clearStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: theme.spacing.sm,
  },
  clearText: { fontSize: 11, color: '#059669', fontWeight: '600' },

  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tagText: { fontSize: 9, fontWeight: '700' },

  loader: { paddingVertical: theme.spacing.md, alignItems: 'center' },
});
