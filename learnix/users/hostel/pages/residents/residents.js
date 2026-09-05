import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import ResidentDetail from './pages/resident_detail/resident_detail';

const residents = [
  { id: '1', name: 'Sneha Reddy', roll: '21CS118', branch: 'CSE', year: '3rd', block: 'A', room: 'A-101', bed: 'A-101-1', phone: '98765 43210', joined: 'Aug 2023', dues: '₹0' },
  { id: '2', name: 'Priya Sharma', roll: '21EC042', branch: 'ECE', year: '3rd', block: 'A', room: 'A-101', bed: 'A-101-2', phone: '98765 11223', joined: 'Aug 2023', dues: '₹0' },
  { id: '3', name: 'Ananya Iyer', roll: '21ME077', branch: 'ME', year: '3rd', block: 'A', room: 'A-101', bed: 'A-101-3', phone: '99887 66554', joined: 'Aug 2023', dues: '₹2,400' },
  { id: '4', name: 'Arjun Mehta', roll: '22CS045', branch: 'CSE', year: '2nd', block: 'B', room: 'B-204', bed: 'B-204-1', phone: '91234 56789', joined: 'Aug 2024', dues: '₹0' },
  { id: '5', name: 'Rahul Verma', roll: '22IT031', branch: 'IT', year: '2nd', block: 'B', room: 'B-204', bed: 'B-204-2', phone: '90123 45678', joined: 'Aug 2024', dues: '₹0' },
  { id: '6', name: 'Karan Singh', roll: '20CS098', branch: 'CSE', year: '4th', block: 'C', room: 'C-302', bed: 'C-302-1', phone: '98989 89898', joined: 'Aug 2022', dues: '₹1,200' },
  { id: '7', name: 'Vikram Nair', roll: '23ME054', branch: 'ME', year: '2nd', block: 'C', room: 'C-115', bed: 'C-115-1', phone: '90909 09090', joined: 'Jan 2025', dues: '₹0' },
  { id: '8', name: 'Divya Menon', roll: '22CS102', branch: 'CSE', year: '2nd', block: 'A', room: 'A-118', bed: 'A-118-1', phone: '97654 32109', joined: 'Aug 2024', dues: '₹0' },
];

const blockColors = { A: '#2563eb', B: '#0891b2', C: '#059669' };

export default function ResidentsModule({ navigation }) {
  const [search, setSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('All');
  const [selectedResident, setSelectedResident] = useState(null);

  if (selectedResident) {
    return (
      <ResidentDetail
        resident={selectedResident}
        onBack={() => setSelectedResident(null)}
      />
    );
  }

  const filtered = residents.filter((r) => {
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.roll.toLowerCase().includes(search.toLowerCase()) ||
      r.room.toLowerCase().includes(search.toLowerCase());
    const matchesBlock = blockFilter === 'All' || r.block === blockFilter;
    return matchesSearch && matchesBlock;
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, roll or room…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <View style={styles.filterRow}>
        {['All', 'A', 'B', 'C'].map((b) => (
          <TouchableOpacity
            key={b}
            style={[styles.filterChip, blockFilter === b && styles.filterChipActive]}
            onPress={() => setBlockFilter(b)}
          >
            <Text style={[styles.filterText, blockFilter === b && styles.filterTextActive]}>
              {b === 'All' ? 'All Blocks' : `Block ${b}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.map((r) => {
          const color = blockColors[r.block];
          return (
            <TouchableOpacity
              key={r.id}
              style={styles.card}
              onPress={() => setSelectedResident(r)}
            >
              <View style={[styles.avatar, { backgroundColor: color + '1a' }]}>
                <Text style={[styles.avatarText, { color }]}>{r.name.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.meta}>
                  {r.roll} · {r.branch} · {r.year} yr
                </Text>
                <View style={styles.roomChip}>
                  <Ionicons name="bed-outline" size={11} color={color} />
                  <Text style={[styles.roomText, { color }]}>
                    {r.room} · Bed {r.bed}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.text,
  },
  filterRow: { flexDirection: 'row', marginTop: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.textMuted,
  },
  filterTextActive: { color: '#fff' },
  list: { paddingBottom: 24, paddingTop: 12 },
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
    fontFamily: 'Manrope_700Bold',
  },
  cardBody: { flex: 1 },
  name: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 5,
  },
  roomText: {
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    marginLeft: 4,
  },
});