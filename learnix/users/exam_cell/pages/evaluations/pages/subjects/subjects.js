// X-05 — SUBJECTS: the subject-wise evaluation queue
// (docs/users/05 §3.3, requirement 3).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { EVALUATION_STATUS_META, MODERATION_STATUS_META, AMBER, GREEN, RED, plural } from '../../evaluationMeta';
import { EvaluationScreen, ExamPicker, Card, Chip, Progress, EmptyNote, useEvaluation, useExamPicker } from '../../evaluationUi';

export default function EvaluationsSubjects() {
  const picker = useExamPicker();
  const { data, loading, refreshing, error, reload, onRefresh } = useEvaluation(
    () => examcellApi.evaluationBlock('SUBJECTS', picker.examId),
    [picker.examId],
  );

  const items = data?.items ?? [];

  return (
    <EvaluationScreen
      title="Subject-wise evaluation"
      subtitle="Every subject with its paper counts, marks and status."
      loading={loading || picker.loading}
      refreshing={refreshing}
      error={error ?? picker.error}
      onRetry={() => { picker.reload(); reload(); }}
      onRefresh={onRefresh}
      header={
        <ExamPicker exams={picker.exams} examId={picker.examId} onChange={picker.setExamId} loading={picker.loading} error={picker.error} />
      }
    >
      {items.map((it) => {
        const st = EVALUATION_STATUS_META[it.status] || EVALUATION_STATUS_META.PENDING;
        const mo = MODERATION_STATUS_META[it.moderationStatus] || MODERATION_STATUS_META.NOT_REQUESTED;
        const pct = it.totalPapers > 0 ? Math.round((it.marked / it.totalPapers) * 100) : 0;
        const bar = pct === 100 ? GREEN : pct >= 50 ? AMBER : RED;
        return (
          <Card key={it.id}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.subject}>{it.subject}</Text>
                <Text style={s.meta}>{it.code} · {it.exam}</Text>
              </View>
              <Chip label={st.label} color={st.color} />
            </View>
            <View style={s.progressRow}>
              <Progress percent={pct} color={bar} />
              <Text style={[s.pct, { color: bar }]}>{pct}%</Text>
            </View>
            <View style={s.footer}>
              <Text style={s.counts}>
                {it.marked}/{it.totalPapers} marked{it.missing > 0 ? ` · ${plural(it.missing, 'paper')} missing` : ''}
              </Text>
              {it.moderationStatus !== 'NOT_REQUESTED' && (
                <Chip label={mo.label} color={mo.color} />
              )}
            </View>
          </Card>
        );
      })}

      {!items.length && (
        <View style={s.empty}>
          <Ionicons name="library-outline" size={24} color="#94a3b8" />
          <Text style={s.emptyText}>No subjects under evaluation for this exam.</Text>
        </View>
      )}
    </EvaluationScreen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subject: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  pct: { fontSize: 12, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', width: 42, textAlign: 'right' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  counts: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },
  empty: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center' },
});
