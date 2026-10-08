// X-05 — DEADLINES: when grading is due, and what is already past it
// (docs/users/05 §3.3, requirement 6).
//
// One deadline per exam — a second call MOVES the date (the server upserts on
// `examId`), so this screen never offers "add another deadline": it offers
// set and move, which is the same operation.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { AMBER, GREEN, RED, plural } from '../../evaluationMeta';
import {
  EvaluationScreen, Card, Chip, Progress, ProblemStrip, EmptyNote,
  useEvaluation, useAction,
} from '../../evaluationUi';

export default function EvaluationsDeadlines() {
  const { data, loading, refreshing, error, reload, onRefresh } = useEvaluation(() =>
    examcellApi.evaluationBlock('DEADLINES'),
  );
  const action = useAction(reload);
  const [drafts, setDrafts] = useState({}); // examId -> 'YYYY-MM-DD'

  const items = data?.items ?? [];

  const isoFor = (row) => {
    if (row.dueAt) {
      const d = new Date(row.dueAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return '';
  };

  const save = (row) => {
    const value = drafts[row.examId] ?? isoFor(row);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      action.run(() => Promise.reject(new Error('Deadline must be YYYY-MM-DD')));
      return;
    }
    action.run(() => examcellApi.setEvaluationDeadline(row.examId, `${value}T23:59:59`));
  };

  const remind = (row) => action.run(() => examcellApi.remindEvaluationDeadline(row.examId));

  return (
    <EvaluationScreen
      title="Deadlines"
      subtitle="One grading deadline per exam — set it, move it, remind against it."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <ProblemStrip problem={action.problem} />

      {items.map((row) => {
        const bar = row.percent === 100 ? GREEN : row.overdue ? RED : AMBER;
        return (
          <Card key={row.examId}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.exam}>{row.exam}</Text>
                <Text style={s.meta}>
                  {row.dueAt
                    ? `Due ${new Date(row.dueAt).toLocaleDateString()}${row.remindedAt ? ' · reminded' : ''}`
                    : 'No deadline set yet'}
                </Text>
              </View>
              {row.overdue && <Chip label="Overdue" color={RED} />}
              {!row.overdue && row.dueAt && row.percent < 100 && <Chip label="On track" color={GREEN} />}
            </View>

            <View style={s.progressRow}>
              <Progress percent={row.percent} color={bar} />
              <Text style={[s.pct, { color: bar }]}>{row.percent}%</Text>
            </View>
            <Text style={s.counts}>
              {row.marked} of {row.total} papers marked{row.total ? ` · ${plural(row.total - row.marked, 'paper')} left` : ''}
            </Text>

            <View style={s.actions}>
              <TextInput
                style={s.input}
                value={String(drafts[row.examId] ?? isoFor(row))}
                onChangeText={(t) => setDrafts((d) => ({ ...d, [row.examId]: t.replace(/[^0-9-]/g, '') }))}
                placeholder="YYYY-MM-DD"
                maxLength={10}
                editable={!action.busy}
              />
              <TouchableOpacity style={s.saveBtn} activeOpacity={0.75} onPress={() => save(row)} disabled={action.busy}>
                <Text style={s.saveText}>{row.dueAt ? 'Move' : 'Set'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.remindBtn, (!row.dueAt || action.busy) && s.btnDisabled]}
                activeOpacity={0.75}
                onPress={() => remind(row)}
                disabled={!row.dueAt || action.busy}
              >
                <Ionicons name="notifications-outline" size={14} color="#b45309" />
                <Text style={s.remindText}>Remind</Text>
              </TouchableOpacity>
            </View>
          </Card>
        );
      })}

      {!items.length && <EmptyNote>No exams yet — create one in the timetable first.</EmptyNote>}
    </EvaluationScreen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exam: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  pct: { fontSize: 12, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', width: 42, textAlign: 'right' },
  counts: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4, marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-SemiBold', backgroundColor: '#f8fafc' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 9, paddingHorizontal: 16, paddingVertical: 9 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Manrope-Bold' },
  remindBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#b4530914', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  remindBtnDisabled: { opacity: 0.4 },
  btnDisabled: { opacity: 0.4 },
  remindText: { color: '#b45309', fontWeight: '700', fontSize: 11, fontFamily: 'Manrope-Bold' },
});
