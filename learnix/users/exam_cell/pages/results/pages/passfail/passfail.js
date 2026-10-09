// X-06 — PASS/FAIL: who cleared, who failed, the backlog list per subject
// (docs/users/05 §3.4).
//
// `isPass` shown here is the row's, and the row's came from `gradeFor()` —
// F is the ONLY failing grade, so pass rate and backlog list can never
// disagree with the grade scale on the Grades screen. If they ever appear
// to, one of the two is a stale read, not a second opinion.
//
// The backlog list is sorted by subject with the most failures first, because
// that is the order a controller acts in: one subject at a time, worst first.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { GREEN, RED, AMBER, SLATE, gradeColor, plural } from '../../resultsMeta';
import { ResultScreen, ExamPicker, Card, Chip, Avatar, StatGrid, Progress, useResult, useExamPicker } from '../../resultsUi';

export default function ResultsPassFail() {
  const picker = useExamPicker();
  const { examId, setExamId } = picker;
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(
    () => examcellApi.resultBlock('PASSFAIL', examId),
    [examId],
  );

  const totals = data?.totals;
  const subjects = data?.subjects ?? [];
  const backlogs = data?.backlogs ?? [];

  return (
    <ResultScreen
      title="Pass / fail processing"
      subtitle="Who cleared, who failed, and the backlog list per subject."
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
              { id: 'results', label: 'Results', value: totals?.results ?? 0, icon: 'document-text-outline', color: '#2563eb' },
              { id: 'passed', label: 'Cleared', value: totals?.passed ?? 0, icon: 'checkmark-circle', color: GREEN },
              { id: 'failed', label: 'Failed', value: totals?.failed ?? 0, icon: 'close-circle', color: RED },
              { id: 'rate', label: 'Pass %', value: `${totals?.passPercent ?? 0}%`, icon: 'percent', color: AMBER },
            ]}
          />
        </>
      }
    >
      {/* ── Per-subject spread, worst first ── */}
      {subjects.map((sub) => (
        <Card key={sub.code} style={s.subRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.subName}>{sub.subject}</Text>
            <Text style={s.subMeta}>
              {sub.code} · {sub.passed}/{sub.total} cleared
            </Text>
            <View style={s.prog}>
              <Progress percent={sub.total > 0 ? Math.round((sub.passed / sub.total) * 100) : 0} color={sub.failed > 0 ? AMBER : GREEN} />
            </View>
          </View>
          <Chip label={sub.failed > 0 ? plural(sub.failed, 'backlog') : 'all clear'} color={sub.failed > 0 ? RED : GREEN} />
        </Card>
      ))}

      {/* ── The backlog list ── */}
      {backlogs.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Backlogs ({backlogs.length})</Text>
          {backlogs.map((b) => (
            <Card key={b.id} style={s.row}>
              <Avatar name={b.student} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{b.student}</Text>
                <Text style={s.meta}>
                  {b.rollNo} · {b.subject} ({b.code})
                </Text>
                <Text style={s.marks}>
                  {b.marksObtained}/{b.maxMarks} · {b.percent}%
                </Text>
              </View>
              <View style={s.right}>
                <View style={[s.gradeBadge, { backgroundColor: `${gradeColor(b.grade)}1A` }]}>
                  <Text style={[s.gradeText, { color: gradeColor(b.grade) }]}>{b.grade}</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {!totals?.results && (
        <View style={s.empty}>
          <Ionicons name="account-check-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>No results yet</Text>
          <Text style={s.emptyBody}>Pass/fail derives from consolidated rows — consolidate a slot first.</Text>
        </View>
      )}

      {!!totals?.results && backlogs.length === 0 && (
        <View style={s.empty}>
          <Ionicons name="checkmark-circle" size={26} color={GREEN} />
          <Text style={s.emptyTitle}>Everyone cleared</Text>
          <Text style={s.emptyBody}>No backlogs on this exam.</Text>
        </View>
      )}

      {backlogs.length > 0 && (
        <Text style={s.foot}>{plural(backlogs.length, 'backlog')} · F is the only failing band, pass from 40%</Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  subMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  prog: { marginTop: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  marks: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 1 },
  right: { alignItems: 'flex-end' },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, minWidth: 42, alignItems: 'center' },
  gradeText: { fontSize: 14, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
