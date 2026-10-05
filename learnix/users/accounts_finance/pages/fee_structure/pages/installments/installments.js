// F-04 Fee Structure — instalment configuration (docs/users/06 §3.5.3).
//
// This is the MENU, not the meal. It sets the plan every bill raised against
// this structure is OFFERED — the actual plan for a given family is still agreed
// per student on the dues desk, because a family that cannot pay in three goes
// to the counter, not to a config screen. The screen says so, because a
// configuration that looks binding gets treated as binding and families get
// told the wrong thing.
//
// The preview is the useful part: the split is computed with the same
// integer-paise arithmetic the server uses, and the parts are asserted to add
// back up to the whole. A schedule that comes to ₹1 less than the bill is a
// collections bug that surfaces months later as "they paid the full amount and
// still owe ₹1".
//
// Twelve is the ceiling for the same reason the dues desk enforces it: past
// that, every instalment is a bill to age, remind and chase, and the cost of
// collecting it exceeds the goodwill.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  rupees, formatDay, INSTALLMENT_FREQUENCIES, INSTALLMENT_COUNTS,
  frequencyMeta, THEME,
} from '../../feeStructureMeta';

const FIRST_DUE_PRESETS = [15, 30, 45, 60, 90];

/**
 * Mirror of `defaultInstallments` on the server.
 *
 * Duplicated so the schedule moves as the officer drags the picker instead of
 * after a round trip — but it is a MIRROR, and the Save response carries the
 * server's own schedule, which is what replaces this one. If the two ever
 * diverge the officer sees the server's figures appear.
 */
function previewSplit(totalMinor, count) {
  const total = Math.max(0, Math.round(totalMinor));
  const n = Math.max(1, Math.min(12, Math.floor(count || 1)));
  if (n === 1) return [{ sequence: 1, amountMinor: total }];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => ({
    sequence: i + 1,
    amountMinor: base + (i < remainder ? 1 : 0),
  }));
}

const STEP_DAYS = { ONE_TIME: 0, MONTHLY: 30, QUARTERLY: 91, TRIMESTER: 60, SEMESTERLY: 182 };

function previewDates(startDay, count, frequency, firstDueDays) {
  const step = STEP_DAYS[frequency] ?? 0;
  const n = Math.max(1, Math.min(12, count || 1));
  if (!startDay) return [];
  const start = new Date(`${startDay}T00:00:00`);
  const first = new Date(start);
  first.setDate(first.getDate() + Math.max(0, firstDueDays));
  if (n === 1 || step === 0) return [{ sequence: 1, dueDay: iso(first) }];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(first);
    d.setDate(d.getDate() + step * i);
    return { sequence: i + 1, dueDay: iso(d) };
  });
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function FeeStructureInstallments({ route, navigation }) {
  const id = route?.params?.id;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState(1);
  const [frequency, setFrequency] = useState('ONE_TIME');
  const [firstDueDays, setFirstDueDays] = useState(30);
  const [saved, setSaved] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await accountsApi.feeStructureDetail(id);
      setDetail(d);
      setCount(d.installments.count ?? 1);
      setFrequency(d.installments.frequency ?? 'ONE_TIME');
      setFirstDueDays(d.installments.firstDueDays ?? 30);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const pickFrequency = (fid) => {
    setFrequency(fid);
    // ONE_TIME cannot be paired with a count above 1 — the server refuses it, so
    // the picker will not offer a combination that cannot be saved.
    if (fid === 'ONE_TIME') setCount(1);
    else if (count < 2) setCount(2);
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const result = await accountsApi.saveFeeInstallments(id, { count, frequency, firstDueDays });
      setSaved(result);
      await load();
      Alert.alert('Plan saved', result.summary);
    } catch (err) {
      Alert.alert('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  }, [count, frequency, firstDueDays, id, load]);

  const preview = useMemo(() => {
    if (!detail) return null;
    const totalMinor = detail.totalRupees * 100;
    const amounts = previewSplit(totalMinor, count);
    const dates = previewDates(detail.academicYear.startDay, count, frequency, firstDueDays);
    const sum = amounts.reduce((s, a) => s + a.amountMinor, 0);
    return {
      rows: amounts.map((a) => ({ ...a, dueDay: dates[a.sequence - 1]?.dueDay ?? null })),
      sumRupees: Math.round(sum / 100),
      foots: sum === totalMinor,
    };
  }, [detail, count, frequency, firstDueDays]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME} />
        <Text style={styles.loadingText}>Loading the instalment plan…</Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error ?? 'Not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = frequencyMeta(frequency);
  const counts = INSTALLMENT_COUNTS.filter((c) => c.value <= (meta.max ?? 12));
  const unchanged =
    count === detail.installments.count
    && frequency === detail.installments.frequency
    && firstDueDays === detail.installments.firstDueDays;

  return (
    <ScrollView
      style={styles.container}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{detail.program.name}</Text>
        <Text style={styles.headerSub}>{detail.academicYear.name} · fee {rupees(detail.totalRupees)}</Text>
        <View style={styles.headerNote}>
          <Ionicons name="information-circle-outline" size={12} color="#0891b2" />
          <Text style={styles.headerNoteText}>
            The plan every bill here is OFFERED. A family that cannot pay this way still gets a different plan
            agreed on the dues desk — nothing here refuses one.
          </Text>
        </View>
      </View>

      {/* ── Frequency ── */}
      <Text style={styles.fieldLabel}>How often?</Text>
      <View style={styles.freqGrid}>
        {INSTALLMENT_FREQUENCIES.map((f) => {
          const on = frequency === f.id;
          return (
            <TouchableOpacity key={f.id} onPress={() => pickFrequency(f.id)} activeOpacity={0.85} style={[styles.freqCard, on && styles.freqCardOn]}>
              <Text style={[styles.freqLabel, on && { color: '#fff' }]}>{f.label}</Text>
              <Text style={[styles.freqHint, on && { color: '#dbeafe' }]}>{f.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Count ── */}
      <Text style={styles.fieldLabel}>How many payments?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {counts.map((c) => {
          const on = count === c.value;
          return (
            <TouchableOpacity key={c.value} onPress={() => setCount(c.value)} activeOpacity={0.85} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {frequency === 'ONE_TIME' ? (
        <Text style={styles.hint}>One payment is not a plan — the whole fee falls due as a single bill.</Text>
      ) : (
        <Text style={styles.hint}>
          Up to 12. Past that every instalment becomes a bill to age, remind and chase, and the collection cost
          exceeds the goodwill.
        </Text>
      )}

      {/* ── First due date ── */}
      <Text style={styles.fieldLabel}>First payment falls due how long after the year starts?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {FIRST_DUE_PRESETS.map((d) => {
          const on = firstDueDays === d;
          return (
            <TouchableOpacity key={d} onPress={() => setFirstDueDays(d)} activeOpacity={0.85} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{d} days</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={styles.hint}>
        The year starts {formatDay(detail.academicYear.startDay)}, so the first bill would fall{' '}
        {preview?.rows?.[0]?.dueDay ? formatDay(preview.rows[0].dueDay) : '—'}.
      </Text>

      {/* ── Preview ── */}
      {preview && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>What this would raise</Text>
          <View style={styles.previewRows}>
            {preview.rows.map((r) => (
              <View key={r.sequence} style={styles.previewRow}>
                <Text style={styles.previewSeq}>#{r.sequence}</Text>
                <Text style={styles.previewDate}>{r.dueDay ? formatDay(r.dueDay) : '—'}</Text>
                <Text style={styles.previewAmount}>{rupees(Math.round(r.amountMinor / 100))}</Text>
              </View>
            ))}
          </View>
          <View style={styles.previewTotal}>
            <Text style={styles.previewTotalLabel}>The {preview.rows.length} bill{preview.rows.length === 1 ? '' : 's'} add up to</Text>
            <Text style={[styles.previewTotalValue, !preview.foots && styles.previewTotalBad]}>
              {rupees(preview.sumRupees)}
            </Text>
          </View>
          {preview.foots ? (
            <View style={styles.footsOk}>
              <Ionicons name="checkmark-circle-outline" size={13} color="#059669" />
              <Text style={styles.footsText}>
                Exactly the {rupees(detail.totalRupees)} fee. Every paise is placed.
              </Text>
            </View>
          ) : (
            <View style={styles.footsBad}>
              <Ionicons name="alert-circle-outline" size={13} color="#dc2626" />
              <Text style={styles.footsBadText}>
                These do not add up to the fee. Saving will be refused until the split is whole.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Currently saved ── */}
      <View style={styles.currentCard}>
        <Text style={styles.currentTitle}>Currently saved</Text>
        <Text style={styles.currentSummary}>{detail.installments.summary}</Text>
        <Text style={styles.currentNote}>
          {detail.installments.schedule.length} bill{detail.installments.schedule.length === 1 ? '' : 's'},
          {' '}first on {formatDay(detail.installments.schedule[0]?.dueDay)}.
          {' '}Raised bills are NOT changed by this — a plan already agreed with a family is a promise.
        </Text>
      </View>

      {saved && (
        <View style={styles.savedBox}>
          <Ionicons name="checkmark-circle" size={14} color="#059669" />
          <Text style={styles.savedText}>
            Saved: {saved.summary} · {saved.schedule.length} bills totalling {rupees(saved.scheduleTotalRupees)}.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, (unchanged || saving) && styles.saveBtnOff]}
        onPress={save}
        disabled={unchanged || saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={styles.saveBtnText}>{unchanged ? 'No change to save' : 'Save this plan'}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={15} color={THEME} />
        <Text style={styles.backText}>Back to the structure</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },

  header: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 6 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  headerSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  headerNote: { flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: '#f0f9ff', borderRadius: 8, padding: 9 },
  headerNoteText: { flex: 1, fontSize: 11, color: '#0369a1', fontFamily: 'Manrope-Regular', lineHeight: 16 },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-SemiBold', marginTop: 14, marginBottom: 6 },
  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  freqCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 11 },
  freqCardOn: { backgroundColor: THEME, borderColor: THEME },
  freqLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  freqHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 14 },

  chipScroll: { marginBottom: 2 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 7, marginRight: 7 },
  chipOn: { backgroundColor: THEME, borderColor: THEME },
  chipText: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium' },
  hint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 5, lineHeight: 15 },

  previewCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginTop: 14 },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  previewRows: { marginTop: 8, backgroundColor: '#f8fafc', borderRadius: 10, padding: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 6 },
  previewSeq: { width: 26, fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold' },
  previewDate: { flex: 1, fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular' },
  previewAmount: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  previewTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  previewTotalLabel: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular' },
  previewTotalValue: { fontSize: 16, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  previewTotalBad: { color: '#dc2626' },
  footsOk: { flexDirection: 'row', gap: 6, marginTop: 8, backgroundColor: '#f0fdf4', borderRadius: 8, padding: 8 },
  footsText: { flex: 1, fontSize: 10, color: '#065f46', fontFamily: 'Manrope-Regular', lineHeight: 15 },
  footsBad: { flexDirection: 'row', gap: 6, marginTop: 8, backgroundColor: '#fef2f2', borderRadius: 8, padding: 8 },
  footsBadText: { flex: 1, fontSize: 10, color: '#b91c1c', fontFamily: 'Manrope-Regular', lineHeight: 15 },

  currentCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 13, marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  currentTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  currentSummary: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold', marginTop: 4 },
  currentNote: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 5, lineHeight: 15 },

  savedBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginTop: 12 },
  savedText: { flex: 1, fontSize: 11, color: '#065f46', fontFamily: 'Manrope-Medium', lineHeight: 16 },

  saveBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: THEME, borderRadius: 12, paddingVertical: 13, marginTop: 12 },
  saveBtnOff: { backgroundColor: '#93b4f5' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 12, marginTop: 10 },
  backText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
});