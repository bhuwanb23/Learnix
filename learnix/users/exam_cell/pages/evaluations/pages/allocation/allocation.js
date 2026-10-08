// X-05 — ALLOCATION: who marks which subject, and what nobody took
// (docs/users/05 §3.3, requirement 2).
//
// The evaluator id comes from the client, so the SERVER re-checks that the
// user is a teacher or HOD OF THIS INSTITUTION (422 otherwise). That check is
// the whole reason this screen's selector only ever offers this college's
// staff: the list below is what the catalogue reports, not what the client
// guessed.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { EVALUATION_STATUS_META, plural } from '../../evaluationMeta';
import {
  EvaluationScreen, ExamPicker, Card, Chip, ProblemStrip, EmptyNote,
  useEvaluation, useExamPicker, useAction,
} from '../../evaluationUi';

export default function EvaluationsAllocation() {
  const picker = useExamPicker();
  const { data, loading, refreshing, error, reload, onRefresh } = useEvaluation(
    () => examcellApi.evaluationBlock('ALLOCATION', picker.examId),
    [picker.examId],
  );
  const action = useAction(reload);

  const rows = data?.evaluations ?? [];
  const evaluators = data?.evaluators ?? [];

  // Inline pick: tapping an unassigned subject reveals the staff list for it.
  // Kept as local state via a simple prompt-free pattern: the first tap opens
  // the subject, each evaluator chip then allocates.
  const [open, setOpen] = React.useState(null);

  return (
    <EvaluationScreen
      title="Evaluator allocation"
      subtitle="Assign this institution's teaching staff to each subject."
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

      {data?.unassigned > 0 && (
        <View style={s.warn}>
          <Ionicons name="help-circle-outline" size={15} color="#b45309" />
          <Text style={s.warnText}>{plural(data.unassigned, 'subject')} still has no evaluator.</Text>
        </View>
      )}

      {rows.map((row) => {
        const st = EVALUATION_STATUS_META[row.status] || EVALUATION_STATUS_META.PENDING;
        const isOpen = open === row.id;
        const assigned = evaluators.find((e) => e.id === row.evaluatorUserId);
        return (
          <Card key={row.id}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.subject}>{row.subject}</Text>
                <Text style={s.meta}>{row.code} · {row.exam} · {plural(row.papers, 'paper')}</Text>
              </View>
              <Chip label={st.label} color={st.color} />
            </View>

            <View style={s.assignee}>
              <Ionicons name="person-outline" size={13} color={assigned ? '#7c3aed' : '#dc2626'} />
              <Text style={[s.assigneeText, !assigned && s.assigneeMissing]}>
                {assigned ? assigned.name : 'No evaluator yet'}
              </Text>
              <TouchableOpacity
                style={s.changeBtn}
                activeOpacity={0.75}
                onPress={() => setOpen(isOpen ? null : row.id)}
              >
                <Text style={s.changeText}>{isOpen ? 'Close' : assigned ? 'Reassign' : 'Assign'}</Text>
              </TouchableOpacity>
            </View>

            {isOpen && (
              <View style={s.staffList}>
                {evaluators.map((ev) => (
                  <TouchableOpacity
                    key={ev.id}
                    style={[s.staffChip, ev.id === row.evaluatorUserId && s.staffChipActive]}
                    activeOpacity={0.75}
                    disabled={action.busy}
                    onPress={() =>
                      action.run(async () => {
                        await examcellApi.allocateEvaluator(row.id, ev.id);
                        setOpen(null);
                      })
                    }
                  >
                    <Text style={[s.staffName, ev.id === row.evaluatorUserId && s.staffNameActive]}>{ev.name}</Text>
                    <Text style={s.staffLoad}>{plural(ev.load, 'subject')} assigned</Text>
                  </TouchableOpacity>
                ))}
                {!evaluators.length && <Text style={s.noStaff}>No teaching staff in this institution yet.</Text>}
              </View>
            )}
          </Card>
        );
      })}

      {!rows.length && <EmptyNote>No subjects to allocate for this exam.</EmptyNote>}
    </EvaluationScreen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subject: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#b4530912', borderWidth: 1, borderColor: '#b4530940', borderRadius: 10, padding: 10, marginBottom: 12 },
  warnText: { flex: 1, fontSize: 12, color: '#b45309', fontFamily: 'Manrope-SemiBold' },
  assignee: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  assigneeText: { flex: 1, fontSize: 12, color: '#334155', fontFamily: 'Manrope-SemiBold' },
  assigneeMissing: { color: '#dc2626' },
  changeBtn: { backgroundColor: '#2563eb14', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  changeText: { fontSize: 11, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },
  staffList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  staffChip: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  staffChipActive: { borderColor: '#7c3aed', backgroundColor: '#7c3aed10' },
  staffName: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  staffNameActive: { color: '#7c3aed' },
  staffLoad: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  noStaff: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
});
