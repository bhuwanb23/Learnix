// X-06 — GRADES: the published scale against every result
// (docs/users/05 §3.4).
//
// This screen is where the grade scale becomes visible to the person who has
// to defend it: the table at the top is THE scale (the same one the server
// derives from), and every row below shows its percentage and band against
// it.
//
// THE DRIFT COUNTER IS THE POINT. Each row carries `drift: true` when the
// stored grade disagrees with what the scale says — possible only for rows
// written before this feature (the old `enterResult` accepted a grade from
// the client). A non-zero count means re-derive those rows; it is shown in
// red rather than hidden, because a marksheet printed from a drifted row
// would be wrong and nobody would know why.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { GRADE_SCALE, PASS_PERCENT, RED, GREEN, SLATE, gradeColor, plural } from '../../resultsMeta';
import { ResultScreen, ExamPicker, Card, Chip, Avatar, StatGrid, useResult, useExamPicker } from '../../resultsUi';

export default function ResultsGrades() {
  const picker = useExamPicker();
  const { examId, setExamId } = picker;
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(
    () => examcellApi.resultBlock('GRADES', examId),
    [examId],
  );

  const items = data?.items ?? [];
  const distribution = data?.distribution ?? {};
  const driftCount = data?.driftCount ?? 0;

  return (
    <ResultScreen
      title="Grade calculation"
      subtitle="One scale, applied to every row — percentage first, band second, pass follows."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <>
          <ExamPicker exams={picker.exams} examId={examId} onChange={setExamId} loading={picker.loading} error={picker.error} />

          {/* ── THE scale ── */}
          <Card style={s.scaleCard}>
            <Text style={s.scaleTitle}>Published scale (pass from {PASS_PERCENT}%)</Text>
            <View style={s.scaleGrid}>
              {GRADE_SCALE.map((band) => (
                <View key={band.grade} style={s.scaleCell}>
                  <Text style={[s.scaleGrade, { color: gradeColor(band.grade) }]}>{band.grade}</Text>
                  <Text style={s.scaleMin}>{band.min}%+</Text>
                  <Text style={s.scalePoints}>{band.points} pts</Text>
                  <Text style={s.scaleCount}>{distribution[band.grade] ?? 0}</Text>
                </View>
              ))}
            </View>
          </Card>

          <StatGrid
            items={[
              { id: 'rows', label: 'Results', value: items.length, icon: 'document-text-outline', color: '#2563eb' },
              { id: 'pass', label: 'Pass bands', value: items.filter((i) => i.isPass).length, icon: 'happy-outline', color: GREEN },
              { id: 'fail', label: 'Failed (F)', value: items.filter((i) => !i.isPass).length, icon: 'sad-outline', color: RED },
              { id: 'drift', label: 'Drifted', value: driftCount, icon: 'alert-circle-outline', color: driftCount > 0 ? RED : SLATE },
            ]}
          />

          {driftCount > 0 && (
            <View style={s.drift}>
              <Ionicons name="warning" size={14} color={RED} />
              <Text style={s.driftText}>
                {plural(driftCount, 'row')} stored a grade the scale disagrees with — re-derive before printing a
                marksheet.
              </Text>
            </View>
          )}
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
              {r.marksObtained}/{r.maxMarks} · {r.percent}%
            </Text>
          </View>
          <View style={s.right}>
            <View style={[s.gradeBadge, { backgroundColor: `${gradeColor(r.grade)}1A` }]}>
              <Text style={[s.gradeText, { color: gradeColor(r.grade) }]}>{r.grade}</Text>
            </View>
            {r.drift ? <Chip label="drift" color={RED} /> : <Chip label={r.status} color={SLATE} />}
          </View>
        </Card>
      ))}

      {!items.length && (
        <View style={s.empty}>
          <Ionicons name="ribbon-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>No results to grade</Text>
          <Text style={s.emptyBody}>Consolidate a slot first — grades derive from marks, never from a form.</Text>
        </View>
      )}

      {items.length > 0 && (
        <Text style={s.foot}>{plural(items.length, 'row')} · band from percentage, pass follows the band</Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  scaleCard: { padding: 12 },
  scaleTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  scaleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleCell: { alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#eef2f7', paddingVertical: 8, paddingHorizontal: 6, minWidth: 44 },
  scaleGrade: { fontSize: 13, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  scaleMin: { fontSize: 9, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  scalePoints: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  scaleCount: { fontSize: 11, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold', marginTop: 3 },
  drift: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${RED}0D`, borderWidth: 1, borderColor: `${RED}33`, borderRadius: 10, padding: 10, marginBottom: 12 },
  driftText: { flex: 1, fontSize: 12, color: RED, fontFamily: 'Manrope-SemiBold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  marks: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 6 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, minWidth: 42, alignItems: 'center' },
  gradeText: { fontSize: 14, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
