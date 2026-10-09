// X-05 — REVALUATION: what students asked to have re-checked
// (docs/users/05 §3.3, requirement 11).
//
// Lifecycle: REQUESTED → APPROVED | REJECTED → COMPLETED (docs 05-state-machines
// §2.4). Only a REQUESTED row gets decision buttons — the server refuses the
// rest, so the button is simply not drawn. The decision goes through the
// existing `/examcell/re-evaluations/:id/decide` route, which is the same one
// the results screen uses; there is deliberately no second decide endpoint.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { REVALUATION_STATUS_META, THEME, AMBER, GREEN, RED, SLATE, plural } from '../../evaluationMeta';
import {
  EvaluationScreen, Card, Chip, Avatar, ProblemStrip, EmptyNote, StatGrid,
  useEvaluation, useAction,
} from '../../evaluationUi';

export default function EvaluationsRevaluation() {
  const { data, loading, refreshing, error, reload, onRefresh } = useEvaluation(() =>
    examcellApi.evaluationBlock('REVALUATION'),
  );
  const action = useAction(reload);

  const items = data?.items ?? [];
  const counts = data?.counts ?? {};
  const open = data?.open ?? counts.REQUESTED ?? 0;
  const decided = items.filter((i) => i.status !== 'REQUESTED');
  const requested = items.filter((i) => i.status === 'REQUESTED');

  const decide = (id, decision) => action.run(() => examcellApi.decideReevaluation(id, decision));

  const Row = ({ it }) => {
    const meta = REVALUATION_STATUS_META[it.status] || REVALUATION_STATUS_META.REQUESTED;
    const canDecide = it.status === 'REQUESTED';
    return (
      <Card>
        <View style={s.row}>
          <Avatar name={it.student} />
          <View style={{ flex: 1 }}>
            <Text style={s.student}>{it.student}</Text>
            <Text style={s.meta}>{it.rollNo} · {it.code} · {it.exam}</Text>
          </View>
          <Chip label={meta.label} color={meta.color} />
        </View>

        <Text style={s.subject}>{it.subject}</Text>
        {it.reason ? (
          <View style={s.reason}>
            <Ionicons name="chatbox-ellipses-outline" size={13} color={SLATE} />
            <Text style={s.reasonText}>{it.reason}</Text>
          </View>
        ) : null}
        <Text style={s.marks}>
          Current marks: {it.marks ?? '—'}{it.maxMarks ? ` / ${it.maxMarks}` : ''}
        </Text>

        {canDecide && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.approve]} activeOpacity={0.75} disabled={action.busy} onPress={() => decide(it.id, 'APPROVED')}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
              <Text style={s.btnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.reject]} activeOpacity={0.75} disabled={action.busy} onPress={() => decide(it.id, 'REJECTED')}>
              <Ionicons name="close-circle-outline" size={15} color="#fff" />
              <Text style={s.btnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        {!canDecide && it.status === 'APPROVED' && (
          <Text style={s.hint}>Approved — marks will be re-checked and the result completed.</Text>
        )}
      </Card>
    );
  };

  return (
    <EvaluationScreen
      title="Revaluation requests"
      subtitle="What students asked to have re-checked, and what was decided."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <ProblemStrip problem={action.problem} />

      <StatGrid
        items={[
          { label: 'Awaiting decision', value: open, color: THEME },
          { label: 'Approved', value: counts.APPROVED ?? 0, color: AMBER },
          { label: 'Rejected', value: counts.REJECTED ?? 0, color: RED },
          { label: 'Completed', value: counts.COMPLETED ?? 0, color: GREEN },
        ]}
      />

      {requested.length > 0 && (
        <>
          <Text style={s.section}>Awaiting your decision ({requested.length})</Text>
          {requested.map((it) => <Row key={it.id} it={it} />)}
        </>
      )}

      {decided.length > 0 && (
        <>
          <Text style={s.section}>Already decided ({decided.length})</Text>
          {decided.map((it) => <Row key={it.id} it={it} />)}
        </>
      )}

      {!items.length && <EmptyNote>No revaluation requests yet.</EmptyNote>}
      {items.length > 0 && (
        <Text style={s.foot}>{plural(items.length, 'request')} in total</Text>
      )}
    </EvaluationScreen>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  student: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  subject: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-SemiBold', marginTop: 10 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 9, marginTop: 8 },
  reasonText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Regular', lineHeight: 16 },
  marks: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 14, flex: 1 },
  approve: { backgroundColor: '#059669' },
  reject: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Manrope-Bold' },
  hint: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 8 },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
