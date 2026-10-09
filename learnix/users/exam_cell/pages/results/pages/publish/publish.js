// X-06 — PUBLISH: APPROVED → PUBLISHED, gated (docs/users/05 §3.4).
//
// The only screen where something goes out to students, so it shows WHY a
// slot cannot go out, not just that it cannot. Each slot carries the server's
// blocker list — unmarked papers, flagged moderation, rows still waiting on
// verify/approve, marked papers with no row — and the publish button is off
// while any of them stand.
//
// The old `POST /examcell/results/publish` had no such gate: it stamped
// `publishedAt` on every row of a slot in one call, so half-graded papers
// could reach students as final. Here the server re-checks the same blockers
// at write time; a stale screen that enables the button anyway gets a 422
// carrying `reasons`, which lands in the problem strip rather than in a
// student's hands.
//
// WRITES RELOAD: the row leaves because the server published it.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { GREEN, RED, AMBER, SLATE, plural } from '../../resultsMeta';
import {
  ResultScreen,
  ExamPicker,
  Card,
  StatGrid,
  ProblemStrip,
  useResult,
  useExamPicker,
  useAction,
} from '../../resultsUi';

export default function ResultsPublish() {
  const picker = useExamPicker();
  const { examId, setExamId } = picker;
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(
    () => examcellApi.resultBlock('PUBLISH', examId),
    [examId],
  );
  const action = useAction(reload);

  const slots = data?.slots ?? [];
  const items = data?.items ?? [];
  const ready = slots.filter((x) => x.ready);
  const publishedCount = slots.reduce((a, x) => a + (x.counts.PUBLISHED ?? 0), 0);

  const publish = (slotId) => action.run(() => examcellApi.publishResults(slotId));

  return (
    <ResultScreen
      title="Result publication"
      subtitle="Approved rows only, gated on every paper being marked."
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
              { id: 'approved', label: 'Approved', value: items.length, icon: 'checkbox', color: '#4f46e5' },
              { id: 'ready', label: 'Slots ready', value: ready.length, icon: 'checkmark-circle', color: GREEN },
              { id: 'blocked', label: 'Blocked', value: slots.length - ready.length, icon: 'lock-closed', color: slots.length - ready.length ? RED : SLATE },
              { id: 'live', label: 'Live now', value: publishedCount, icon: 'megaphone', color: AMBER },
            ]}
          />
          <ProblemStrip problem={action.problem} />
        </>
      }
    >
      {slots.map((slot) => (
        <Card key={slot.slotId} style={s.card}>
          <View style={s.headRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.subName}>{slot.subject}</Text>
              <Text style={s.subMeta}>
                {slot.code} · {new Date(slot.date).toLocaleDateString()} · {slot.counts.APPROVED ?? 0} approved
                {(slot.counts.PUBLISHED ?? 0) > 0 ? ` · ${slot.counts.PUBLISHED} live` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[s.btn, (!slot.ready || action.busy) && s.btnOff]}
              disabled={!slot.ready || action.busy}
              onPress={() => publish(slot.slotId)}
              activeOpacity={0.75}
            >
              <Ionicons name="megaphone" size={14} color="#fff" />
              <Text style={s.btnText}>{action.busy ? 'Publishing…' : 'Publish'}</Text>
            </TouchableOpacity>
          </View>

          {/* The reasons, named — never a bare disabled button. */}
          {slot.blockers.map((reason) => (
            <View key={reason} style={s.blocker}>
              <Ionicons name="lock-closed" size={12} color={RED} />
              <Text style={s.blockerText}>{reason}</Text>
            </View>
          ))}
          {slot.ready && (
            <View style={[s.blocker, s.readyRow]}>
              <Ionicons name="checkmark-circle" size={12} color={GREEN} />
              <Text style={[s.blockerText, { color: '#065f46' }]}>Every paper marked, every row approved — clear to publish.</Text>
            </View>
          )}
        </Card>
      ))}

      {!slots.length && (
        <View style={s.empty}>
          <Ionicons name="megaphone-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>No slots to publish</Text>
          <Text style={s.emptyBody}>Results reach this screen after approval — consolidate, verify and approve first.</Text>
        </View>
      )}

      {items.length > 0 && (
        <Text style={s.foot}>
          {plural(items.length, 'row')} approved and waiting · publishing flips COMPLETED exams to RESULTS_PUBLISHED
        </Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  card: { padding: 14 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  subMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: AMBER, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  btnOff: { backgroundColor: '#94a3b8' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  blocker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  readyRow: { backgroundColor: `${GREEN}0D`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  blockerText: { flex: 1, fontSize: 11, color: RED, fontFamily: 'Manrope-SemiBold' },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
