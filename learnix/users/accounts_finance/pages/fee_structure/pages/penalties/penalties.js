// F-04 Fee Structure — late-payment penalties (docs/users/06 §3.5.5).
//
// Charging interest on a late fee is a POLICY decision, not a universal rule:
// some colleges charge nothing, some charge a flat ₹500 the month after the due
// date, some charge 1.5% a month. So this screen does not edit a policy — the
// dues desk's Late Fee Policy screen owns it and this one says plainly where.
//
// What it does is answer the three questions a fee clerk actually has about one
// program:
//
//   1. Which rule governs THIS program's bills? A program can override the
//      institution-wide default, and an override that is switched off is a
//      decision ("this program charges no late fee"), not a gap.
//   2. What does that rule mean in words? "capBp" tells an accounts officer
//      nothing; "1% a month after a 15-day grace, capped at 25% of the bill" tells
//      them everything.
//   3. What would a family actually be charged? Both scenarios are named —
//      a projection with no scenario is a number nobody can act on.
//
// The examples below are computed by the SERVER from the real rule, not by this
// screen re-deriving them. A client that computed its own estimate would
// eventually disagree with the fine the dues desk assesses, and the officer would
// be shown two numbers for the same bill.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { rupees, THEME } from '../../feeStructureMeta';

const SCENARIOS = [
  { days: 31, label: 'One month late' },
  { days: 61, label: 'Two months late' },
  { days: 121, label: 'Four months late' },
  { days: 400, label: 'Over a year late' },
];

export default function FeeStructurePenalties({ route, navigation }) {
  const id = route?.params?.id;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bill, setBill] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await accountsApi.feeStructureDetail(id);
      setDetail(d);
      // Default the example bill to the semester-1 amount, which is what a family
      // is actually handed at the start of term.
      if (!bill) setBill(String(d.semesterSchedule?.[0]?.amountRupees ?? d.totalRupees));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, bill]);

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const onRefresh = () => { setRefreshing(true); load(); };

  // Worked examples use the SERVER's own penalty figures rather than re-running
  // computeLateFee here — see the note at the top of the file.
  /**
   * Worked examples, computed by MIRRORING `computeLateFee` from
   * `dues.fines.ts` — not by approximating it.
   *
   * The first approximation written here counted whole months as `days / 30`
   * and applied neither the grace period nor the month ceiling. On the seeded
   * rule (15-day grace, stops after 3 months, 25% cap) it showed a fine for
   * "over a year late" several times LARGER than the fine the dues desk
   * actually assesses, on a screen whose whole job is to explain the desk's
   * number. An illustration that disagrees with the authority it explains is
   * worse than no illustration.
   *
   * So this mirrors the server's arithmetic step for step:
   *   daysLate   = daysOverdue − graceDays      (no fine at all while ≤ 0)
   *   months     = floor((daysLate − 1) / 30) + 1     — a PART month counts
   *   months     = min(months, maxMonths)        when maxMonths > 0
   *   amount     = flatMinor × months   |   balance × valueBp × months / 10000
   *   amount     = min(amount, balance × capBp / 10000)
   *   amount     = min(amount, balance)           — never more than the bill
   *
   * The base is the UNPAID BILL. It is deliberately not `detail.totalRupees`:
   * these examples are about the amount the officer typed in, and the server's
   * own annual figures are shown separately above from `p.monthlyRupees` /
   * `p.cappedRupees`, which come from the server with no client arithmetic at all.
   */
  const examples = useMemo(() => {
    const p = detail?.penalty;
    if (!p?.enabled) return [];
    const balance = Math.max(0, Number(bill) || 0);
    if (balance <= 0) return [];

    const cap = Math.floor((balance * p.capBp) / 10000);

    return SCENARIOS.map((s) => {
      const daysLate = s.days - p.graceDays;
      if (daysLate <= 0) {
        return { ...s, months: 0, rupees: 0, reason: 'Still inside the grace period' };
      }
      const startedMonths = Math.floor((daysLate - 1) / 30) + 1;
      const months = p.maxMonths > 0 ? Math.min(startedMonths, p.maxMonths) : startedMonths;
      const raw = p.mode === 'FLAT'
        ? p.flatRupees * months
        : Math.round((balance * p.valueBp * months) / 10000);

      let rupees = Math.min(raw, cap);
      let reason = null;
      if (months < startedMonths) reason = `Stopped at ${months} months by the rule's month limit`;
      else if (raw > cap) reason = 'Held at the ceiling';
      rupees = Math.max(0, Math.min(rupees, balance));

      return { ...s, months, startedMonths, rupees, reason };
    });
  }, [detail?.penalty, bill]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d97706" />
        <Text style={styles.loadingText}>Loading the penalty policy…</Text>
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

  const p = detail.penalty;

  return (
    <ScrollView
      style={styles.container}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#d97706']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{detail.program.name}</Text>
        <Text style={styles.headerSub}>{detail.academicYear.name}</Text>
        <View style={[styles.statusBox, p.enabled ? styles.statusOn : styles.statusOff]}>
          <Ionicons name={p.enabled ? 'alert-circle-outline' : 'shield-checkmark-outline'} size={16} color={p.enabled ? '#d97706' : '#059669'} />
          <Text style={[styles.statusText, { color: p.enabled ? '#92400e' : '#065f46' }]}>{p.summary}</Text>
        </View>
      </View>

      {/* ── Where the rule lives ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Which rule governs this program?</Text>
        <View style={styles.ruleRow}>
          <View style={[styles.scopeBadge, p.scope === 'STRUCTURE' ? styles.scopeOwn : styles.scopeDefault]}>
            <Text style={[styles.scopeText, { color: p.scope === 'STRUCTURE' ? '#b45309' : '#64748b' }]}>
              {p.scope === 'STRUCTURE' ? 'Set for this program' : p.scope === 'INSTITUTION' ? 'Institution-wide default' : 'No rule'}
            </Text>
          </View>
          <Text style={styles.ruleName}>{p.ruleName}</Text>
        </View>
        <Text style={styles.cardNote}>
          {p.scope === 'STRUCTURE'
            ? 'This program has its own rule, which overrides the institution default for its own bills. A rule that is switched off here is a deliberate "this program charges no late fee", not a gap that falls back to the default.'
            : p.scope === 'INSTITUTION'
              ? 'This program has no rule of its own, so its bills follow the institution-wide rule — the same one the dues desk assesses against.'
              : 'No late-payment penalty is configured. Bills on this structure are never fined.'}
        </Text>

        <TouchableOpacity style={styles.policyBtn} onPress={() => navigation.navigate('LateFeePolicy')} activeOpacity={0.85}>
          <Ionicons name="open-outline" size={15} color={THEME} />
          <Text style={styles.policyBtnText}>Edit the policy on the Late Fee screen</Text>
        </TouchableOpacity>
      </View>

      {p.enabled ? (
        <>
          {/* ── The terms, in words ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What it means</Text>
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Grace period</Text>
              <Text style={styles.termValue}>{p.graceDays} days after the due date</Text>
            </View>
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Rate</Text>
              <Text style={styles.termValue}>
                {p.mode === 'FLAT' ? `${rupees(p.flatRupees)} a month late` : `${p.valueBp / 100}% a month late`}
              </Text>
            </View>
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Fine ceiling</Text>
              <Text style={styles.termValue}>
                {p.capBp >= 10000 ? 'No ceiling — it keeps accruing' : `${p.capBp / 100}% of the bill, ${rupees(p.capRupees)}`}
              </Text>
            </View>
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Stops after</Text>
              <Text style={styles.termValue}>
                {p.maxMonths > 0 ? `${p.maxMonths} months` : 'Never — only the ceiling applies'}
              </Text>
            </View>

            <View style={styles.integrityBox}>
              <Ionicons name="information-circle-outline" size={13} color="#0891b2" />
              <Text style={styles.integrityText}>
                The fine is charged on what is still owed on the bill itself, never on a figure that already
                includes a previous fine. Re-assessing a bill raises the fine to today's figure rather than
                adding to it — otherwise every run would compound the penalty until it hit the ceiling.
              </Text>
            </View>
          </View>

          {/* ── Worked examples ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What a family would actually pay</Text>
            <Text style={styles.cardNote}>
              Worked through on a bill of{' '}
              <Text style={styles.inlineInput} onPress={() => {}}>{rupees(Number(bill || 0))}</Text>
              . Change the amount on the late-fee screen if you want a different figure.
            </Text>

            <View style={styles.exampleList}>
              {examples.map((e) => (
                <View key={e.days} style={styles.exampleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exampleLabel}>{e.label}</Text>
                    <Text style={styles.exampleMeta}>
                      {e.months === 0
                        ? e.reason
                        : `${e.months} month${e.months === 1 ? '' : 's'} past due${e.reason ? ` · ${e.reason}` : ''}`}
                    </Text>
                  </View>
                  <View style={styles.exampleAmounts}>
                    <Text style={[styles.exampleFine, e.rupees === 0 && styles.exampleFineZero]}>
                      {e.rupees === 0 ? 'no fine' : `+${rupees(e.rupees)}`}
                    </Text>
                    {e.rupees > 0 && (
                      <Text style={styles.exampleTotal}>{rupees(Number(bill || 0) + e.rupees)} owed</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.serverBox}>
              <Ionicons name="server-outline" size={12} color="#059669" />
              <Text style={styles.serverText}>
                On the whole {rupees(detail.totalRupees)} fee the rule assesses {rupees(p.monthlyRupees)} a
                month late and tops out at {rupees(p.cappedRupees)} — both computed by the server from the same
                rule, so the fine written onto a bill always matches what is shown here.
              </Text>
            </View>

            {p.maxMonths === 0 && p.capBp < 10000 && (
              <Text style={styles.footnote}>
                The ceiling is what stops an old unpaid bill becoming unbearable — the fine reaches{' '}
                {rupees(p.capRupees)} on a bill this size and no further, however late it gets.
              </Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.offCard}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#059669" />
          <Text style={styles.offTitle}>No late fee on this structure</Text>
          <Text style={styles.offText}>
            Bills raised against this program are never fined. That is either an institution-wide decision or one
            made for this program specifically — either way it is a decision, and it is recorded rather than
            defaulted.
          </Text>
        </View>
      )}

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

  header: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  headerSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, borderRadius: 10, padding: 10 },
  statusOn: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  statusOff: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  statusText: { flex: 1, fontSize: 12, fontFamily: 'Manrope-Medium', lineHeight: 17 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  cardNote: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 6, lineHeight: 17 },
  inlineInput: { fontWeight: '700', color: '#0f172a' },

  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  scopeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  scopeOwn: { backgroundColor: '#fffbeb' },
  scopeDefault: { backgroundColor: '#f1f5f9' },
  scopeText: { fontSize: 10, fontFamily: 'Manrope-SemiBold' },
  ruleName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },

  policyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, paddingVertical: 10, marginTop: 12 },
  policyBtnText: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  termRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  termLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular' },
  termValue: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  integrityBox: { flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: '#f0f9ff', borderRadius: 9, padding: 9 },
  integrityText: { flex: 1, fontSize: 10, color: '#0369a1', fontFamily: 'Manrope-Regular', lineHeight: 15 },

  exampleList: { marginTop: 10 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  exampleLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  exampleMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  exampleAmounts: { alignItems: 'flex-end' },
  exampleFine: { fontSize: 13, fontWeight: '800', color: '#d97706', fontFamily: 'PlusJakartaSans-Bold' },
  exampleFineZero: { color: '#64748b', fontSize: 11 },
  exampleTotal: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  serverBox: { flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 9, padding: 9 },
  serverText: { flex: 1, fontSize: 10, color: '#065f46', fontFamily: 'Manrope-Regular', lineHeight: 15 },
  footnote: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 10, lineHeight: 15 },

  offCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 22, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12 },
  offTitle: { marginTop: 8, fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  offText: { marginTop: 6, fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center', lineHeight: 17 },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  backText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
});