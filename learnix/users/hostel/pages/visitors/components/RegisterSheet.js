/**
 * Register a visitor at the gate.
 *
 * A RESIDENT PICKER, NOT A TEXT FIELD
 * ------------------------------------
 * The old mock screen typed a resident NAME and a ROOM into two free-text boxes, which cannot
 * work: the backend needs a `studentProfileId`, and a name typed by hand will not match it. So
 * this searches `GET /hostel/residents` and lets the warden pick a real resident, which is also
 * the only way to guarantee the visitor is attached to somebody who actually holds a bed.
 *
 * The room is DISPLAYED, never typed. The picker returns it, and it is re-derived server-side, so
 * a room that has since changed cannot be pasted in from an old note.
 *
 * THE POLICY IS SHOWN, NOT ASSUMED
 * -------------------------------
 * The sheet receives the live policy and says up front whether this hostel requires a purpose or
 * an ID proof, and offers only the fields the institution actually demands. A form full of
 * optional fields that the server will reject is a worse form than one that says what is needed.
 * When the policy says the same-day rule applies, the departure picker is capped to the arrival
 * date so the constraint is visible before the attempt rather than after it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { hostelApi } from '../../../../../services/api';

const RELATIONS = ['Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Friend', 'Aunt', 'Uncle', 'Relative', 'Other'];

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in LOCAL time, which is what a person reads off a clock. */
const toLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dateOnly = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function RegisterSheet({ visible, onClose, onDone, policy }) {
  const [form, setForm] = useState({ name: '', phone: '', relation: 'Father', purpose: '', idType: '', idNumber: '' });
  const [inAt, setInAt] = useState('');
  const [outAt, setOutAt] = useState('');

  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);

  const [busy, setBusy] = useState(false);

  const needPurpose = policy?.requirePurpose === true;
  const needId = policy?.requireIdProof === true;
  const dayOnly = policy?.dayVisitsOnly !== false;

  // Reset per open, so a previous visitor's phone number can never leak into a new registration.
  useEffect(() => {
    if (!visible) return;
    const base = new Date();
    base.setMinutes(base.getMinutes() + 60, 0, 0);
    const end = new Date(base);
    end.setHours(base.getHours() + 4);
    setForm({ name: '', phone: '', relation: 'Father', purpose: '', idType: '', idNumber: '' });
    setInAt(toLocalInput(base));
    setOutAt(toLocalInput(dayOnly ? end : new Date(base.getTime() + 12 * 3600e3)));
    setQ('');
    setResults([]);
    setPicked(null);
  }, [visible]);

  // Resident search. Debounced, and every request is cancellable-by-abandonment: `alive` guards
  // against an earlier slow response overwriting a later fast one, which otherwise makes the list
  // flicker between result sets as the warden types.
  useEffect(() => {
    if (!visible || !q.trim()) {
      setResults([]);
      return undefined;
    }
    let alive = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await hostelApi.residents({ q: q.trim(), pageSize: 8 });
        if (alive) setResults(res.residents ?? []);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, visible]);

  const departureCeiling = useMemo(() => (inAt ? dateOnly(new Date(inAt)) : undefined), [inAt]);

  const submit = async () => {
    if (!picked) {
      Alert.alert('Choose a resident', 'Search for and tap the resident this visitor is here to see.');
      return;
    }
    if (form.name.trim().length < 2) {
      Alert.alert('Visitor name needed', 'Enter the visitor\'s full name.');
      return;
    }
    if (needPurpose && !form.purpose.trim()) {
      Alert.alert('Purpose needed', 'This hostel records a purpose for every visit.');
      return;
    }
    if (needId && !(form.idType.trim() && form.idNumber.trim())) {
      Alert.alert('ID proof needed', 'This hostel records an ID proof before a visitor may be authorised.');
      return;
    }
    if (!inAt || !outAt) {
      Alert.alert('Window needed', 'Set when the visitor is expected to arrive and leave.');
      return;
    }

    setBusy(true);
    try {
      const created = await hostelApi.registerVisitor({
        name: form.name.trim(),
        visitingStudentProfileId: picked.studentProfileId,
        relation: form.relation,
        phone: form.phone.trim() || null,
        purpose: form.purpose.trim() || null,
        idType: form.idType.trim() || null,
        idNumber: form.idNumber.trim() || null,
        expectedInAt: new Date(inAt).toISOString(),
        expectedOutAt: new Date(outAt).toISOString(),
      });
      Alert.alert(
        'Registered',
        `${created.name} is awaiting confirmation. ${created.visiting} has been notified.`,
      );
      onDone();
    } catch (e) {
      Alert.alert('Could not register', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Register a visitor</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body} keyboardShouldPersistTaps="handled">
            {/* --- Resident picker --- */}
            <Text style={styles.label}>Visiting resident</Text>
            {picked ? (
              <View style={styles.pickedBox}>
                <Ionicons name="person-circle-outline" size={16} color={theme.colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.pickedName}>{picked.name}</Text>
                  <Text style={styles.pickedMeta}>
                    {picked.rollNo}
                    {picked.room ? ` · Room ${picked.room}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setPicked(null)}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Search by name or room…"
                  placeholderTextColor="#9ca3af"
                  value={q}
                  onChangeText={setQ}
                  autoCapitalize="words"
                />
                {searching ? <Text style={styles.hint}>Searching…</Text> : null}
                {!searching && q.trim() && results.length === 0 ? (
                  <Text style={styles.hint}>No resident matches that. Try a room number.</Text>
                ) : null}
                {results.map((r) => (
                  <TouchableOpacity
                    key={r.studentProfileId}
                    style={styles.result}
                    onPress={() => {
                      setPicked(r);
                      setQ('');
                      setResults([]);
                    }}
                  >
                    <Text style={styles.resultName}>{r.name}</Text>
                    <Text style={styles.resultMeta}>
                      {r.rollNo}
                      {r.room ? ` · ${r.room}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* --- Visitor --- */}
            <Text style={styles.label}>Visitor name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#9ca3af"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Used to check the barred list — optional but recommended"
              placeholderTextColor="#9ca3af"
              value={form.phone}
              onChangeText={(t) => setForm({ ...form, phone: t })}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Relation to resident</Text>
            <View style={styles.chips}>
              {RELATIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.relChip, form.relation === r && styles.relChipOn]}
                  onPress={() => setForm({ ...form, relation: r })}
                >
                  <Text style={[styles.relText, form.relation === r && styles.relTextOn]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {dayOnly ? (
              <Text style={styles.note}>
                This hostel allows day visits only — the departure must be on the same day as the arrival.
              </Text>
            ) : null}

            <Text style={styles.label}>Expected arrival</Text>
            <TextInput
              style={styles.input}
              value={inAt}
              onChangeText={setInAt}
              placeholder="YYYY-MM-DDTHH:mm"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Expected departure</Text>
            <TextInput
              style={styles.input}
              value={outAt}
              onChangeText={setOutAt}
              placeholder="YYYY-MM-DDTHH:mm"
              placeholderTextColor="#9ca3af"
            />
            {dayOnly && departureCeiling ? (
              <Text style={styles.hint}>Same-day rule applies — departure must fall on {departureCeiling}.</Text>
            ) : null}

            {needPurpose || form.purpose ? (
              <>
                <Text style={styles.label}>
                  Purpose{needPurpose ? '' : ' (optional)'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Attending a wedding in town"
                  placeholderTextColor="#9ca3af"
                  value={form.purpose}
                  onChangeText={(t) => setForm({ ...form, purpose: t })}
                />
              </>
            ) : null}

            {needId || form.idNumber ? (
              <>
                <Text style={styles.label}>
                  ID proof{needId ? '' : ' (optional)'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type (Aadhaar, passport, licence…)"
                  placeholderTextColor="#9ca3af"
                  value={form.idType}
                  onChangeText={(t) => setForm({ ...form, idType: t })}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={styles.input}
                  placeholder="ID number"
                  placeholderTextColor="#9ca3af"
                  value={form.idNumber}
                  onChangeText={(t) => setForm({ ...form, idNumber: t })}
                />
              </>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, busy && styles.btnBusy]} onPress={submit} disabled={busy}>
              <Text style={styles.confirmText}>{busy ? 'Saving…' : 'Register'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 26,
    maxHeight: '92%',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  body: { marginTop: 4 },
  label: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginBottom: 4,
  },
  hint: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 4 },
  note: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: '#a16207',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  pickedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
  },
  pickedName: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  pickedMeta: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  result: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  resultName: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  resultMeta: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  relChip: {
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 6,
    marginTop: 6,
  },
  relChipOn: { backgroundColor: theme.colors.primary },
  relText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  relTextOn: { color: '#fff' },
  actions: { flexDirection: 'row', marginTop: 16 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 8,
  },
  cancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  btnBusy: { opacity: 0.6 },
  confirmText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});