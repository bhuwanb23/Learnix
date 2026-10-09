// X-06 — APPROVAL: VERIFIED → APPROVED (docs/users/05 §3.4).
//
// The signature step. Approval takes a whole slot's VERIFIED rows in one
// move — you sign off a subject, not a student — and the button is off until
// there is something to sign, so an empty screen cannot manufacture an
// approval. The actor and time are stamped server-side on every row; this
// screen never writes a name of its own.
//
// WRITES RELOAD: after a successful approval the rows leave for the Publish
// block because the server moved them, not because this screen deleted them.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { GREEN, INDIGO, SLATE, plural } from '../../resultsMeta';
import {
  ResultScreen,
  ExamPicker,
  Card,
  Chip,
  Avatar,
  StatGrid,
  ProblemStrip,
  useResult,
  useExamPicker,
  useAction,
} from '../../resultsUi';

export default function ResultsApproval() {
  const picker = useExamPicker();
  const { examId, setExamId } = picker;
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(
    () => examcellApi.resultBlock('APPROVAL', examId),
    [examId],
  );
  const action = useAction(reload);

  const items = data?.items ?? [];
  const counts = data?.counts ?? {};
  const slots = [...new Set(items.map((i) => i.slotId))];

  const approve = (slotId) => action.run(() => examcellApi.approveResults(slotId));

  return (
    <ResultScreen
      title="Result approval"
      subtitle="Sign off verified rows before anything can be published."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <>
          <ExamPicker exams={picker.exams} examId={examId} onChange={setExamId} loading={picker.loading} error={picker.error} />
          <StatGrid
            items={[
              { id: 'verified', label: 'To approve', value: counts.VERIFIED ?? 0, icon: 'time-outline', color: '#0284c7' },
              { id: 'approved', label: 'Approved', value: counts.APPROVED ?? 0, icon: 'checkbox', color: INDIGO },
              { id: 'published', label: 'Published', value: counts.PUBLISHED ?? 0, icon: 'megaphone', color: GREEN },
              { id: 'draft', label: 'Not verified', value: counts.DRAFT ?? 0, icon: 'document-text-outline', color: SLATE },
            ]}
          />
          <ProblemStrip problem={action.problem} />

          {/* ── Per-slot approval: one signature per subject ── */}
          {slots.map((slotId) => {
            const slotRows = items.filter((i) => i.slotId === slotId);
            return (
              <Card key={slotId} style={s.slotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.subName}>{slotRows[0]?.subject}</Text>
                  <Text style={s.subMeta}>
                    {slotRows[0]?.code} · {slotRows[0]?.exam} · {plural(slotRows.length, 'row')} verified
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.btn, action.busy && s.btnOff]}
                  disabled={action.busy}
                  onPress={() => approve(slotId)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="checkbox" size={14} color="#fff" />
                  <Text style={s.btnText}>{action.busy ? 'Signing…' : 'Approve'}</Text>
                </TouchableOpacity>
              </Card>
            );
          })}
        </>
      }
    >
      {items.map((r) => (
        <Card key={r.id} style={s.row}>
          <Avatar name={r.student} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{r.student}</Text>
            <Text style={s.meta}>
              {r.rollNo} · {r.subject} ({r.code})
            </Text>
            <Text style={s.marks}>
              {r.marksObtained}/{r.maxMarks} · {r.percent}% · {r.isPass ? 'pass' : 'F'}
            </Text>
          </View>
          <View style={s.right}>
            <Chip label={r.verifiedAt ? `verified ${new Date(r.verifiedAt).toLocaleDateString()}` : 'verified'} color={INDIGO} />
          </View>
        </Card>
      ))}

      {!items.length && (
        <View style={s.empty}>
          <Ionicons name="checkbox-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>Nothing to approve</Text>
          <Text style={s.emptyBody}>
            {(counts.DRAFT ?? 0) > 0
              ? 'Rows are still in DRAFT — verify them first.'
              : 'Approval opens once a slot has verified rows.'}
          </Text>
        </View>
      )}

      {items.length > 0 && (
        <Text style={s.foot}>{plural(items.length, 'row')} awaiting signature · approval stamps actor and time server-side</Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  subMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: INDIGO, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  btnOff: { backgroundColor: '#94a3b8' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  marks: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 1 },
  right: { alignItems: 'flex-end' },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
