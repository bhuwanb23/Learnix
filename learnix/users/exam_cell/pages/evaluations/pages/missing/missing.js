// X-05 — MISSING: the unmarked list that blocks publication
// (docs/users/05 §3.3, requirement 7).
//
// "Missing" means what `isMarked` means — both components in and in bounds —
// and this screen shows WHICH component is absent for each paper, because
// "half-entered" and "never touched" are different problems with different
// fixes. A screen that said only "no marks" would hide the half-entered ones.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { SCRIPT_STATUS_META, RED, AMBER, GREEN, plural } from '../../evaluationMeta';
import { EvaluationScreen, Card, Chip, Avatar, EmptyNote, StatGrid, useEvaluation } from '../../evaluationUi';

export default function EvaluationsMissing() {
  const { data, loading, refreshing, error, reload, onRefresh } = useEvaluation(() =>
    examcellApi.evaluationBlock('MISSING'),
  );

  const items = data?.items ?? [];
  const halfEntered = items.filter((p) => p.hasInternal !== p.hasExternal).length;
  const scriptMissing = items.filter((p) => p.scriptStatus === 'NOT_RECEIVED').length;

  return (
    <EvaluationScreen
      title="Missing marks"
      subtitle="Papers with no complete marks — this list blocks publication."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <StatGrid
        items={[
          { id: 'missing', label: 'Unmarked', value: data?.count ?? 0, icon: 'alert-circle', color: RED },
          { id: 'half', label: 'Half entered', value: halfEntered, icon: 'swap-horizontal', color: AMBER },
          { id: 'nscript', label: 'Script absent', value: scriptMissing, icon: 'document-text', color: RED },
          { id: 'ready', label: 'Blocked by', value: data?.count ?? 0, icon: 'lock-closed', color: GREEN },
        ]}
      />

      {items.map((p) => {
        const which =
          p.hasInternal && p.hasExternal ? 'out of bounds' : p.hasInternal ? 'external missing' : p.hasExternal ? 'internal missing' : 'untouched';
        const sm = SCRIPT_STATUS_META[p.scriptStatus] || SCRIPT_STATUS_META.NOT_RECEIVED;
        return (
          <Card key={p.id} style={s.row}>
            <Avatar name={p.student} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{p.student}</Text>
              <Text style={s.meta}>{p.rollNo} · {p.subject} ({p.code}) · {p.exam}</Text>
              <View style={s.tags}>
                <Chip label={which} color={p.hasInternal !== p.hasExternal ? AMBER : RED} />
                <Chip label={sm.label} color={sm.color} />
                {!p.evaluatorUserId && <Chip label="No evaluator" color={RED} />}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
          </Card>
        );
      })}

      {!items.length && (
        <View style={s.clear}>
          <Ionicons name="checkmark-circle" size={26} color={GREEN} />
          <Text style={s.clearTitle}>Every paper has marks</Text>
          <Text style={s.clearBody}>Nothing here blocks publication.</Text>
        </View>
      )}

      {items.length > 0 && (
        <Text style={s.foot}>{plural(items.length, 'paper')} missing · enter them from Marks entry</Text>
      )}
    </EvaluationScreen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  clear: { alignItems: 'center', padding: 26, gap: 6 },
  clearTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  clearBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  foot: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 6 },
});
