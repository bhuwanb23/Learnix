import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard, EmptyState } from '../../../../../components/ui';
import { THEME, statusMeta, procurementMeta, formatDate, formatDateTime, relativeTime, waitingLabel } from '../requestMeta';

const NOTE_LIMIT = 500;

export default function RequestDetail({ navigation, route }) {
  const requestId = route?.params?.requestId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [decision, setDecision] = useState(null); // 'APPROVED' | 'REJECTED' | null
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!requestId) {
      setError('No request was selected.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setData(await libraryApi.request(requestId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submit = () => {
    if (note.trim().length < 5) {
      setNoteError('The student reads this — give at least 5 characters.');
      return;
    }
    const run = async () => {
      setSaving(true);
      try {
        await libraryApi.decideRequest(requestId, decision, note.trim());
        setDecision(null);
        setNote('');
        await fetchData();
        Alert.alert(
          decision === 'APPROVED' ? 'Approved' : 'Declined',
          decision === 'APPROVED'
            ? 'A purchase has been raised. Receive it from the Procurement desk once it arrives.'
            : 'The student has been told why.',
        );
      } catch (err) {
        setNoteError(err.message);
      } finally {
        setSaving(false);
      }
    };

    Alert.alert(
      decision === 'APPROVED' ? 'Approve this request?' : 'Decline this request?',
      decision === 'APPROVED'
        ? 'A purchase will be raised so you can order the title.'
        : 'The student will see your reason. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: decision === 'APPROVED' ? 'Approve' : 'Decline', style: decision === 'APPROVED' ? 'default' : 'destructive', onPress: run },
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

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error ?? 'Request not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const r = data.request;
  const student = data.student;
  const standing = data.standing;
  const meta = statusMeta(r.status);
  const waiting = waitingLabel(r.waitingDays);
  const canDecide = r.status === 'PENDING';
  const pm = data.procurement ? procurementMeta(data.procurement.status) : null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Title + status */}
        <AnimatedCard delay={0} style={styles.block}>
          <Text style={styles.title}>{r.title}</Text>
          {r.author ? <Text style={styles.author}>{r.author}</Text> : null}
          <View style={styles.chipRow}>
            <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={12} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {waiting ? (
              <View style={[styles.plainChip, r.waitingDays > 14 && styles.plainChipWarn]}>
                <Text style={[styles.plainText, r.waitingDays > 14 && styles.plainTextWarn]}>{waiting}</Text>
              </View>
            ) : null}
            <View style={styles.plainChip}>
              <Text style={styles.plainText}>Asked {relativeTime(r.createdAt)}</Text>
            </View>
          </View>
          {r.reason ? (
            <View style={styles.quote}>
              <Text style={styles.quoteLabel}>Student's reason</Text>
              <Text style={styles.quoteText}>"{r.reason}"</Text>
            </View>
          ) : null}
        </AnimatedCard>

        {/* Decision already made */}
        {!canDecide && r.decidedAt ? (
          <AnimatedCard delay={60} style={styles.block}>
            <Text style={styles.cardLabel}>Decision</Text>
            <View style={styles.decisionRow}>
              <View style={[styles.decisionIcon, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={styles.decisionBody}>
                <Text style={styles.decisionTitle}>
                  {meta.label} by {r.decidedBy ?? 'the library'} · {formatDate(r.decidedAt)}
                </Text>
                <Text style={styles.decisionNote}>{r.decisionNote}</Text>
              </View>
            </View>
          </AnimatedCard>
        ) : null}

        {/* Student */}
        <AnimatedCard delay={120} style={styles.block}>
          <Text style={styles.cardLabel}>Requested by</Text>
          <View style={styles.studentRow}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>
                {(student.name || '?').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.studentBody}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentMeta}>
                {student.rollNo}
                {student.program ? ` · ${student.program}` : ''}
                {student.batch ? ` · ${student.batch}` : ''}
                {student.semester ? ` · Sem ${student.semester}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.statRow}>
            {[
              { label: 'Holds', value: standing.activeLoans, color: '#2563eb' },
              { label: 'Overdue', value: standing.overdueLoans, color: '#dc2626' },
              { label: 'Fines due', value: standing.pendingFineCount, color: '#d97706' },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { color: s.value === 0 ? '#cbd5e1' : s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </AnimatedCard>

        {/* Catalog match */}
        <AnimatedCard delay={180} style={styles.block}>
          <Text style={styles.cardLabel}>Do we already stock it?</Text>
          {data.catalogMatches.length === 0 ? (
            <View style={styles.noMatchRow}>
              <Ionicons name="alert-circle-outline" size={16} color="#d97706" />
              <Text style={styles.noMatchText}>
                No catalog title matches this request — buying it is a genuine addition to the collection.
              </Text>
            </View>
          ) : (
            data.catalogMatches.map((b) => (
              <View key={b.id} style={styles.matchRow}>
                <View style={styles.matchIcon}>
                  <Ionicons name="book-outline" size={16} color="#059669" />
                </View>
                <View style={styles.matchBody}>
                  <Text style={styles.matchTitle} numberOfLines={1}>{b.title}</Text>
                  <Text style={styles.matchSub}>{b.author ?? 'Author unknown'}</Text>
                </View>
                <View style={[styles.stockPill, b.availableCopies === 0 && styles.stockPillOut]}>
                  <Text style={[styles.stockText, b.availableCopies === 0 && { color: '#dc2626' }]}>
                    {b.availableCopies}/{b.totalCopies} free
                  </Text>
                </View>
              </View>
            ))
          )}
        </AnimatedCard>

        {/* Demand */}
        {data.sameTitleRequests.length > 0 ? (
          <AnimatedCard delay={240} style={styles.block}>
            <Text style={styles.cardLabel}>
              Others asked for this ({data.sameTitleRequests.length})
            </Text>
            {data.sameTitleRequests.map((o, i) => {
              const om = statusMeta(o.status);
              return (
                <View key={o.id}>
                  <TouchableOpacity
                    style={styles.otherRow}
                    onPress={() => navigation.openModule('RequestDetail', { requestId: o.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.otherBody}>
                      <Text style={styles.otherName}>{o.student}</Text>
                      <Text style={styles.otherSub}>{o.rollNo} · {relativeTime(o.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: om.bg }]}>
                      <Text style={[styles.statusText, { color: om.color }]}>{om.label}</Text>
                    </View>
                  </TouchableOpacity>
                  {i < data.sameTitleRequests.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </AnimatedCard>
        ) : null}

        {/* Procurement */}
        {data.procurement ? (
          <AnimatedCard
            delay={300}
            style={styles.block}
            onPress={() => navigation.openModule('ProcurementDetail', { procurementId: data.procurement.id })}
          >
            <Text style={styles.cardLabel}>Purchase</Text>
            <View style={styles.procRow}>
              <View style={[styles.procIcon, { backgroundColor: pm.bg }]}>
                <Ionicons name={pm.icon} size={18} color={pm.color} />
              </View>
              <View style={styles.procBody}>
                <Text style={styles.procTitle}>{pm.label} · {data.procurement.copies} cop{data.procurement.copies === 1 ? 'y' : 'ies'}</Text>
                <Text style={styles.procSub}>
                  {data.procurement.costRupees > 0 ? `₹${data.procurement.costRupees.toLocaleString()} · ` : ''}
                  {data.procurement.orderedAt ? `ordered ${formatDate(data.procurement.orderedAt)}` : 'not yet ordered'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
          </AnimatedCard>
        ) : canDecide ? null : (
          <AnimatedCard delay={300} style={styles.block}>
            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={15} color="#64748b" />
              <Text style={styles.noteText}>No purchase was raised for this request.</Text>
            </View>
          </AnimatedCard>
        )}

        {/* Decision bar */}
        {canDecide ? (
          <AnimatedCard delay={340} style={[styles.block, styles.decisionBar]}>
            {!decision ? (
              <>
                <Text style={styles.decisionBarTitle}>Your decision</Text>
                <Text style={styles.decisionBarHint}>
                  The student sees your note. Declining asks for a reason — approve to raise a purchase.
                </Text>
                <View style={styles.decisionButtons}>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => setDecision('REJECTED')} activeOpacity={0.85}>
                    <Ionicons name="close" size={16} color="#dc2626" />
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => setDecision('APPROVED')} activeOpacity={0.85}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.noteHeader}>
                  <Ionicons
                    name={decision === 'APPROVED' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                    size={17}
                    color={decision === 'APPROVED' ? '#059669' : '#dc2626'}
                  />
                  <Text style={styles.decisionBarTitle}>
                    {decision === 'APPROVED' ? 'Approve' : 'Decline'} — reason
                  </Text>
                </View>
                <TextInput
                  style={[styles.noteInput, noteError && styles.noteInputError]}
                  value={note}
                  onChangeText={(v) => { setNote(v); setNoteError(null); }}
                  placeholder={
                    decision === 'APPROVED'
                      ? 'e.g. Two copies approved — this is on the syllabus.'
                      : 'e.g. Outside our acquisition scope; try the departmental library.'
                  }
                  placeholderTextColor="#cbd5e1"
                  multiline
                  maxLength={NOTE_LIMIT}
                />
                <View style={styles.noteFooter}>
                  <Text style={styles.noteCount}>{note.length}/{NOTE_LIMIT}</Text>
                  <View style={styles.noteActions}>
                    <TouchableOpacity
                      style={styles.noteCancel}
                      onPress={() => { setDecision(null); setNote(''); setNoteError(null); }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.noteCancelText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.noteSubmit, saving && styles.noteSubmitBusy]}
                      onPress={submit}
                      disabled={saving}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.noteSubmitText}>
                        {saving ? 'Saving…' : decision === 'APPROVED' ? 'Confirm approval' : 'Confirm decline'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {noteError ? <Text style={styles.noteError}>{noteError}</Text> : null}
              </>
            )}
          </AnimatedCard>
        ) : null}
      </ScrollView>
    </View>
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

  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', lineHeight: 24 },
  author: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  plainChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: '#f1f5f9' },
  plainChipWarn: { backgroundColor: '#fef2f2' },
  plainText: { fontSize: 10, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  plainTextWarn: { color: '#dc2626' },

  quote: { marginTop: 13, padding: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderLeftWidth: 3, borderLeftColor: THEME },
  quoteLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  quoteText: { fontSize: 12, color: '#334155', fontFamily: 'Manrope-Regular', lineHeight: 18, fontStyle: 'italic' },

  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },

  decisionRow: { flexDirection: 'row', alignItems: 'flex-start' },
  decisionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  decisionBody: { flex: 1 },
  decisionTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  decisionNote: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular', lineHeight: 18, marginTop: 4 },

  studentRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 13, backgroundColor: THEME + '14', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  initials: { fontSize: 14, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
  studentBody: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  studentMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  statRow: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 12 },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 2 },
  statValue: { fontSize: 17, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 },

  noMatchRow: { flexDirection: 'row', alignItems: 'flex-start' },
  noMatchText: { flex: 1, fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular', lineHeight: 17, marginLeft: 9 },
  matchRow: { flexDirection: 'row', alignItems: 'center' },
  matchIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  matchBody: { flex: 1 },
  matchTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  matchSub: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  stockPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, backgroundColor: '#f0fdf4' },
  stockPillOut: { backgroundColor: '#fef2f2' },
  stockText: { fontSize: 10, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold' },

  otherRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  otherBody: { flex: 1 },
  otherName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  otherSub: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#eef2f7' },

  procRow: { flexDirection: 'row', alignItems: 'center' },
  procIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  procBody: { flex: 1 },
  procTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  procSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  noteRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginLeft: 9 },

  decisionBar: { padding: 15, backgroundColor: '#fffdf7', borderColor: '#fde68a' },
  decisionBarTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  decisionBarHint: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16, marginTop: 4 },
  decisionButtons: { flexDirection: 'row', gap: 10, marginTop: 13 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca' },
  declineText: { fontSize: 13, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12, backgroundColor: '#059669' },
  approveText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },

  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  noteInput: { minHeight: 92, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular', textAlignVertical: 'top', backgroundColor: '#fff' },
  noteInputError: { borderColor: '#fca5a5' },
  noteFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  noteCount: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  noteActions: { flexDirection: 'row', gap: 9 },
  noteCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  noteCancelText: { fontSize: 12, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  noteSubmit: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 11, backgroundColor: THEME },
  noteSubmitBusy: { opacity: 0.7 },
  noteSubmitText: { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  noteError: { fontSize: 11, color: '#dc2626', fontFamily: 'Manrope-SemiBold', marginTop: 9 },
});
