// PAYSLIP DOCUMENT — generate the PDF and hand the employee a real file.
//
// The old screen offered "Resend payslip", which emailed nobody, and
// `PayrollEntry.payslipFileId` was a column nothing ever wrote. So "payslip
// generation" was a button with no effect.
//
// This screen makes it honest in three ways:
//   · it shows whether a file actually EXISTS (a File row AND bytes on disk), not
//     whether a field is non-null
//   · generating writes a real PDF server-side and returns a size, so "generated"
//     is a fact rather than a promise
//   · it opens the actual document, so the officer can see what the employee will
//     receive before sending it anywhere
//
// It also states the BASIS of any loss-of-pay line, because a payslip that
// charges somebody money without saying why is not evidence of anything.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Linking, Share, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi, mediaUrl } from '../../../../../../services/api';
import { AnimatedCard, SkeletonCard, StatusChip } from '../../../../../../components/ui';
import { THEME, rupees, monthLabel, formatDate } from '../../payrollSalaryMeta';

const kb = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

export default function PayslipDocument({ navigation, route }) {
  const entryId = route?.params?.entryId;
  const [doc, setDoc] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, p] = await Promise.all([
        accountsApi.payslipDocument(entryId),
        accountsApi.payslip(entryId),
      ]);
      setDoc(d);
      setPayslip(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entryId]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const url = doc?.file?.url ? mediaUrl(doc.file.url) : null;

  const open = async () => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Could not open the payslip', err.message);
    }
  };

  const share = async () => {
    if (!url) return;
    try {
      // A local file URI is what a share sheet can actually attach; the served
      // URL is what a browser can open. Both are offered because a phone that
      // cannot open one can usually do the other.
      await Share.share({ message: `${doc.file.originalName}\n${url}`, url: Platform.OS === 'android' ? url : undefined });
    } catch {
      Alert.alert('Share unavailable', `Open the payslip at ${url}`);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      await accountsApi.generatePayslip(entryId);
      await load();
      Alert.alert('Payslip generated', 'A PDF has been produced and attached to this entry.');
    } catch (err) {
      Alert.alert('Could not generate', err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <SkeletonCard />
      </ScrollView>
    );
  }

  const entry = payslip?.entry;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME} />}
    >
      {error ? (
        <AnimatedCard style={{ marginBottom: 12 }}>
          <Text style={{ color: '#dc2626' }}>{error}</Text>
        </AnimatedCard>
      ) : null}

      {/* The document itself, or the honest reason there isn't one */}
      <AnimatedCard>
        <View style={styles.docHead}>
          <View style={[styles.docIcon, { backgroundColor: doc?.hasPayslip ? '#f0fdf4' : '#fef2f2' }]}>
            <Ionicons name="document-text-outline" size={20} color={doc?.hasPayslip ? '#059669' : '#dc2626'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docTitle}>
              {doc?.hasPayslip ? 'Payslip ready' : 'No payslip generated yet'}
            </Text>
            <Text style={styles.docSub}>
              {doc?.hasPayslip
                ? `${doc.file.originalName} · ${kb(doc.file.sizeBytes)}`
                : 'Generate it to produce a real PDF for this month.'}
            </Text>
          </View>
          <StatusChip
            label={doc?.hasPayslip ? 'On file' : 'Missing'}
            color={doc?.hasPayslip ? '#059669' : '#dc2626'}
            bg={doc?.hasPayslip ? '#f0fdf4' : '#fef2f2'}
            icon={doc?.hasPayslip ? 'checkmark-circle' : 'alert-circle'}
          />
        </View>

        {doc?.hasPayslip ? (
          <View style={styles.docActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={open}>
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={styles.primaryText}>Open payslip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={share}>
              <Ionicons name="share-outline" size={16} color={THEME} />
              <Text style={styles.ghostText}>Share</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 14 }, !doc?.canGenerate && { opacity: 0.5 }]}
            onPress={generate}
            disabled={generating || !doc?.canGenerate}
          >
            {generating ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="document-text-outline" size={16} color="#fff" />
                <Text style={styles.primaryText}>Generate payslip PDF</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {!doc?.canGenerate && !doc?.hasPayslip ? (
          <Text style={styles.blockNote}>
            This entry has no earnings lines, so there is nothing to print.
          </Text>
        ) : null}
      </AnimatedCard>

      {/* What the PDF will say */}
      {entry ? (
        <AnimatedCard style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>{entry.staffName}</Text>
          <Text style={styles.cardSub}>
            {entry.designation ?? 'Staff'}{entry.departmentName ? ` · ${entry.departmentName}` : ''}
            {entry.employeeNo ? ` · ${entry.employeeNo}` : ''}
          </Text>
          <Text style={styles.cardSub}>{monthLabel(entry.month)}</Text>

          <View style={styles.linesBox}>
            {entry.earnings.map((e, i) => (
              <View key={`e${i}`} style={styles.lineRow}>
                <Text style={styles.lineLabel}>{e.label}</Text>
                <Text style={styles.lineAmt}>{rupees(Math.round(e.amountMinor / 100))}</Text>
              </View>
            ))}
            <View style={styles.thinLine} />
            <View style={styles.lineRow}>
              <Text style={[styles.lineLabel, { fontWeight: '700' }]}>Gross</Text>
              <Text style={[styles.lineAmt, { fontWeight: '700' }]}>{rupees(entry.grossRupees)}</Text>
            </View>
            {entry.deductions.map((d, i) => (
              <View key={`d${i}`} style={styles.lineRow}>
                <Text style={styles.lineLabel}>− {d.label}</Text>
                <Text style={[styles.lineAmt, { color: '#dc2626' }]}>−{rupees(Math.round(d.amountMinor / 100))}</Text>
              </View>
            ))}
            <View style={styles.thinLine} />
            <View style={styles.lineRow}>
              <Text style={[styles.lineLabel, { fontWeight: '800', fontSize: 15 }]}>Net pay</Text>
              <Text style={[styles.lineAmt, { fontWeight: '800', fontSize: 15, color: '#059669' }]}>{rupees(entry.netRupees)}</Text>
            </View>
          </View>

          {entry.status === 'PAID' && entry.paidAt ? (
            <View style={styles.paidBox}>
              <Ionicons name="checkmark-circle" size={15} color="#059669" />
              <Text style={styles.paidText}>
                Paid {formatDate(entry.paidAt)}
                {entry.paymentRef ? ` · ${entry.paymentRef}` : ''}
              </Text>
            </View>
          ) : null}
        </AnimatedCard>
      ) : null}

      {/* WHY the money is short — the part an employee will ask about */}
      {doc?.lopBasis || payslip?.attendance?.basis ? (
        <AnimatedCard style={{ marginTop: 14 }}>
          <View style={styles.basisHead}>
            <Ionicons name="information-circle-outline" size={15} color="#d97706" />
            <Text style={styles.basisTitle}>Basis of the loss-of-pay line</Text>
          </View>
          <Text style={styles.basisText}>{doc.lopBasis ?? payslip.attendance.basis}</Text>
          {payslip?.attendance?.source ? (
            <Text style={styles.basisSource}>Recorded from {payslip.attendance.source === 'LEAVE_SYNC' ? 'approved leave' : 'the desk'}.</Text>
          ) : null}
        </AnimatedCard>
      ) : null}

      {/* Which salary version priced this, months later */}
      {payslip?.salary ? (
        <AnimatedCard style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>Priced by this salary version</Text>
          <Text style={styles.cardSub}>
            {rupees(payslip.salary.monthlyGrossRupees)} gross, effective {payslip.salary.effectiveFrom}
            {payslip.salary.reason ? ` · ${payslip.salary.reason}` : ''}
          </Text>
          <View style={styles.compWrap}>
            {payslip.salary.components.map((c) => (
              <View key={c.code} style={styles.compChip}>
                <Text style={styles.compChipText}>{c.label}</Text>
              </View>
            ))}
          </View>
        </AnimatedCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 40 },
  docHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  docSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  docActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryBtn: { flex: 2, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 9, backgroundColor: THEME },
  primaryText: { color: '#fff', fontWeight: '700' },
  ghostBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 9, borderWidth: 1, borderColor: THEME },
  ghostText: { color: THEME, fontWeight: '700' },
  blockNote: { fontSize: 11, color: '#94a3b8', marginTop: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  linesBox: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  lineLabel: { fontSize: 12, color: '#475569' },
  lineAmt: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  thinLine: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 },
  paidBox: { flexDirection: 'row', gap: 6, marginTop: 12, backgroundColor: '#f0fdf4', padding: 9, borderRadius: 8 },
  paidText: { flex: 1, fontSize: 12, color: '#047857' },
  basisHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  basisTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
  basisText: { fontSize: 12, color: '#475569', lineHeight: 17 },
  basisSource: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
  compWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  compChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f1f5f9' },
  compChipText: { fontSize: 11, color: '#475569' },
});