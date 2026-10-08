// X-05 — PROGRESS: the season's marking progress, worst subject first
// (docs/users/05 §3.3, requirement 10).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { THEME, AMBER, GREEN, RED, EVALUATION_STATUS_META, MODERATION_STATUS_META } from '../../evaluationMeta';
import { EvaluationScreen, Card, Chip, Progress, StatGrid, useEvaluation } from '../../evaluationUi';

export default function EvaluationsProgress() {
  const { data, loading, refreshing, error, reload, onRefresh } = useEvaluation(() =>
    examcellApi.evaluationBlock('PROGRESS'),
  );

  const items = data?.items ?? [];
  // Worst first: the subject the controller can unblock sits at the top.
  const sorted = [...items].sort((a, b) => a.percent - b.percent);

  return (
    <EvaluationScreen
      title="Evaluation progress"
      subtitle="How much of the season is marked — lowest first."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <StatGrid
        items={[
          { id: 'pct', label: 'Marked', value: `${data?.percent ?? 0}%`, icon: 'pie-chart', color: THEME },
          { id: 'marked', label: 'Papers marked', value: data?.marked ?? 0, icon: 'checkmark-circle', color: GREEN },
          { id: 'total', label: 'Total papers', value: data?.total ?? 0, icon: 'document-text', color: AMBER },
          { id: 'subjects', label: 'Subjects', value: items.length, icon: 'library', color: RED },
        ]}
      />

      {sorted.map((it) => {
        const st = EVALUATION_STATUS_META[it.status] || EVALUATION_STATUS_META.PENDING;
        const mo = MODERATION_STATUS_META[it.moderationStatus] || MODERATION_STATUS_META.NOT_REQUESTED;
        const bar = it.percent === 100 ? GREEN : it.percent >= 50 ? AMBER : RED;
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
              <Progress percent={it.percent} color={bar} />
              <Text style={[s.pct, { color: bar }]}>{it.percent}%</Text>
            </View>
            <Text style={s.counts}>
              {it.marked} of {it.total} papers marked
              {it.moderationStatus !== 'NOT_REQUESTED' ? ` · ${mo.label}` : ''}
            </Text>
          </Card>
        );
      })}

      {!items.length && (
        <View style={s.empty}>
          <Ionicons name="documents-outline" size={24} color="#94a3b8" />
          <Text style={s.emptyText}>No evaluations open yet — they appear once the timetable has slots.</Text>
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
  counts: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 6 },
  empty: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center' },
});
