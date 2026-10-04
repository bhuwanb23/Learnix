// Budgets — allocation and utilisation (docs/users/06 §3.6 §3).
//
// A budget screen that only reads is a poster. The point of this one is that the
// number can be changed from the same screen it is judged on, because the moment
// you find you are 40% over the lab line is the moment you want to change it.
//
// Two things the old screen never had and that turn out to matter most:
//
//  1. UNBUDGETED SPEND. Every rupee of approved spend that sits on no line is
//     counted per line and totalled. Without it, a department can spend without
//     limit as long as it files the claims under a category nobody budgeted.
//  2. OVERSPEND IS ITS OWN WORDING. A line at 140% and a line at 100% both draw
//     a full bar, so "₹14.2L over" appears above the bar while the percentage
//     next to it says 140%. Rendering only the percentage threw away the single
//     most useful fact about the line.
//
// Editing is per line and writes straight through — there is no "save all"
// because there is no draft state: a budget that is edited but not saved is a
// budget that was never edited.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  rupees, compactRupees, categoryMeta, utilisationPhrase, utilisationColor,
  utilisationWidth, fiscalYearLabel, EXPENSE_CATEGORIES, THEME,
} from '../../../expensesMeta';

const DEPT_NONE = '__none__';

/** Rupees typed → integer paise stored. */
const toMinor = (v) => Math.round((parseFloat(v) || 0) * 100);

function BudgetLine({ line, onEdit }) {
  const color = utilisationColor(line);
  const wide = utilisationWidth(line);

  return (
    <View style={styles.lineCard}>
      <View style={styles.lineHeader}>
        <View style={styles.lineTitleWrap}>
          <View style={[styles.lineDot, { backgroundColor: categoryMeta(line.category).color }]} />
          <View style={styles.lineTitles}>
            <Text style={styles.lineTitle}>{line.categoryLabel}</Text>
            <Text style={styles.lineScope}>{line.departmentName}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onEdit(line)}
          style={styles.editBtn}
          activeOpacity={0.7}
          accessibilityLabel={`Edit the ${line.categoryLabel} budget`}
        >
          <Ionicons name="create-outline" size={16} color={THEME} />
        </TouchableOpacity>
      </View>

      <View style={styles.lineAmounts}>
        <Text style={styles.lineSpent}>{compactRupees(line.spentRupees)}</Text>
        <Text style={styles.lineOf}> of {compactRupees(line.plannedRupees)}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${wide}%`, backgroundColor: color }]} />
      </View>

      <View style={styles.lineFooter}>
        <Text style={[styles.linePhrase, { color }]}>{utilisationPhrase(line)}</Text>
        <Text style={styles.linePct}>{line.percent}%</Text>
      </View>

      {line.unbudgetedRupees > 0 && (
        <View style={styles.unbudgetedChip}>
          <Ionicons name="alert-circle" size={12} color="#d97706" />
          <Text style={styles.unbudgetedText}>
            {compactRupees(line.unbudgetedRupees)} approved off-budget
            {line.unbudgetedCount > 0 ? ` across ${line.unbudgetedCount} claim${line.unbudgetedCount === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
      )}

      {line.note ? <Text style={styles.lineNote}>{line.note}</Text> : null}
    </View>
  );
}

export default function Budgets({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(null);
  const [editing, setEditing] = useState(null);
  const [planned, setPlanned] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.expenseBudgets(year ? { fiscalYear: year } : {});
      setData(result);
      // Follow the server's year, not the one asked for: on first load there was
      // none, and defaulting locally would drift from the budget it is showing.
      if (!year) setYear(result.fiscalYear);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const openEditor = (line) => {
    setEditing(line);
    setPlanned(line ? String(line.plannedRupees) : '');
    setNote(line?.note ?? '');
  };

  const save = async () => {
    const minor = toMinor(planned);
    if (editing && minor === Math.round((editing.plannedRupees ?? 0) * 100) && note === (editing.note ?? '')) {
      setEditing(null);
      return;
    }
    if (minor < 0) {
      Alert.alert('Check the amount', 'A budget cannot be negative.');
      return;
    }
    setSaving(true);
    try {
      await accountsApi.saveExpenseBudget({
        // An existing line is updated by id; a null id means "create this line",
        // which is what adding a category nobody budgeted for requires.
        ...(editing?.id ? { id: editing.id } : {}),
        category: editing.category,
        plannedMinor: minor,
        ...(editing.departmentId ? { departmentId: editing.departmentId } : {}),
        ...(editing.fiscalYear ? { fiscalYear: editing.fiscalYear } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setEditing(null);
      await load();
    } catch (err) {
      Alert.alert('Could not save the budget', err.message);
    } finally {
      setSaving(false);
    }
  };

  const reconcile = () =>
    Alert.alert(
      'Recalculate from approved claims?',
      'The server recomputes every line’s spent figure from the approved claims attached to it. Useful after a manual correction; it never changes what you planned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recalculate',
          onPress: async () => {
            try {
              const r = await accountsApi.reconcileExpenseBudgets();
              await load();
              Alert.alert('Recalculated', `${r.checked} budget line${r.checked === 1 ? '' : 's'} checked.`);
            } catch (err) {
              Alert.alert('Could not reconcile', err.message);
            }
          },
        },
      ],
    );

  const totals = data?.totals;

  /** Categories with no line this year — the ones you can still add. */
  const uncategorised = useMemo(() => {
    if (!data) return [];
    const plannedCats = new Set(data.budgets.map((b) => b.category));
    return EXPENSE_CATEGORIES.filter((c) => !plannedCats.has(c.id));
  }, [data]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* ── Year switcher ─────────────────────────────────────── */}
      {data.years.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
          {data.years.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              activeOpacity={0.8}
              style={[styles.yearChip, data.fiscalYear === y && styles.yearChipOn]}
            >
              <Text style={[styles.yearText, data.fiscalYear === y && styles.yearTextOn]}>
                {fiscalYearLabel(y)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {data.fiscalYear !== data.currentFiscalYear && (
        <View style={styles.pastBanner}>
          <Ionicons name="time-outline" size={15} color="#92400e" />
          <Text style={styles.pastText}>
            You are looking at FY {fiscalYearLabel(data.fiscalYear)}. The current
            year is {fiscalYearLabel(data.currentFiscalYear)}.
          </Text>
        </View>
      )}

      {/* ── Totals ────────────────────────────────────────────── */}
      <View style={styles.totalsCard}>
        <Text style={styles.totalsLabel}>
          Planned for FY {fiscalYearLabel(data.fiscalYear)}
        </Text>
        <Text style={styles.totalsValue}>{compactRupees(totals.plannedRupees)}</Text>

        <View style={styles.totalsTrack}>
          <View
            style={[styles.totalsFill, {
              width: `${Math.min(100, totals.percent)}%`,
              backgroundColor: totals.remainingRupees < 0 ? '#dc2626' : totals.percent >= 90 ? '#d97706' : '#059669',
            }]}
          />
        </View>

        <View style={styles.totalsRow}>
          <View style={styles.totalsCell}>
            <Text style={styles.totalsCellLabel}>Spent</Text>
            <Text style={styles.totalsCellValue}>{compactRupees(totals.spentRupees)}</Text>
          </View>
          <View style={styles.totalsCell}>
            <Text style={styles.totalsCellLabel}>
              {totals.remainingRupees < 0 ? 'Over by' : 'Left'}
            </Text>
            <Text style={[styles.totalsCellValue, totals.remainingRupees < 0 && { color: '#dc2626' }]}>
              {compactRupees(Math.abs(totals.remainingRupees))}
            </Text>
          </View>
          <View style={styles.totalsCell}>
            <Text style={styles.totalsCellLabel}>Used</Text>
            <Text style={styles.totalsCellValue}>{totals.percent}%</Text>
          </View>
        </View>

        {totals.overBudgetCount > 0 && (
          <View style={styles.overBanner}>
            <Ionicons name="warning" size={15} color="#dc2626" />
            <Text style={styles.overText}>
              {totals.overBudgetCount} line{totals.overBudgetCount === 1 ? '' : 's'} over budget
            </Text>
          </View>
        )}

        {totals.unbudgetedRupees > 0 && (
          <View style={styles.unbudgetedTotal}>
            <Ionicons name="alert-circle" size={15} color="#d97706" />
            <Text style={styles.unbudgetedTotalText}>
              {compactRupees(totals.unbudgetedRupees)} of approved spend sits on
              no line at all — it is not in any of these percentages.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.reconcileBtn} onPress={reconcile} activeOpacity={0.8}>
        <Ionicons name="refresh" size={15} color={THEME} />
        <Text style={styles.reconcileText}>Recalculate spent from approved claims</Text>
      </TouchableOpacity>

      {/* ── Lines ─────────────────────────────────────────────── */}
      <Text style={styles.section}>Budget lines ({data.budgets.length})</Text>
      {data.budgets.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No budget set for FY {fiscalYearLabel(data.fiscalYear)}. Everything
            approved this year is off-budget.
          </Text>
        </View>
      )}
      {data.budgets.map((line) => (
        <BudgetLine key={line.id} line={line} onEdit={openEditor} />
      ))}

      {uncategorised.length > 0 && (
        <>
          <Text style={styles.section}>Categories with no line</Text>
          <Text style={styles.sectionHint}>
            Spend in these is approved but invisible to every percentage above.
          </Text>
          {uncategorised.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.addRow}
              activeOpacity={0.8}
              onPress={() =>
                openEditor({
                  category: c.id, categoryLabel: c.label, fiscalYear: data.fiscalYear,
                  departmentId: null, departmentName: 'Institution-wide', plannedRupees: 0, note: null,
                })
              }
            >
              <Ionicons name={c.icon} size={17} color={c.color} />
              <View style={styles.addInfo}>
                <Text style={styles.addTitle}>{c.label}</Text>
                <Text style={styles.addHint}>{c.hint}</Text>
              </View>
              <Ionicons name="add-circle" size={22} color={THEME} />
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* ── Editor ────────────────────────────────────────────── */}
      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {editing?.id ? 'Change the allocation' : 'Budget a category'}
            </Text>
            {editing && (
              <Text style={styles.sheetSub}>
                {editing.categoryLabel} · {editing.departmentName} · FY{' '}
                {fiscalYearLabel(editing.fiscalYear ?? data.fiscalYear)}
              </Text>
            )}

            <Text style={styles.sheetLabel}>Planned amount</Text>
            <View style={styles.amountBox}>
              <Text style={styles.sheetRupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={planned}
                onChangeText={setPlanned}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />
            </View>

            {editing?.spentRupees > 0 && (
              <Text style={styles.sheetHint}>
                {rupees(editing.spentRupees)} has already been approved against
                this line. Setting a lower number does not un-approve it — the
                line simply goes over.
              </Text>
            )}

            <Text style={styles.sheetLabel}>Note</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="What this line is for"
              placeholderTextColor="#94a3b8"
              maxLength={200}
              multiline
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>{editing?.id ? 'Save' : 'Add line'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },

  yearScroll: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 12 },
  yearChip: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
  },
  yearChipOn: { backgroundColor: THEME, borderColor: THEME },
  yearText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  yearTextOn: { color: '#fff' },

  pastBanner: {
    flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderColor: '#fde68a',
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12,
  },
  pastText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Regular', lineHeight: 17 },

  totalsCard: {
    backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f7',
    padding: 18,
  },
  totalsLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  totalsValue: {
    fontSize: 28, fontWeight: '800', color: '#0f172a', marginTop: 6,
    fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1,
  },
  totalsTrack: {
    height: 10, borderRadius: 5, backgroundColor: '#eef2f7', marginTop: 14, overflow: 'hidden',
  },
  totalsFill: { height: '100%', borderRadius: 5 },
  totalsRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  totalsCell: { flex: 1 },
  totalsCellLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  totalsCellValue: {
    fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold', marginTop: 2,
  },

  overBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2',
    borderRadius: 10, padding: 10, marginTop: 14, borderWidth: 1, borderColor: '#fecaca',
  },
  overText: { fontSize: 12, fontWeight: '600', color: '#b91c1c', fontFamily: 'Manrope-SemiBold' },
  unbudgetedTotal: {
    flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderRadius: 10, padding: 12,
    marginTop: 10, borderWidth: 1, borderColor: '#fde68a',
  },
  unbudgetedTotalText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Regular', lineHeight: 17 },

  reconcileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 10,
  },
  reconcileText: { fontSize: 12, fontWeight: '600', color: THEME, fontFamily: 'Manrope-SemiBold' },

  section: {
    fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 8,
  },
  sectionHint: {
    fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginBottom: 10, lineHeight: 16,
  },

  lineCard: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 14, marginBottom: 10,
  },
  lineHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  lineTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineDot: { width: 8, height: 8, borderRadius: 4 },
  lineTitles: { flex: 1 },
  lineTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  lineScope: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  editBtn: { padding: 4 },

  lineAmounts: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  lineSpent: { fontSize: 19, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  lineOf: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  track: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },

  lineFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  linePhrase: { fontSize: 11, fontWeight: '600', fontFamily: 'Manrope-SemiBold' },
  linePct: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold' },

  unbudgetedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fffbeb',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginTop: 8,
  },
  unbudgetedText: { fontSize: 10, color: '#92400e', fontFamily: 'Manrope-SemiBold' },
  lineNote: {
    fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 8,
    fontStyle: 'italic', lineHeight: 16,
  },

  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 18, borderStyle: 'dashed',
  },
  emptyText: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular', lineHeight: 18, textAlign: 'center' },

  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff',
    borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', borderStyle: 'dashed',
    padding: 14, marginBottom: 8,
  },
  addInfo: { flex: 1 },
  addTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  addHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sheetSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4 },
  sheetLabel: {
    fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8,
  },
  amountBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14,
  },
  sheetRupee: { fontSize: 20, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  amountInput: {
    flex: 1, fontSize: 22, fontWeight: '800', color: '#0f172a', paddingVertical: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  sheetHint: {
    fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Regular', marginTop: 10, lineHeight: 17,
  },
  noteInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular', minHeight: 60,
    textAlignVertical: 'top',
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center',
  },
  cancelText: { color: '#64748b', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: THEME, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
