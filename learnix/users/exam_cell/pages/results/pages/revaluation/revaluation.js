// X-06 — REVALUATION: decide requests, apply revised marks (docs/users/05 §3.4).
//
// The decision screen for the post-publication correction path (docs
// 05-state-machines §2.4): REQUESTED → APPROVED → COMPLETED | REJECTED, one
// direction, and the buttons here are driven by the SERVER's `allowed` list
// per row — a COMPLETED or REJECTED request offers no buttons at all,
// because the server would answer 422 anyway.
//
// COMPLETING A REQUEST NEEDS THE REVISED MARKS. The server refuses a
// COMPLETED without `revisedMarks` (it is the whole point of the step), so
// this screen asks for the number before it sends: an input per APPROVED
// request, bounded server-side against the result's own maxMarks. On
// completion the result row is re-derived through the grade scale and its
// `revision` is bumped — the old endpoint accepted no marks at all, so a
// "completed" decision changed nothing.
//
// WRITES RELOAD: the queue re-reads, so the row's new status is the server's.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { REVAL_STATUS_META, GREEN, RED, SLATE, plural } from '../../resultsMeta';
import {
  ResultScreen,
  Card,
  Chip,
  Avatar,
  StatGrid,
  ProblemStrip,
  useResult,
  useAction,
} from '../../resultsUi';

export default function ResultsRevaluation() {
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(() =>
    examcellApi.resultBlock('REVALUATION'),
  );
  const action = useAction(reload);
  const [marks, setMarks] = useState({});

  const items = data?.items ?? [];
  const counts = data?.counts ?? {};

  const decide = (req, decision) => {
    if (decision === 'COMPLETED') {
      const raw = (marks[req.id] ?? '').toString().trim();
      if (raw === '') {
        action.run(async () => {
          throw new Error(`Enter the revised marks for ${req.student} (0–${req.maxMarks}) before completing.`);
        });
        return;
      }
      const revisedMarks = Number(raw);
      if (!Number.isInteger(revisedMarks) || revisedMarks < 0 || revisedMarks > req.maxMarks) {
        action.run(async () => {
          throw new Error(`Revised marks must be a whole number 0–${req.maxMarks}.`);
        });
        return;
      }
      action.run(() => examcellApi.decideReevaluation(req.id, { decision, revisedMarks }));
      return;
    }
    action.run(() => examcellApi.decideReevaluation(req.id, { decision }));
  };

  return (
    <ResultScreen
      title="Revaluation updates"
      subtitle="Decide requests and apply revised marks — a completion bumps the result's revision."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <>
          <StatGrid
            items={[
              { id: 'open', label: 'To decide', value: counts.REQUESTED ?? 0, icon: 'time-outline', color: '#2563eb' },
              { id: 'approved', label: 'Awaiting complete', value: counts.APPROVED ?? 0, icon: 'hourglass-outline', color: '#d97706' },
              { id: 'completed', label: 'Completed', value: counts.COMPLETED ?? 0, icon: 'checkmark-done', color: GREEN },
              { id: 'rejected', label: 'Rejected', value: counts.REJECTED ?? 0, icon: 'close-circle', color: RED },
            ]}
          />
          <ProblemStrip problem={action.problem} />
        </>
      }
    >
      {items.map((req) => {
        const meta = REVAL_STATUS_META[req.status] || { color: SLATE, label: req.status };
        const allowed = req.allowed ?? [];
        return (
          <Card key={req.id}>
            <View style={s.row}>
              <Avatar name={req.student} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{req.student}</Text>
                <Text style={s.meta}>
                  {req.rollNo} · {req.subject} ({req.code})
                </Text>
                <Text style={s.reason} numberOfLines={3}>“{req.reason}”</Text>
              </View>
              <Chip label={meta.label} color={meta.color} />
            </View>

            <View style={s.tags}>
              <Chip label={`row ${req.marks}/${req.maxMarks} · ${req.grade}`} color={SLATE} />
              <Chip label={`result ${req.resultStatus}`} color="#0891b2" />
              {req.revision > 0 && <Chip label={`revision ${req.revision}`} color={RED} />}
              {req.revisedMarks !== null && req.revisedMarks !== undefined && (
                <Chip label={`revised → ${req.revisedMarks}`} color={GREEN} />
              )}
            </View>

            {req.note ? <Text style={s.note}>Decision note: {req.note}</Text> : null}

            {/* ── The revised marks input — only where the server needs one ── */}
            {allowed.includes('COMPLETED') && (
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  value={marks[req.id] ?? ''}
                  onChangeText={(v) => setMarks((m) => ({ ...m, [req.id]: v }))}
                  placeholder={`Revised marks (0–${req.maxMarks})`}
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  editable={!action.busy}
                />
                <Text style={s.inputHint}>row had {req.marks}</Text>
              </View>
            )}

            {/* ── Buttons from the SERVER's allowed list, never a guess ── */}
            {allowed.length > 0 && (
              <View style={s.actions}>
                {allowed.includes('APPROVED') && (
                  <TouchableOpacity style={[s.btn, s.btnApprove]} disabled={action.busy} onPress={() => decide(req, 'APPROVED')} activeOpacity={0.75}>
                    <Text style={s.btnText}>Approve</Text>
                  </TouchableOpacity>
                )}
                {allowed.includes('COMPLETED') && (
                  <TouchableOpacity style={[s.btn, s.btnComplete]} disabled={action.busy} onPress={() => decide(req, 'COMPLETED')} activeOpacity={0.75}>
                    <Ionicons name="checkmark-circle" size={13} color="#fff" />
                    <Text style={s.btnText}>Complete with revised marks</Text>
                  </TouchableOpacity>
                )}
                {allowed.includes('REJECTED') && (
                  <TouchableOpacity style={[s.btn, s.btnReject]} disabled={action.busy} onPress={() => decide(req, 'REJECTED')} activeOpacity={0.75}>
                    <Text style={s.btnText}>Reject</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {allowed.length === 0 && (
              <Text style={s.closed}>Decided {new Date(req.decidedAt || req.createdAt).toLocaleDateString()} — this request is closed.</Text>
            )}
          </Card>
        );
      })}

      {!items.length && (
        <View style={s.empty}>
          <Ionicons name="refresh-circle-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>No re-evaluation requests</Text>
          <Text style={s.emptyBody}>Students raise these after results are published.</Text>
        </View>
      )}

      {items.length > 0 && (
        <Text style={s.foot}>
          {plural(items.length, 'request')} · completion re-derives the grade and bumps the result's revision
        </Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  reason: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Regular', marginTop: 4, fontStyle: 'italic' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  note: { fontSize: 11, color: '#0369a1', fontFamily: 'Manrope-SemiBold', marginTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-SemiBold', backgroundColor: '#f8fafc' },
  inputHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  btnApprove: { backgroundColor: '#2563eb' },
  btnComplete: { backgroundColor: '#059669' },
  btnReject: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  closed: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 8 },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
