/**
 * X-10 — The exam officer's profile: the styles.
 * Docs: 05-exam-cell.md §3.8
 *
 * A separate file because the profile screen is the busiest one in the exam cell module and the
 * stylesheet was most of it. The pattern is the one the rest of the module already uses — a
 * `xxxMeta.js` / `xxxUi.js` pair next to the screen that draws.
 */
import { StyleSheet } from 'react-native';
import { theme } from '../../../../constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  link: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },

  header: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    gap: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  designation: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  employee: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  where: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  roleRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rolePillText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  errorCard: { borderColor: theme.colors.error, borderWidth: 1 },
  errorText: { color: theme.colors.error, fontSize: 13, flex: 1 },

  statRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statTile: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, textAlign: 'center' },

  card: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  muted: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },

  examRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 5 },
  examName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  examMeta: { fontSize: 11, color: theme.colors.textMuted },
  examStatus: { fontSize: 10, fontWeight: '700', color: theme.colors.primary },

  permRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  permKey: { fontSize: 11, color: theme.colors.text, fontWeight: '600' },
  permName: { fontSize: 11, color: theme.colors.textMuted, flex: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 6 },

  prefRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 5 },
  prefIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  prefBlurb: { fontSize: 11, color: theme.colors.textMuted },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockedText: { fontSize: 10, color: theme.colors.error, fontWeight: '600' },

  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  dangerText: { fontSize: 13, color: theme.colors.error, fontWeight: '600' },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  menuSub: { fontSize: 11, color: theme.colors.textMuted },

  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: theme.spacing.sm + 2,
    marginTop: theme.spacing.sm,
  },
  logoutText: { fontSize: 14, color: theme.colors.error, fontWeight: '700' },
});
