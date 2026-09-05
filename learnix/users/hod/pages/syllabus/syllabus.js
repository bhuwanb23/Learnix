import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialTemplates = [
  { id: 'S1', name: 'DBMS Syllabus', program: 'B.Tech CSE', semester: 5, units: 5, by: 'Dr. Sunita Rao', submitted: '2 hrs ago', status: 'Pending', color: '#059669' },
  { id: 'S2', name: 'Thermodynamics Syllabus', program: 'B.Tech ME', semester: 5, units: 5, by: 'Prof. Anand Krishnan', submitted: '5 hrs ago', status: 'Pending', color: '#d97706' },
  { id: 'S3', name: 'AI & ML Syllabus', program: 'B.Tech CSE', semester: 6, units: 6, by: 'Dr. Arjun Nair', submitted: 'Yesterday', status: 'Pending', color: '#2563eb' },
  { id: 'S4', name: 'Data Structures Syllabus', program: 'B.Tech CSE', semester: 5, units: 5, by: 'Dr. Meera Iyer', submitted: 'Jun 2026', status: 'Approved', color: '#2563eb' },
  { id: 'S5', name: 'Operating Systems Syllabus', program: 'B.Tech CSE', semester: 5, units: 6, by: 'Dr. Sunita Rao', submitted: 'Jun 2026', status: 'Approved', color: '#3b82f6' },
];

export default function SyllabusModule({ navigation }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [tab, setTab] = useState('Pending');

  const pending = templates.filter((t) => t.status === 'Pending');
  const visible = tab === 'Pending' ? pending : templates.filter((t) => t.status === 'Approved');

  const handleApprove = (id) => {
    const t = templates.find((x) => x.id === id);
    setTemplates(templates.map((x) => (x.id === id ? { ...x, status: 'Approved' } : x)));
    Alert.alert('Approved', `${t.name} approved and forwarded to Admin for final sign-off.`);
  };

  const handleChanges = (id) => {
    const t = templates.find((x) => x.id === id);
    Alert.alert('Changes Requested', `Feedback sent to ${t.by} for syllabus revision.`);
  };

  const handlePreview = (t) => {
    Alert.alert(t.name, `${t.program} · Sem ${t.semester}\n${t.units} units · submitted by ${t.by}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {['Pending', 'Approved'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {visible.map((t) => (
          <View key={t.id} style={styles.card}>
            <View style={[styles.syllabusIcon, { backgroundColor: t.color + '1a' }]}>
              <Ionicons name="document-text-outline" size={19} color={t.color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{t.name}</Text>
              <Text style={styles.meta}>
                {t.program} · Sem {t.semester} · {t.units} units
              </Text>
              <Text style={styles.submitted}>
                by {t.by} · {t.submitted}
              </Text>
            </View>
            {t.status === 'Pending' ? (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.changesBtn}
                  onPress={() => handleChanges(t.id)}
                >
                  <Ionicons name="create-outline" size={14} color="#d97706" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(t.id)}
                >
                  <Ionicons name="checkmark-outline" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.approvedChip}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.approvedText}>Approved</Text>
              </View>
            )}
            <TouchableOpacity style={styles.previewBtn} onPress={() => handlePreview(t)}>
              <Ionicons name="eye-outline" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}
        {visible.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-outline" size={30} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No pending syllabus approvals — all caught up!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tab: {
    paddingHorizontal: 16,
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
  list: { paddingTop: 12, paddingBottom: 24 },
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
  syllabusIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
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
  submitted: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  changesBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  approveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  approvedText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
    marginLeft: 4,
  },
  previewBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 28,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
});