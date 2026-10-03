import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';
import {
  THEME, PAYMENT_METHODS, WAIVE_PRESETS, EXTEND_PRESETS,
  statusMeta, rupees, formatDate,
} from '../fineMeta';

const MODES = [
  { id: 'collect', label: 'Collect', icon: 'cash-outline' },
  { id: 'waive', label: 'Waive', icon: 'gift-outline' },
  { id: 'extend', label: 'Extend', icon: 'calendar-outline' },
];

export default function SettleFine({ navigation, route }) {
  const fineId = route?.params?.fineId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('collect');
  const [method, setMethod] = useState('CASH');
  const [reason, setReason] = useState('');
  const [extendDays, setExtendDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    if (!fineId) {
      setError('No fine selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const result = await libraryApi.fineDetail(fineId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fineId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doCollect = async () => {
    setBusy(true);
    try {
      const result = await libraryApi.collectFine(fineId, method);
      Alert.alert(
        'Fine Collected',
        `${rupees(result.amountRupees)} received via ${method}.\n\nReceipt: ${result.receiptNo}`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert('Cannot Collect', err.message);
    } finally {
      setBusy(false);
    }
  };

  const doWaive = () => {
    if (reason.trim().length < 3) {
      Alert.alert('Reason Required', 'Enter why this fine is being waived. It is recorded in the audit log.');
      return;
    }
    Alert.alert(
      'Waive Fine?',
      `${rupees(data.amountRupees)} will be written off for ${data.bookIssue.student.name}.\n\nReason: ${reason.trim()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Waive',
          onPress: async () => {
            setBusy(true);
            try {
              await libraryApi.waiveFine(fineId, reason.trim());
              Alert.alert('Fine Waived', `${rupees(data.amountRupees)} waived for ${data.bookIssue.student.name}.`, [
                { text: 'Done', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert('Cannot Waive', err.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const doExtend = () => {
    Alert.alert(
      'Extend Due Date?',
      `"${data.bookIssue.book.title}" will get ${extendDays} more day(s).\n\nNo fine is charged if it is returned by then. The current ${rupees(data.amountRupees)} fine is written off.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Extend',
          onPress: async () => {
            setBusy(true);
            try {
              const result = await libraryApi.extendFine(fineId, extendDays);
              Alert.alert(
                'Due Date Extended',
                `New due date: ${formatDate(result.newDueDate)}.\n${rupees(result.amountAtRisk)} fine written off.`,
                [{ text: 'Done', onPress: () => navigation.goBack() }],
              );
            } catch (err) {
              Alert.alert('Cannot Extend', err.message);
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
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = statusMeta(data.status);
  const settled = data.status !== 'PENDING';
  const bookReturned = Boolean(data.bookIssue.returnDate);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Fine summary */}
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.headerTitle}>{data.bookIssue.student.name}</Text>
            <Text style={styles.headerSub}>
              {data.bookIssue.student.rollNo} · {data.bookIssue.book.title}
            </Text>
          </View>
          <Text style={styles.headerAmount}>{rupees(data.amountRupees)}</Text>
        </View>

        <View style={styles.breakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Days overdue</Text>
            <Text style={styles.breakdownValue}>{data.breakdown.daysOverdue}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Rate</Text>
            <Text style={styles.breakdownValue}>{rupees(data.breakdown.ratePerDayRupees)}/day</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownTotalLabel}>Total charged</Text>
            <Text style={styles.breakdownTotal}>{rupees(data.breakdown.chargedRupees)}</Text>
          </View>
        </View>
      </AnimatedCard>

      {/* Sibling fines — settle everything at once */}
      {data.siblings.length > 0 && (
        <AnimatedCard delay={60} style={styles.block}>
          <View style={styles.siblingHeader}>
            <Ionicons name="information-circle-outline" size={16} color="#d97706" />
            <Text style={styles.siblingHeaderText}>
              {data.bookIssue.student.name} owes {rupees(data.studentTotals.pendingAmountRupees)} across {data.studentTotals.pendingCount} fine(s).
            </Text>
          </View>
          <TouchableOpacity
            style={styles.siblingBtn}
            onPress={() => navigation.openModule('StudentFines', { studentId: data.bookIssue.student.id })}
            activeOpacity={0.85}
          >
            <Ionicons name="people-outline" size={15} color={THEME} />
            <Text style={styles.siblingBtnText}>Settle all at once</Text>
            <Ionicons name="chevron-forward" size={14} color={THEME} />
          </TouchableOpacity>
        </AnimatedCard>
      )}

      {settled ? (
        <AnimatedCard delay={120} style={styles.block}>
          <View style={styles.closedRow}>
            <Ionicons name="checkmark-circle" size={20} color={meta.color} />
            <View style={styles.headerBody}>
              <Text style={styles.closedTitle}>This fine is already {meta.label.toLowerCase()}</Text>
              <Text style={styles.closedSub}>
                {data.status === 'PAID' && data.payment
                  ? `${rupees(data.amountRupees)} via ${data.payment.method} · ${formatDate(data.settledAt)}`
                  : data.waivedReason || 'No further action available.'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.openModule('FineDetail', { fineId })}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={16} color="#2563eb" />
            <Text style={styles.secondaryBtnText}>View Full Record</Text>
          </TouchableOpacity>
        </AnimatedCard>
      ) : (
        <>
          {/* Mode switch */}
          <View style={styles.tabsRow}>
            {MODES.filter((m) => m.id !== 'extend' || !bookReturned).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.tab, mode === m.id && styles.tabActive]}
                onPress={() => setMode(m.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={m.icon}
                  size={14}
                  color={mode === m.id ? THEME : '#94a3b8'}
                />
                <Text style={[styles.tabText, mode === m.id && styles.tabTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* COLLECT */}
          {mode === 'collect' && (
            <AnimatedCard delay={80} style={styles.block}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodGrid}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.methodCard, method === m.id && styles.methodCardActive]}
                    onPress={() => setMethod(m.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={m.icon} size={18} color={method === m.id ? THEME : '#94a3b8'} />
                    <Text style={[styles.methodText, method === m.id && styles.methodTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.receiptNote}>
                <Ionicons name="receipt-outline" size={14} color="#059669" />
                <Text style={styles.receiptNoteText}>
                  Creates a {rupees(data.amountRupees)} payment and a numbered receipt in Accounts. The student is notified automatically.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.btnDisabled]}
                onPress={doCollect}
                activeOpacity={0.85}
                disabled={busy}
              >
                {busy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                <Text style={styles.primaryBtnText}>
                  {busy ? 'Recording…' : `Collect ${rupees(data.amountRupees)}`}
                </Text>
              </TouchableOpacity>
            </AnimatedCard>
          )}

          {/* WAIVE */}
          {mode === 'waive' && (
            <AnimatedCard delay={80} style={styles.block}>
              <Text style={styles.label}>Reason for Waiving</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder="Explain why this fine is being written off…"
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.hint}>
                Required. Waivers are audited — the reason is stored on the record.
              </Text>

              <Text style={styles.labelSmall}>Quick reasons</Text>
              {WAIVE_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.preset, reason === p && styles.presetActive]}
                  onPress={() => setReason(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetText, reason === p && styles.presetTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.waiveBtn,
                  (reason.trim().length < 3 || busy) && styles.btnDisabled,
                ]}
                onPress={doWaive}
                activeOpacity={0.85}
                disabled={reason.trim().length < 3 || busy}
              >
                {busy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="gift" size={17} color="#fff" />}
                <Text style={styles.waiveBtnText}>
                  {reason.trim().length < 3 ? 'Enter a reason' : `Waive ${rupees(data.amountRupees)}`}
                </Text>
              </TouchableOpacity>
            </AnimatedCard>
          )}

          {/* EXTEND */}
          {mode === 'extend' && !bookReturned && (
            <AnimatedCard delay={80} style={styles.block}>
              <Text style={styles.label}>Extend By</Text>
              <View style={styles.extendRow}>
                {EXTEND_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.days}
                    style={[styles.extendBtn, extendDays === p.days && styles.extendBtnActive]}
                    onPress={() => setExtendDays(p.days)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.extendText, extendDays === p.days && styles.extendTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.extendNote}>
                <Ionicons name="calendar-outline" size={15} color="#2563eb" />
                <View style={styles.headerBody}>
                  <Text style={styles.extendNoteTitle}>
                    New due date {formatDate(new Date(Date.now() + extendDays * 864e5))}
                  </Text>
                  <Text style={styles.extendNoteSub}>
                    The book must still be out. Extending clears the overdue flag and writes off {rupees(data.amountRupees)}.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.extendSubmit, busy && styles.btnDisabled]}
                onPress={doExtend}
                activeOpacity={0.85}
                disabled={busy}
              >
                {busy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="calendar" size={17} color="#fff" />}
                <Text style={styles.waiveBtnText}>
                  {busy ? 'Updating…' : `Extend ${extendDays} Days`}
                </Text>
              </TouchableOpacity>
            </AnimatedCard>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },
  btnDisabled: { opacity: 0.5 },
  headerBody: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  headerIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  headerSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  headerAmount: { fontSize: 17, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold' },

  // Breakdown
  breakdown: { borderTopWidth: 1, borderTopColor: '#eef2f7', padding: 14, paddingTop: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  breakdownLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  breakdownValue: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  breakdownDivider: { height: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  breakdownTotalLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  breakdownTotal: { fontSize: 15, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold' },

  // Siblings
  siblingHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, paddingBottom: 8 },
  siblingHeaderText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
  siblingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 14, marginBottom: 14, paddingVertical: 11, borderRadius: 11, backgroundColor: THEME + '12', borderWidth: 1, borderColor: THEME + '33' },
  siblingBtnText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  // Tabs
  tabsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', padding: 4, marginTop: 4, marginBottom: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: THEME + '14' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  tabTextActive: { color: THEME, fontWeight: '700' },

  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  labelSmall: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  textArea: { minHeight: 84 },
  hint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 7, lineHeight: 15 },

  // Methods
  methodGrid: { flexDirection: 'row', gap: 8 },
  methodCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  methodCardActive: { backgroundColor: THEME + '10', borderColor: THEME },
  methodText: { fontSize: 10, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold', marginTop: 6, textAlign: 'center' },
  methodTextActive: { color: THEME, fontWeight: '700' },
  receiptNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f0fdf4', borderRadius: 11, padding: 11, marginTop: 14 },
  receiptNoteText: { flex: 1, fontSize: 11, color: '#166534', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },

  // Presets
  preset: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 7 },
  presetActive: { backgroundColor: THEME + '10', borderColor: THEME },
  presetText: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium' },
  presetTextActive: { color: THEME, fontWeight: '700' },

  // Extend
  extendRow: { flexDirection: 'row', gap: 8 },
  extendBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  extendBtnActive: { backgroundColor: THEME, borderColor: THEME },
  extendText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  extendTextActive: { color: '#fff' },
  extendNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 11, padding: 11, marginTop: 14 },
  extendNoteTitle: { fontSize: 12, fontWeight: '700', color: '#1e40af', fontFamily: 'Manrope-Bold' },
  extendNoteSub: { fontSize: 11, color: '#1e40af', fontFamily: 'Manrope-Medium', marginTop: 2, lineHeight: 16 },

  // Buttons
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  waiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#d97706', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  waiveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  extendSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 13, marginHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },

  closedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  closedTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  closedSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 16 },
});