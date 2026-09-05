import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import AlumniDetail from './pages/alumni_detail/alumni_detail';

const stats = [
  { label: 'Total Alumni', value: '12,450', icon: 'people-outline', color: '#2563eb' },
  { label: 'Employed', value: '9,820', icon: 'briefcase-outline', color: '#059669' },
  { label: 'Entrepreneurs', value: '640', icon: 'rocket-outline', color: '#d97706' },
  { label: 'Higher Ed', value: '1,120', icon: 'school-outline', color: '#0891b2' },
];

const alumni = [
  { id: 'A1', name: 'Rohit Malhotra', batch: '2021', company: 'Google', role: 'Software Engineer', location: 'Bengaluru', status: 'Active', color: '#2563eb' },
  { id: 'A2', name: 'Sneha Iyer', batch: '2020', company: 'Microsoft', role: 'Product Manager', location: 'Hyderabad', status: 'Active', color: '#059669' },
  { id: 'A3', name: 'Arjun Nair', batch: '2019', company: 'Founder, Nova Labs', role: 'Entrepreneur', location: 'Bengaluru', status: 'Active', color: '#d97706' },
  { id: 'A4', name: 'Priya Reddy', batch: '2022', company: 'TCS', role: 'Data Analyst', location: 'Chennai', status: 'Active', color: '#0891b2' },
  { id: 'A5', name: 'Karthik Menon', batch: '2018', company: 'Amazon', role: 'Sr. Solutions Architect', location: 'Pune', status: 'Inactive', color: '#64748b' },
  { id: 'A6', name: 'Divya Sharma', batch: '2021', company: 'IIT Madras', role: 'M.Tech Scholar', location: 'Chennai', status: 'Active', color: '#dc2626' },
  { id: 'A7', name: 'Vikram Singh', batch: '2020', company: 'Flipkart', role: 'SDE-II', location: 'Bengaluru', status: 'Active', color: '#7c3aed' },
  { id: 'A8', name: 'Ananya Joshi', batch: '2023', company: 'Deloitte', role: 'Consultant', location: 'Mumbai', status: 'Active', color: '#0d9488' },
];

const batches = ['All', '2024', '2023', '2022', '2021', '2020'];

export default function AlumniDirectory({ navigation }) {
  const [query, setQuery] = useState('');
  const [batch, setBatch] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = alumni.filter((a) => {
    const matchesQuery = a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.company.toLowerCase().includes(query.toLowerCase());
    const matchesBatch = batch === 'All' || a.batch === batch;
    return matchesQuery && matchesBatch;
  });

  if (selected) {
    return (
      <AlumniDetail
        alumni={selected}
        navigation={{
          goBack: () => setSelected(null),
          openModule: (key) => navigation.openModule(key),
        }}
      />
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search alumni, company..."
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
      >
        {batches.map((b) => (
          <TouchableOpacity
            key={b}
            style={[styles.chip, batch === b && styles.chipActive]}
            onPress={() => setBatch(b)}
          >
            <Text style={[styles.chipText, batch === b && styles.chipTextActive]}>
              {b === 'All' ? 'All Batches' : `Batch ${b}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.countText}>{filtered.length} alumni found</Text>

      {filtered.map((a) => (
        <TouchableOpacity
          key={a.id}
          style={styles.card}
          onPress={() => setSelected(a)}
          activeOpacity={0.8}
        >
          <View style={[styles.avatar, { backgroundColor: a.color + '1a' }]}>
            <Text style={[styles.avatarText, { color: a.color }]}>
              {a.name.split(' ').map((n) => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{a.name}</Text>
              <View style={[styles.statusChip, { backgroundColor: a.status === 'Active' ? '#dcfce7' : '#f1f5f9' }]}>
                <Text style={[styles.statusText, { color: a.status === 'Active' ? '#059669' : '#64748b' }]}>
                  {a.status}
                </Text>
              </View>
            </View>
            <Text style={styles.role}>{a.role} · {a.company}</Text>
            <Text style={styles.meta}>
              Batch {a.batch} · {a.location}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  chipsRow: {
    marginTop: 12,
  },
  chipsContent: {
    paddingHorizontal: 16,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  chipTextActive: {
    color: '#fff',
  },
  countText: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Manrope-ExtraBold',
  },
  cardBody: { flex: 1, marginRight: 8 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginRight: 8,
  },
  statusChip: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },
  role: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  meta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});