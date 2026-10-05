import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { EmptyState } from '../../../../../../components/ui';
import { PersonAvatar, Meter } from '../../components/EventCard';
import { regStatusMeta, fmtDate } from '../../eventMeta';

/**
 * Attendees tab.
 *
 * This is where ATTENDANCE is recorded. `checkedInAt` is the only thing that
 * moves it, and only markAttendance() writes it — the office ticking people in
 * here is the sole path to a real participation number. Previously the app
 * inferred attendance from `status === 'CONFIRMED'`, which recorded what people
 * SAID rather than what they DID.
 *
 * A graduate sees the same list, read-only, with their own check-in state.
 */
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'going', label: 'Going' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'attended', label: 'Attended' },
];

export default function EventAttendees({ event, reload }) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [code, setCode] = useState('');

  const vc = event.viewerContext ?? {};
  const stats = event.stats ?? {};
  const attendees = useMemo(() => {
    const all = (event.attendees ?? []).filter((a) => a.status !== 'CANCELLED');
    if (filter === 'going') return all.filter((a) => a.status === 'CONFIRMED');
    if (filter === 'waitlist') return all.filter((a) => a.status === 'PENDING');
    if (filter === 'attended') return all.filter((a) => a.checkedInAt);
    return all;
  }, [event.attendees, filter]);

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const markSelected = async () => {
    try {
      setBusy(true);
      const res = await alumniApi.markAttendance(event.id, selected);
      setSelected([]);
      Alert.alert(
        'Attendance marked',
        `${res.marked} checked in${res.skipped ? `, ${res.skipped} already recorded` : ''}.`,
      );
      reload();
    } catch (e) {
      Alert.alert('Cannot mark attendance', e.message);
    } finally {
      setBusy(false);
    }
  };

  const unmarkSelected = async () => {
    try {
      setBusy(true);
      const res = await alumniApi.undoAttendance(event.id, selected);
      setSelected([]);
      Alert.alert('Attendance cleared', `${res.cleared} record(s) removed.`);
      reload();
    } catch (e) {
      Alert.alert('Cannot clear attendance', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onCodeSubmit = async () => {
    try {
      setBusy(true);
      const res = await alumniApi.qrCheckIn(event.id, code.trim());
      setCode('');
      setScannerOpen(false);
      Alert.alert(
        res.already ? 'Already checked in' : 'Checked in',
        `${res.name}${res.already ? ' was already recorded at check-in.' : ' is now marked present.'}`,
      );
      reload();
    } catch (e) {
      Alert.alert('Code not recognised', e.message);
    } finally {
      setBusy(false);
    }
  };

  const selectedCount = selected.length;
  const allSelected = attendees.length > 0 && attendees.every((a) => selected.includes(a.registrationId));

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Turnout</Text>
        <Meter
          label="Confirmed"
          value={
            stats.registered > 0 ? Math.round(((stats.confirmed ?? 0) / stats.registered) * 100) : null
          }
          color="#0891b2"
          hint={`${stats.confirmed ?? 0} of ${stats.registered ?? 0} registered`}
        />
        <Meter
          label="Checked in"
          value={stats.attendanceRate}
          color="#059669"
          hint={
            stats.confirmed > 0
              ? `${stats.checkedIn ?? 0} of ${stats.confirmed ?? 0} confirmed actually turned up`
              : 'Nothing confirmed yet'
          }
        />
        {stats.pending > 0 ? (
          <Text style={styles.waitNote}>
            {stats.pending} on the waitlist — confirming one frees a seat for the next in line.
          </Text>
        ) : null}
      </View>

      {vc.canMarkAttendance ? (
        <View style={styles.officeBar}>
          <TouchableOpacity style={styles.officeBtn} onPress={() => setScannerOpen(true)}>
            <Ionicons name="qr-code-outline" size={14} color="#0f172a" />
            <Text style={styles.officeBtnText}>Check in by code</Text>
          </TouchableOpacity>
          {selectedCount > 0 ? (
            <TouchableOpacity style={styles.officeBtnPrimary} onPress={markSelected} disabled={busy}>
              <Ionicons name="checkmark-done" size={14} color="#fff" />
              <Text style={styles.officeBtnPrimaryText}>
                Mark {selectedCount} present
              </Text>
            </TouchableOpacity>
          ) : null}
          {selectedCount > 0 ? (
            <TouchableOpacity style={styles.officeBtnDanger} onPress={unmarkSelected} disabled={busy}>
              <Ionicons name="close" size={14} color="#dc2626" />
              <Text style={styles.officeBtnDangerText}>Undo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrap} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <TouchableOpacity key={f.id} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setFilter(f.id)}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {vc.canMarkAttendance && attendees.length > 0 ? (
        <TouchableOpacity
          style={styles.selectAll}
          onPress={() => setSelected(allSelected ? [] : attendees.map((a) => a.registrationId))}
        >
          <Ionicons
            name={allSelected ? 'checkbox' : 'square-outline'}
            size={15}
            color={allSelected ? '#059669' : theme.colors.textMuted}
          />
          <Text style={styles.selectAllText}>{allSelected ? 'Clear selection' : 'Select all'}</Text>
        </TouchableOpacity>
      ) : null}

      {attendees.length === 0 ? (
        <EmptyState icon="people-outline" title="Nobody here yet" subtitle="Registrations will appear here as people sign up." color="#0891b2" />
      ) : null}

      {attendees.map((a) => {
        const sm = regStatusMeta(a.status);
        const isSelected = selected.includes(a.registrationId);
        return (
          <View key={a.registrationId} style={[styles.row, isSelected && styles.rowSelected]}>
            {vc.canMarkAttendance ? (
              <TouchableOpacity onPress={() => toggle(a.registrationId)} hitSlop={8} style={{ marginRight: 8 }}>
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={17}
                  color={isSelected ? '#059669' : '#cbd5e1'}
                />
              </TouchableOpacity>
            ) : null}
            <PersonAvatar name={a.name} checkedIn={!!a.checkedInAt} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.name} numberOfLines={1}>
                {a.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {a.role ?? '—'}
                {a.company ? ` · ${a.company}` : ''}
                {a.graduationYear ? ` · ${a.graduationYear}` : ''}
              </Text>
              {a.checkedInAt ? (
                <Text style={styles.checkedIn}>Checked in {fmtDate(a.checkedInAt)}</Text>
              ) : null}
            </View>
            <View style={[styles.statusChip, { backgroundColor: sm.color + '14' }]}>
              <Ionicons name={sm.icon} size={10} color={sm.color} />
              <Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text>
            </View>
          </View>
        );
      })}

      {/* ⚠️ Mock check-in — no camera scanner yet. */}
      <Modal visible={scannerOpen} transparent animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Check in by code</Text>
              <TouchableOpacity onPress={() => setScannerOpen(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.mockNote}>
              <Ionicons name="construct-outline" size={14} color="#b45309" />
              <Text style={styles.mockNoteText}>
                No camera scanner yet — paste or type the code from the attendee's confirmation. The server
                verifies it exactly as a scanner would.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Registration code</Text>
            <TextInput
              style={styles.field}
              value={code}
              onChangeText={setCode}
              placeholder="EVT:ABC123:DEF456:…"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setScannerOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={onCodeSubmit} disabled={busy || !code.trim()}>
                <Text style={styles.modalSubmitText}>{busy ? 'Checking…' : 'Check in'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16, paddingBottom: 28 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  waitNote: { fontSize: 10, fontFamily: 'Manrope-Medium', color: '#b45309', marginTop: 4 },

  officeBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  officeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  officeBtnText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#0f172a' },
  officeBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  officeBtnPrimaryText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#fff' },
  officeBtnDanger: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  officeBtnDangerText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#dc2626' },

  filterWrap: { flexGrow: 0, marginBottom: 8 },
  filterRow: { gap: 6 },
  filterChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 6 },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  filterTextActive: { color: '#fff' },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  selectAllText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 8 },
  rowSelected: { borderColor: '#059669', backgroundColor: '#f0fdf4' },
  name: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  checkedIn: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: '#059669', marginTop: 3 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  statusText: { fontSize: 9, fontFamily: 'Manrope-Bold' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  mockNote: { flexDirection: 'row', gap: 7, backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginBottom: 6 },
  mockNoteText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: '#b45309', lineHeight: 15 },
  fieldLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 10 },
  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modalSubmit: { flex: 1, backgroundColor: '#0891b2', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});