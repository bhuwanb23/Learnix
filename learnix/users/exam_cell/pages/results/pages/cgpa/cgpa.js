// X-06 — CGPA: credit-weighted SGPA per exam, running CGPA per student
// (docs/users/05 §3.4).
//
// Both numbers come from the server's `weightedGpa()` — credit-weighted
// average of grade points, 2 dp — because two screens printing different
// GPAs for the same rows is exactly how a transcript loses trust. The scale
// beside each figure is the same table the grades screen shows.
//
// SGPA is this exam only (what the controller is about to publish); CGPA
// runs across every result the student has in this institution, so a student
// mid-backlog sees the backlog pull the average down rather than vanish from
// it.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { GREEN, SLATE, CYAN, gradeColor, plural } from '../../resultsMeta';
import { ResultScreen, ExamPicker, Card, Avatar, Chip, StatGrid, useResult, useExamPicker } from '../../resultsUi';

export default function ResultsCgpa() {
  const picker = useExamPicker();
  const { examId, setExamId } = picker;
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(
    () => examcellApi.resultBlock('CGPA', examId),
    [examId],
  );

  const items = data?.items ?? [];
  const sgpas = items.map((i) => i.sgpa).filter((v) => typeof v === 'number');
  const avgSgpa = sgpas.length ? Math.round((sgpas.reduce((a, b) => a + b, 0) / sgpas.length) * 100) / 100 : null;
  const top = sgpas.length ? Math.max(...sgpas) : null;
  const cgpas = items.map((i) => i.cgpa).filter((v) => typeof v === 'number');
  const avgCgpa = cgpas.length ? Math.round((cgpas.reduce((a, b) => a + b, 0) / cgpas.length) * 100) / 100 : null;

  return (
    <ResultScreen
      title="SGPA / CGPA"
      subtitle="Credit-weighted averages of the published grade points — same function the server prints."
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
              { id: 'students', label: 'Students', value: items.length, icon: 'people-outline', color: CYAN },
              { id: 'avg', label: 'Avg SGPA', value: avgSgpa === null ? '—' : avgSgpa, icon: 'calculator-outline', color: '#2563eb' },
              { id: 'top', label: 'Top SGPA', value: top === null ? '—' : top, icon: 'trophy-outline', color: GREEN },
              { id: 'cgpa', label: 'Avg CGPA', value: avgCgpa === null ? '—' : avgCgpa, icon: 'trending-up-outline', color: CYAN },
            ]}
          />
        </>
      }
    >
      {items.map((stu) => (
        <Card key={stu.studentProfileId} style={s.row}>
          <Avatar name={stu.student} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{stu.student}</Text>
            <Text style={s.meta}>
              {stu.rollNo} · {plural(stu.subjects, 'subject')} · {stu.credits} credits
            </Text>
            <View style={s.tags}>
              <Chip label={`SGPA ${stu.sgpa === null ? '—' : stu.sgpa}`} color="#2563eb" />
              <Chip label={`CGPA ${stu.cgpa === null ? '—' : stu.cgpa}`} color={CYAN} />
              <Chip label={`${stu.lifetimeResults} results on record`} color={SLATE} />
            </View>
          </View>
          <View style={s.gpaBox}>
            <Text style={[s.gpaValue, { color: gradeColor(stu.sgpa >= 7 ? 'A' : stu.sgpa >= 5 ? 'C' : 'F') }]}>
              {stu.sgpa === null ? '—' : stu.sgpa}
            </Text>
            <Text style={s.gpaLabel}>SGPA</Text>
          </View>
        </Card>
      ))}

      {!items.length && (
        <View style={s.empty}>
          <Ionicons name="calculator-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>No results to average</Text>
          <Text style={s.emptyBody}>Consolidate a slot first — GPs derive from graded rows.</Text>
        </View>
      )}

      {items.length > 0 && (
        <Text style={s.foot}>
          {plural(items.length, 'student')} · SGPA is this exam, CGPA runs across every result on record
        </Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  gpaBox: { alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#eef2f7', paddingHorizontal: 10, paddingVertical: 8, minWidth: 58 },
  gpaValue: { fontSize: 16, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  gpaLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 1 },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
