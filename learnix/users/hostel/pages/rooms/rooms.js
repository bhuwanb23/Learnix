import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hostelApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';
import RoomDetail from './pages/room_detail/room_detail';

const BLOCK_COLORS = ['#2563eb', '#0891b2', '#059669', '#d97706', '#7c3aed'];

export default function RoomsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await hostelApi.rooms();
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const blockIdx = Math.min(selectedBlockIdx, (data?.blocks?.length ?? 1) - 1);

  // Filter rooms by search
  const filteredRooms = useMemo(() => {
    if (!data) return [];
    const block = data.blocks[blockIdx];
    if (!block) return [];
    if (!search) return block.roomList;
    const q = search.toLowerCase();
    return block.roomList.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }, [data, blockIdx, search]);

  if (selectedRoom) {
    return (
      <RoomDetail
        roomNumber={selectedRoom.number}
        onBack={() => {
          setSelectedRoom(null);
          load();
        }}
      />
    );
  }

  // Skeleton loading state
  if (loading && !data) {
    return (
      <View style={styles.container}>
        <SkeletonStatRow style={{ marginTop: 16 }} />
        <View style={{ marginTop: 16 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="cloud-offline-outline" size={32} color={theme.colors.textMuted} />
        <Text style={[styles.muted, { marginTop: 8 }]}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const blocks = data.blocks;
  const block = blocks[blockIdx];
  const color = BLOCK_COLORS[blockIdx % BLOCK_COLORS.length];
  const totalOccupied = blocks.reduce((n, b) => n + b.occupied, 0);
  const totalCapacity = blocks.reduce((n, b) => n + b.capacity, 0);
  const vacantBeds = totalCapacity - totalOccupied;
  const fullRooms = blocks.reduce(
    (n, b) => n + b.roomList.filter((r) => r.status === 'Full').length,
    0,
  );

  const getStatusStyle = (status) => {
    if (status === 'Full') return { bg: '#fee2e2', color: '#dc2626' };
    if (status === 'Partial') return { bg: '#fef3c7', color: '#d97706' };
    return { bg: '#dcfce7', color: '#059669' };
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {/* Stats Row */}
      <AnimatedCard delay={0} style={styles.statsRowWrap}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalOccupied}</Text>
            <Text style={styles.statLabel}>Occupied Beds</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{vacantBeds}</Text>
            <Text style={styles.statLabel}>Vacant Beds</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{fullRooms}</Text>
            <Text style={styles.statLabel}>Full Rooms</Text>
          </View>
        </View>
      </AnimatedCard>

      {/* Block Tabs */}
      <View style={styles.blockTabs}>
        {blocks.map((b, i) => (
          <TouchableOpacity
            key={b.id}
            style={[styles.blockTab, blockIdx === i && styles.blockTabActive]}
            onPress={() => { setSelectedBlockIdx(i); setSearch(''); }}
          >
            <Text style={[styles.blockTabText, blockIdx === i && styles.blockTabTextActive]}>
              {b.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Block Summary Card */}
      <AnimatedCard delay={60}>
        <View style={styles.blockCard}>
          <View style={styles.blockHeader}>
            <View>
              <Text style={styles.blockName}>{block.name}</Text>
              <Text style={styles.blockSub}>
                {block.occupied} of {block.capacity} beds · {block.rooms} rooms
              </Text>
            </View>
            <View style={[styles.pctChip, { backgroundColor: color + '1a' }]}>
              <Text style={[styles.pctText, { color }]}>{block.occupancyPct}%</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${block.occupancyPct}%`, backgroundColor: color }]}
            />
          </View>
        </View>
      </AnimatedCard>

      {/* Search */}
      <View style={{ marginTop: 14 }}>
        <SearchBar placeholder="Search room number or status…" onSearch={setSearch} />
      </View>

      {/* Room count */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Rooms — {block.name}</Text>
        <Text style={styles.resultCount}>{filteredRooms.length} rooms</Text>
      </View>

      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <EmptyState
          icon="bed-outline"
          title="No rooms match"
          subtitle={`Try a different search in ${block.name}`}
          color={color}
        />
      ) : (
        <View style={styles.roomGrid}>
          {filteredRooms.map((room, idx) => {
            const st = getStatusStyle(room.status);
            return (
              <AnimatedCard
                key={room.id}
                onPress={() => setSelectedRoom({ number: room.number })}
                delay={idx * 30}
                style={styles.roomCardInner}
              >
                <View style={styles.roomTop}>
                  <Text style={styles.roomId}>{room.number}</Text>
                  <View style={[styles.roomStatus, { backgroundColor: st.bg }]}>
                    <Text style={[styles.roomStatusText, { color: st.color }]}>{room.status}</Text>
                  </View>
                </View>
                <View style={styles.bedRow}>
                  {Array.from({ length: room.capacity }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.bed,
                        i < room.occupied ? { backgroundColor: color } : styles.bedEmpty,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.roomMeta}>
                  {room.occupied}/{room.capacity} beds
                </Text>
              </AnimatedCard>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  retryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  statsRowWrap: { marginTop: 16, padding: 0 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  blockTabs: {
    flexDirection: 'row',
    marginTop: 14,
  },
  blockTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  blockTabActive: { backgroundColor: theme.colors.primary },
  blockTabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  blockTabTextActive: { color: '#fff' },
  blockCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginTop: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockName: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  blockSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pctChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pctText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
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
  resultCount: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  roomCardInner: {
    width: '31.5%',
    padding: 10,
    marginBottom: 10,
  },
  roomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomId: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  roomStatus: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  roomStatusText: { fontSize: 8, fontFamily: 'Manrope-Bold' },
  bedRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  bed: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    marginHorizontal: 1.5,
  },
  bedEmpty: { backgroundColor: '#e5e7eb' },
  roomMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 6,
  },
});
