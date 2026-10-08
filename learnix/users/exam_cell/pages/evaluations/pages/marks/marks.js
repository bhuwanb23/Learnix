// X-05 — MARKS: internal + external entry, against the 40/60 bound
// (docs/users/05 §3.3, requirements 4 and 5).
//
// The bounds come from the catalogue's `marksPolicy` (mirrored in
// evaluationMeta as a fallback) — 0..40 internal, 0..60 external. The screen
// pre-validates so the controller hears about a 45 BEFORE the round trip, but
// the server validates too: a client that skips this check still cannot write
// out-of-bounds marks (422 with `allowed`).
//
// Moderation APPROVED locks the paper — the inputs are disabled rather than
// left live to fail, because a form that submits and then complains is a form
// that wasted the edit.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { MARKS_POLICY, GREEN, MUTED, isMarked } from '../../evaluationMeta';
import {
  EvaluationScreen, ExamPicker, Card, Chip, Avatar, ProblemStrip, EmptyNote,
  useEvaluation, useExamPicker, useAction,
} from '../../evaluationUi';

export default function EvaluationsMarks() {
  const picker = useExamPicker();
  const { data, loading, refreshing, error, reload, onRefresh } = useEvaluation(
    () => examcellApi.evaluationBlock('MARKS', picker.examId),
    [picker.examId],
  );
  const action = useAction(reload);
  const [drafts, setDrafts] = useState({}); // paperId -> { i, e }

  const policy = data?.policy || MARKS_POLICY;
  const evaluations = data?.evaluations ?? [];
  const lockedAll = evaluations.length > 0 && evaluations.every((e) => e.moderationStatus === 'APPROVED');

  const draftFor = (p) => drafts[p.id] || { i: p.internalMarks ?? '', e: p.externalMarks ?? '' };
  const setDraft = (id, key, value) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: value.replace(/[^0-9]/g, '') } }));

  const save = (paper) => {
    const d = draftFor(paper);
    const i = d.i === '' ? NaN : Number(d.i);
    const e = d.e === '' ? NaN : Number(d.e);
    if (!Number.isInteger(i) || i < 0 || i > policy.internalMax) {
      action.run(() => Promise.reject(new Error(`Internal marks must be 0..${policy.internalMax}`)));
      return;
    }
    if (!Number.isInteger(e) || e < 0 || e > policy.externalMax) {
      action.run(() => Promise.reject(new Error(`External marks must be 0..${policy.externalMax}`)));
      return;
    }
    action.run(async () => {
      await examcellApi.enterMarks(paper.id, i, e);
      setDrafts((d) => { const copy = { ...d }; delete copy[paper.id]; return copy; });
    });
  };

  return (
    <EvaluationScreen
      title="Marks entry"
      subtitle={`Internal 0..${policy.internalMax} + external 0..${policy.externalMax} = 100, per paper.`}
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
      {lockedAll && (
        <View style={s.locked}>
          <Ionicons name="lock-closed" size={14} color="#4f46e5" />
          <Text style={s.lockedText}>Moderation approved these marks — entry is locked.</Text>
        </View>
      )}

      {evaluations.map((ev) => (
        <View key={ev.id} style={s.group}>
          <View style={s.groupHead}>
            <Text style={s.groupTitle}>{ev.subject} <Text style={s.groupCode}>{ev.code}</Text></Text>
            <Chip
              label={ev.moderationStatus === 'APPROVED' ? 'Locked' : 'Open'}
              color={ev.moderationStatus === 'APPROVED' ? '#4f46e5' : GREEN}
            />
          </View>

          {ev.papers.map((p) => {
            const d = draftFor(p);
            const marked = isMarked(p);
            const locked = ev.moderationStatus === 'APPROVED';
            return (
              <Card key={p.id} style={s.paper}>
                <Avatar name={p.student} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{p.student}</Text>
                  <Text style={s.meta}>{p.rollNo}{marked ? ` · total ${p.internalMarks + p.externalMarks}` : ' · unmarked'}</Text>
                </View>
                <View style={s.inputs}>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={[s.input, locked && s.inputLocked]}
                      value={String(d.i)}
                      onChangeText={(t) => setDraft(p.id, 'i', t)}
                      keyboardType="numeric"
                      placeholder="IN"
                      editable={!locked && !action.busy}
                      maxLength={2}
                    />
                    <Text style={s.inputCap}>/{policy.internalMax}</Text>
                  </View>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={[s.input, locked && s.inputLocked]}
                      value={String(d.e)}
                      onChangeText={(t) => setDraft(p.id, 'e', t)}
                      keyboardType="numeric"
                      placeholder="EX"
                      editable={!locked && !action.busy}
                      maxLength={2}
                    />
                    <Text style={s.inputCap}>/{policy.externalMax}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.saveBtn, locked && s.saveDisabled]}
                    activeOpacity={0.75}
                    disabled={locked || action.busy}
                    onPress={() => save(p)}
                  >
                    <Ionicons name="checkmark" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
          {!ev.papers.length && <EmptyNote>No papers for this subject.</EmptyNote>}
        </View>
      ))}

      {!evaluations.length && <EmptyNote>No subjects under evaluation for this exam.</EmptyNote>}
    </EvaluationScreen>
  );
}

const s = StyleSheet.create({
  locked: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4f46e512', borderWidth: 1, borderColor: '#4f46e540', borderRadius: 10, padding: 10, marginBottom: 12 },
  lockedText: { flex: 1, fontSize: 12, color: '#4f46e5', fontFamily: 'Manrope-SemiBold' },
  group: { marginBottom: 16 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  groupTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  groupCode: { fontSize: 11, fontWeight: '400', color: '#64748b', fontFamily: 'Manrope-Regular' },
  paper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  inputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center' },
  input: { width: 36, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 6, fontSize: 13, textAlign: 'center', color: '#0f172a', fontFamily: 'Manrope-SemiBold', backgroundColor: '#f8fafc' },
  inputLocked: { backgroundColor: '#f1f5f9', color: MUTED },
  inputCap: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginRight: 4 },
  saveBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  saveDisabled: { backgroundColor: '#cbd5e1' },
});
