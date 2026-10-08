/**
 * A student's gate passes: request one, and watch what happens to it.
 *
 * WHY THIS SCREEN EXISTS
 * ----------------------
 * `prisma.gatePass.create` appeared nowhere in the codebase before this. The warden had an
 * inbox for a queue that could only ever be filled by the seed, and `07-feature-list.md`
 * listed "S-15 … gate pass request" as **wired** when it was not. This is the missing half.
 *
 * ONE OPEN PASS AT A TIME
 * -----------------------
 * The form disables itself when the student already holds a pending or unreturned pass, and
 * says which. That is not bureaucracy: it is the rule that keeps "who is in tonight?"
 * answerable, and the server enforces it independently — the disabled form is courtesy, not
 * control.
 *
 * THE EMERGENCY TOGGLE
 * --------------------
 * It is a PRIORITY flag. It does not bypass approval and it does not self-authorise anything —
 * it tells the warden to look at this request now. The copy says so explicitly, because a
 * checkbox labelled "emergency" in a form is exactly the sort of control a student would
 * reasonably assume grants an exemption.
 *
 * The lifecycle label shown here comes from the server, derived by the same rules that order the
 * warden's inbox. Neither screen computes its own.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { studentApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../components/ui';
import { lifecycleMeta, lateBy, fmtDateTime, initials } from './gatePassMeta';

/** Half an hour from now, rounded, as the default departure — "leaving soon". */
function defaultOutAt() {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  d.setSeconds(0, 0);
  return toLocalInput(d);
}

/** Six hours from now, rounded: the common case is an evening out. */
function defaultBackAt() {
  const d = new Date(Date.now() + 6 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return toLocalInput(d);
}

/**
 * `datetime-local` value format, in LOCAL time.
 *
 * Built by hand rather than via `toISOString()`, because `toISOString` converts to UTC and the
 * input then reads back as the wrong wall-clock time — a student in IST who picks 18:00 would
 * otherwise submit 12:30.
 */
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function MyGatePasses({ navigation }) {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [outAt, setOutAt] = useState(defaultOutAt);
  const [backAt, setBackAt] = useState(defaultBackAt);
  const [isEmergency, setIsEmergency] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPasses(await studentApi.myGatePasses());
    } catch (e) {
      setError(e.message || 'Could not load your gate passes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * A pass that occupies the one slot: awaiting a decision, or out and not yet back.
   * Mirrors `blocksNewRequest` on the server. The server still enforces it — this is so the
   * student is told before they fill in a form.
   */
  const openPass = useMemo(
    () =>
      passes.find(
        (p) => p.status === 'PENDING' || (p.status === 'APPROVED' && !p.actualInAt),
      ) ?? null,
    [passes],
  );

  const submit = async () => {
    if (reason.trim().length < 3) {
      Alert.alert('Add a reason', 'The warden needs to know why you are leaving.');
      return;
    }
    const out = new Date(outAt);
    const back = new Date(backAt);
    if (Number.isNaN(out.getTime()) || Number.isNaN(back.getTime())) {
      Alert.alert('Check the times', 'Enter a valid departure and return time.');
      return;
    }
    if (back <= out) {
      Alert.alert('Check the times', 'Your return time must be after your departure time.');
      return;
    }

    setBusy(true);
    try {
      await studentApi.requestGatePass({
        reason: reason.trim(),
        destination: destination.trim() || null,
        outAt: out.toISOString(),
        expectedInAt: back.toISOString(),
        isEmergency,
      });
      setReason('');
      setDestination('');
      setIsEmergency(false);
      setOutAt(defaultOutAt());
      setBackAt(defaultBackAt());
      setShowForm(false);
      Alert.alert('Requested', 'The warden has been notified. You will hear back once it is decided.');
      await load();
    } catch (e) {
      Alert.alert('Cannot request', e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = (pass) => {
    Alert.alert('Withdraw request', `Withdraw your request for "${pass.reason}"?`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            await studentApi.cancelGatePass(pass.id);
            await load();
          } catch (e) {
            Alert.alert('Cannot withdraw', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ marginTop: 16 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My gate passes</Text>
      </View>

      {error && passes.length === 0 && (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={20} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* The blocker is stated before the button, so a greyed-out control always explains itself. */}
      {openPass ? (
        <View style={styles.blockerBox}>
          <Ionicons name="information-circle-outline" size={16} color="#d97706" />
          <Text style={styles.blockerText}>
            You already have a pass {lifecycleMeta(openPass.lifecycle).label.toLowerCase()}. You can
            request another once it has been decided and you are back.
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.requestBtn, showForm && styles.requestBtnActive]}
          onPress={() => setShowForm((s) => !s)}
        >
          <Ionicons name={showForm ? 'close' : 'add-circle-outline'} size={17} color="#fff" />
          <Text style={styles.requestText}>
            {showForm ? 'Cancel' : 'Request a gate pass'}
          </Text>
        </TouchableOpacity>
      )}

      {showForm && !openPass && (
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Reason</Text>
          <TextInput
            style={styles.input}
            placeholder="Why do you need to leave?"
            placeholderTextColor={theme.colors.textMuted}
            value={reason}
            onChangeText={setReason}
          />

          <Text style={styles.formLabel}>Destination</Text>
          <TextInput
            style={styles.input}
            placeholder="Where are you going? (optional)"
            placeholderTextColor={theme.colors.textMuted}
            value={destination}
            onChangeText={setDestination}
          />

          <View style={styles.timeRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.formLabel}>Leaving</Text>
              <TextInput
                style={styles.input}
                value={outAt}
                onChangeText={setOutAt}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Back by</Text>
              <TextInput
                style={styles.input}
                value={backAt}
                onChangeText={setBackAt}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.emergencyRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.emergencyLabel}>This is an emergency</Text>
              <Text style={styles.emergencyHint}>
                Puts your request at the top of the warden's queue. It does not skip approval.
              </Text>
            </View>
            <Switch
              value={isEmergency}
              onValueChange={setIsEmergency}
              trackColor={{ true: '#7c3aed', false: theme.colors.border }}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, busy && { opacity: 0.6 }]}
            onPress={submit}
            disabled={busy}
          >
            <Text style={styles.submitText}>{busy ? 'Sending…' : 'Send request'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >
        {passes.length === 0 && !error ? (
          <EmptyState
            icon="exit-outline"
            title="No gate passes yet"
            subtitle="Request one when you need to leave the hostel"
            color="#2563eb"
          />
        ) : (
          passes.map((p, idx) => {
            const meta = lifecycleMeta(p.lifecycle);
            const late = lateBy(p.minutesLate);
            return (
              <AnimatedCard key={p.id} delay={Math.min(idx, 8) * 40} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, p.isEmergency && styles.avatarEmergency]}>
                    <Text style={[styles.avatarText, p.isEmergency && { color: '#7c3aed' }]}>
                      {initials(p.reason)}
                    </Text>
                  </View>
                  <View style={styles.cardHead}>
                    <Text style={styles.reason} numberOfLines={1}>
                      {p.reason}
                    </Text>
                    {p.destination ? (
                      <Text style={styles.destination} numberOfLines={1}>
                        {p.destination}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.short}</Text>
                  </View>
                </View>

                <View style={styles.timesRow}>
                  <Text style={styles.timeText}>
                    {p.actualOutAt ? 'Left' : 'Out'}: {fmtDateTime(p.actualOutAt ?? p.outAt)}
                  </Text>
                </View>
                <View style={styles.timesRow}>
                  <Text style={styles.timeText}>
                    {p.actualInAt ? 'Back' : 'Back by'}:{' '}
                    {fmtDateTime(p.actualInAt ?? p.expectedInAt)}
                  </Text>
                </View>

                {late && <Text style={styles.lateText}>{late}</Text>}

                {p.status === 'REJECTED' && (
                  <Text style={styles.noteText}>
                    {p.decisionNote
                      ? `Refused: ${p.decisionNote}`
                      : 'Refused. The warden did not record a reason — ask at the office.'}
                  </Text>
                )}

                {/* The warden is told the ID was or was not checked, so the student is not left
                    guessing whether anyone looked at their face. */}
                {p.status === 'APPROVED' && p.idVerified && (
                  <View style={styles.verifyRow}>
                    <Ionicons name="shield-checkmark-outline" size={12} color="#059669" />
                    <Text style={styles.verifyText}>The warden checked your ID</Text>
                  </View>
                )}

                {p.status === 'PENDING' && (
                  <TouchableOpacity style={styles.withdrawBtn} onPress={() => cancel(p)}>
                    <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
                    <Text style={styles.withdrawText}>Withdraw request</Text>
                  </TouchableOpacity>
                )}
              </AnimatedCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: { fontSize: 17, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  errorBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  errorText: { flex: 1, fontSize: 12, fontFamily: 'Manrope-Medium', color: '#dc2626', marginLeft: 8 },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.primary },
  blockerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  blockerText: { flex: 1, fontSize: 12, fontFamily: 'Manrope-Medium', color: '#92400e', marginLeft: 8, lineHeight: 17 },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 8,
  },
  requestBtnActive: { backgroundColor: '#64748b' },
  requestText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 6 },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginTop: 12,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  timeRow: { flexDirection: 'row' },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  emergencyLabel: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  emergencyHint: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  submitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  list: { paddingTop: 14, paddingBottom: 24 },
  card: { padding: 12, marginBottom: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarEmergency: { backgroundColor: '#ede9fe' },
  avatarText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#2563eb' },
  cardHead: { flex: 1 },
  reason: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  destination: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontFamily: 'Manrope-Bold' },
  timesRow: { marginTop: 6 },
  timeText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  lateText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#dc2626', marginTop: 6 },
  noteText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#dc2626', marginTop: 7, lineHeight: 16 },
  verifyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  verifyText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#059669', marginLeft: 4 },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 11,
  },
  withdrawText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#dc2626', marginLeft: 4 },
});