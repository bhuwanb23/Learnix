import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialVisitors = [
  { id: '1', name: 'Rajesh Reddy', visiting: 'Sneha Reddy', room: 'A-101', relation: 'Father', in: '4:10 PM', out: null, phone: '98450 12345' },
  { id: '2', name: 'Meena Sharma', visiting: 'Priya Sharma', room: 'A-101', relation: 'Mother', in: '3:40 PM', out: null, phone: '98123 45678' },
  { id: '3', name: 'Vijay Singh', visiting: 'Karan Singh', room: 'C-302', relation: 'Brother', in: '11:20 AM', out: '1:05 PM', phone: '98989 12321' },
  { id: '4', name: 'Lakshmi Nair', visiting: 'Vikram Nair', room: 'C-115', relation: 'Aunt', in: '10:00 AM', out: '12:30 PM', phone: '97450 90909' },
  { id: '5', name: 'Suresh Menon', visiting: 'Divya Menon', room: 'A-118', relation: 'Uncle', in: 'Yesterday 6:00 PM', out: 'Yesterday 8:15 PM', phone: '98765 11223' },
];

export default function VisitorsModule({ navigation }) {
  const [visitors, setVisitors] = useState(initialVisitors);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', visiting: '', room: '', relation: '', phone: '' });

  const active = visitors.filter((v) => !v.out);
  const today = visitors.filter((v) => !String(v.in).startsWith('Yesterday'));

  const handleCheckIn = () => {
    if (!form.name.trim() || !form.visiting.trim() || !form.room.trim()) {
      Alert.alert('Incomplete', 'Visitor name, resident and room are required.');
      return;
    }
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    setVisitors([
      { id: String(Date.now()), ...form, in: time, out: null, phone: form.phone || '—' },
      ...visitors,
    ]);
    setForm({ name: '', visiting: '', room: '', relation: '', phone: '' });
    setShowForm(false);
    Alert.alert('Checked In', `${form.name} signed in and the resident was notified.`);
  };

  const handleCheckOut = (id) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    setVisitors(visitors.map((v) => (v.id === id ? { ...v, out: time } : v)));
    Alert.alert('Checked Out', 'Visitor signed out. Log updated.');
  };

  return (
    <View style={styles.container}>
      {!showForm && (
        <TouchableOpacity style={styles.checkInBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="person-add-outline" size={17} color="#fff" />
          <Text style={styles.checkInText}>Check-in Visitor</Text>
        </TouchableOpacity>
      )}

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Visitor Check-in</Text>
          <Text style={styles.formLabel}>Visitor Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#9ca3af"
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
          />
          <Text style={styles.formLabel}>Visiting (Resident)</Text>
          <TextInput
            style={styles.input}
            placeholder="Resident name"
            placeholderTextColor="#9ca3af"
            value={form.visiting}
            onChangeText={(t) => setForm({ ...form, visiting: t })}
          />
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Room</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. A-101"
                placeholderTextColor="#9ca3af"
                value={form.room}
                onChangeText={(t) => setForm({ ...form, room: t })}
              />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Relation</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Father"
                placeholderTextColor="#9ca3af"
                value={form.relation}
                onChangeText={(t) => setForm({ ...form, relation: t })}
              />
            </View>
          </View>
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleCheckIn}>
              <Text style={styles.confirmText}>Check In</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{active.length}</Text>
          <Text style={styles.statLabel}>In Campus</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{today.length}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>24</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Active Visitors</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {active.map((v) => (
          <View key={v.id} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{v.name.charAt(0)}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.visitorName}>{v.name} · {v.relation}</Text>
              <Text style={styles.visitorMeta}>
                Visiting {v.visiting} ({v.room}) · In: {v.in}
              </Text>
              <Text style={styles.visitorPhone}>{v.phone}</Text>
            </View>
            <TouchableOpacity style={styles.outBtn} onPress={() => handleCheckOut(v.id)}>
              <Ionicons name="log-out-outline" size={14} color="#fff" />
              <Text style={styles.outText}>Check Out</Text>
            </TouchableOpacity>
          </View>
        ))}
        {active.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={28} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No visitors in campus right now.</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, styles.historyTitle]}>Today's Log</Text>
        {today
          .filter((v) => v.out)
          .map((v) => (
            <View key={v.id} style={styles.logCard}>
              <View style={styles.logIcon}>
                <Ionicons name="checkmark-done-outline" size={14} color="#059669" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.logName}>{v.name} → {v.visiting} ({v.room})</Text>
                <Text style={styles.visitorMeta}>
                  In {v.in} · Out {v.out}
                </Text>
              </View>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 16,
  },
  checkInText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 6,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginTop: 16,
  },
  formTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  formRow: { flexDirection: 'row', justifyContent: 'space-between' },
  formHalf: { flex: 1, marginRight: 8 },
  formActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 11,
    marginRight: 8,
  },
  cancelText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
  },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
  },
  confirmText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
  },
  historyTitle: { marginTop: 20 },
  list: { paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  cardBody: { flex: 1, marginRight: 8 },
  visitorName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  visitorMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  visitorPhone: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  outBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  outText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 4,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  logIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logName: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
});