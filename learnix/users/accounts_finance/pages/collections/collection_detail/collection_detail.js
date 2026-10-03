// Collection Detail — one receipt, end to end (docs/users/06 §3.2).
//
// A collection is three things at once: a payment (money in), a receipt (proof
// the family can hold), and a set of allocations (which bills it settled). This
// screen shows all three, because "we paid ₹40,000 in March" is not an answer
// to "are we still owed for it".
//
// The reversal is gated honestly. A payment that another module raised — a
// donation, a hostel rent receipt, a transport fee, a library fine — is not
// reversible here, and the screen says where to go instead of pretending.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';
import {
  THEME, rupees, formatDate, formatDateTime, statusMeta, dueStatusMeta,
  categoryMeta, methodMeta, owningModule, REVERSAL_PRESETS,
} from '../collectionMeta';

export default function CollectionDetail({ navigation, route }) {
  const paymentId = route?.params?.paymentId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    if (!paymentId) {
      setError('No collection selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setData(await accountsApi.collectionDetail(paymentId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doReverse = () => {
    const why = reason.trim();
    if (why.length < 5) {
      Alert.alert('Reason Required', 'Say why this is being reversed (at least 5 characters). It is stored on the record and shown to the student.');
      return;
    }
    Alert.alert(
      'Reverse This Collection?',
      `${rupees(data.payment.amountRupees)} will be taken back off ` +
      `${data.allocations.length} due(s), the receipt will be voided, and ${data.student?.name ?? 'the payer'} ` +
      `will be notified.\n\nReason: ${why}\n\nThe payment record is kept — it is not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const res = await accountsApi.reverseCollection(paymentId, why);
              setReverseOpen(false);
              setReason('');
              await fetchData();
              Alert.alert(
                'Reversed',
                `${res.reopenedDues} due(s) re-opened and the receipt is voided. The payment record stays in the ledger with a reversal stamp.`,
              );
            } catch (err) {
              Alert.alert('Cannot Reverse', err.message);
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
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = data.payment;
  const meta = statusMeta(p);
  const cat = categoryMeta(p.category);
  const method = methodMeta(p.method);
  const owner = owningModule(data.externalLinks);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Receipt card — styled like the slip the family holds. */}
      <AnimatedCard delay={0} style={[styles.block, p.isReversed && styles.receiptVoided]}>
        <View style={styles.receiptHead}>
          <View style={[styles.receiptIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.receiptBody}>
            <Text style={styles.receiptRef}>{p.referenceNo}</Text>
            <Text style={styles.receiptSub}>
              {cat.label} · {method.label} · {formatDate(p.paidAt ?? p.createdAt)}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={[styles.amountValue, p.isReversed && styles.amountStruck]}>
            {rupees(p.amountRupees)}
          </Text>
          {p.isReversed && <Text style={styles.amountVoided}>Reversed</Text>}
        </View>

        {data.receipt && (
          <View style={styles.receiptStrip}>
            <View style={styles.receiptStripRow}>
              <Ionicons
                name={data.receipt.voidedAt ? 'close-circle' : 'receipt-outline'}
                size={14}
                color={data.receipt.voidedAt ? '#dc2626' : '#059669'}
              />
              <Text style={styles.receiptStripLabel}>Receipt</Text>
              <Text style={styles.receiptStripValue}>{data.receipt.receiptNo}</Text>
            </View>
            <View style={styles.receiptStripRow}>
              <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
              <Text style={styles.receiptStripLabel}>Issued</Text>
              <Text style={styles.receiptStripValue}>{formatDateTime(data.receipt.issuedAt)}</Text>
            </View>
            {data.receipt.voidedAt && (
              <View style={styles.receiptStripRow}>
                <Ionicons name="ban-outline" size={14} color="#dc2626" />
                <Text style={styles.receiptStripLabel}>Voided</Text>
                <Text style={[styles.receiptStripValue, { color: '#dc2626' }]}>{formatDateTime(data.receipt.voidedAt)}</Text>
              </View>
            )}
          </View>
        )}
      </AnimatedCard>

      {/* Reversal stamp — the reason is the point, so it gets its own block. */}
      {p.isReversed && (
        <AnimatedCard delay={50} style={[styles.block, styles.stampCard]}>
          <View style={styles.stampRow}>
            <Ionicons name="arrow-undo" size={18} color="#dc2626" />
            <View style={styles.stampBody}>
              <Text style={styles.stampTitle}>Reversed {formatDate(p.reversedAt)}</Text>
              <Text style={styles.stampReason}>“{p.reversalReason}”</Text>
              {p.reversalBy && <Text style={styles.stampBy}>by {p.reversalBy}</Text>}
            </View>
          </View>
          <View style={styles.stampNote}>
            <Ionicons name="information-circle-outline" size={13} color="#991b1b" />
            <Text style={styles.stampNoteText}>
              This row is kept in the ledger so the history survives, but it no longer counts toward collections.
              {data.receipt?.voidReason ? ` The receipt was voided: “${data.receipt.voidReason}”.` : ''}
            </Text>
          </View>
        </AnimatedCard>
      )}

      {/* Payer */}
      <AnimatedCard delay={100} style={styles.block}>
        <Text style={styles.label}>Paid By</Text>
        {data.student ? (
          <TouchableOpacity
            style={styles.personRow}
            onPress={() => navigation.openModule('StudentStatement', { studentProfileId: data.student.id, rollNo: data.student.rollNo })}
            activeOpacity={0.8}
          >
            <View style={styles.personAvatar}>
              <Text style={styles.personInitial}>{data.student.name.charAt(0)}</Text>
            </View>
            <View style={styles.personBody}>
              <Text style={styles.personName}>{data.student.name}</Text>
              <Text style={styles.personMeta}>{data.student.rollNo} · {data.student.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ) : (
          <View style={styles.noStudentRow}>
            <Ionicons name="business-outline" size={16} color="#94a3b8" />
            <Text style={styles.noStudentText}>
              Not tied to a student — this is a {cat.label.toLowerCase()} recorded at the counter.
            </Text>
          </View>
        )}
        {p.recordedBy && (
          <View style={styles.recordedRow}>
            <Ionicons name="person-circle-outline" size={13} color="#94a3b8" />
            <Text style={styles.recordedText}>Recorded by {p.recordedBy} · {formatDateTime(p.createdAt)}</Text>
          </View>
        )}
        {p.gatewayRef && (
          <View style={styles.recordedRow}>
            <Ionicons name="link-outline" size={13} color="#94a3b8" />
            <Text style={styles.recordedText}>Gateway reference {p.gatewayRef}</Text>
          </View>
        )}
      </AnimatedCard>

      {/* Allocations — the honest answer to "what did this pay off?" */}
      <AnimatedCard delay={150} style={styles.block}>
        <Text style={styles.label}>What This Settled</Text>

        {data.allocations.length === 0 ? (
          <View style={styles.noAlloc}>
            <Ionicons name="wallet-outline" size={18} color="#d97706" />
            <Text style={styles.noAllocText}>
              Nothing on this account was outstanding, so the full {rupees(data.unallocatedRupees)} is held as an
              advance against future dues. It is not a shortfall.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.allocSummary}>
              <View style={styles.allocSummaryCell}>
                <Text style={styles.allocSummaryLabel}>Applied to dues</Text>
                <Text style={styles.allocSummaryValue}>{rupees(data.allocatedRupees)}</Text>
              </View>
              {data.unallocatedRupees > 0 && (
                <>
                  <View style={styles.allocSummaryDivider} />
                  <View style={styles.allocSummaryCell}>
                    <Text style={styles.allocSummaryLabel}>Held as advance</Text>
                    <Text style={[styles.allocSummaryValue, { color: '#d97706' }]}>
                      {rupees(data.unallocatedRupees)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {data.allocations.map((a) => {
              const dmeta = dueStatusMeta(a.dueStatus);
              return (
                <View key={a.id} style={styles.allocRow}>
                  <View style={styles.allocRowTop}>
                    <View style={[styles.allocDot, { backgroundColor: dmeta.color }]} />
                    <View style={styles.allocBody}>
                      <Text style={styles.allocTitle}>{a.title}</Text>
                      <Text style={styles.allocMeta}>
                        {a.program ? `${a.program} · ` : ''}{dmeta.label}
                        {a.clearedThisDue ? ' · fully cleared by this payment' : ''}
                      </Text>
                    </View>
                    <Text style={styles.allocAmount}>{rupees(a.amountRupees)}</Text>
                  </View>
                  {/* A due's balance AFTER this payment — the number that shows
                      whether the family still owes anything on this bill. */}
                  <View style={styles.allocBar}>
                    <View
                      style={[
                        styles.allocBarFill,
                        {
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((a.dueAmountRupees - a.dueBalanceRupees) / Math.max(1, a.dueAmountRupees)) * 100,
                            ),
                          )}%`,
                          backgroundColor: dmeta.color,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.allocFoot}>
                    <Text style={styles.allocFootText}>
                      {rupees(a.dueAmountRupees)} billed · {rupees(a.duePaidRupees)} paid
                    </Text>
                    <Text style={[styles.allocFootText, a.dueBalanceRupees > 0 ? { color: '#dc2626' } : { color: '#059669' }]}>
                      {a.dueBalanceRupees > 0 ? `${rupees(a.dueBalanceRupees)} still due` : 'Settled'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </AnimatedCard>

      {/* Reversal */}
      {!p.isReversed && (
        <AnimatedCard delay={200} style={styles.block}>
          {!data.canReverse ? (
            <View style={styles.blockedRow}>
              <Ionicons
                name={owner ? owner.icon : 'information-circle-outline'}
                size={17}
                color="#d97706"
              />
              <View style={styles.blockedBody}>
                <Text style={styles.blockedTitle}>
                  {owner ? `Raised in ${owner.label}` : 'Nothing to reverse'}
                </Text>
                <Text style={styles.blockedText}>{data.reverseBlockReason}</Text>
              </View>
            </View>
          ) : reverseOpen ? (
            <>
              <Text style={styles.label}>Why Is This Being Reversed?</Text>
              <TextInput
                style={styles.textArea}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Cheque bounced at the bank…"
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.hint}>
                Recorded on the payment, shown on the voided receipt and sent to the student. Minimum 5 characters.
              </Text>

              <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Common reasons</Text>
              <View style={styles.presetWrap}>
                {REVERSAL_PRESETS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.preset, reason === r && styles.presetActive]}
                    onPress={() => setReason(r)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetText, reason === r && styles.presetTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.reverseImpact}>
                <Text style={styles.reverseImpactTitle}>This will:</Text>
                <Text style={styles.reverseImpactText}>
                  • take {rupees(data.allocatedRupees)} back off {data.allocations.length} due(s) and re-open them
                </Text>
                <Text style={styles.reverseImpactText}>
                  • void receipt {data.receipt?.receiptNo ?? '—'} so it no longer proves a live collection
                </Text>
                <Text style={styles.reverseImpactText}>
                  • notify {data.student?.name ?? 'the payer'}
                </Text>
                <Text style={styles.reverseImpactText}>
                  • keep the payment row in the ledger, stamped reversed
                </Text>
              </View>

              <View style={styles.reverseBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setReverseOpen(false); setReason(''); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reverseBtn, reason.trim().length < 5 && styles.btnDisabled]}
                  onPress={doReverse}
                  activeOpacity={0.85}
                  disabled={reason.trim().length < 5 || busy}
                >
                  {busy
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="arrow-undo" size={16} color="#fff" />}
                  <Text style={styles.reverseText}>{busy ? 'Reversing…' : 'Reverse'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.reverseEntry}
              onPress={() => setReverseOpen(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-undo-outline" size={16} color="#dc2626" />
              <View style={styles.blockedBody}>
                <Text style={styles.reverseEntryTitle}>Reverse this collection</Text>
                <Text style={styles.reverseEntryText}>
                  Put the money back on the dues and void the receipt. The record is kept, not deleted.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </AnimatedCard>
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
  btnDisabled: { opacity: 0.45 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  hint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 7, lineHeight: 15 },

  // Receipt
  receiptVoided: { backgroundColor: '#fffbfb', borderColor: '#fecaca' },
  receiptHead: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, paddingBottom: 6 },
  receiptIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  receiptBody: { flex: 1 },
  receiptRef: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  receiptSub: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  statusPillText: { fontSize: 10, fontWeight: '800', fontFamily: 'Manrope-Bold' },
  amountBox: { alignItems: 'center', paddingVertical: 10 },
  amountValue: { fontSize: 30, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1 },
  amountStruck: { color: '#94a3b8', textDecorationLine: 'line-through' },
  amountVoided: { fontSize: 10, fontWeight: '800', color: '#dc2626', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  receiptStrip: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  receiptStripRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  receiptStripLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', width: 58 },
  receiptStripValue: { flex: 1, fontSize: 11, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },

  // Reversal stamp
  stampCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  stampRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 14, paddingBottom: 8 },
  stampBody: { flex: 1 },
  stampTitle: { fontSize: 12, fontWeight: '800', color: '#991b1b', fontFamily: 'Manrope-Bold' },
  stampReason: { fontSize: 12, color: '#7f1d1d', fontFamily: 'Manrope-Medium', marginTop: 3, lineHeight: 17 },
  stampBy: { fontSize: 10, color: '#b91c1c', fontFamily: 'Manrope-Regular', marginTop: 4 },
  stampNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  stampNoteText: { flex: 1, fontSize: 10, color: '#991b1b', fontFamily: 'Manrope-Medium', lineHeight: 15 },

  // Person
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  personAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center' },
  personInitial: { fontSize: 16, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  personBody: { flex: 1 },
  personName: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  personMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  noStudentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noStudentText: { flex: 1, fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', lineHeight: 16 },
  recordedRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  recordedText: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  // Allocations
  noAlloc: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#fffbeb', borderRadius: 11, padding: 12 },
  noAllocText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Medium', lineHeight: 16 },
  allocSummary: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 11, paddingVertical: 11, marginBottom: 6 },
  allocSummaryCell: { flex: 1, alignItems: 'center' },
  allocSummaryDivider: { width: 1, backgroundColor: '#e2e8f0' },
  allocSummaryLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  allocSummaryValue: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },
  allocRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  allocRowTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  allocDot: { width: 7, height: 7, borderRadius: 4 },
  allocBody: { flex: 1 },
  allocTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  allocMeta: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  allocAmount: { fontSize: 13, fontWeight: '800', color: '#059669', fontFamily: 'PlusJakartaSans-Bold' },
  allocBar: { height: 5, borderRadius: 3, backgroundColor: '#eef2f7', marginTop: 9, marginLeft: 16, overflow: 'hidden' },
  allocBarFill: { height: 5, borderRadius: 3 },
  allocFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginLeft: 16 },
  allocFootText: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  // Blocked reversal
  blockedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  blockedBody: { flex: 1 },
  blockedTitle: { fontSize: 12, fontWeight: '700', color: '#92400e', fontFamily: 'Manrope-Bold' },
  blockedText: { fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Medium', marginTop: 2, lineHeight: 16 },
  reverseEntry: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reverseEntryTitle: { fontSize: 13, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
  reverseEntryText: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 15 },

  // Reverse form
  textArea: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, minHeight: 76, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preset: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  presetActive: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  presetText: { fontSize: 10, color: '#475569', fontFamily: 'Manrope-Medium' },
  presetTextActive: { color: '#dc2626', fontWeight: '700' },
  reverseImpact: { backgroundColor: '#fef2f2', borderRadius: 11, borderWidth: 1, borderColor: '#fecaca', padding: 12, marginTop: 14, gap: 4 },
  reverseImpactTitle: { fontSize: 11, fontWeight: '800', color: '#991b1b', fontFamily: 'Manrope-Bold', marginBottom: 2 },
  reverseImpactText: { fontSize: 10, color: '#991b1b', fontFamily: 'Manrope-Medium', lineHeight: 16 },
  reverseBtnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12, backgroundColor: '#f1f5f9' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  reverseBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 14 },
  reverseText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
});