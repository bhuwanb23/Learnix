/**
 * HD-06 — The HOD's Courses desk: the detail's shared stylesheet.
 * Docs: 11-hod.md §3.3
 *
 * The panels are in two files — `coursesDetailPanels.js` for the course itself and
 * `coursesDetailResults.js` for the measurements and the graph — and they draw the same
 * surfaces: a row card, a sub-label, a plain line. So the styles live here and both import them.
 */
import { StyleSheet } from 'react-native';
import { theme } from '../../../../constants/theme';

export const styles = StyleSheet.create({
  flex: { flex: 1 },

  rowCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  rowMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  rollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rollMain: { flex: 1 },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dayLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, width: 34 },
  slotText: { fontSize: 12, color: theme.colors.text, fontWeight: '600' },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  plainLine: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },

  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  gradeLetter: { fontSize: 12, fontWeight: '800', color: theme.colors.text, width: 18 },
  gradeBarTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  gradeBarFill: { height: 7, borderRadius: 4 },
  gradeCount: { fontSize: 11, fontWeight: '700', color: theme.colors.text, width: 22, textAlign: 'right' },

  prereqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#64748b' },
});
