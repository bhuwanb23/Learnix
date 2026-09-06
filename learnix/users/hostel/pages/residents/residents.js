import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hostelApi } from '../../../../services/api';
import ResidentDetail from './pages/resident_detail/resident_detail';

const BLOCK_COLORS = { 'Block A': '#2563eb', 'Block B': '#0891b2', 'Block C': '#059669' };

export default function ResidentsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('All');
  const [selectedResident, setSelectedResident] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await hostelApi.residents());
    } catch (e) {
      setError(e.message || 'Failed to load residents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const blockNames = useMemo(
    () => ['All', ...new Set((data ?? []).map((r) => r.block))],
    [data],
  );

  if (selectedResident) {
    return (
      <ResidentDetail
        studentProfileId={selectedResident.studentProfileId}
        onBack={() => {
          setSelectedResident(null);
          load(); // refresh dues after rent collection
        }}
      />
    );
  }

  const filtered = (data ?? []).filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.room.toLowerCase().includes(q) ||
      r.bedLabel.toLowerCase().includes(q);
    const matchesBlock = blockFilter === 'All' || r.block === blockFilter;
    return matchesSearch && matchesBlock;
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, room or bed…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <View style={styles.filterRow}>
        {blockNames.map((b) => (
          <TouchableOpacity
            key={b}
            style={[styles.filterChip, blockFilter === b && styles.filterChipActive]}
            onPress={() => setBlockFilter(b)}
          >
            <Text style={[styles.filterText, blockFilter === b && styles.filterTextActive]}>
              {b === 'All' ? 'All Blocks' : b}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {error && !data && <Text style={styles.errorText}>{error}</Text>}
        {loading && !data && <Text style={styles.muted}>Loading residents…</Text>}
        {data && filtered.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={28} color={theme.colors.textMuted} />
            <Text style={styles.muted}>No residents match your search.</Text>
          </View>
        )}
        {filtered.map((r) => {
          const color = BLOCK_COLORS[r.block] ?? '#2563eb';
          return (
            <TouchableOpacity
              key={r.allocationId}
              style={styles.card}
              onPress={() => setSelectedResident(r)}
            >
              <View style={[styles.avatar, { backgroundColor: color + '1a' }]}>
                <Text style={[styles.avatarText, { color }]}>{r.name.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.meta}>{r.phone || 'No phone on file'}</Text>
                <View style={styles.roomChip}>
                  <Ionicons name="bed-outline" size={11} color={color} />
                  <Text style={[styles.roomText, { color }]}>
                    {r.room} · Bed {r.bedLabel}
                  </Text>
                </View>
              </View>
              {r.duesCount > 0 ? (
                <View style={styles.dueChip}>
                  <Text style={styles.dueText}>₹{Math.round(r.outstandingMinor / 100).toLocaleString('en-IN')} due</Text>
                </View>
              ) : (
                <View style={styles.clearChip}>
                  <Ionicons name="checkmark" size={12} color="#059669" />
                  <Text style={styles.clearText}>Clear</Text>
                </View>
              )}
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
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
    marginBottom: 6,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  filterTextActive: { color: '#fff' },
  list: { paddingBottom: 24, paddingTop: 12 },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  errorText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: '#dc2626' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
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
  cardBody: { flex: 1 },
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
    fontFamily: 'Manrope-SemiBold',
    marginLeft: 4,
  },
  dueChip: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  dueText: { fontSize: 10, fontFamily: 'Manrope-Bold', color: '#dc2626' },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  clearText: { fontSize: 10, fontFamily: 'Manrope-Bold', color: '#059669', marginLeft: 2 },
});
