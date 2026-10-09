// X-06 — CONSOLIDATE: marked papers → result rows (docs/users/05 §3.4).
//
// The lever that starts the pipeline. Two things this screen must not do:
//
//   1. IT NEVER SHOWS A GRADE THE SERVER DID NOT DERIVE. There is no form
//      here — no marks field, no grade picker, no pass checkbox. The old
//      `POST /examcell/results` had all three and the screen decided who
//      passed; the replacement reads the papers and derives grade/percent/
//      isPass in `result.rules.ts`.
//
//   2. A FAILED LOAD SHOWS AS FAILED. If this screen rendered an empty list
//      on error, a controller would conclude there is nothing to consolidate
//      and go publish elsewhere — so the shell's error panel takes over.
//
// Re-running consolidate is safe and expected: rows still in DRAFT are
// refreshed from the papers (marks may have been re-entered), rows past DRAFT
// are skipped and the count says so — a verified result is never silently
// rewritten by pulling the first lever again.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { THEME, AMBER, GREEN, SLATE, plural } from '../../resultsMeta';
import {
  ResultScreen,
  ExamPicker,
  Card,
  Chip,
  StatGrid,
  ProblemStrip,
  useResult,
  useExamPicker,
  useAction,
} from '../../resultsUi';

export default function ResultsConsolidate() {
  const picker = useExamPicker();
  const { examId, setExamId } = picker;
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(
    () => examcellApi.resultBlock('CONSOLIDATE', examId),
    [examId],
  );
  const action = useAction(reload);
  const [lastRun, setLastRun] = useState(null);

  const items = data?.items ?? [];
  const totals = data?.totals;

  const consolidate = (slotId) =>
    action.run(async () => {
      const res = await examcellApi.consolidateResults(slotId);
      setLastRun(res);
    });

  return (
    <ResultScreen
      title="Marks consolidation"
      subtitle="Pull marked papers into result rows — grade and pass/fail derived, never typed."
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
              { id: 'slots', label: 'Slots', value: totals?.slots ?? 0, icon: 'layers-outline', color: THEME },
              { id: 'marked', label: 'Papers marked', value: totals?.marked ?? 0, icon: 'checkmark-done', color: GREEN },
              { id: 'rows', label: 'Result rows', value: totals?.results ?? 0, icon: 'document-text-outline', color: '#0891b2' },
              { id: 'pending', label: 'Not yet rows', value: totals?.pending ?? 0, icon: 'add-circle-outline', color: AMBER },
            ]}
          />
          <ProblemStrip problem={action.problem} />
        </>
      }
    >
      {lastRun ? (
        <View style={s.lastRun}>
          <Ionicons name="checkmark-circle" size={15} color={GREEN} />
          <Text style={s.lastRunText}>
            {lastRun.subject}: {plural(lastRun.created, 'row')} created
            {lastRun.refreshed > 0 ? `, ${lastRun.refreshed} refreshed` : ''}
            {lastRun.skipped > 0 ? `, ${lastRun.skipped} skipped (past DRAFT)` : ''}
          </Text>
        </View>
      ) : null}

      {items.map((slot) => (
        <Card key={slot.slotId} style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.subject}>{slot.subject}</Text>
            <Text style={s.meta}>
              {slot.code} · {slot.exam} · {new Date(slot.date).toLocaleDateString()}
            </Text>
            <View style={s.tags}>
              <Chip label={`${slot.marked}/${slot.papers} marked`} color={slot.marked === slot.papers ? GREEN : AMBER} />
              <Chip label={`${slot.results} rows`} color="#0891b2" />
              {slot.pending > 0 && <Chip label={`${slot.pending} missing`} color={AMBER} />}
            </View>
          </View>
          <TouchableOpacity
            style={[s.btn, (!slot.canConsolidate || action.busy) && s.btnOff]}
            disabled={!slot.canConsolidate || action.busy}
            onPress={() => consolidate(slot.slotId)}
            activeOpacity={0.75}
          >
            <Ionicons name="git-merge" size={14} color="#fff" />
            <Text style={s.btnText}>{action.busy ? 'Working…' : 'Consolidate'}</Text>
          </TouchableOpacity>
        </Card>
      ))}

      {!items.length && (
        <View style={s.empty}>
          <Ionicons name="git-merge-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>No exam slots yet</Text>
          <Text style={s.emptyBody}>Schedule an exam in the timetable, then mark its papers in Evaluations.</Text>
        </View>
      )}

      {items.length > 0 && (
        <Text style={s.foot}>
          Rows past DRAFT are skipped, never rewritten — a verified result changes only through verification or
          re-evaluation.
        </Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subject: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  btnOff: { backgroundColor: '#94a3b8' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  lastRun: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${GREEN}12`, borderWidth: 1, borderColor: `${GREEN}44`, borderRadius: 10, padding: 10, marginBottom: 12 },
  lastRunText: { flex: 1, fontSize: 12, color: '#065f46', fontFamily: 'Manrope-SemiBold' },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
