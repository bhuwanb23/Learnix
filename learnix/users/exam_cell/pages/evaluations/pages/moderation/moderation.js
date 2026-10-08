// X-05 — MODERATION: the second look before results go out
// (docs/users/05 §3.3, requirement 8).
//
// The workflow: a COMPLETED evaluation can be sent to moderation (422 if asked
// earlier — the server names the statuses that would work), then a moderator
// APPROVES or FLAGGES it. APPROVED locks the marks (entry screen disables
// itself); FLAGGED re-opens them. Only a PENDING item can be decided — the
// other buttons are not drawn, because a button the server would refuse is a
// button that wastes a tap.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { MODERATION_STATUS_META, EVALUATION_STATUS_META, GREEN, RED, AMBER, plural } from '../../evaluationMeta';
import {
  EvaluationScreen, Card, Chip, Progress, ProblemStrip, EmptyNote,
  useEvaluation, useAction,
} from '../../evaluationUi';

export default function EvaluationsModeration() {
  const { data, loading, refreshing, error, reload, onRefresh } = useEvaluation(() =>
    examcellApi.evaluationBlock('MODERATION'),
  );
  const action = useAction(reload);
  const [notes, setNotes] = useState({}); // evaluationId -> note text

  const items = data?.items ?? [];
  const pending = items.filter((i) => i.moderationStatus === 'PENDING');
  const decided = items.filter((i) => i.moderationStatus !== 'PENDING');

  const request = (id) => action.run(() => examcellApi.requestModeration(id));
  const decide = (id, decision) =>
    action.run(() => examcellApi.decideModeration(id, decision, notes[id] || undefined));

  const Row = ({ it }) => {
    const mo = MODERATION_STATUS_META[it.moderationStatus] || MODERATION_STATUS_META.NOT_REQUESTED;
    const st = EVALUATION_STATUS_META[it.status] || EVALUATION_STATUS_META.PENDING;
    const pct = it.total > 0 ? Math.round((it.marked / it.total) * 100) : 0;
    const canRequest = it.status === 'COMPLETED' && it.moderationStatus !== 'PENDING';
    const canDecide = it.moderationStatus === 'PENDING';
    return (
      <Card>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.subject}>{it.subject}</Text>
            <Text style={s.meta}>{it.code} · {it.exam}</Text>
          </View>
          <Chip label={mo.label} color={mo.color} />
        </View>

        <View style={s.progressRow}>
          <Progress percent={pct} color={pct === 100 ? GREEN : AMBER} />
          <Text style={s.pct}>{it.marked}/{it.total}</Text>
        </View>
        <Text style={s.statusLine}>Evaluation: {st.label}</Text>

        {it.moderationStatus === 'FLAGGED' && it.moderationNote && (
          <View style={s.note}>
            <Ionicons name="flag" size={13} color={RED} />
            <Text style={s.noteText}>{it.moderationNote}</Text>
          </View>
        )}
        {it.moderationStatus === 'APPROVED' && (
          <View style={s.approved}>
            <Ionicons name="shield-checkmark" size={13} color={GREEN} />
            <Text style={s.approvedText}>Approved{it.moderatedAt ? ` ${new Date(it.moderatedAt).toLocaleDateString()}` : ''} — marks locked</Text>
          </View>
        )}

        {canDecide && (
          <>
            <TextInput
              style={s.noteInput}
              value={notes[it.id] || ''}
              onChangeText={(t) => setNotes((n) => ({ ...n, [it.id]: t }))}
              placeholder="Note (required when flagging, optional when approving)"
              maxLength={500}
              editable={!action.busy}
            />
            <View style={s.actions}>
              <TouchableOpacity style={[s.btn, s.approve]} activeOpacity={0.75} disabled={action.busy} onPress={() => decide(it.id, 'APPROVED')}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                <Text style={s.btnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.flag]} activeOpacity={0.75} disabled={action.busy} onPress={() => decide(it.id, 'FLAGGED')}>
                <Ionicons name="flag-outline" size={15} color="#fff" />
                <Text style={s.btnText}>Flag</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!canDecide && it.status === 'COMPLETED' && it.moderationStatus === 'NOT_REQUESTED' && (
          <TouchableOpacity style={[s.btn, s.request]} activeOpacity={0.75} disabled={action.busy || !canRequest} onPress={() => request(it.id)}>
            <Ionicons name="git-pull-request-outline" size={15} color="#fff" />
            <Text style={s.btnText}>Send to moderation</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <EvaluationScreen
      title="Moderation"
      subtitle="Second look at entered marks before results go out."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <ProblemStrip problem={action.problem} />

      {pending.length > 0 && (
        <>
          <Text style={s.section}>Awaiting your decision ({pending.length})</Text>
          {pending.map((it) => <Row key={it.id} it={it} />)}
        </>
      )}

      {decided.length > 0 && (
        <>
          <Text style={s.section}>Everything else ({decided.length})</Text>
          {decided.map((it) => <Row key={it.id} it={it} />)}
        </>
      )}

      {!items.length && <EmptyNote>No evaluations yet — nothing to moderate.</EmptyNote>}
      {items.length > 0 && (
        <Text style={s.foot}>{plural(items.length, 'subject')} in the moderation view</Text>
      )}
    </EvaluationScreen>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subject: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  pct: { fontSize: 11, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold', width: 44, textAlign: 'right' },
  statusLine: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: `${RED}0D`, borderRadius: 8, padding: 9, marginTop: 8 },
  noteText: { flex: 1, fontSize: 11, color: RED, fontFamily: 'Manrope-SemiBold' },
  approved: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: `${GREEN}0D`, borderRadius: 8, padding: 9, marginTop: 8 },
  approvedText: { flex: 1, fontSize: 11, color: GREEN, fontFamily: 'Manrope-SemiBold' },
  noteInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#0f172a', fontFamily: 'Manrope-Regular', backgroundColor: '#f8fafc', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 14 },
  approve: { backgroundColor: '#059669', flex: 1 },
  flag: { backgroundColor: '#dc2626', flex: 1 },
  request: { backgroundColor: '#4f46e5', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Manrope-Bold' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
