// Late Fee Policy — the institution's own rule for late payment
// (docs/users/06 §3.3).
//
// The mechanism is universal; whether a fine is charged, and how much, is the
// institution's decision. That is the whole point of this screen existing: the
// rule is a policy statement, so it is written in plain English, previewed
// against the real book before it is saved, and switching it off is as easy as
// switching it on.
//
// The projection matters more than the form. An officer asked to turn on a fine
// needs to know what it costs the institute this month and how many families it
// touches — not discover it on next month's collection report. So the server
// projects the rule against the live book and the numbers are shown before save.
//
// A fine is ASSESSED, never automatic. This screen can run the assessment, but
// only bills that are already overdue and not yet fined are touched, and each
// assessment is stamped with who did it and when.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, SkeletonStatRow, SkeletonCard } from '../../../../../../components/ui';
import { THEME, rupees, compactRupees, formatDateTime } from '../duesMeta';

const MODES = [
  { id: 'PERCENT', label: '% of the bill', hint: 'of the unpaid amount, every month late' },
  { id: 'FLAT', label: 'Flat amount', hint: 'a fixed sum, every month late' },
];

export default function LateFeePolicy({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // The form mirrors the server rule exactly — percent is edited as a percent
  // and stored as basis points (1.5% = 150bp), which is the one conversion that
  // is easy to get wrong by a factor of 100.
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState('Standard late fee');
  const [mode, setMode] = useState('PERCENT');
  const [percent, setPercent] = useState('1.5');
  const [flatRupees, setFlatRupees] = useState('200');
  const [graceDays, setGraceDays] = useState('15');
  const [capPercent, setCapPercent] = useState('25');
  const [maxMonths, setMaxMonths] = useState('6');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.lateFeeSettings();
      setData(result);
      const r = result.rule;
      setEnabled(!!r.enabled);
      setName(r.name || 'Standard late fee');
      setMode(r.mode ?? 'PERCENT');
      setPercent(((r.valueBp ?? 150) / 100).toString());
      setFlatRupees(String(r.flatRupees ?? 200));
      setGraceDays(String(r.graceDays ?? 15));
      setCapPercent(String((r.capBp ?? 2500) / 100));
      setMaxMonths(String(r.maxMonths ?? 6));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const save = async () => {
    const grace = parseInt(graceDays, 10);
    const cap = parseFloat(capPercent);
    const months = parseInt(maxMonths, 10);
    const rate = parseFloat(percent);
    const flat = parseFloat(flatRupees);

    if (!Number.isFinite(grace) || grace < 0 || grace > 90) {
      Alert.alert('Check the grace period', 'Grace must be between 0 and 90 days.');
      return;
    }
    if (mode === 'PERCENT' && (!Number.isFinite(rate) || rate <= 0 || rate > 25)) {
      Alert.alert('Check the rate', 'A monthly percentage must be above 0% and at most 25%.');
      return;
    }
    if (mode === 'FLAT' && (!Number.isFinite(flat) || flat <= 0)) {
      Alert.alert('Check the flat amount', 'A flat fine must be more than zero.');
      return;
    }
    if (!Number.isFinite(cap) || cap < 0 || cap > 100) {
      Alert.alert('Check the cap', 'The cap is a percentage of the bill, from 0 to 100.');
      return;
    }
    if (!Number.isFinite(months) || months < 0 || months > 36) {
      Alert.alert('Check the limit', 'A fine can run for 0 (no limit) to 36 months.');
      return;
    }

    setBusy(true);
    try {
      await accountsApi.saveLateFeeRule({
        name: name.trim() || 'Standard late fee',
        enabled,
        graceDays: grace,
        mode,
        valueBp: mode === 'PERCENT' ? Math.round(rate * 100) : 0,
        flatMinor: mode === 'FLAT' ? Math.round(flat * 100) : 0,
        capBp: Math.round(cap * 100),
        maxMonths: months,
      });
      await load();
      Alert.alert(
        enabled ? 'Policy saved' : 'Fines switched off',
        enabled
          ? 'The rule applies to future assessments. Existing fines are unchanged — remove them per bill if you need to.'
          : 'No new fine can be assessed. Fines already charged stay on the bills they were charged to.',
      );
    } catch (err) {
      Alert.alert('Cannot Save', err.message);
    } finally {
      setBusy(false);
    }
  };

  const runAssessment = () => {
    Alert.alert(
      'Assess fines now?',
      `${data.projection.pendingCount} overdue bill(s) across ${data.projection.pendingStudents} ` +
      `student(s) would be fined, about ${rupees(data.projection.pendingRupees)} in total.\n\n` +
      'This charges real money to real families and is stamped against your name. Bills already ' +
      'fined are left alone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assess',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const result = await accountsApi.runLateFee({});
              await load();
              Alert.alert(
                'Assessment complete',
                `${result.assessedCount} bill(s) fined, ${rupees(result.addedRupees)} charged, ` +
                `${result.studentsNotified} student(s) told, ${result.skippedCount} skipped.`,
              );
            } catch (err) {
              Alert.alert('Cannot Assess', err.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = data.projection;
  // The plain-English sentence is generated on the server from the SAVED rule,
  // and previewed here from the form, so the officer reads what they are about
  // to write in the same words their families will.
  const previewSentence = !enabled
    ? 'No late fine will be charged.'
    : `${graceDays}-day grace · ${mode === 'FLAT'
      ? `${rupees(parseFloat(flatRupees) || 0)} a month late`
      : `${percent}% a month late`} · cap ${Number(capPercent) >= 100 ? 'none' : `${capPercent}% of the bill`}` +
      `${Number(maxMonths) > 0 ? ` · stops after ${maxMonths} months` : ''}`;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        {/* ── Status ── */}
        <AnimatedCard delay={0} style={[styles.card, enabled ? styles.onCard : styles.offCard]}>
          <View style={styles.statusTop}>
            <View style={[styles.statusIcon, { backgroundColor: enabled ? '#fffbeb' : '#f1f5f9' }]}>
              <Ionicons
                name={enabled ? 'alert-circle-outline' : 'shield-checkmark-outline'}
                size={20}
                color={enabled ? '#d97706' : '#64748b'}
              />
            </View>
            <View style={styles.statusBody}>
              <Text style={styles.statusTitle}>{enabled ? 'Late fines are on' : 'Late fines are off'}</Text>
              <Text style={styles.statusSub}>
                {data.ruleId
                  ? `Policy saved ${formatDateTime(data.updatedAt)}`
                  : 'No policy has been saved for this institution yet'}
              </Text>
            </View>
          </View>
          <Text style={styles.statusSentence}>{data.rule.ruleSummary}</Text>
        </AnimatedCard>

        {/* ── Projection ── */}
        <AnimatedCard delay={40} style={styles.card}>
          <Text style={styles.sectionLabel}>What this rule would do right now</Text>
          <View style={styles.projRow}>
            <ProjCell label="Overdue bills" value={String(p.overdueCount)} />
            <View style={styles.projDivider} />
            <ProjCell label="Already fined" value={String(p.alreadyAssessedCount)} color="#64748b" />
            <View style={styles.projDivider} />
            <ProjCell label="Would be fined" value={String(p.pendingCount)} color="#d97706" />
          </View>
          <View style={styles.projMoney}>
            <Text style={styles.projMoneyLabel}>Total that would be charged</Text>
            <Text style={styles.projMoneyValue}>{rupees(p.pendingRupees)}</Text>
            <Text style={styles.projMoneyMeta}>
              across {p.pendingStudents} student{p.pendingStudents === 1 ? '' : 's'} — these families
              would be told, and the amount is itemised on their bill.
            </Text>
          </View>

          {enabled && p.pendingCount > 0 ? (
            <TouchableOpacity
              style={[styles.runBtn, busy && styles.runBtnBusy]}
              activeOpacity={0.85}
              onPress={runAssessment}
              disabled={busy}
            >
              <Ionicons name="flash-outline" size={15} color="#fff" />
              <Text style={styles.runBtnText}>
                {busy ? 'Working…' : `Assess ${p.pendingCount} bill${p.pendingCount === 1 ? '' : 's'} now`}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.runNote}>
              <Ionicons name="information-circle-outline" size={13} color="#94a3b8" />
              <Text style={styles.runNoteText}>
                {enabled
                  ? 'Every overdue bill already carries a fine, so there is nothing to assess.'
                  : 'Turn the policy on and save it to start assessing fines.'}
              </Text>
            </View>
          )}
        </AnimatedCard>

        {/* ── The rule ── */}
        <Text style={styles.label}>The rule</Text>

        <AnimatedCard delay={80} style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleBody}>
              <Text style={styles.fieldTitle}>Charge a late fine</Text>
              <Text style={styles.fieldHint}>Turning this off stops new fines. It never removes one already charged.</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, enabled && styles.toggleOn]}
              onPress={() => setEnabled((v) => !v)}
              activeOpacity={0.85}
            >
              <View style={[styles.knob, enabled && styles.knobOn]} />
            </TouchableOpacity>
          </View>

          <View style={styles.sep} />

          <Text style={styles.fieldLabel}>Policy name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            editable={enabled && !busy}
            placeholder="Standard late fee"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.fieldLabel}>How the fine is calculated</Text>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeRow, mode === m.id && styles.modeRowActive]}
              onPress={() => setMode(m.id)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={mode === m.id ? 'radio-button-on' : 'radio-button-off'}
                size={17}
                color={mode === m.id ? THEME : '#94a3b8'}
              />
              <View style={styles.modeBody}>
                <Text style={[styles.modeTitle, mode === m.id && styles.modeTitleActive]}>{m.label}</Text>
                <Text style={styles.modeHint}>{m.hint}</Text>
              </View>
              {m.id === 'PERCENT' ? (
                <View style={styles.inlineField}>
                  <TextInput
                    style={styles.inlineInput}
                    value={percent}
                    onChangeText={setPercent}
                    keyboardType="decimal-pad"
                    editable={enabled && mode === 'PERCENT' && !busy}
                  />
                  <Text style={styles.inlineSuffix}>%</Text>
                </View>
              ) : (
                <View style={styles.inlineField}>
                  <Text style={styles.inlinePrefix}>₹</Text>
                  <TextInput
                    style={styles.inlineInput}
                    value={flatRupees}
                    onChangeText={setFlatRupees}
                    keyboardType="numeric"
                    editable={enabled && mode === 'FLAT' && !busy}
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Grace period (days)</Text>
              <TextInput
                style={styles.input}
                value={graceDays}
                onChangeText={setGraceDays}
                keyboardType="number-pad"
                editable={enabled && !busy}
              />
              <Text style={styles.colHint}>No fine until the bill is this many days past due.</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Stops after (months)</Text>
              <TextInput
                style={styles.input}
                value={maxMonths}
                onChangeText={setMaxMonths}
                keyboardType="number-pad"
                editable={enabled && !busy}
              />
              <Text style={styles.colHint}>0 means the fine keeps accruing.</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Cap — % of the bill</Text>
          <View style={styles.inlineField}>
            <TextInput
              style={[styles.input, styles.capInput]}
              value={capPercent}
              onChangeText={setCapPercent}
              keyboardType="decimal-pad"
              editable={enabled && !busy}
            />
            <Text style={styles.inlineSuffix}>%</Text>
          </View>
          <Text style={styles.fieldHint}>
            A fine can never exceed this share of the bill it is attached to, however long the
            family takes. This is the protection that stops a small delay turning into a
            disproportionate bill.
          </Text>
        </AnimatedCard>

        {/* ── Preview sentence ── */}
        <AnimatedCard delay={110} style={[styles.card, styles.previewCard]}>
          <Text style={styles.previewLabel}>In plain English</Text>
          <Text style={styles.previewText}>{previewSentence}</Text>
          <Text style={styles.previewHint}>
            This is what a family sees on their bill, and what a parent will quote back to you.
          </Text>
        </AnimatedCard>

        <TouchableOpacity
          style={[styles.saveBtn, (!enabled || busy) && styles.saveBtnIdle]}
          activeOpacity={0.85}
          onPress={save}
          disabled={busy}
        >
          <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save policy'}</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          A fine is never added silently: every assessment is stamped with the officer who made it
          and the time, and it can be removed per bill with a recorded reason.
        </Text>
      </ScrollView>
    </View>
  );
}

function ProjCell({ label, value, color }) {
  return (
    <View style={styles.projCell}>
      <Text style={styles.projLabel}>{label}</Text>
      <Text style={[styles.projValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  card: { marginBottom: 10, padding: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 9 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },

  onCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  offCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  statusIcon: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  statusBody: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  statusSub: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  statusSentence: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 12, lineHeight: 18 },

  projRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  projCell: { flex: 1 },
  projDivider: { width: 1, height: 28, backgroundColor: '#f1f5f9' },
  projLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  projValue: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },
  projMoney: { marginTop: 14, padding: 13, borderRadius: 12, backgroundColor: '#fef2f2' },
  projMoneyLabel: { fontSize: 10, color: '#991b1b', fontFamily: 'Manrope-Medium' },
  projMoneyValue: { fontSize: 22, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold', marginTop: 3, letterSpacing: -0.6 },
  projMoneyMeta: { fontSize: 10, color: '#7f1d1d', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 14 },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 13, paddingVertical: 13, borderRadius: 12, backgroundColor: '#d97706' },
  runBtnBusy: { backgroundColor: '#f59e0b' },
  runBtnText: { fontSize: 13, fontWeight: '800', color: '#fff', fontFamily: 'Manrope-Bold' },
  runNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 13, padding: 11, borderRadius: 11, backgroundColor: '#f8fafc' },
  runNoteText: { flex: 1, fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleBody: { flex: 1 },
  fieldTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  fieldHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 3, lineHeight: 14 },
  toggle: { width: 46, height: 27, borderRadius: 14, backgroundColor: '#cbd5e1', padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: '#d97706' },
  knob: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  sep: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  input: { borderRadius: 11, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  capInput: { flex: 1 },
  inlineField: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineInput: { width: 88, borderRadius: 11, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular', textAlign: 'right' },
  inlinePrefix: { fontSize: 14, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  inlineSuffix: { fontSize: 14, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },

  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  modeRowActive: { borderColor: THEME, backgroundColor: THEME + '07' },
  modeBody: { flex: 1 },
  modeTitle: { fontSize: 13, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
  modeTitleActive: { color: THEME },
  modeHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 14 },

  twoCol: { flexDirection: 'row', gap: 11 },
  col: { flex: 1 },
  colHint: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 5, lineHeight: 13 },

  previewCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b' },
  previewLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  previewText: { fontSize: 14, color: '#f1f5f9', fontFamily: 'Manrope-SemiBold', marginTop: 7, lineHeight: 21 },
  previewHint: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 9, lineHeight: 14 },

  saveBtn: { paddingVertical: 15, borderRadius: 13, backgroundColor: THEME, alignItems: 'center', marginTop: 4 },
  saveBtnIdle: { backgroundColor: '#94a3b8' },
  saveText: { fontSize: 14, fontWeight: '800', color: '#fff', fontFamily: 'Manrope-Bold' },
  footnote: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 16, lineHeight: 15 },
});
