// Expense detail — one claim, and the decision about it (docs/users/06 §3.6).
//
// An approver's actual question is not "what is this claim" but "can I sign this
// off", and the answer needs three things side by side: what was bought, who was
// paid and how, and what it does to the budget line. The old screen showed an
// Alert with a category name and two buttons — no amount of context, no receipt,
// and no way to find out what approving would cost.
//
// Receipts are first-class here rather than an attachment icon. A claim with no
// receipt is the single most common reason a claim is sent back, so its absence
// is stated on the screen as a finding, not left for the approver to discover.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Linking, Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { accountsApi, mediaUrl } from '../../../../../../services/api';
import {
  rupees, compactRupees, formatDate, formatDateTime, relativeTime, categoryMeta,
  statusMeta, paymentMethodMeta, docKindMeta, humanFileSize, utilisationPhrase,
  utilisationColor, utilisationWidth, receiptHint, ACCEPTED_UPLOAD_TYPES,
  ACCEPTED_UPLOAD_LABEL, REJECTION_PRESETS,
} from '../../expensesMeta';

const ACCENT = '#2563eb';

const DOC_KIND_CHOICES = ['RECEIPT', 'INVOICE', 'QUOTATION'];

function Row({ label, value, icon, onPress, tone }) {
  if (value === null || value === undefined || value === '') return null;
  const content = (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={15} color="#94a3b8" style={styles.rowIcon} /> : null}
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, tone && { color: tone }]} numberOfLines={2}>
        {value}
      </Text>
      {onPress ? <Ionicons name="open-outline" size={14} color="#94a3b8" /> : null}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
  ) : content;
}

export default function ExpenseDetail({ navigation, route }) {
  const expenseId = route?.params?.id ?? route?.params?.expenseId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.expenseDetail(expenseId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [expenseId]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const act = async (fn, successTitle, successBody) => {
    setBusy(fn.name ?? 'action');
    try {
      await fn();
      await load();
      Alert.alert(successTitle, successBody);
    } catch (err) {
      Alert.alert('Could not do that', err.message);
    } finally {
      setBusy(null);
    }
  };

  const approve = () =>
    act(
      async () => { await accountsApi.approveExpense(expenseId); },
      'Approved',
      'It now counts against the budget line.',
    );

  const confirmReject = () => {
    const text = reason.trim();
    if (text.length < 3) {
      Alert.alert('Say why', 'A rejection without a reason is unauditable — the claimer is told nothing.');
      return;
    }
    setRejecting(false);
    const submitted = text;
    setReason('');
    act(
      async () => { await accountsApi.rejectExpense(expenseId, submitted); },
      'Rejected',
      'The claimer can see your reason and reopen it with a fix.',
    );
  };

  const reopen = () =>
    act(
      async () => { await accountsApi.reopenExpense(expenseId); },
      'Back in the queue',
      'It is awaiting approval again, with the history kept.',
    );

  const attach = async (kind) => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ACCEPTED_UPLOAD_TYPES,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;

    const type = asset.mimeType ?? '';
    if (type && !ACCEPTED_UPLOAD_TYPES.includes(type)) {
      Alert.alert('That file type will not upload', `${ACCEPTED_UPLOAD_LABEL}.`);
      return;
    }
    if (asset.size && asset.size > 8 * 1024 * 1024) {
      Alert.alert('That file is too large', `${humanFileSize(asset.size)} — the limit is 8 MB.`);
      return;
    }

    setUploading(true);
    try {
      await accountsApi.attachExpenseDocument(
        expenseId,
        { uri: asset.uri, name: asset.name ?? 'document', type: type || 'image/jpeg', size: asset.size ?? 0 },
        kind,
      );
      await load();
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  const detach = (doc) =>
    Alert.alert(
      'Detach this document?',
      `${docKindMeta(doc.kind).label} will be removed from the claim. The claim itself is untouched.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Detach',
          style: 'destructive',
          onPress: async () => {
            setBusy(`detach-${doc.id}`);
            try {
              await accountsApi.detachExpenseDocument(expenseId, doc.id);
              await load();
            } catch (err) {
              Alert.alert('Could not detach', err.message);
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );

  const openDocument = (doc) => {
    if (!doc.url) {
      // Every uploaded document carries its storage path, so this only fires for
      // a row written before the path was being returned — worth saying rather
      // than opening a dead link.
      Alert.alert('Receipt unavailable', 'This document has no download path recorded.');
      return;
    }
    Linking.openURL(mediaUrl(doc.url)).catch(() => {
      Alert.alert('Could not open the receipt', 'Check the server is reachable and try again.');
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error ?? 'Claim not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const e = data.expense;
  const meta = statusMeta(e.status);
  const cat = categoryMeta(e.category);
  const budget = data.budgetImpact;
  const hint = receiptHint(e);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ACCENT]} />}
    >
      {/* ── Headline ──────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${cat.color}14` }]}>
          <Ionicons name={cat.icon} size={22} color={cat.color} />
        </View>
        <Text style={styles.heroAmount}>{rupees(e.amountRupees)}</Text>
        <Text style={styles.heroTitle} numberOfLines={2}>{e.title}</Text>
        <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={13} color={meta.color} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.heroMeta}>
          {cat.label}
          {e.subcategory ? ` · ${e.subcategory}` : ''}
          {e.departmentName ? ` · ${e.departmentName}` : ''}
        </Text>
      </View>

      {hint && (
        <View style={styles.warnBanner}>
          <Ionicons name="alert-circle" size={16} color="#d97706" />
          <Text style={styles.warnText}>
            {hint}. Approving without one is a decision you will be asked to
            justify at audit.
          </Text>
        </View>
      )}

      {/* ── The money ─────────────────────────────────────────── */}
      <Text style={styles.section}>The money</Text>
      <View style={styles.card}>
        <Row label="Paid" value={rupees(e.amountRupees)} icon="cash-outline" />
        {e.taxRupees > 0 && <Row label="Tax included" value={rupees(e.taxRupees)} icon="pricetag-outline" />}
        {e.taxRupees > 0 && <Row label="Net of tax" value={rupees(e.netRupees)} icon="calculator-outline" />}
        <Row label="Method" value={e.paymentMethodLabel} icon={paymentMethodMeta(e.paymentMethod).icon} />
        <Row label="Reference" value={e.paymentReference} icon="barcode-outline" />
        <Row label="Vendor" value={e.vendor} icon="storefront-outline" />
        <Row label="Dated" value={formatDate(e.date)} icon="calendar-outline" />
        <Row label="Month" value={`${e.month} (FY ${e.fiscalYear})`} icon="folder-outline" />
      </View>

      {/* ── Decision ──────────────────────────────────────────── */}
      <Text style={styles.section}>Decision</Text>
      <View style={styles.card}>
        <Row label="Raised by" value={e.requestedBy} icon="person-outline" />
        {e.approvedBy && (
          <Row
            label="Approved by"
            value={`${e.approvedBy} · ${formatDateTime(e.approvedAt)}`}
            icon="checkmark-circle-outline"
            tone="#059669"
          />
        )}
        {e.approvedByName && <Row label="Approved as" value={e.approvedByName} icon="person-circle-outline" />}
        {e.rejectedBy && (
          <Row
            label="Rejected by"
            value={`${e.rejectedBy} · ${formatDateTime(e.rejectedAt)}`}
            icon="close-circle-outline"
            tone="#dc2626"
          />
        )}
        {e.rejectionReason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Why it was rejected</Text>
            <Text style={styles.reasonText}>{e.rejectionReason}</Text>
          </View>
        )}
      </View>

      {/* ── Budget impact ─────────────────────────────────────── */}
      <Text style={styles.section}>Budget</Text>
      <View style={styles.card}>
        {budget ? (
          <>
            <Row label="Line" value={budget.categoryLabel} icon="pie-chart-outline" />
            <Row label="Fiscal year" value={`FY ${budget.fiscalYear}`} icon="calendar-number-outline" />
            <Row label="Planned" value={rupees(budget.plannedRupees)} icon="flag-outline" />
            <Row label="Spent so far" value={rupees(budget.spentRupees)} icon="trending-up-outline" />
            <View style={styles.utilRow}>
              <View style={styles.utilHeader}>
                <Text style={styles.rowLabel}>Utilisation</Text>
                <Text style={[styles.utilPct, { color: utilisationColor(budget) }]}>
                  {budget.percent}%
                </Text>
              </View>
              <View style={styles.utilTrack}>
                <View
                  style={[styles.utilFill, {
                    width: `${utilisationWidth(budget)}%`,
                    backgroundColor: utilisationColor(budget),
                  }]}
                />
              </View>
              <Text style={styles.utilHint}>
                {utilisationPhrase(budget)}
                {budget.ifApprovedPercent !== undefined && (
                  <> · approving this claim takes it to {budget.ifApprovedPercent}%</>
                )}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.unbudgeted}>
            <Ionicons name="warning" size={16} color="#d97706" />
            <Text style={styles.unbudgetedText}>
              No budget line. This claim will be approved against nothing, which
              is how a budget quietly stops being real.
            </Text>
          </View>
        )}
      </View>

      {/* ── Receipts ──────────────────────────────────────────── */}
      <Text style={styles.section}>Receipts & documents</Text>
      <View style={styles.card}>
        {e.documents.length === 0 && (
          <Text style={styles.emptyDocs}>
            Nothing attached yet. A claim without a receipt is the most common
            reason one is sent back.
          </Text>
        )}
        {e.documents.map((d) => {
          const km = docKindMeta(d.kind);
          return (
            <View key={d.id} style={styles.docRow}>
              <Ionicons name={km.icon} size={18} color={km.color} />
              <View style={styles.docInfo}>
                <Text style={styles.docKind}>{km.label}</Text>
                <Text style={styles.docMeta}>
                  {d.originalName ?? 'Receipt'} · {humanFileSize(d.sizeBytes)} ·{' '}
                  {relativeTime(d.createdAt)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => openDocument(d)}
                style={styles.docAction}
                activeOpacity={0.7}
                accessibilityLabel="Open document"
              >
                <Ionicons name="eye-outline" size={17} color={ACCENT} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => detach(d)}
                style={styles.docAction}
                activeOpacity={0.7}
                accessibilityLabel="Detach document"
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={busy === `detach-${d.id}` ? '#94a3b8' : '#dc2626'}
                />
              </TouchableOpacity>
            </View>
          );
        })}

        {uploading ? (
          <View style={styles.uploading}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.uploadingText}>Uploading…</Text>
          </View>
        ) : (
          <View style={styles.attachRow}>
            {DOC_KIND_CHOICES.map((k) => (
              <TouchableOpacity
                key={k}
                style={styles.attachBtn}
                onPress={() => attach(k)}
                activeOpacity={0.8}
              >
                <Ionicons name="attach" size={14} color={ACCENT} />
                <Text style={styles.attachText}>{docKindMeta(k).label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={styles.attachHint}>{ACCEPTED_UPLOAD_LABEL}</Text>
      </View>

      {e.note && (
        <>
          <Text style={styles.section}>Note from the raiser</Text>
          <View style={styles.card}>
            <Text style={styles.noteText}>{e.note}</Text>
          </View>
        </>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      <View style={styles.actions}>
        {e.status === 'PENDING' && (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={approve}
              disabled={!!busy}
              activeOpacity={0.85}
            >
              {busy === 'approve' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.primaryText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => setRejecting(true)}
              disabled={!!busy}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle" size={18} color="#dc2626" />
              <Text style={styles.dangerText}>Reject with a reason</Text>
            </TouchableOpacity>
          </>
        )}

        {e.status === 'REJECTED' && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={reopen} disabled={!!busy} activeOpacity={0.85}>
            <Ionicons name="refresh" size={17} color={ACCENT} />
            <Text style={styles.secondaryText}>Put it back in the queue</Text>
          </TouchableOpacity>
        )}

        {e.status === 'APPROVED' && (
          <View style={styles.settledNote}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={styles.settledText}>
              Approved and counted against the budget. Attach any bill that
              arrives late — it stays on the claim either way.
            </Text>
          </View>
        )}
      </View>

      {/* ── History ───────────────────────────────────────────── */}
      {data.history.length > 0 && (
        <>
          <Text style={styles.section}>History</Text>
          <View style={styles.card}>
            {data.history.map((h, i) => (
              <View key={h.id} style={styles.historyRow}>
                <View style={styles.historyDot} />
                {i < data.history.length - 1 && <View style={styles.historyLine} />}
                <View style={styles.historyInfo}>
                  <Text style={styles.historyAction}>
                    {h.action.replace(/^expense\./, '').replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {h.actor} · {formatDateTime(h.at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Reject sheet ──────────────────────────────────────── */}
      <Modal visible={rejecting} transparent animationType="slide" onRequestClose={() => setRejecting(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Why is this being rejected?</Text>
            <Text style={styles.modalSub}>
              The claimer sees this. Be specific enough that they can fix it.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              {REJECTION_PRESETS.map((p) => (
                <TouchableOpacity key={p} style={styles.preset} onPress={() => setReason(p)} activeOpacity={0.8}>
                  <Text style={styles.presetText} numberOfLines={2}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Say why…"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              maxLength={500}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejecting(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmReject} activeOpacity={0.85}>
                <Text style={styles.modalConfirmText}>Reject claim</Text>
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
  retryBtn: { marginTop: 16, backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },

  hero: { alignItems: 'center', paddingVertical: 12 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  heroAmount: {
    fontSize: 30, fontWeight: '800', color: '#0f172a', marginTop: 12,
    fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1,
  },
  heroTitle: {
    fontSize: 15, color: '#0f172a', textAlign: 'center', marginTop: 4,
    fontFamily: 'Manrope-SemiBold', paddingHorizontal: 12,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  heroMeta: {
    fontSize: 12, color: '#64748b', marginTop: 8, textAlign: 'center',
    fontFamily: 'Manrope-Regular',
  },

  warnBanner: {
    flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderColor: '#fde68a',
    borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8,
  },
  warnText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Regular', lineHeight: 17 },

  section: {
    fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 8,
  },
  card: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 14,
  },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  rowIcon: { width: 18 },
  rowLabel: { flex: 1, fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  rowValue: {
    flex: 1.4, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-SemiBold', textAlign: 'right',
  },

  reasonBox: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1,
    borderColor: '#fecaca',
  },
  reasonLabel: {
    fontSize: 10, fontWeight: '700', color: '#b91c1c', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  reasonText: { fontSize: 12, color: '#7f1d1d', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 18 },

  utilRow: { marginTop: 10 },
  utilHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  utilPct: { fontSize: 14, fontWeight: '800', fontFamily: 'Manrope-Bold' },
  utilTrack: {
    height: 8, borderRadius: 4, backgroundColor: '#eef2f7', marginTop: 8, overflow: 'hidden',
  },
  utilFill: { height: '100%', borderRadius: 4 },
  utilHint: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 6 },

  unbudgeted: {
    flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fde68a',
  },
  unbudgetedText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Regular', lineHeight: 17 },

  emptyDocs: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular', lineHeight: 18 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  docInfo: { flex: 1 },
  docKind: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  docMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  docAction: { padding: 6 },

  uploading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  uploadingText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  attachRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  attachBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 10,
  },
  attachText: { fontSize: 11, fontWeight: '600', color: ACCENT, fontFamily: 'Manrope-SemiBold' },
  attachHint: {
    fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 8, textAlign: 'center',
  },

  noteText: { fontSize: 13, color: '#334155', fontFamily: 'Manrope-Regular', lineHeight: 20 },

  actions: { marginTop: 24, gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: 14, paddingVertical: 15,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderColor: '#fecaca', borderWidth: 1, borderRadius: 14,
    paddingVertical: 15,
  },
  dangerText: { color: '#dc2626', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 14,
    paddingVertical: 15,
  },
  secondaryText: { color: ACCENT, fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  settledNote: {
    flexDirection: 'row', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  settledText: { flex: 1, fontSize: 11, color: '#065f46', fontFamily: 'Manrope-Regular', lineHeight: 17 },

  historyRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  historyDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1', marginTop: 5,
  },
  historyLine: { position: 'absolute', left: 3.5, top: 16, bottom: -4, width: 1, backgroundColor: '#e2e8f0' },
  historyInfo: { flex: 1 },
  historyAction: {
    fontSize: 12, color: '#0f172a', fontFamily: 'Manrope-SemiBold', textTransform: 'capitalize',
  },
  historyMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  modalSub: {
    fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 18,
  },
  presetScroll: { marginTop: 14, marginHorizontal: -24, paddingHorizontal: 24 },
  preset: {
    backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginRight: 8, maxWidth: 220,
  },
  presetText: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 15 },
  reasonInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginTop: 16,
    fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular', textAlignVertical: 'top',
    minHeight: 90,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center',
  },
  modalCancelText: { color: '#64748b', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  modalConfirm: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#dc2626', alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
