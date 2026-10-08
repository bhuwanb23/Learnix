/**
 * The rules this hostel keeps, editable by the warden.
 *
 * WHY THE RULES ARE EDITABLE AT ALL
 * ---------------------------------
 * There is no such thing as a correct universal visitor policy. One campus closes at 7pm and wants
 * an ID proof from everybody. Another never closes, does not care who comes, and keeps a denylist
 * for one person. Hardcoding either would make this feature wrong somewhere, so every rule below
 * is data in `SystemConfig` and this sheet is how it is changed - no deploy, no code.
 *
 * EVERY CONTROL SAYS WHAT IT DOES
 * ------------------------------
 * The toggles are named in the warden's words ("Day visits only") and each carries the consequence
 * in plain text. A setting labelled `dayVisitsOnly` teaches nobody anything; "a visitor must leave
 * the same day they arrived" tells them what they are about to forbid.
 *
 * THE VALUES SHOWN ARE THE EFFECTIVE ONES
 * ---------------------------------------
 * Read from `GET /visitors/policy`, which overlays the stored config onto the defaults and CLAMPS
 * every field. So what this shows is what the rules module will actually apply - including when
 * the stored config is missing or malformed - rather than what somebody once typed.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { hostelApi } from '../../../../../services/api';

/** One switch: the rule, what it means, and the value it drives. */
function Rule({ label, hint, value, onChange, danger }) {
  return (
    <View style={styles.rule}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[styles.ruleLabel, danger && { color: '#dc2626' }]}>{label}</Text>
        <Text style={styles.ruleHint}>{hint}</Text>
      </View>
      <Switch
        value={value === true}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: '#bfdbfe' }}
        thumbColor={value === true ? theme.colors.primary : '#f1f5f9'}
      />
    </View>
  );
}

const isHhMm = (s) => /^\d{1,2}:\d{2}$/.test(String(s ?? '').trim());

export default function PolicySheet({ visible, onClose, onChanged }) {
  const [policy, setPolicy] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const res = await hostelApi.visitorPolicy();
        setPolicy(res.policy ?? null);
        setDefaults(res.defaults ?? null);
        setError(null);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [visible]);

  const set = (patch) => setPolicy((p) => ({ ...p, ...patch }));
  const setHours = (patch) => setPolicy((p) => ({ ...p, visitingHours: { ...p.visitingHours, ...patch } }));
  const setRepeat = (patch) => setPolicy((p) => ({ ...p, repeatAlert: { ...p.repeatAlert, ...patch } }));

  const save = async () => {
    if (!policy) return;
    // The times are validated HERE as well as on the server. A typo like "25:00" should be caught
    // while the warden is looking at the field they typed it into, not three requests later.
    if (!isHhMm(policy.visitingHours?.start) || !isHhMm(policy.visitingHours?.end)) {
      Alert.alert('Check the times', 'Visiting hours must look like 08:00.');
      return;
    }
    setBusy(true);
    try {
      const res = await hostelApi.updateVisitorPolicy(policy);
      // The RESPONSE is authoritative, not the form: the server clamps, so echoing back what it
      // stored keeps the two from drifting after an odd edit.
      setPolicy(res.policy ?? policy);
      Alert.alert('Rules saved', 'The new visitor rules apply from now on.');
      onChanged?.();
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (!defaults) return;
    setPolicy(defaults);
    Alert.alert('Defaults restored', 'Not saved yet — tap Save rules to apply.');
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Visitor rules</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>Could not load the rules: {error}</Text> : null}
          {!policy && !error ? <Text style={styles.loading}>Loading the current rules…</Text> : null}

          {policy ? (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.body} keyboardShouldPersistTaps="handled">
              <Text style={styles.group}>Approvals</Text>
              <Rule
                label="Warden confirms every visit"
                hint="A resident's authorisation waits for you before anybody may come in."
                value={policy.requireWardenApproval}
                onChange={(v) => set({ requireWardenApproval: v })}
              />
              <Rule
                label="Residents must authorise first"
                hint="Turn off for a hostel that simply logs visitors at the gate."
                value={policy.requireResidentAuthorisation}
                onChange={(v) => set({ requireResidentAuthorisation: v })}
              />

              <Text style={styles.group}>Windows</Text>
              <Rule
                label="Day visits only"
                hint="A visitor must leave on the same day they arrived. Turn off to allow overnight guests."
                value={policy.dayVisitsOnly}
                onChange={(v) => set({ dayVisitsOnly: v })}
              />
              <View style={styles.twoCol}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Doors open</Text>
                  <TextInput
                    style={styles.input}
                    value={policy.visitingHours?.start ?? ''}
                    onChangeText={(t) => setHours({ start: t })}
                    placeholder="08:00"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Doors close</Text>
                  <TextInput
                    style={styles.input}
                    value={policy.visitingHours?.end ?? ''}
                    onChangeText={(t) => setHours({ end: t })}
                    placeholder="19:00"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
              <Rule
                label="Warn about visits outside these hours"
                hint="A visit planned for 10pm raises an alert on the register form."
                value={policy.visitingHours?.enabled}
                onChange={(v) => setHours({ enabled: v })}
              />

              <Text style={styles.group}>Advance notice</Text>
              <Text style={styles.fieldLabel}>How far ahead a visit may be booked (days)</Text>
              <TextInput
                style={styles.input}
                value={String(policy.maxAdvanceDays ?? '')}
                onChangeText={(t) => set({ maxAdvanceDays: Number(t.replace(/\D/g, '')) || 0 })}
                keyboardType="number-pad"
              />
              <Text style={styles.ruleHint}>0 means no limit.</Text>

              <Text style={styles.group}>Identity</Text>
              <Rule
                label="Ask for a purpose"
                hint="Every visit records why the visitor is here."
                value={policy.requirePurpose}
                onChange={(v) => set({ requirePurpose: v })}
              />
              <Rule
                label="Require an ID proof"
                hint="Type and number recorded before a visitor may be authorised."
                value={policy.requireIdProof}
                onChange={(v) => set({ requireIdProof: v })}
              />
              <Rule
                label="Check the barred list"
                hint="Refuses entry to anybody on the list, and badges them on the register form."
                value={policy.barredCheck}
                onChange={(v) => set({ barredCheck: v })}
                danger
              />

              <Text style={styles.group}>Frequent visitors</Text>
              <Rule
                label="Warn about repeat visits"
                hint="Flags somebody visiting unusually often, so it is a decision rather than a note."
                value={policy.repeatAlert?.enabled}
                onChange={(v) => setRepeat({ enabled: v })}
              />
              <View style={styles.twoCol}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Flag from N visits</Text>
                  <TextInput
                    style={styles.input}
                    value={String(policy.repeatAlert?.count ?? '')}
                    onChangeText={(t) => setRepeat({ count: Number(t.replace(/\D/g, '')) || 2 })}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Within days</Text>
                  <TextInput
                    style={styles.input}
                    value={String(policy.repeatAlert?.withinDays ?? '')}
                    onChangeText={(t) => setRepeat({ withinDays: Number(t.replace(/\D/g, '')) || 30 })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={styles.group}>Time zone</Text>
              <Text style={styles.fieldLabel}>Minutes to add to UTC for local time</Text>
              <TextInput
                style={styles.input}
                value={String(policy.utcOffsetMinutes ?? '')}
                onChangeText={(t) => set({ utcOffsetMinutes: Number(t.replace(/[^\-0-9]/g, '')) || 0 })}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.ruleHint}>330 is India. Visiting hours are local, so this decides what "8pm" means.</Text>
            </ScrollView>
          ) : null}

          {policy ? (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.resetBtn} onPress={reset}>
                <Text style={styles.resetText}>Defaults</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, busy && { opacity: 0.6 }]} onPress={save} disabled={busy}>
                <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save rules'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
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
    paddingBottom: 22,
    maxHeight: '94%',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  error: { fontSize: 12, fontFamily: 'Manrope-Medium', color: '#dc2626', marginTop: 10 },
  loading: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 14 },
  body: { marginTop: 10 },
  group: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 4,
  },
  rule: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  ruleLabel: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  ruleHint: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  fieldLabel: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 5 },
  label: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginBottom: 4,
  },
  twoCol: { flexDirection: 'row', marginTop: 6 },
  actions: { flexDirection: 'row', marginTop: 14 },
  resetBtn: { paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center', marginRight: 6 },
  resetText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center', marginRight: 6 },
  cancelText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  saveBtn: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 12 },
  saveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});