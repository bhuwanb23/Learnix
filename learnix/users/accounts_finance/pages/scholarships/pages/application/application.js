// F-08 Scholarships — ONE application (docs/users/06 §3.7).
//
// The screen the whole desk exists for: why is this student eligible, is every
// document verified, how much will it actually give, and what may the officer do
// next. Every action is offered by the SERVER (`actions`); the client renders
// them and never decides on its own.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, StatusChip } from '../../../../../../components/ui';
import {
  THEME, AMBER, GREEN, RED, rupees, statusMeta, bandMeta, documentMeta,
  DOCUMENT_STATUS_META, blockedReason,
} from '../../scholarshipsMeta';

// The server accepts exactly these (scholarship.routes.ts ALLOWED_MIME).
const ACCEPTED_UPLOAD_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
];

export default function ScholarshipApplication({ navigation, route }) {
  const applicationId = route?.params?.applicationId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(null); // the document code mid-upload
  const [error, setError] = useState(null);
  const [reasonModal, setReasonModal] = useState(null); // { kind, title, hint, onSubmit }

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.applicationDetail(applicationId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applicationId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const act = async (fn, success) => {
    try {
      setBusy(true);
      setData(await fn());
      if (success) Alert.alert('Done', success);
    } catch (err) {
      Alert.alert('Not allowed', err.message);
    } finally {
      setBusy(false);
    }
  };

  const askReason = (kind, title, hint, onSubmit) => setReasonModal({ kind, title, hint, onSubmit });

  /**
   * Attach the file itself. The two refusals below are the ones the server would
   * make anyway, checked locally so the desk finds out before spending their
   * mobile data on an 8 MB upload that was always going to bounce.
   */
  const uploadDoc = async (code, label) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        // Copy to cache: on Android the original content:// uri is revoked when
        // the picker closes, and the upload then fails some seconds later with a
        // bare "no such file".
        copyToCacheDirectory: true,
        multiple: false,
        type: ACCEPTED_UPLOAD_TYPES,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;

      const type = asset.mimeType ?? '';
      if (type && !ACCEPTED_UPLOAD_TYPES.includes(type)) {
        Alert.alert('That file type will not upload', `${label} must be a JPEG, PNG, WebP, HEIC or PDF.`);
        return;
      }
      if (asset.size && asset.size > 8 * 1024 * 1024) {
        Alert.alert('That file is too large', `${Math.round(asset.size / 1024 / 1024 * 10) / 10} MB — the limit is 8 MB.`);
        return;
      }

      setUploading(code);
      await accountsApi.uploadScholarshipDocument(data.id, code, {
        uri: asset.uri,
        name: asset.name ?? label,
        // Fall back to a type the server accepts; an asset with no reported MIME
        // type is not a reason to refuse an upload the server would take.
        type: type || 'application/pdf',
      });
      await fetchData();
      Alert.alert('Attached', `${label} uploaded. Verify it to complete the checklist.`);
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <View style={styles.wrap}><SkeletonCard /><SkeletonCard /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={RED} />
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={fetchData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return <EmptyState icon="document-text-outline" title="Not found" message="This application is no longer available." />;
  }

  const sm = statusMeta(data.status);
  const bm = bandMeta(data.amount?.band);
  const live = data.eligibility?.live ?? { lines: [], eligible: false, summary: '' };
  const docs = data.documents ?? {};
  const blocked = blockedReason(data.actions);
  const can = (name) => (data.actions ?? []).includes(name);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <AnimatedCard style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.info}>
            <Text style={styles.name}>{data.student?.name}</Text>
            <Text style={styles.meta}>{data.student?.rollNo} · semester {data.student?.currentSemester ?? '—'}</Text>
          </View>
          <StatusChip label={sm.label} color={sm.color} backgroundColor={sm.bg} />
        </View>
        <Text style={styles.schemeName}>{data.scholarship?.name}</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.openModule('ScholarshipDetail', { schemeId: data.scholarship?.id })}>
          <Text style={styles.link}>View the scheme →</Text>
        </TouchableOpacity>
      </AnimatedCard>

      {/* Actions come from the server. A BLOCKED reason is shown rather than a
          silently disabled button, because "why can't I approve this" is the
          question the officer actually has. */}
      {data.actions?.length ? (
        <View style={styles.actionRow}>
          {can('START_REVIEW') ? (
            <ActionBtn label="Start review" icon="time-outline" tone={THEME} disabled={busy}
              onPress={() => act(() => accountsApi.startReview(data.id, 'Taken up for review'), 'Moved to review')} />
          ) : null}
          {can('APPROVE') ? (
            <ActionBtn label="Approve" icon="checkmark-circle-outline" tone={GREEN} disabled={busy}
              onPress={() => act(() => accountsApi.approveScholarship(data.id, 'Documents and eligibility verified'), 'Approved')} />
          ) : null}
          {can('DISBURSE') ? (
            <ActionBtn label="Release funds" icon="wallet-outline" tone={THEME} disabled={busy}
              onPress={() => act(() => accountsApi.disburseScholarship(data.id, {}), 'Credited against the student\u2019s dues')} />
          ) : null}
          {can('REJECT') ? (
            <ActionBtn label="Reject" icon="close-circle-outline" tone={RED} disabled={busy}
              onPress={() => askReason('reject', 'Reject this application', 'The student will see this reason.', (reason) =>
                act(() => accountsApi.rejectScholarship(data.id, reason), 'Rejected'))} />
          ) : null}
          {can('WITHDRAW') ? (
            <ActionBtn label="Withdraw" icon="arrow-undo-outline" tone={AMBER} disabled={busy}
              onPress={() => askReason('withdraw', 'Withdraw this application', 'Optional reason.', (note) =>
                act(() => accountsApi.withdrawScholarship(data.id, note), 'Withdrawn'))} />
          ) : null}
        </View>
      ) : null}

      {data.status === 'DISBURSED' && (data.allocations ?? []).length ? (
        // A disbursement moves real money onto the student's bill. Without a way
        // back, a wrong release is permanent — the app could take money off the
        // ledger but never put it back.
        <AnimatedCard style={[styles.card, styles.reverseCard]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Released funds</Text>
            <Text style={styles.countText}>{rupees(data.amount?.disbursedRupees)} released</Text>
          </View>
          <Text style={styles.mutedLine}>
            Credited to {(data.allocations ?? []).map((a) => a.dueTitle).join(', ')}. Reversing puts the money back on the bill and returns this application to Approved.
          </Text>
          <TouchableOpacity style={styles.reverseBtn} disabled={busy}
            onPress={() => askReason('reverse', 'Reverse this disbursement', 'The student will see this reason.', (reason) =>
              act(() => accountsApi.reverseDisbursement(data.id, reason), 'Reversed — the balance is back on the student’s dues'))}>
            <Ionicons name="arrow-undo-outline" size={15} color={RED} />
            <Text style={styles.reverseBtnText}>Reverse the disbursement</Text>
          </TouchableOpacity>
        </AnimatedCard>
      ) : null}

      {blocked ? (
        <View style={styles.blockedBox}>
          <Ionicons name="information-circle-outline" size={16} color={AMBER} />
          <Text style={styles.blockedText}>Cannot approve yet — {blocked}.</Text>
        </View>
      ) : null}

      {/* Amount: requested vs granted, and WHY they differ. */}
      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>Amount</Text>
        <View style={styles.amountGrid}>
          <AmountCell label="Outstanding" value={rupees(data.amount?.outstandingRupees)} />
          <AmountCell label="Requested" value={rupees(data.amount?.requestedRupees)} />
          <AmountCell label="Granted" value={rupees(data.amount?.grantedRupees)} tone={GREEN} />
          <AmountCell label="Released" value={rupees(data.amount?.disbursedRupees)} tone={THEME} />
        </View>
        {data.amount?.basis ? <Text style={styles.basis}>{data.amount.basis}</Text> : null}
        {data.amount?.cappedBy ? (
          <View style={styles.warnRow}>
            <Ionicons name="alert-circle-outline" size={13} color={AMBER} />
            <Text style={styles.warnText}>Capped by {data.amount.cappedBy === 'BUDGET' ? 'the scheme fund' : 'the outstanding balance'}</Text>
          </View>
        ) : null}
        {(data.amount?.warnings ?? []).map((w, i) => (
          <Text key={i} style={styles.warningLine}>• {w}</Text>
        ))}
        <View style={styles.bandRow}>
          <Ionicons name={bm.icon} size={13} color={bm.color} />
          <Text style={[styles.bandText, { color: bm.color }]}>{bm.label}</Text>
        </View>
      </AnimatedCard>

      {/* Eligibility, rule by rule, with the actual value beside the requirement. */}
      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>Eligibility</Text>
        <Text style={styles.summary}>{live.summary}</Text>
        {(live.lines ?? []).map((line) => (
          <View key={line.operator} style={styles.ruleRow}>
            <Ionicons
              name={line.passed ? 'checkmark-circle' : line.unknown ? 'help-circle' : 'close-circle'}
              size={16}
              color={line.passed ? GREEN : line.unknown ? AMBER : RED}
            />
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleLabel}>
                {line.label}{line.declared ? '  (declared)' : ''}
              </Text>
              <Text style={styles.ruleActual}>needs {line.required} · has {line.actual}</Text>
            </View>
          </View>
        ))}
        {!(live.lines ?? []).length ? (
          <Text style={styles.muted}>This scheme has no eligibility rules — every eligible student qualifies.</Text>
        ) : null}
        <Text style={styles.disclaimer}>
          Income and gender are declared by the student and verified by an officer against the uploaded documents — the system cannot prove them on its own.
        </Text>
      </AnimatedCard>

      {/* Documents: an upload is evidence, a verification is a decision. */}
      <AnimatedCard style={styles.card}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <Text style={styles.countText}>{docs.verifiedCount}/{docs.requiredCount} verified</Text>
        </View>
        {(docs.documents ?? []).map((d) => {
          const meta = documentMeta(d.code);
          const dm = DOCUMENT_STATUS_META[d.status] ?? DOCUMENT_STATUS_META.PENDING;
          const closed = data.status === 'DISBURSED' || data.status === 'REJECTED';
          return (
            <View key={d.code} style={styles.docRow}>
              <Ionicons name={meta.icon} size={18} color="#64748b" />
              <View style={styles.docInfo}>
                <Text style={styles.docLabel}>{meta.label}</Text>
                <Text style={styles.docStatus}>{dm.label}</Text>
              </View>
              {!closed && d.status !== 'VERIFIED' ? (
                <View style={styles.docActions}>
                  {/* Upload first, then verify. Without this a document could only
                      ever be rejected, the checklist could never complete, and
                      approval would be permanently blocked. */}
                  {d.file ? (
                    <TouchableOpacity
                      style={styles.docBtn}
                      onPress={() => askReason('doc', `Verify ${meta.label}`, 'Optional note.', () =>
                        act(() => accountsApi.markScholarshipDocument(data.id, d.code, { status: 'VERIFIED', fileId: d.file.id }), 'Verified'))}
                    >
                      <Text style={styles.docBtnText}>Verify</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.docBtn, uploading === d.code && styles.docBtnBusy]}
                      disabled={uploading === d.code}
                      onPress={() => uploadDoc(d.code, meta.label)}
                    >
                      <Text style={styles.docBtnText}>{uploading === d.code ? 'Sending…' : 'Upload'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.docBtn, styles.docBtnReject]}
                    onPress={() => askReason('doc', `Reject ${meta.label}`, 'The student must be told why.', (reason) =>
                      act(() => accountsApi.markScholarshipDocument(data.id, d.code, { status: 'REJECTED', fileId: d.file?.id ?? null, note: reason }), 'Rejected'))}
                  >
                    <Text style={[styles.docBtnText, { color: RED }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.pill, { backgroundColor: dm.bg }]}>
                  <Text style={[styles.pillText, { color: dm.color }]}>{d.status === 'VERIFIED' ? '✓' : dm.label}</Text>
                </View>
              )}
            </View>
          );
        })}
      </AnimatedCard>

      {/* What the money actually paid for. */}
      {(data.allocations ?? []).length ? (
        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>Credited against</Text>
          {data.allocations.map((al) => (
            <View key={al.id} style={styles.allocRow}>
              <Ionicons name="receipt-outline" size={15} color={THEME} />
              <Text style={styles.allocTitle}>{al.dueTitle}</Text>
              <Text style={styles.allocAmount}>{rupees(al.amountRupees)}</Text>
            </View>
          ))}
          <Text style={styles.muted}>Balance left on that bill: {rupees(data.allocations[0].balanceAfterRupees)}</Text>
        </AnimatedCard>
      ) : null}

      <AnimatedCard style={styles.card}>
        <Text style={styles.sectionTitle}>History</Text>
        {(data.events ?? []).map((e) => (
          <View key={e.id} style={styles.eventRow}>
            <View style={styles.dot} />
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>
                {e.toMeta?.label ?? e.to}{e.from ? ` ← ${e.from}` : ''}
              </Text>
              <Text style={styles.eventMeta}>{e.actor ?? 'System'} · {e.at}</Text>
              {e.note ? <Text style={styles.eventNote}>{e.note}</Text> : null}
            </View>
          </View>
        ))}
        {!(data.events ?? []).length ? <Text style={styles.muted}>No events recorded yet.</Text> : null}
      </AnimatedCard>

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => navigation.openModule('ScholarshipStudentHistory', { studentProfileId: data.student?.id })}
      >
        <Text style={styles.link}>See this student\u2019s whole scholarship history →</Text>
      </TouchableOpacity>

      <ReasonModal
        spec={reasonModal}
        onClose={() => setReasonModal(null)}
        onSubmit={(text) => {
          const spec = reasonModal;
          setReasonModal(null);
          if (spec) spec.onSubmit(text);
        }}
      />
    </ScrollView>
  );
}

function ActionBtn({ label, icon, tone, disabled, onPress }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: tone, opacity: disabled ? 0.6 : 1 }]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={15} color="#fff" />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function AmountCell({ label, value, tone }) {
  return (
    <View style={styles.amountCell}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

function ReasonModal({ spec, onClose, onSubmit }) {
  const [text, setText] = useState('');
  useEffect(() => { setText(''); }, [spec]);
  if (!spec) return null;
  const needsText = spec.kind === 'reject' || spec.kind === 'doc';
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{spec.title}</Text>
          <Text style={styles.modalHint}>{spec.hint}</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={needsText ? 'Required' : 'Optional'}
            multiline
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOk, needsText && text.trim().length < 3 && styles.modalOkDisabled]}
              onPress={() => onSubmit(text)}
              disabled={needsText && text.trim().length < 3}
            >
              <Text style={styles.modalOkText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  wrap: { flex: 1, backgroundColor: '#f5f7f9', padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f7f9' },
  error: { marginTop: 12, color: RED, textAlign: 'center' },
  retry: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  muted: { fontSize: 11, color: '#64748b', marginTop: 6 },
  hero: { marginBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  meta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  schemeName: { fontSize: 12, color: '#475569', marginTop: 8 },
  linkRow: { paddingVertical: 8 },
  link: { fontSize: 12, fontWeight: '700', color: THEME },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  blockedBox: { flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  blockedText: { flex: 1, fontSize: 11, color: '#92400e', fontWeight: '600' },
  card: { marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  amountCell: { width: '50%', paddingVertical: 6 },
  amountLabel: { fontSize: 10, color: '#64748b' },
  amountValue: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  basis: { fontSize: 11, color: '#475569', marginTop: 6 },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  warnText: { fontSize: 11, color: AMBER, fontWeight: '600' },
  warningLine: { fontSize: 11, color: '#92400e', marginTop: 4 },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  bandText: { fontSize: 11, fontWeight: '700' },
  summary: { fontSize: 12, color: '#475569', marginBottom: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5 },
  ruleInfo: { flex: 1 },
  ruleLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  ruleActual: { fontSize: 11, color: '#64748b', marginTop: 1 },
  disclaimer: { fontSize: 10, color: '#92400e', marginTop: 10, fontStyle: 'italic' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  docStatus: { fontSize: 10, color: '#64748b', marginTop: 1 },
  docActions: { flexDirection: 'row', gap: 6 },
  docBtnBusy: { opacity: 0.6 },
  reverseCard: { borderColor: '#fecaca', borderWidth: 1 },
  reverseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, borderRadius: 10, paddingVertical: 11, backgroundColor: '#fef2f2' },
  reverseBtnText: { color: RED, fontWeight: '700', fontSize: 12 },
  mutedLine: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  docBtn: { borderWidth: 1, borderColor: GREEN, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  docBtnReject: { borderColor: RED },
  docBtnText: { fontSize: 11, fontWeight: '700', color: GREEN },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  pillText: { fontSize: 10, fontWeight: '700' },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  allocTitle: { flex: 1, fontSize: 12, color: '#0f172a' },
  allocAmount: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  eventRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: THEME, marginTop: 5 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  eventMeta: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  eventNote: { fontSize: 11, color: '#475569', marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, width: '100%' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  modalHint: { fontSize: 11, color: '#64748b', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, marginTop: 12, minHeight: 70, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 14 },
  modalCancelText: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  modalOk: { backgroundColor: THEME, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  modalOkDisabled: { opacity: 0.4 },
  modalOkText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});