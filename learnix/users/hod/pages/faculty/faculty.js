import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import FacultyDetail from './pages/faculty_detail/faculty_detail';

const faculty = [
  { id: 'TCH001', name: 'Dr. Meera Iyer', designation: 'Professor', subjects: ['Data Structures', 'Algorithms'], classes: 4, workload: 18, maxWorkload: 24, status: 'Active', color: '#2563eb' },
  { id: 'TCH002', name: 'Dr. Sunita Rao', designation: 'Assistant Professor', subjects: ['DBMS', 'Computer Networks'], classes: 5, workload: 22, maxWorkload: 24, status: 'Active', color: '#d97706' },
  { id: 'TCH003', name: 'Prof. Sanjay Tiwari', designation: 'Assistant Professor', subjects: ['Python', 'Web Development'], classes: 5, workload: 23, maxWorkload: 24, status: 'Active', color: '#dc2626' },
  { id: 'TCH004', name: 'Dr. Arjun Nair', designation: 'Associate Professor', subjects: ['AI', 'Machine Learning'], classes: 4, workload: 19, maxWorkload: 24, status: 'Active', color: '#059669' },
  { id: 'TCH005', name: 'Dr. Priya Venkatesh', designation: 'Associate Professor', subjects: ['Computer Architecture', 'OS'], classes: 3, workload: 15, maxWorkload: 24, status: 'On Leave', color: '#0891b2' },
];

const statusStyle = (s) => {
  if (s === 'Active') return { bg: '#dcfce7', color: '#059669' };
  return { bg: '#fef3c7', color: '#d97706' };
};

export default function FacultyModule({ navigation }) {
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  if (selectedFaculty) {
    return <FacultyDetail faculty={selectedFaculty} onBack={() => setSelectedFaculty(null)} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>18</Text>
          <Text style={styles.statLabel}>Faculty</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>16</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>80%</Text>
          <Text style={styles.statLabel}>Avg Workload</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Department Faculty</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Add Faculty', 'Faculty onboarding form opens here — designation, subjects and workload.')}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>

      {faculty.map((f) => {
        const st = statusStyle(f.status);
        const pct = Math.round((f.workload / f.maxWorkload) * 100);
        return (
          <TouchableOpacity
            key={f.id}
            style={styles.card}
            onPress={() => setSelectedFaculty(f)}
          >
            <View style={[styles.avatar, { backgroundColor: f.color + '1a' }]}>
              <Text style={[styles.avatarText, { color: f.color }]}>{f.name.charAt(0)}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{f.name}</Text>
              <Text style={styles.meta}>
                {f.designation} · {f.classes} classes
              </Text>
              <View style={styles.workloadRow}>
                <View style={styles.workloadTrack}>
                  <View
                    style={[
                      styles.workloadFill,
                      { width: pct + '%', backgroundColor: pct > 90 ? '#dc2626' : pct > 75 ? '#d97706' : '#2563eb' },
                    ]}
                  />
                </View>
                <Text style={styles.workloadText}>{f.workload}/{f.maxWorkload}</Text>
              </View>
            </View>
            <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.color }]}>{f.status}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  workloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  workloadTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginRight: 8,
  },
  workloadFill: { height: 5, borderRadius: 3 },
  workloadText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});