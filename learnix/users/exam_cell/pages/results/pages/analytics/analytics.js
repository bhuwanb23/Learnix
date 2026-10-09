// X-06 — ANALYTICS: pass rate, grade distribution, toppers, subject spread
// (docs/users/05 §3.4).
//
// Works with or without an exam: pick one for that exam's numbers, or leave
// the institution-wide view (no picker here — the block is one of the two
// that does not require an exam).
//
// Every figure is derived from the same rows and the same scale the Grades
// screen prints: the band counts sum to the total, pass + fail equals total,
// and the subject list is sorted worst-pass-rate first because that is the
// order anyone actually acts in.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { GREEN, RED, AMBER, SLATE, gradeColor, plural } from '../../resultsMeta';
import { ResultScreen, Card, Chip, Avatar, StatGrid, Progress, useResult } from '../../resultsUi';

export default function ResultsAnalytics() {
  const { data, loading, refreshing, error, reload, onRefresh } = useResult(() =>
    examcellApi.resultBlock('ANALYTICS'),
  );

  const totals = data?.totals;
  const distribution = data?.distribution ?? [];
  const toppers = data?.toppers ?? [];
  const subjects = data?.subjects ?? [];
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <ResultScreen
      title="Result analytics"
      subtitle="Pass rate, grade distribution, toppers and subject spread — institution-wide."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <StatGrid
          items={[
            { id: 'results', label: 'Results', value: totals?.results ?? 0, icon: 'document-text-outline', color: '#2563eb' },
            { id: 'pass', label: 'Pass %', value: `${totals?.passPercent ?? 0}%`, icon: 'trending-up', color: GREEN },
            { id: 'avg', label: 'Avg %', value: totals?.averagePercent ?? 0, icon: 'stats-chart', color: AMBER },
            { id: 'fail', label: 'Failed', value: totals?.failed ?? 0, icon: 'trending-down', color: RED },
          ]}
        />
      }
    >
      {/* ── Grade distribution ── */}
      <Card style={s.card}>
        <Text style={s.cardTitle}>Grade distribution</Text>
        {distribution.map((d) => (
          <View key={d.grade} style={s.distRow}>
            <Text style={[s.distGrade, { color: gradeColor(d.grade) }]}>{d.grade}</Text>
            <View style={s.distBar}>
              <View
                style={[
                  s.distFill,
                  { width: `${(d.count / maxCount) * 100}%`, backgroundColor: gradeColor(d.grade) },
                ]}
              />
            </View>
            <Text style={s.distCount}>{d.count}</Text>
          </View>
        ))}
        {distribution.length === 0 && <Text style={s.muted}>No graded rows yet.</Text>}
      </Card>

      {/* ── Toppers ── */}
      {toppers.length > 0 && (
        <Card style={s.card}>
          <Text style={s.cardTitle}>Top 10 by percentage</Text>
          {toppers.map((t, i) => (
            <View key={`${t.id}`} style={s.topRow}>
              <View style={[s.rank, i < 3 && s.rankTop]}>
                <Text style={[s.rankText, i < 3 && s.rankTextTop]}>{i + 1}</Text>
              </View>
              <Avatar name={t.student} size={30} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{t.student}</Text>
                <Text style={s.meta}>
                  {t.rollNo} · {t.subject} ({t.code})
                </Text>
              </View>
              <View style={s.right}>
                <Text style={s.pct}>{t.percent}%</Text>
                <Text style={[s.grade, { color: gradeColor(t.grade) }]}>{t.grade}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* ── Subject spread, worst pass-rate first ── */}
      <Card style={s.card}>
        <Text style={s.cardTitle}>Subject spread</Text>
        {subjects.map((sub) => (
          <View key={sub.code} style={s.subRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{sub.subject}</Text>
              <Text style={s.meta}>
                {sub.code} · {plural(sub.count, 'row')} · avg {sub.averagePercent}%
              </Text>
              <View style={s.prog}>
                <Progress percent={sub.passPercent} color={sub.passPercent >= 80 ? GREEN : sub.passPercent >= 50 ? AMBER : RED} />
              </View>
            </View>
            <Chip label={`${sub.passPercent}% pass`} color={sub.passPercent >= 80 ? GREEN : sub.passPercent >= 50 ? AMBER : RED} />
          </View>
        ))}
        {subjects.length === 0 && <Text style={s.muted}>No subjects with results yet.</Text>}
      </Card>

      {!totals?.results && (
        <View style={s.empty}>
          <Ionicons name="stats-chart-outline" size={26} color={SLATE} />
          <Text style={s.emptyTitle}>Nothing to chart yet</Text>
          <Text style={s.emptyBody}>Analytics appear once results are consolidated.</Text>
        </View>
      )}

      {totals?.results > 0 && (
        <Text style={s.foot}>
          {plural(totals.results, 'row')} in scope · bands and pass rate come from the published scale
        </Text>
      )}
    </ResultScreen>
  );
}

const s = StyleSheet.create({
  card: { padding: 14 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  distGrade: { width: 26, fontSize: 12, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  distBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#eef2f7', overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 4 },
  distCount: { width: 30, textAlign: 'right', fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rank: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  rankTop: { backgroundColor: '#fef3c7' },
  rankText: { fontSize: 10, fontWeight: '800', color: '#64748b', fontFamily: 'PlusJakartaSans-Bold' },
  rankTextTop: { color: '#b45309' },
  name: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  right: { alignItems: 'flex-end' },
  pct: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  grade: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  prog: { marginTop: 6 },
  muted: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  empty: { alignItems: 'center', padding: 26, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  emptyBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
