// X-06 — VERIFY: DRAFT → VERIFIED, rows re-checked against their papers
// (docs/users/05 §3.4).
//
// The screen the word "verification" is worth anything on. Each DRAFT row
// arrives with its paper's total beside it and an `ok` flag computed SERVER
// side — this screen does not re-decide whether a row matches, it displays
// the server's verdict. A row the server refused (mismatch, missing paper,
// drifted grade) is listed with its reason, and the verify button for that
// slot is off, because the server will answer 422 anyway.
//
// WRITES RELOAD: a successful verify re-reads the block, so the row leaves
// the queue because the SERVER says it left — not because this screen
// optimistically deleted it.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { GREEN, RED, AMBER, SLATE, plural } from '../../resultsMeta';
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

export default function ResultsVerify() {
  const picker = useExamPicker();
  const { examId, setExamId } = picker;
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(
    () => examcellApi.resultBlock('VERIFY', examId),
    [examId],
  );
  const action = useAction(reload);

  const items = data?.items ?? [];
  const mismatches = data?.mismatches ?? [];
  const counts = data?.counts ?? {};
  const slots = [...new Set(items.map((i) => i.slotId))];
  const badSlots = new Set(mismatches.map((i) => i.slotId));

  const verify = (slotId) => action.run(() => examcellApi.verifyResults(slotId));

  return (
    <ResultScreen
      title="Result verification"
      subtitle="Each DRAFT row against its paper — the server checks, this screen shows the verdict."
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
              { id: 'draft', label: 'To verify', value: counts.DRAFT ?? 0, icon: 'time-outline', color: SLATE },
              { id: 'verified', label: 'Verified', value: counts.VERIFIED ?? 0, icon: 'checkmark-done', color: GREEN },
              { id: 'bad', label: 'Mismatches', value: mismatches.length, icon: 'alert-circle', color: mismatches.length ? RED : SLATE },
              { id: 'missing', label: 'Missing rows', value: data?.missingRows ?? 0, icon: 'help-circle', color: data?.missingRows ? AMBER : SLATE },
            ]}
          />
          <ProblemStrip problem={action.problem} />

          {/* ── Per-slot verify: the whole slot moves together ── */}
          {slots.map((slotId) => {
            const blocked = badSlots.has(slotId) || (data?.missingRows ?? 0) > 0;
            const slotRows = items.filter((i) => i.slotId === slotId);
            return (
              <Card key={slotId} style={s.slotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.subName}>{slotRows[0]?.subject}</Text>
                  <Text style={s.subMeta}>
                    {slotRows[0]?.code} · {plural(slotRows.length, 'row')} in queue
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.btn, (blocked || action.busy) && s.btnOff]}
                  disabled={blocked || action.busy}
                  onPress={() => verify(slotId)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="checkmark-done" size={14} color="#fff" />
                  <Text style={s.btnText}>{action.busy ? 'Checking…' : 'Verify'}</Text>
                </TouchableOpacity>
              </Card>
            );
          })}

          {/* ── What the server refused, with its reason ── */}
          {mismatches.map((m) => (
            <View key={`${m.id}-${m.reason}`} style={s.bad}>
              <Ionicons name="warning" size={14} color={RED} />
              <Text style={s.badText}>
                {m.student} ({m.rollNo}) · {m.code}: {m.reason}
              </Text>
            </View>
          ))}
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
              row {r.marksObtained}/{r.maxMarks} · paper {r.paperMarks === null ? '—' : r.paperMarks}
            </Text>
          </View>
          <View style={s.right}>
            <Chip label={r.ok ? 'match' : 'refused'} color={r.ok ? GREEN : RED} />
            {!r.ok ? <Text style={s.reason} numberOfLines={2}>{r.reason}</Text> : null}
          </View>
        </Card>
      ))}

      {!items.length && (counts.VERIFIED ?? 0) === 0 && (
        <View style={s.empty}>
          <Ionicons name="checkmark-done-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>Nothing to verify</Text>
          <Text style={s.emptyBody}>Consolidate a slot first — verification starts from DRAFT rows.</Text>
        </View>
      )}

      {!items.length && (counts.VERIFIED ?? 0) > 0 && (
        <View style={s.empty}>
          <Ionicons name="checkmark-circle" size={26} color={GREEN} />
          <Text style={s.emptyTitle}>Queue is clear</Text>
          <Text style={s.emptyBody}>Every row on this exam is past DRAFT — approve them next.</Text>
        </View>
      )}

      {items.length > 0 && (
        <Text style={s.foot}>{plural(items.length, 'row')} awaiting verification · the check happens on the server</Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  subMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0284c7', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  btnOff: { backgroundColor: '#94a3b8' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  bad: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: `${RED}0D`, borderWidth: 1, borderColor: `${RED}33`, borderRadius: 10, padding: 10, marginBottom: 8 },
  badText: { flex: 1, fontSize: 12, color: RED, fontFamily: 'Manrope-SemiBold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  marks: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 4, maxWidth: 130 },
  reason: { fontSize: 9, color: RED, fontFamily: 'Manrope-Regular', textAlign: 'right' },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
