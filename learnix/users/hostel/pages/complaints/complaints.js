import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialComplaints = [
  { id: '1', title: 'Water leakage in bathroom', room: 'B-210', by: 'Arjun Mehta', type: 'Plumbing', severity: 'High', status: 'Open', age: '2 days', desc: 'Ceiling pipe leaking since Monday, floor constantly wet.' },
  { id: '2', title: 'Wi-Fi down on Floor 3', room: 'C-Floor 3', by: 'Vikram Nair', type: 'Network', severity: 'Medium', status: 'Assigned', age: '1 day', desc: 'No connectivity since yesterday evening on the whole floor.' },
  { id: '3', title: 'Broken window grill', room: 'A-105', by: 'Divya Menon', type: 'Maintenance', severity: 'Low', status: 'Open', age: '3 days', desc: 'Grill on the corridor window is loose and swinging.' },
  { id: '4', title: 'AC not cooling in room', room: 'B-308', by: 'Rahul Verma', type: 'Electrical', severity: 'Medium', status: 'Resolved', age: '1 hr ago', desc: 'AC blowing warm air, filter may need cleaning.' },
  { id: '5', title: 'Mess sink clogged', room: 'Mess Hall', by: 'Mess Staff', type: 'Plumbing', severity: 'High', status: 'Assigned', age: '5 hrs', desc: 'Kitchen sink draining very slowly, backup risk at dinner.' },
  { id: '6', title: 'Lift stuck between floors', room: 'Block C Lift', by: 'Karan Singh', type: 'Electrical', severity: 'High', status: 'Resolved', age: 'Yesterday', desc: 'Lift halted between 2nd and 3rd floor, occupants evacuated safely.' },
];

const categories = ['All', 'Plumbing', 'Electrical', 'Network', 'Maintenance'];

const severityStyle = (s) => {
  if (s === 'High') return { bg: '#fee2e2', color: '#dc2626' };
  if (s === 'Medium') return { bg: '#fef3c7', color: '#d97706' };
  return { bg: '#e0e7ff', color: '#4f46e5' };
};

const statusStyle = (s) => {
  if (s === 'Resolved') return { bg: '#dcfce7', color: '#059669' };
  if (s === 'Assigned') return { bg: '#dbeafe', color: '#2563eb' };
  return { bg: '#fef3c7', color: '#d97706' };
};

export default function ComplaintsModule({ navigation }) {
  const [complaints, setComplaints] = useState(initialComplaints);
  const [category, setCategory] = useState('All');
  const [tab, setTab] = useState('All');

  const filtered = complaints.filter((c) => {
    const matchesCat = category === 'All' || c.type === category;
    const matchesTab =
      tab === 'All' ||
      (tab === 'Open' && c.status !== 'Resolved') ||
      (tab === 'Resolved' && c.status === 'Resolved');
    return matchesCat && matchesTab;
  });

  const openCount = complaints.filter((c) => c.status !== 'Resolved').length;

  const handleAssign = (id) => {
    setComplaints(
      complaints.map((c) => (c.id === id ? { ...c, status: 'Assigned' } : c))
    );
    Alert.alert('Assigned', 'Maintenance staff notified with the complaint details.');
  };

  const handleResolve = (id) => {
    setComplaints(
      complaints.map((c) => (c.id === id ? { ...c, status: 'Resolved' } : c))
    );
    Alert.alert('Resolved', 'Complaint marked resolved and closed.');
  };

  const handleNew = () => {
    Alert.alert('New Complaint', 'Log a complaint on behalf of a resident — room, type and description.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{openCount}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>4</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>2.1 days</Text>
          <Text style={styles.statLabel}>Avg. Resolution</Text>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {['All', 'Open', 'Resolved'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.newBtn} onPress={handleNew}>
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.newText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.map((c) => {
          const sev = severityStyle(c.severity);
          const st = statusStyle(c.status);
          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.typeIcon}>
                  <Ionicons
                    name={
                      c.type === 'Plumbing'
                        ? 'water-outline'
                        : c.type === 'Electrical'
                        ? 'flash-outline'
                        : c.type === 'Network'
                        ? 'wifi-outline'
                        : 'construct-outline'
                    }
                    size={17}
                    color="#2563eb"
                  />
                </View>
                <View style={styles.cardHeader}>
                  <Text style={styles.title} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.meta}>
                    {c.room} · by {c.by} · {c.age} ago
                  </Text>
                </View>
                <View style={[styles.sevChip, { backgroundColor: sev.bg }]}>
                  <Text style={[styles.sevText, { color: sev.color }]}>{c.severity}</Text>
                </View>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{c.desc}</Text>
              <View style={styles.cardBottom}>
                <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.color }]}>{c.status}</Text>
                </View>
                {c.status === 'Open' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.resolveBtn}
                      onPress={() => handleResolve(c.id)}
                    >
                      <Text style={styles.resolveText}>Resolve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => handleAssign(c.id)}
                    >
                      <Ionicons name="construct-outline" size={13} color="#fff" />
                      <Text style={styles.assignText}>Assign</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {c.status === 'Assigned' && (
                  <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => handleResolve(c.id)}
                  >
                    <Text style={styles.resolveText}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 'auto',
  },
  newText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  chipsRow: { flexGrow: 0, marginTop: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  chipTextActive: { color: '#fff' },
  list: { paddingTop: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardHeader: { flex: 1 },
  title: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sevChip: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  sevText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },
  desc: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginTop: 9,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  statusChip: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  actions: {
    flexDirection: 'row',
  },
  resolveBtn: {
    backgroundColor: '#dcfce7',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginLeft: 8,
  },
  resolveText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginLeft: 8,
  },
  assignText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
});