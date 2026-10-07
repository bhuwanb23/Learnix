import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hostelApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';
import RoomDetail from './pages/room_detail/room_detail';

const PAGE_SIZE = 24;

/**
 * The room directory.
 *
 * WHY FILTERING MOVED TO THE SERVER
 * ---------------------------------
 * This screen used to fetch every room in the institution and filter in JS. That is wrong
 * twice over: a search term can only match rows the browser already holds, and it silently
 * ignores every room past the first page.
 *
 * WHY BLOCK COLOUR IS HASHED, NOT INDEXED
 * ---------------------------------------
 * It used to be `BLOCK_COLORS[blockIdx]` — the colour came from the chip's POSITION, so
 * tapping a different tab changed the colour of the block you were looking at, and a fourth
 * block had no colour of its own. Hashing the block NAME makes the colour a property of the
 * block, which is the thing it was always meant to be.
 *
 * WHY THE STAT ROW DOES NOT MOVE WHEN YOU FILTER
 * ----------------------------------------------
 * Totals come from the unfiltered institution on purpose. A row reading "Occupied 31" that
 * became "Occupied 2" the moment you typed in the search box would make the filters
 * unreadable — you could not tell a filter result from the state of the hostel.
 */

function blockColor(name) {
  let h = 0;
  for (let i = 0; i < String(name ?? '').length; i++) h = (h * 31 + String(name)[i].charCodeAt(0)) >>> 0;
  return ['#2563eb', '#0891b2', '#059669', '#d97706', '#7c3aed', '#be123c'][h % 6];
}

/** One style per rollup. `Maintenance` is a real state: a room whose every bed is withdrawn. */
const STATUS_STYLE = {
  Vacant: { bg: '#dcfce7', color: '#059669' },
  Partial: { bg: '#fef3c7', color: '#d97706' },
  Full: { bg: '#fee2e2', color: '#dc2626' },
  Maintenance: { bg: '#ede9fe', color: '#6d28d9' },
};

const statusStyle = (status) => STATUS_STYLE[status] ?? STATUS_STYLE.Vacant;

export default function RoomsModule() {
  const [rooms, setRooms] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [facets, setFacets] = useState(null);
  const [totals, setTotals] = useState(null);

  const [query, setQuery] = useState('');
  const [block, setBlock] = useState(undefined);
  const [floor, setFloor] = useState(undefined);
  const [status, setStatus] = useState(undefined);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const fetchPage = useCallback(
    async (targetPage, mode) => {
      try {
        if (mode === 'append') setLoadingMore(true);
        else if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await hostelApi.rooms({
          q: query || undefined,
          block,
          floor,
          status,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setPagination(res.pagination ?? null);
        setFacets(res.facets ?? null);
        setTotals(res.totals ?? null);
        setRooms((prev) => (mode === 'append' ? [...prev, ...(res.rooms ?? [])] : res.rooms ?? []));
      } catch (e) {
        setError(e.message || 'Failed to load rooms');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [query, block, floor, status],
  );

  // Debounced: `SearchBar` already debounces `onSearch`, but each keystroke still restarts a
  // timer per character and this is a round trip. An empty box fires immediately, because
  // clearing the filter should feel free.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchPage(1, 'replace');
    }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, block, floor, status, fetchPage]);

  const loadMore = () => {
    if (!pagination || page >= pagination.totalPages) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next, 'append');
  };

  // Tapping the active chip clears that filter, so a chip row is its own off switch.
  const toggle = (setter) => (value) => setter((prev) => (prev === value ? undefined : value));

  const hasFilters = !!(block || floor !== undefined || status || query);

  const clearAll = () => {
    setQuery('');
    setBlock(undefined);
    setFloor(undefined);
    setStatus(undefined);
  };

  if (selectedRoomId) {
    return (
      <RoomDetail
        roomId={selectedRoomId}
        onBack={() => {
          setSelectedRoomId(null);
          // A resident may have been allocated, vacated or transferred from inside the detail
          // screen, and a bed may have been withdrawn, so the list is re-read rather than
          // assumed current.
          fetchPage(1, 'replace');
        }}
      />
    );
  }

  if (loading && rooms.length === 0) {
    return (
      <View style={styles.container}>
        <SkeletonStatRow style={{ marginTop: 16 }} />
        <View style={{ marginTop: 16 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 10 }} />
          ))}
        </View>
      </View>
    );
  }

  if (error && rooms.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="cloud-offline-outline" size={32} color={theme.colors.textMuted} />
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPage(1, 'replace')}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canLoadMore = pagination && page < pagination.totalPages;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchPage(1, 'replace')} />
      }
    >
      {/* Stats. Institution-wide, NOT filtered — see the file header. */}
      {totals && (
        <AnimatedCard delay={0} style={styles.statsRowWrap}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totals.occupied}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totals.vacant}</Text>
              <Text style={styles.statLabel}>Vacant</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totals.maintenanceBeds}</Text>
              <Text style={styles.statLabel}>In repair</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totals.fullRooms}</Text>
              <Text style={styles.statLabel}>Full rooms</Text>
            </View>
          </View>
          <Text style={styles.occupancyLine}>
            {totals.rooms} rooms · {totals.occupancyPct}% of {totals.capacity} beds occupied
          </Text>
        </AnimatedCard>
      )}

      <View style={{ marginTop: 14 }}>
        <SearchBar placeholder="Search room, bed or resident…" onSearch={setQuery} />
      </View>

      {/* Block chips, built from the blocks that actually have rooms — with live counts. */}
      <View style={styles.filterRow}>
        {(facets?.blocks ?? []).map((b) => {
          const active = block === b.id;
          const color = blockColor(b.name);
          return (
            <TouchableOpacity
              key={b.id}
              style={[styles.filterChip, active && { backgroundColor: color }]}
              onPress={toggle(setBlock)(b.id)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {b.name} · {b.rooms}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floor and status chips. */}
      <View style={styles.filterRow}>
        {(facets?.floors ?? []).map((f) => {
          const active = floor === f;
          return (
            <TouchableOpacity
              key={`f-${f}`}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={toggle(setFloor)(f)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                Floor {f}
              </Text>
            </TouchableOpacity>
          );
        })}
        {(facets?.statuses ?? []).map((s) => {
          const active = status === s;
          const st = statusStyle(s);
          return (
            <TouchableOpacity
              key={`s-${s}`}
              style={[styles.filterChip, active && { backgroundColor: st.color }]}
              onPress={toggle(setStatus)(s)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
        {hasFilters && (
          <TouchableOpacity style={styles.clearChip} onPress={clearAll}>
            <Ionicons name="close" size={12} color={theme.colors.textMuted} />
            <Text style={styles.clearChipText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {pagination && (
        <Text style={styles.countLine}>
          {pagination.total} room{pagination.total === 1 ? '' : 's'}
          {query ? ` matching “${query}”` : ''}
        </Text>
      )}

      {rooms.length === 0 && !error ? (
        <EmptyState
          icon="bed-outline"
          title="No rooms match"
          subtitle="Try a different search term, or clear the filters"
          color="#0891b2"
        />
      ) : (
        <View style={styles.roomGrid}>
          {rooms.map((room, idx) => {
            const st = statusStyle(room.status);
            const color = blockColor(room.block);
            return (
              <AnimatedCard
                key={room.id}
                onPress={() => setSelectedRoomId(room.id)}
                delay={Math.min(idx, 10) * 30}
                style={styles.roomCard}
              >
                <View style={styles.roomTop}>
                  <Text style={styles.roomId}>{room.number}</Text>
                  <View style={[styles.roomStatus, { backgroundColor: st.bg }]}>
                    <Text style={[styles.roomStatusText, { color: st.color }]}>{room.status}</Text>
                  </View>
                </View>

                {/* One dot per BED, coloured by that bed's real state. This is the thing that
                    was invisible before: a bed withdrawn for repair used to render as an empty
                    slot, indistinguishable from a free one. */}
                <View style={styles.bedRow}>
                  {room.beds.map((bed) => (
                    <View
                      key={bed.id}
                      style={[
                        styles.bedDot,
                        bed.status === 'ALLOCATED' && { backgroundColor: color },
                        bed.status === 'MAINTENANCE' && styles.bedMaintenance,
                      ]}
                    />
                  ))}
                </View>

                <Text style={styles.roomMeta}>
                  {room.occupied}/{room.capacity} · floor {room.floor}
                </Text>
                {room.maintenanceBeds > 0 && (
                  <Text style={styles.repairNote}>
                    {room.maintenanceBeds} in repair
                  </Text>
                )}
                {room.occupantNames?.length > 0 && (
                  <Text style={styles.occupantHint} numberOfLines={1}>
                    {room.occupantNames.length === 1
                      ? room.occupantNames[0]
                      : `${room.occupantNames[0]} +${room.occupantNames.length - 1}`}
                  </Text>
                )}
              </AnimatedCard>
            );
          })}
        </View>
      )}

      {canLoadMore && (
        <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
          <Text style={styles.loadMoreText}>
            {loadingMore
              ? 'Loading…'
              : `Load more (${pagination.total - rooms.length} remaining)`}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 8 },
  retryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  statsRowWrap: { marginTop: 16, padding: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  statValue: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  statLabel: {
    fontSize: 9,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  occupancyLine: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 7,
    marginBottom: 6,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  filterTextActive: { color: '#fff' },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 6,
  },
  clearChipText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    marginLeft: 3,
  },
  countLine: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 8 },
  roomCard: { width: '48.5%', padding: 11, marginBottom: 10 },
  roomTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomId: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  roomStatus: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  roomStatusText: { fontSize: 8, fontFamily: 'Manrope-Bold' },
  bedRow: { flexDirection: 'row', marginTop: 10 },
  // A maintenance bed is a slashed grey bar, not an empty slot: an empty slot reads as
  // "available", and the whole point of withdrawing a bed is that it is NOT.
  bedDot: { flex: 1, height: 6, borderRadius: 3, marginHorizontal: 1.5, backgroundColor: '#e5e7eb' },
  bedMaintenance: { backgroundColor: '#c4b5fd' },
  roomMeta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 6 },
  repairNote: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#6d28d9', marginTop: 3 },
  occupantHint: {
    fontSize: 9,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  loadMore: { alignItems: 'center', paddingVertical: 14, paddingBottom: 24 },
  loadMoreText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.primary },
});