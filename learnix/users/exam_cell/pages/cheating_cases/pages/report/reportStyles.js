/**
 * X-08 — Cheating cases: the report screen's styles.
 * (docs/users/05 §3.6)
 */
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  body: { paddingBottom: 40 },
  flex: { flex: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 10,
  },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
    marginBottom: 6,
  },
  slotRowOn: { borderColor: THEME, backgroundColor: THEME + '0D' },
  slotName: { fontSize: 12.5, fontWeight: '600', color: '#0f172a' },
  slotMeta: { fontSize: 10.5, color: MUTED, marginTop: 1 },

  whereRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  whereText: { fontSize: 12, color: '#475569' },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: SLATE,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
    marginBottom: 5,
  },
  studentRowOn: { borderColor: THEME, backgroundColor: THEME + '0D' },
  studentName: { fontSize: 12.5, fontWeight: '600', color: '#0f172a' },
  studentMeta: { fontSize: 10.5, color: MUTED, marginTop: 1 },

  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12.5,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 7,
  },
  inputTall: { minHeight: 84, textAlignVertical: 'top' },

  hint: { fontSize: 11, color: MUTED, lineHeight: 16, marginBottom: 8 },

  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
    marginBottom: 5,
  },
  riskRowOn: { borderColor: THEME, backgroundColor: THEME + '0D' },
  riskLabel: { fontSize: 12.5, fontWeight: '700', color: '#0f172a' },
  riskBlurb: { fontSize: 10.5, color: MUTED, marginTop: 1, lineHeight: 15 },

  classGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  classChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  classChipOn: { borderColor: VIOLET, backgroundColor: VIOLET + '14' },
  classChipText: { fontSize: 10.5, fontWeight: '600', color: SLATE },
  classChipTextOn: { color: VIOLET },

  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
    marginBottom: 5,
  },
  sourceRowOn: { borderColor: THEME, backgroundColor: THEME + '0D' },
  sourceLabel: { fontSize: 12, fontWeight: '600', color: SLATE },
  sourceLabelOn: { color: THEME },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME,
    borderRadius: 11,
    paddingVertical: 13,
    marginHorizontal: 20,
    marginTop: 4,
  },
  submitText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
});
