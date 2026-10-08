/**
 * One pass in full: the whole timeline, and whatever the warden can still do about it.
 *
 * WHY A TIMELINE
 * --------------
 * A pass is a sequence of events — requested, decided, left, returned — and the two that matter
 * operationally are the GAPS between them. "Approved at 18:00, due to leave at 18:30, actually
 * left 21:10, due back 22:00, never came back" is one story; four separate fields on four
 * separate cards is not. The rail shows each step with its own timestamp, and an unmet planned
 * step is drawn hollow so the gap is visible rather than inferred.
 *
 * The lifecycle label is shown AS THE SERVER SENT IT. Nothing here recomputes it — the same
 * derivation orders the inbox and answers the student's screen, and a second implementation on
 * the client could disagree with both.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { hostelApi } from '../../../../../../services/api';
import { SectionCard, Empty, lifecycleMeta, lateBy, fmtDateTime, initials } from '../../gatePassMeta';

export default function PassDetail({ passId, onBack, onDecide }) {
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPass(await hostelApi.gatePass(passId));
    } catch (e) {
      setError(e.message || 'Failed to load gate pass');
    } finally {
      setLoading(false);
    }
  }, [passId]);

  useEffect(() => {
    load();
  }, [load]);

  const markExit = () => {
    Alert.alert('Mark as checked out', `Record that ${pass.student} has left now?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark exited',
        onPress: async () => {
          try {
            await hostelApi.gatePassExit(pass.id);
            await load();
          } catch (e) {
            Alert.alert('Cannot record exit', e.message);
          }
        },
      },
    ]);
  };

  if (loading && !pass) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Loading pass…</Text>
      </View>
    );
  }
  if (error && !pass) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={30} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={onBack}>
          <Text style={styles.backLinkText}>Back to gate passes</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!pass) return null;

  const meta = lifecycleMeta(pass.lifecycle);
  const late = lateBy(pass.minutesLate);
  const decidable = pass.status === 'PENDING';
  const canExit = pass.status === 'APPROVED' && !pass.actualOutAt && !pass.actualInAt;
  const canReturn = pass.status === 'APPROVED' && !!pass.actualOutAt && !pass.actualInAt;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient
          colors={pass.isEmergency ? ['#7c3aed', '#5b21b6'] : ['#2563eb', '#1d4ed8']}
          style={styles.hero}
        >
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(pass.student)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.student}>{pass.student}</Text>
              <Text style={styles.roll}>
                {pass.rollNo}
                {pass.room ? ` · Room ${pass.room}` : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {late ? <Text style={styles.heroLate}>{late}</Text> : null}
        </LinearGradient>

        {(decidable || canExit || canReturn) && (
          <View style={styles.actionRow}>
            {decidable && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => onDecide(pass, 'REJECTED')}
                >
                  <Ionicons name="close-outline" size={15} color="#dc2626" />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => onDecide(pass, 'APPROVED')}
                >
                  <Ionicons name="checkmark-outline" size={15} color="#fff" />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </>
            )}
            {canExit && (
              <TouchableOpacity style={[styles.actionBtn, styles.gateBtn]} onPress={markExit}>
                <Ionicons name="log-out-outline" size={15} color={theme.colors.primary} />
                <Text style={styles.gateText}>Mark exited</Text>
              </TouchableOpacity>
            )}
            {canReturn && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.gateBtn]}
                onPress={() => onDecide(pass, 'RETURN')}
              >
                <Ionicons name="log-in-outline" size={15} color={theme.colors.primary} />
                <Text style={styles.gateText}>Mark returned</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <SectionCard title="Request">
          <Row label="Reason" value={pass.reason} />
          <Row label="Destination" value={pass.destination || 'Not stated'} />
          <Row label="Requested" value={fmtDateTime(pass.createdAt)} />
          {pass.isEmergency ? <Row label="Emergency" value="Yes — priority queue" tone="#7c3aed" /> : null}
        </SectionCard>

        {/* The timeline. `met` distinguishes a step that HAPPENED from one that was only PLANNED
            — that distinction is the whole feature. */}
        <SectionCard title="Timeline">
          <Step
            icon="document-text-outline"
            label="Requested"
            planned={null}
            actual={pass.createdAt}
          />
          <Step
            icon={pass.status === 'REJECTED' ? 'close-circle-outline' : 'checkmark-circle-outline'}
            label={pass.status === 'REJECTED' ? 'Rejected' : pass.status === 'CANCELLED' ? 'Withdrawn by student' : 'Approved'}
            planned={null}
            actual={fmtDateTime(pass.decidedAt ?? pass.cancelledAt) || null}
            met={pass.status !== 'PENDING'}
            tone={pass.status === 'REJECTED' ? '#dc2626' : pass.status === 'CANCELLED' ? '#64748b' : '#059669'}
          />
          <Step
            icon="log-out-outline"
            label="Departure"
            planned={pass.outAt}
            actual={pass.actualOutAt}
            met={!!pass.actualOutAt}
          />
          <Step
            icon="log-in-outline"
            label="Return"
            planned={pass.expectedInAt}
            actual={pass.actualInAt}
            met={!!pass.actualInAt}
          />
          {pass.decisionNote ? (
            <>
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Decision note</Text>
                <Text style={styles.noteText}>{pass.decisionNote}</Text>
              </View>
            </>
          ) : null}
        </SectionCard>

        {/* Verification stated plainly, because its ABSENCE is the interesting case. */}
        <SectionCard title="Verification">
          {pass.status === 'PENDING' ? (
            <Empty>Not decided yet.</Empty>
          ) : pass.idVerified ? (
            <View style={styles.verifyOk}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
              <Text style={styles.verifyOkText}>The warden's ID check was recorded.</Text>
            </View>
          ) : pass.status === 'REJECTED' ? (
            <Empty>Rejected — no identity check was recorded.</Empty>
          ) : (
            <View style={styles.verifyWarn}>
              <Ionicons name="shield-outline" size={16} color="#94a3b8" />
              <Text style={styles.verifyWarnText}>
                Approved without an ID check. The warden decided on the request alone.
              </Text>
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, tone }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, tone && { color: tone }]}>{value}</Text>
    </View>
  );
}

/**
 * One timeline step. `actual` is what the gate recorded; `planned` is what was expected.
 * A step with a plan but no actual is drawn hollow — that hollow step IS the gap a warden is
 * looking for, so it must not be rendered as if it had happened.
 */
function Step({ icon, label, planned, actual, met, tone }) {
  const color = met ? tone ?? '#059669' : '#cbd5e1';
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View style={[styles.stepDot, met ? { backgroundColor: color } : styles.stepDotHollow]}>
          <Ionicons name={icon} size={11} color={met ? '#fff' : '#94a3b8'} />
        </View>
      </View>
      <View style={styles.stepBody}>
        <Text style={[styles.stepLabel, met && { color: theme.colors.text, fontFamily: 'Manrope-Bold' }]}>
          {label}
        </Text>
        {actual ? (
          <Text style={styles.stepActual}>{fmtDateTime(actual)}</Text>
        ) : planned ? (
          <Text style={styles.stepPlanned}>planned {fmtDateTime(planned)} — not recorded</Text>
        ) : (
          <Text style={styles.stepPlanned}>{met ? '' : 'pending'}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  errorText: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: '#dc2626',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  backLink: { marginTop: 12, padding: 6 },
  backLinkText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  content: { paddingBottom: 32 },
  hero: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 18 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  student: { fontSize: 19, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  roll: { fontSize: 12, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  statusText: { fontSize: 12, fontFamily: 'Manrope-Bold', marginLeft: 5 },
  heroLate: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fecaca', marginTop: 8 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  rejectBtn: { backgroundColor: '#fee2e2' },
  rejectText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#dc2626', marginLeft: 5 },
  approveBtn: { backgroundColor: theme.colors.primary },
  approveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 5 },
  gateBtn: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  gateText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.primary, marginLeft: 5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginRight: 12 },
  rowValue: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text, flexShrink: 1, textAlign: 'right' },
  step: { flexDirection: 'row' },
  stepRail: { width: 28, alignItems: 'center' },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepDotHollow: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#cbd5e1' },
  stepBody: { flex: 1, paddingBottom: 16 },
  stepLabel: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  stepActual: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.text, marginTop: 2 },
  stepPlanned: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#94a3b8', marginTop: 2 },
  noteBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 11,
    marginTop: 4,
  },
  noteLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase' },
  noteText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginTop: 4, lineHeight: 17 },
  verifyOk: { flexDirection: 'row', alignItems: 'center' },
  verifyOkText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: '#059669', marginLeft: 8 },
  verifyWarn: { flexDirection: 'row', alignItems: 'center' },
  verifyWarnText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: '#64748b', marginLeft: 8, flex: 1 },
});