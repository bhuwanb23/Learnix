/**
 * The barred list: who this institution does not admit.
 *
 * A BAR OUTLIVES THE VISIT
 * ------------------------
 * This is a standing fact about the institution, not a flag on one booking. That is why it is its
 * own screen rather than a field on the register sheet - a resident can withdraw an authorisation
 * and the visitor row disappears, but "this person is not admitted" must not disappear with it.
 *
 * PHONE IS THE IDENTITY, AND THE FORM SAYS SO
 * -------------------------------------------
 * Matching prefers an exact phone match and only falls back to the normalised name when no phone
 * was ever recorded. A name alone collides often enough to bar the wrong person, so the sheet
 * marks a phone-less entry as matching on name and only. That is also why removal is one tap: the
 * cost of a wrong bar is a person turned away for no reason, so undoing it has to be cheap.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { hostelApi } from '../../../../../services/api';

export default function BarredSheet({ visible, onClose, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', reason: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await hostelApi.barredVisitors());
    } catch (e) {
      Alert.alert('Could not load the barred list', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const add = async () => {
    if (form.name.trim().length < 2 || form.reason.trim().length < 2) {
      Alert.alert('Name and reason needed', 'A bar without a reason is not something the next warden can act on.');
      return;
    }
    setBusy(true);
    try {
      await hostelApi.barVisitor({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        reason: form.reason.trim(),
      });
      setForm({ name: '', phone: '', reason: '' });
      await load();
      onChanged?.();
    } catch (e) {
      Alert.alert('Could not add', e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (row) => {
    // Removal is one tap on purpose - see the note above about the cost of a wrong bar.
    Alert.alert('Remove from the barred list?', `${row.name} could then be admitted.`, [
      { text: 'Keep barred', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await hostelApi.unbarVisitor(row.id);
            await load();
            onChanged?.();
          } catch (e) {
            Alert.alert('Could not remove', e.message);
          }
        },
      },
    ]);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Barred visitors</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Matched on phone number when one is recorded. A bar stops somebody being let in — it does
            not delete the visits they already have.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body} keyboardShouldPersistTaps="handled">
            {rows.map((r) => (
              <View key={r.id} style={styles.row}>
                <Ionicons name="shield-ban-outline" size={16} color="#b91c1c" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.rowName}>{r.name}</Text>
                  <Text style={styles.rowMeta}>
                    {r.phone ? r.phone : 'No phone on record — matches on name only'}
                  </Text>
                  <Text style={styles.rowReason}>{r.reason}</Text>
                </View>
                <TouchableOpacity onPress={() => remove(r)}>
                  <Ionicons name="trash-outline" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
            {loading ? <Text style={styles.empty}>Loading…</Text> : null}
            {!loading && rows.length === 0 ? (
              <Text style={styles.empty}>Nobody is barred.</Text>
            ) : null}

            <Text style={styles.divider} />
            <Text style={styles.label}>Add somebody</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#9ca3af"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (strongly recommended)"
              placeholderTextColor="#9ca3af"
              value={form.phone}
              onChangeText={(t) => setForm({ ...form, phone: t })}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Reason — the next warden reads this"
              placeholderTextColor="#9ca3af"
              value={form.reason}
              onChangeText={(t) => setForm({ ...form, reason: t })}
              multiline
            />

            <TouchableOpacity style={[styles.addBtn, busy && { opacity: 0.6 }]} onPress={add} disabled={busy}>
              <Ionicons name="shield-ban-outline" size={15} color="#fff" />
              <Text style={styles.addText}>{busy ? 'Saving…' : 'Bar this visitor'}</Text>
            </TouchableOpacity>
          </ScrollView>
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
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  subtitle: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 6 },
  body: { marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 11,
    padding: 11,
    marginBottom: 8,
  },
  rowName: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  rowMeta: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  rowReason: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginTop: 3 },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 10 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 14 },
  label: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginBottom: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  addText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 6 },
});