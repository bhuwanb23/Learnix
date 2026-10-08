// X-05 — SCRIPTS: answer-script custody, one subject at a time
// (docs/users/05 §3.3, requirement 1).
//
// The custody chain is NOT_RECEIVED → RECEIVED → VERIFIED and the server
// refuses any other move (422 with `allowed`), so this screen only offers the
// move the server would accept — a button the server would refuse is not
// drawn, rather than drawn and disappointing.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { SCRIPT_STATUS_META, plural } from '../../evaluationMeta';
import {
  EvaluationScreen, ExamPicker, Card, Chip, Avatar, ProblemStrip, EmptyNote,
  useEvaluation, useExamPicker, useAction,
} from '../../evaluationUi';

export default function EvaluationsScripts() {
  const picker = useExamPicker();
  const { data, loading, refreshing, error, reload, onRefresh } = useEvaluation(
    () => examcellApi.evaluationBlock('SCRIPTS', picker.examId),
    [picker.examId],
  );
  const action = useAction(reload);

  const papers = data?.papers ?? [];
  const counts = data?.counts ?? {};

  // Next legal move per paper — mirrored from rules.SCRIPT_TRANSITIONS.
  const nextMove = (status) => (status === 'NOT_RECEIVED' ? 'RECEIVED' : status === 'RECEIVED' ? 'VERIFIED' : null);

  const receiveAll = async () => {
    // one request per subject that still has papers waiting
    const waiting = new Set(
      papers.filter((p) => p.scriptStatus === 'NOT_RECEIVED').map((p) => p.evaluationId),
    );
    for (const id of waiting) await examcellApi.receiveScripts(id);
  };

  const move = (paper) => {
    const to = nextMove(paper.scriptStatus);
    if (!to) return;
    action.run(() => examcellApi.moveScript(paper.id, to));
  };

  return (
    <EvaluationScreen
      title="Answer scripts"
      subtitle="Custody of every paper: received, verified, still missing."
      loading={loading || picker.loading}
      refreshing={refreshing}
      error={error ?? picker.error}
      onRetry={() => { picker.reload(); reload(); }}
      onRefresh={onRefresh}
      header={
        <ExamPicker exams={picker.exams} examId={picker.examId} onChange={picker.setExamId} loading={picker.loading} error={picker.error} />
      }
    >
      <ProblemStrip problem={action.problem} />

      <View style={s.countRow}>
        {['NOT_RECEIVED', 'RECEIVED', 'VERIFIED'].map((k) => {
          const meta = SCRIPT_STATUS_META[k];
          return (
            <View key={k} style={[s.countCell, { backgroundColor: `${meta.color}10` }]}>
              <Text style={[s.countValue, { color: meta.color }]}>{counts[k] ?? 0}</Text>
              <Text style={s.countLabel}>{meta.label}</Text>
            </View>
          );
        })}
      </View>

      {counts.NOT_RECEIVED > 0 && (
        <TouchableOpacity style={s.receiveAll} activeOpacity={0.8} onPress={() => action.run(receiveAll)}>
          <Ionicons name="download-outline" size={15} color="#fff" />
          <Text style={s.receiveAllText}>Mark all waiting as received</Text>
        </TouchableOpacity>
      )}

      {papers.map((p) => {
        const meta = SCRIPT_STATUS_META[p.scriptStatus] || SCRIPT_STATUS_META.NOT_RECEIVED;
        const to = nextMove(p.scriptStatus);
        return (
          <Card key={p.id} style={s.paper}>
            <Avatar name={p.student} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{p.student}</Text>
              <Text style={s.meta}>{p.rollNo} · {p.subject}</Text>
            </View>
            <Chip label={meta.label} color={meta.color} />
            {to && (
              <TouchableOpacity style={s.moveBtn} activeOpacity={0.75} onPress={() => move(p)} disabled={action.busy}>
                <Ionicons name={to === 'RECEIVED' ? 'arrow-down-circle-outline' : 'shield-checkmark-outline'} size={16} color="#2563eb" />
              </TouchableOpacity>
            )}
          </Card>
        );
      })}

      {!papers.length && <EmptyNote>No papers for this exam yet.</EmptyNote>}
      {papers.length > 0 && (
        <Text style={s.foot}>{plural(papers.length, 'paper')} in custody for this exam.</Text>
      )}
    </EvaluationScreen>
  );
}

const s = StyleSheet.create({
  countRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  countCell: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  countValue: { fontSize: 17, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  countLabel: { fontSize: 9, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  receiveAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 11, marginBottom: 12 },
  receiveAllText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Manrope-Bold' },
  paper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  moveBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#2563eb14', justifyContent: 'center', alignItems: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
