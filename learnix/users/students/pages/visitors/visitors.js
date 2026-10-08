/**
 * A resident's visitors: tell the hostel who is coming, and watch it happen.
 *
 * WHY THIS SCREEN EXISTS
 * ----------------------
 * The workflow is "resident pre-authorises, warden confirms", so without this screen a resident
 * has no way to authorise anything - the warden would be the only person who could start a visit,
 * which makes the resident's half of the agreement fictitious. This is that half.
 *
 * WHAT THE STUDENT DOES NOT DO
 * ----------------------------
 * There is no approve and no "let them in" here, and there is no resident-facing route that
 * could perform either. The warden owns the gate. What the student owns is the authorisation and
 * the right to withdraw it while it is still waiting.
 *
 * THE POLICY ARRIVES WITH THE LIST
 * -------------------------------
 * `GET /student/visitors` returns `{ expected, history, policy }`. The policy is not decoration:
 * it is what lets the form explain a refusal ("this hostel only allows day visits") instead of
 * offering fields the server will reject, and it is what decides which fields are shown at all.
 * A resident is not asked for an ID proof at a hostel that does not want one.
 *
 * TWO LISTS, NOT ONE FILTERED ONE
 * ------------------------------
 * `expected` and `history` arrive as separate arrays. Who is coming and who came are different
 * questions, and a resident looking for tonight's visitor should not have to scroll past last
 * month's log - or, worse, have a filter quietly hide tonight's visitor because of a typo.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { studentApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../components/ui';

const RELATIONS = ['Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Friend', 'Aunt', 'Uncle', 'Relative', 'Other'];

const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * Lifecycle labels, mirroring the warden's `visitorMeta`. Duplicated as a small local table rather
 * than imported across the two apps because the two apps share nothing but `services/api` - and a
 * shared import would drag a React component tree (SectionCard, Empty) into the student bundle for
 * six label strings. The RULE itself is still only ever evaluated on the server; only the wording
 * of a server-derived key lives here.
 */
const LIFECYCLE_META = {
  awaiting_approval: { label: 'Waiting for the warden', short: 'Waiting', bg: '#fef3c7', color: '#d97706', icon: 'time-outline' },
  approved: { label: 'Confirmed — not arrived yet', short: 'Confirmed', bg: '#dcfce7', color: '#059669', icon: 'checkmark-circle-outline' },
  in_campus: { label: 'On campus now', short: 'Here', bg: '#dbeafe', color: '#2563eb', icon: 'walk-outline' },
  visit_overdue: { label: 'Overstaying', short: 'Overstayed', bg: '#fee2e2', color: '#dc2626', icon: 'warning-outline' },
  departure_overdue: { label: 'Has not arrived', short: 'Not arrived', bg: '#ffedd5', color: '#c2410c', icon: 'alert-circle-outline' },
  left: { label: 'Left', short: 'Left', bg: '#f1f5f9', color: '#475569', icon: 'exit-outline' },
  no_show: { label: 'Never came', short: 'No-show', bg: '#f1f5f9', color: '#64748b', icon: 'close-circle-outline' },
  rejected: { label: 'Refused by the warden', short: 'Refused', bg: '#fee2e2', color: '#dc2626', icon: 'ban-outline' },
  cancelled: { label: 'Withdrawn', short: 'Withdrawn', bg: '#f1f5f9', color: '#64748b', icon: 'remove-circle-outline' },
  unknown: { label: 'Unrecognised state', short: 'Check', bg: '#ede9fe', color: '#6d28d9', icon: 'help-circle-outline' },
};

const meta = (k) => LIFECYCLE_META[k] ?? LIFECYCLE_META.unknown;

const fmtTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function MyVisitors() {
  const [expected, setExpected] = useState([]);
  const [history, setHistory] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relation: 'Father', purpose: '', idType: '', idNumber: '' });
  const [inAt, setInAt] = useState('');
  const [outAt, setOutAt] = useState('');

  const load = useCallback(async (mode) => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      const res = await studentApi.myVisitors();
      setExpected(res.expected ?? []);
      setHistory(res.history ?? []);
      setPolicy(res.policy ?? null);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load your visitors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  // Defaults are derived from the POLICY, not hardcoded: if the hostel does not allow overnight
  // visits, offering a departure tomorrow morning would be offering a guaranteed refusal.
  const openForm = () => {
    const start = new Date();
    start.setMinutes(start.getMinutes() + 60, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + (policy?.dayVisitsOnly === false ? 12 : 4));
    setForm({ name: '', phone: '', relation: 'Father', purpose: '', idType: '', idNumber: '' });
    setInAt(toLocalInput(start));
    setOutAt(toLocalInput(end));
    setShowForm(true);
  };

  const submit = async () => {
    if (form.name.trim().length < 2) {
      Alert.alert('Name needed', 'Enter your visitor\'s full name.');
      return;
    }
    if (policy?.requirePurpose && !form.purpose.trim()) {
      Alert.alert('Purpose needed', 'This hostel records a reason for every visit.');
      return;
    }
    if (policy?.requireIdProof && !(form.idType.trim() && form.idNumber.trim())) {
      Alert.alert('ID proof needed', 'This hostel records an ID proof before a visitor may come.');
      return;
    }
    setBusy(true);
    try {
      await studentApi.authoriseVisitor({
        name: form.name.trim(),
        relation: form.relation,
        phone: form.phone.trim() || null,
        purpose: form.purpose.trim() || null,
        idType: form.idType.trim() || null,
        idNumber: form.idNumber.trim() || null,
        expectedInAt: new Date(inAt).toISOString(),
        expectedOutAt: new Date(outAt).toISOString(),
      });
      setShowForm(false);
      Alert.alert('Sent to the warden', 'You will be notified once they confirm it.');
      load('refresh');
    } catch (e) {
      Alert.alert('Could not send', e.message);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = (v) => {
    Alert.alert('Withdraw this visitor?', `${v.name} will be cancelled before the warden sees it.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            await studentApi.cancelVisitor(v.id);
            load('refresh');
          } catch (e) {
            Alert.alert('Could not withdraw', e.message);
          }
        },
      },
    ]);
  };

  if (loading && expected.length === 0 && history.length === 0) {
    return (
      <View style={styles.container}>
        <View style={{ marginTop: 16, marginHorizontal: 16 }}>
          <SkeletonCard style={{ marginBottom: 8 }} />
          <SkeletonCard style={{ marginBottom: 8 }} />
        </View>
      </View>
    );
  }

  const dayOnly = policy?.dayVisitsOnly !== false;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={theme.colors.primary} />}
      >
        {/* The house rules, stated before the form rather than discovered through a rejection. */}
        {policy ? (
          <View style={styles.policyBox}>
            <View style={styles.policyHead}>
              <Ionicons name="information-circle-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.policyTitle}>Visitor rules here</Text>
            </View>
            <Text style={styles.policyLine}>
              {policy.visitingHours?.enabled
                ? `Visiting hours ${policy.visitingHours.start}–${policy.visitingHours.end}.`
                : 'No set visiting hours.'}
              {dayOnly ? ' Day visits only.' : ' Overnight visitors are allowed.'}
              {policy.requireWardenApproval ? ' The warden confirms every visit.' : ''}
              {policy.maxAdvanceDays ? ` Book up to ${policy.maxAdvanceDays} days ahead.` : ''}
            </Text>
          </View>
        ) : null}

        {!showForm ? (
          <TouchableOpacity style={styles.addBtn} onPress={openForm}>
            <Ionicons name="person-add-outline" size={16} color="#fff" />
            <Text style={styles.addText}>I'm expecting someone</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Tell the hostel who is coming</Text>

            <Text style={styles.label}>Visitor name</Text>
            <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#9ca3af" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} autoCapitalize="words" />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} placeholder="Recommended — used to check the barred list" placeholderTextColor="#9ca3af" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />

            <Text style={styles.label}>They are my</Text>
            <View style={styles.chips}>
              {RELATIONS.map((r) => (
                <TouchableOpacity key={r} style={[styles.chip, form.relation === r && styles.chipOn]} onPress={() => setForm({ ...form, relation: r })}>
                  <Text style={[styles.chipText, form.relation === r && styles.chipTextOn]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Expected arrival</Text>
            <TextInput style={styles.input} value={inAt} onChangeText={setInAt} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor="#9ca3af" />

            <Text style={styles.label}>Expected departure</Text>
            <TextInput style={styles.input} value={outAt} onChangeText={setOutAt} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor="#9ca3af" />
            {dayOnly ? <Text style={styles.hint}>Same day as the arrival — this hostel does not allow overnight visitors.</Text> : null}

            {policy?.requirePurpose || form.purpose ? (
              <>
                <Text style={styles.label}>Why are they coming?</Text>
                <TextInput style={styles.input} placeholder="e.g. Attending a wedding in town" placeholderTextColor="#9ca3af" value={form.purpose} onChangeText={(t) => setForm({ ...form, purpose: t })} />
              </>
            ) : null}

            {policy?.requireIdProof || form.idNumber ? (
              <>
                <Text style={styles.label}>ID proof type</Text>
                <TextInput style={styles.input} placeholder="Aadhaar, passport, licence…" placeholderTextColor="#9ca3af" value={form.idType} onChangeText={(t) => setForm({ ...form, idType: t })} autoCapitalize="characters" />
                <Text style={styles.label}>ID number</Text>
                <TextInput style={styles.input} value={form.idNumber} onChangeText={(t) => setForm({ ...form, idNumber: t })} />
              </>
            ) : null}

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sendBtn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
                <Text style={styles.sendText}>{busy ? 'Sending…' : 'Send to warden'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Coming to see you</Text>
        {expected.length === 0 ? (
          <EmptyState icon="people-outline" title="Nobody expected" subtitle="Tell the hostel when someone is visiting" color="#0891b2" />
        ) : (
          expected.map((v, idx) => <VisitorCard key={v.id} visitor={v} delay={Math.min(idx, 8) * 40} onWithdraw={() => withdraw(v)} />)
        )}

        {history.length ? (
          <>
            <Text style={styles.sectionTitle}>Past visits</Text>
            {history.map((v, idx) => (
              <AnimatedCard key={v.id} delay={Math.min(idx, 6) * 30} style={styles.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histName}>
                    {v.name} <Text style={styles.histRel}>({v.relation})</Text>
                  </Text>
                  <Text style={styles.histMeta}>
                    {v.checkInAt ? `In ${fmtTime(v.checkInAt)}` : 'Never arrived'}
                    {v.checkOutAt ? ` · Out ${fmtTime(v.checkOutAt)}` : ''}
                  </Text>
                  {v.decisionNote ? <Text style={styles.histNote}>Warden: {v.decisionNote}</Text> : null}
                </View>
                <View style={[styles.histChip, { backgroundColor: meta(v.lifecycle).bg }]}>
                  <Text style={[styles.histChipText, { color: meta(v.lifecycle).color }]}>{meta(v.lifecycle).short}</Text>
                </View>
              </AnimatedCard>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function VisitorCard({ visitor, delay, onWithdraw }) {
  const m = meta(visitor.lifecycle);
  const canWithdraw = visitor.lifecycle === 'awaiting_approval';

  return (
    <AnimatedCard delay={delay} style={styles.card}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{visitor.name}</Text>
          <Text style={styles.rel}>{visitor.relation}</Text>
        </View>
        <View style={[styles.chipBadge, { backgroundColor: m.bg }]}>
          <Ionicons name={m.icon} size={11} color={m.color} />
          <Text style={[styles.chipBadgeText, { color: m.color }]}>{m.short}</Text>
        </View>
      </View>

      <Text style={styles.line}>
        <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />{'  '}
        {visitor.expectedInAt ? `${fmtTime(visitor.expectedInAt)} – ${fmtTime(visitor.expectedOutAt)}` : 'No window given'}
      </Text>
      {visitor.purpose ? <Text style={styles.purpose}>{visitor.purpose}</Text> : null}

      {visitor.decisionNote ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>Warden: {visitor.decisionNote}</Text>
        </View>
      ) : null}

      {/* An alert the resident can see is the one they can act on — e.g. an out-of-hours visit
          they should move, rather than being surprised at the gate. */}
      {visitor.alerts?.length ? (
        <View style={styles.alertBox}>
          {visitor.alerts.map((a) => (
            <Text key={a.code} style={styles.alertLine}>
              <Ionicons name="alert-circle-outline" size={11} color="#a16207" />{'  '}
              {a.message}
            </Text>
          ))}
        </View>
      ) : null}

      {canWithdraw ? (
        <TouchableOpacity style={styles.withdrawBtn} onPress={onWithdraw}>
          <Ionicons name="close" size={13} color="#64748b" />
          <Text style={styles.withdrawText}>Withdraw</Text>
        </TouchableOpacity>
      ) : null}
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 26 },
  policyBox: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 12, marginTop: 16 },
  policyHead: { flexDirection: 'row', alignItems: 'center' },
  policyTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.primary, marginLeft: 5 },
  policyLine: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 5, lineHeight: 17 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 13, marginTop: 14,
  },
  addText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 6 },
  formCard: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 15, marginTop: 14 },
  formTitle: { fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  label: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginBottom: 4 },
  hint: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#92400e', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginTop: 6 },
  chipOn: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextOn: { color: '#fff' },
  formActions: { flexDirection: 'row', marginTop: 16 },
  cancelBtn: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: 10, paddingVertical: 11, marginRight: 8 },
  cancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  sendBtn: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 11 },
  sendText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', borderRadius: 10, padding: 11, marginTop: 12 },
  errorText: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Medium', color: '#dc2626', marginLeft: 6 },
  sectionTitle: { fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginTop: 20, marginBottom: 10 },
  card: { padding: 13, marginBottom: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  rel: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  chipBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipBadgeText: { fontSize: 10, fontFamily: 'Manrope-Bold', marginLeft: 4 },
  line: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 6 },
  purpose: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginTop: 4 },
  noteBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 8, marginTop: 8 },
  noteText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#b91c1c' },
  alertBox: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginTop: 8 },
  alertLine: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#92400e', marginTop: 2 },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceMuted, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 },
  withdrawText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: '#64748b', marginLeft: 4 },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 7 },
  histName: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  histRel: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  histMeta: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  histNote: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#b91c1c', marginTop: 2 },
  histChip: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  histChipText: { fontSize: 10, fontFamily: 'Manrope-Bold' },
});