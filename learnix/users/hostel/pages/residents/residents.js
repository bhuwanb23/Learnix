import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hostelApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonCard } from '../../../../components/ui';
import ResidentDetail from './pages/resident_detail/resident_detail';

/**
 * The resident directory.
 *
 * WHY FILTERING MOVED TO THE SERVER
 * ---------------------------------
 * This screen used to fetch every resident and then `.filter()` in JS. That is wrong twice
 * over: it only ever searched the rows the browser already had, and it silently ignored
 * every resident past the first page. Worse, `listResidents` was fetching ALL rent dues for
 * ALL residents on every load so the client could sum them. At 32 residents that is fine;
 * a hostel with a few thousand beds is the normal case, not the exception.
 *
 * So each filter is a query parameter, they combine with AND, and "Load more" APPENDS
 * pages. Changing a filter resets to page 1 — appending to a filtered-out list would leave
 * rows on screen that no longer match.
 *
 * WHY ROLL NUMBER IS IN THE SEARCH BOX
 * ------------------------------------
 * Roll number is the identifier `allocateBed` asks a warden to type, so it is the thing
 * they are most likely to have in hand when someone knocks on the office door. The old
 * inline query did not even select the column, so no search term could match it.
 */

const PAGE_SIZE = 20;

/**
 * A stable colour per block name, hashed rather than looked up.
 *
 * The previous version mapped 'Block A'/'Block B'/'Block C' explicitly and fell back to one
 * colour for everything else. A fourth block would have looked identical to Block A with no
 * way to tell, and adding a real block would have meant editing this file.
 */
function blockColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ['#2563eb', '#0891b2', '#059669', '#b45309', '#7c3aed', '#be123c'][h % 6];
}

const rupees = (minor) =>
  `₹${Math.round((minor ?? 0) / 100).toLocaleString('en-IN')}`;

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
}

export default function ResidentsModule() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [facets, setFacets] = useState(null);

  const [query, setQuery] = useState('');
  const [block, setBlock] = useState(undefined);
  const [feeStatus, setFeeStatus] = useState(undefined);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  /**
   * Facets come from their own endpoint rather than being scraped out of the current page:
   * a block whose residents are all on page 2 would otherwise vanish from the chips.
   *
   * A failure here is swallowed on purpose. The chips are an enhancement — the directory
   * still works without them, and an error screen over a working list would be worse than
   * no chips at all.
   */
  const loadFacets = useCallback(async () => {
    try {
      setFacets(await hostelApi.residentFacets());
    } catch {
      setFacets(null);
    }
  }, []);

  const fetchPage = useCallback(
    async (targetPage, mode) => {
      try {
        if (mode === 'append') setLoadingMore(true);
        else if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await hostelApi.residents({
          q: query || undefined,
          block,
          feeStatus,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setPagination(res.pagination ?? null);
        setItems((prev) => (mode === 'append' ? [...prev, ...(res.residents ?? [])] : res.residents ?? []));
      } catch (e) {
        setError(e.message || 'Failed to load residents');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [query, block, feeStatus],
  );

  useEffect(() => {
    loadFacets();
  }, [loadFacets]);

  // Debounced. `SearchBar` already debounces `onSearch`, but each keystroke still restarts a
  // timer per character and this is a round trip — 300ms collapses a typed word into one
  // request. An empty box fires immediately, because clearing the filter should feel free.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchPage(1, 'replace');
    }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, block, feeStatus, fetchPage]);

  const loadMore = () => {
    if (!pagination || page >= pagination.totalPages) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next, 'append');
  };

  /** Every block that currently has residents, plus its live count. */
  const blocks = useMemo(() => facets?.blocks ?? [], [facets]);

  // Tapping the active chip clears that filter, so a chip row is its own off switch.
  const setBlockFilter = useCallback((v) => setBlock((prev) => (prev === v ? undefined : v)), []);
  const setFeeFilter = useCallback((v) => setFeeStatus((prev) => (prev === v ? undefined : v)), []);

  if (selected) {
    return (
      <ResidentDetail
        studentProfileId={selected.studentProfileId}
        onBack={() => {
          setSelected(null);
          // The resident may have been transferred or vacated from the detail screen, so
          // the list is re-read rather than assumed current.
          fetchPage(1, 'replace');
          loadFacets();
        }}
      />
    );
  }

  if (loading && items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={{ marginTop: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  const canLoadMore = pagination && page < pagination.totalPages;

  return (
    <View style={styles.container}>
      <View style={{ marginTop: 14 }}>
        <SearchBar
          placeholder="Search name, roll no, room or bed…"
          onSearch={setQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {blocks.map((b) => {
          const active = block === b.name;
          const color = blockColor(b.name);
          return (
            <TouchableOpacity
              key={b.name}
              style={[styles.filterChip, active && { backgroundColor: color }]}
              onPress={() => setBlockFilter(b.name)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {b.name} · {b.count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'DUE', label: 'Fee due' },
          { key: 'CLEAR', label: 'Fee clear' },
        ].map((f) => {
          const active = feeStatus === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFeeFilter(f.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
        {(block || feeStatus || query) && (
          <TouchableOpacity
            style={styles.clearChip}
            onPress={() => {
              setQuery('');
              setBlock(undefined);
              setFeeStatus(undefined);
            }}
          >
            <Ionicons name="close" size={12} color={theme.colors.textMuted} />
            <Text style={styles.clearChipText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {pagination && (
        <Text style={styles.countLine}>
          {pagination.total} resident{pagination.total === 1 ? '' : 's'}
          {query ? ` matching “${query}”` : ''}
        </Text>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPage(1, 'replace')}
          />
        }
        onScrollToEndFailed={loadMore}
      >
        {error && items.length === 0 && <Text style={styles.errorText}>{error}</Text>}

        {items.length === 0 && !error && (
          <EmptyState
            icon="people-outline"
            title="No residents match"
            subtitle="Try a different search term or clear the filters"
            color="#0891b2"
          />
        )}

        {items.map((r, idx) => {
          const color = blockColor(r.block);
          return (
            <AnimatedCard
              key={r.allocationId}
              onPress={() => setSelected(r)}
              delay={Math.min(idx, 10) * 40}
              style={styles.card}
            >
              <View style={[styles.avatar, { backgroundColor: color + '1a' }]}>
                <Text style={[styles.avatarText, { color }]}>{r.name.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{r.name}</Text>
                {/* Roll number is the field a warden scans for, so it leads the meta line. */}
                <Text style={styles.meta}>{r.rollNo}</Text>
                <View style={styles.roomChip}>
                  <Ionicons name="bed-outline" size={11} color={color} />
                  <Text style={[styles.roomText, { color }]}>{r.bedLabel}</Text>
                </View>
              </View>
              {r.duesCount > 0 ? (
                <View style={styles.dueChip}>
                  <Text style={styles.dueText}>{rupees(r.outstandingMinor)} due</Text>
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

        {canLoadMore && (
          <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
            <Text style={styles.loadMoreText}>
              {loadingMore
                ? 'Loading…'
                : `Load more (${pagination.total - items.length} remaining)`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, alignItems: 'center' },
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
    marginTop: 4,
  },
  list: { paddingBottom: 24, paddingTop: 8 },
  errorText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: '#dc2626' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontFamily: 'Manrope-Bold' },
  cardBody: { flex: 1 },
  name: { fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text },
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
  roomText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', marginLeft: 4 },
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
  loadMore: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.primary },
});