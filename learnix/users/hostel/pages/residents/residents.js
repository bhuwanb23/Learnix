import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hostelApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
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
          load();
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

  // Skeleton loading
  if (loading && !data) {
    return (
      <View style={styles.container}>
        <SkeletonStatRow style={{ marginTop: 16 }} />
        <View style={{ marginTop: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ marginTop: 14 }}>
        <SearchBar placeholder="Search name, room or bed…" onSearch={setSearch} />
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
        {data && filtered.length === 0 && (
          <EmptyState
            icon="people-outline"
            title="No residents match"
            subtitle="Try a different search or block filter"
            color="#0891b2"
          />
        )}
        {filtered.map((r, idx) => {
          const color = BLOCK_COLORS[r.block] ?? '#2563eb';
          return (
            <AnimatedCard
              key={r.allocationId}
              onPress={() => setSelectedResident(r)}
              delay={idx * 40}
              style={styles.card}
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
            </AnimatedCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
