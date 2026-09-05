import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const yearStats = [
  { year: '1st', students: 108, avg: 7.2, atRisk: 8 },
  { year: '2nd', students: 104, avg: 7.5, atRisk: 6 },
  { year: '3rd', students: 102, avg: 7.9, atRisk: 4 },
  { year: '4th', students: 96, avg: 8.1, atRisk: 3 },
];

const students = [
  { id: '1', name: 'Aarav Gupta', roll: 'CSE-22-045', year: '3rd', cgpa: 8.9, status: 'Top', color: '#059669' },
  { id: '2', name: 'Meera Joshi', roll: 'CSE-22-112', year: '3rd', cgpa: 8.4, status: 'Good', color: '#2563eb' },
  { id: '3', name: 'Kabir Anand', roll: 'CSE-21-118', year: '4th', cgpa: 9.2, status: 'Top', color: '#059669' },
  { id: '4', name: 'Rohan Kulkarni', roll: 'CSE-23-054', year: '2nd', cgpa: 6.1, status: 'At Risk', color: '#dc2626' },
  { id: '5', name: 'Divya Menon', roll: 'CSE-22-102', year: '3rd', cgpa: 7.6, status: 'Good', color: '#2563eb' },
  { id: '6', name: 'Sana Sheikh', roll: 'CSE-23-031', year: '2nd', cgpa: 5.8, status: 'At Risk', color: '#dc2626' },
];

const statusStyle = (s) => {
  if (s === 'Top') return { bg: '#dcfce7', color: '#059669' };
  if (s === 'Good') return { bg: '#dbeafe', color: '#2563eb' };
  return { bg: '#fee2e2', color: '#dc2626' };
};

export default function StudentsModule({ navigation }) {
  const [year, setYear] = useState('All');

  const filtered = year === 'All' ? students : students.filter((s) => s.year === year);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>410</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>7.8</Text>
          <Text style={styles.statLabel}>Avg CGPA</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>21</Text>
          <Text style={styles.statLabel}>At Risk</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {['All', '1st', '2nd', '3rd', '4th'].map((y) => (
          <TouchableOpacity
            key={y}
            style={[styles.chip, year === y && styles.chipActive]}
            onPress={() => setYear(y)}
          >
            <Text style={[styles.chipText, year === y && styles.chipTextActive]}>
              {y === 'All' ? 'All Years' : `${y} Year`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance by Year</Text>
        {yearStats.map((y) => (
          <View key={y.year} style={styles.yearCard}>
            <Text style={styles.yearLabel}>{y.year} Year</Text>
            <View style={styles.yearMeta}>
              <Text style={styles.yearSub}>{y.students} students</Text>
              <Text style={styles.yearSub}>{y.atRisk} at risk</Text>
            </View>
            <View style={styles.yearBarRow}>
              <Text style={styles.yearBarLabel}>CGPA</Text>
              <View style={styles.yearTrack}>
                <View
                  style={[
                    styles.yearFill,
                    {
                      width: (y.avg / 10) * 100 + '%',
                      backgroundColor: y.avg < 7 ? '#dc2626' : y.avg < 8 ? '#d97706' : '#059669',
                    },
                  ]}
                />
              </View>
              <Text style={styles.yearValue}>{y.avg}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Student List</Text>
        {filtered.map((s) => {
          const st = statusStyle(s.status);
          return (
            <View key={s.id} style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: s.color + '1a' }]}>
                <Text style={[styles.avatarText, { color: s.color }]}>{s.name.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.meta}>
                  {s.roll} · {s.year} Year
                </Text>
              </View>
              <View style={styles.cgpaWrap}>
                <Text style={styles.cgpa}>{s.cgpa}</Text>
                <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.color }]}>{s.status}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
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
  chipsRow: { flexGrow: 0, marginTop: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  chipTextActive: { color: '#fff' },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  yearCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  yearLabel: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  yearMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  yearSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  yearBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  yearBarLabel: {
    width: 40,
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  yearTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginRight: 8,
  },
  yearFill: { height: 6, borderRadius: 3 },
  yearValue: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
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
    width: 42,
    height: 42,
    borderRadius: 21,
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
  cgpaWrap: { alignItems: 'flex-end' },
  cgpa: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});