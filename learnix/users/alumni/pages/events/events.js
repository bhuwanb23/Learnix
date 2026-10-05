import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { EmptyState, SearchBar, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import EventCard from './components/EventCard';
import EventDetail from './pages/event_detail/event_detail';
import { EVENT_TYPES } from './eventMeta';

/**
 * Alumni events directory.
 *
 * Three scopes (Upcoming / Past / My registrations) crossed with the five event
 * types. Filtering and searching happen SERVER-side because `scope=mine` cannot
 * be resolved client-side at all — only the backend knows which registrations
 * belong to the viewer — so the tabs and the type chips all drive one query.
 *
 * `GET /alumni/events` returns `{ items, pagination, facets }`. An earlier
 * version read the response as `{ upcoming, completed }`; the object shape is
 * what carries the facets and the viewer's own status per row.
 */
const SCOPES = [
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { id: 'past', label: 'Past', icon: 'time-outline' },
  { id: 'mine', label: 'My events', icon: 'person-circle-outline' },
];

const SORTS = [
  { id: 'date', label: 'Date' },
  { id: 'title', label: 'A–Z' },
  { id: 'recent', label: 'Newest' },
];

export default function EventsModule({ navigation }) {
  const [scope, setScope] = useState('upcoming');
  const [type, setType] = useState(null);
  const [sort, setSort] = useState('date');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        setData(
          await alumniApi.events({
            scope,
            type: type ?? undefined,
            sort,
            q: query || undefined,
            page,
          }),
        );
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [scope, type, sort, query, page],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Changing any filter invalidates the page cursor, so a filter tap from page 3
  // cannot leave the user staring at an empty page 3.
  const applyFilter = (fn) => {
    setPage(1);
    fn();
  };

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const facets = data?.facets?.types ?? [];

  // Facet counts come from the server for the CURRENT scope, so the chips can
  // show a type that currently has zero events (greyed) rather than vanish —
  // a chip that disappears when you select it is disorienting.
  const countFor = (v) => facets.find((f) => f.type === v)?.count ?? 0;

  const headline = useMemo(() => {
    if (scope === 'mine') {
      const going = items.filter((e) => e.myStatus === 'CONFIRMED').length;
      const wait = items.filter((e) => e.myStatus === 'PENDING').length;
      return going > 0 ? `${going} going${wait ? ` · ${wait} waitlisted` : ''}` : 'Nothing booked yet';
    }
    const seats = items.reduce((s, e) => s + (e.seatsLeft ?? 0), 0);
    return items.length > 0 ? `${seats} seats open across ${items.length} event${items.length === 1 ? '' : 's'}` : '';
  }, [scope, items]);

  if (selectedId) {
    return (
      <EventDetail
        eventId={selectedId}
        navigation={{ goBack: () => setSelectedId(null), openModule: (k) => navigation?.openModule?.(k) }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Alumni Events</Text>
            <Text style={styles.heroSub}>{headline}</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="calendar" size={22} color="#fff" />
          </View>
        </View>
        {data ? (
          <View style={styles.heroStats}>
            <HeroStat value={data.pagination?.total ?? 0} label={scope === 'mine' ? 'registered' : 'events'} />
            <HeroStat
              value={items.filter((e) => e.isOnline).length}
              label="online"
            />
            <HeroStat
              value={items.reduce((s, e) => s + (e.seatsLeft ?? 0), 0)}
              label="seats"
            />
          </View>
        ) : null}
      </LinearGradient>

      {/* Scope tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabWrap}
        contentContainerStyle={styles.tabRow}
      >
        {SCOPES.map((s) => {
          const active = scope === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => applyFilter(() => setScope(s.id))}
            >
              <Ionicons name={s.icon} size={13} color={active ? '#fff' : theme.colors.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search events, venues…" onSearch={(t) => applyFilter(() => setQuery(t))} />
      </View>

      {/* Type filter + sort */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipWrap}
        contentContainerStyle={styles.chipRow}
      >
        <TouchableOpacity
          style={[styles.chip, type === null && styles.chipActive]}
          onPress={() => applyFilter(() => setType(null))}
        >
          <Text style={[styles.chipText, type === null && styles.chipTextActive]}>All types</Text>
        </TouchableOpacity>
        {EVENT_TYPES.map((t) => {
          const n = countFor(t.value);
          const active = type === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.chip,
                active && { backgroundColor: t.color, borderColor: t.color },
                !active && n === 0 && styles.chipEmpty,
              ]}
              onPress={() => applyFilter(() => setType(active ? null : t.value))}
            >
              <Ionicons name={t.icon} size={11} color={active ? '#fff' : n === 0 ? '#cbd5e1' : t.color} />
              <Text
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                  !active && n === 0 && { color: '#cbd5e1' },
                ]}
              >
                {t.label} ({n})
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.sortDivider} />
        {SORTS.map((s) => {
          const active = sort === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => applyFilter(() => setSort(s.id))}
            >
              <Ionicons
                name={s.id === 'date' ? 'calendar-outline' : s.id === 'title' ? 'text-outline' : 'sparkles-outline'}
                size={10}
                color={active ? '#fff' : theme.colors.textMuted}
              />
              <Text style={[styles.sortText, active && styles.sortTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading && !data ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonStatRow count={3} />
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
            />
          }
        >
          {items.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              showMyStatus={scope !== 'past'}
              onPress={() => setSelectedId(e.id)}
            />
          ))}

          {items.length === 0 ? (
            <EmptyState
              icon={scope === 'mine' ? 'calendar-outline' : 'search-outline'}
              title={
                scope === 'mine'
                  ? 'No registrations yet'
                  : scope === 'past'
                    ? 'No past events'
                    : 'No events found'
              }
              subtitle={
                scope === 'mine'
                  ? 'Register for an upcoming event and it will appear here.'
                  : query || type
                    ? 'Try clearing the search or type filter.'
                    : 'Check back later for new events.'
              }
              // A dead-end empty state is a dead end: the obvious next action is
              // offered rather than left to be guessed.
              actionLabel={scope === 'mine' ? 'Browse upcoming' : query || type ? 'Clear filters' : undefined}
              onAction={
                scope === 'mine'
                  ? () => applyFilter(() => setScope('upcoming'))
                  : query || type
                    ? () => {
                        setQuery('');
                        setType(null);
                      }
                    : undefined
              }
              color="#2563eb"
            />
          ) : null}

          {pagination && pagination.totalPages > 1 ? (
            <View style={styles.pager}>
              <TouchableOpacity
                style={[styles.pagerBtn, pagination.page <= 1 && styles.pagerBtnDisabled]}
                disabled={pagination.page <= 1}
                onPress={() => setPage((p) => p - 1)}
              >
                <Ionicons name="chevron-back" size={14} color="#fff" />
                <Text style={styles.pagerText}>Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pagerLabel}>
                Page {pagination.page} of {pagination.totalPages}
              </Text>
              <TouchableOpacity
                style={[
                  styles.pagerBtn,
                  pagination.page >= pagination.totalPages && styles.pagerBtnDisabled,
                ]}
                disabled={pagination.page >= pagination.totalPages}
                onPress={() => setPage((p) => p + 1)}
              >
                <Text style={styles.pagerText}>Next</Text>
                <Ionicons name="chevron-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function HeroStat({ value, label }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { marginTop: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#2563eb', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },

  hero: { padding: 18, paddingTop: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 21, fontFamily: 'Manrope-ExtraBold' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: 'Manrope-Medium', marginTop: 2 },
  heroIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 11, paddingHorizontal: 10, paddingVertical: 7 },
  heroStatValue: { color: '#fff', fontSize: 15, fontFamily: 'Manrope-ExtraBold' },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontFamily: 'Manrope-Medium' },

  tabWrap: { flexGrow: 0, marginTop: 12 },
  tabRow: { paddingHorizontal: 16, gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 11, paddingVertical: 8 },
  tabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: '#fff' },

  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  chipWrap: { flexGrow: 0, marginTop: 8 },
  chipRow: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipEmpty: { backgroundColor: '#f8fafc' },
  chipText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextActive: { color: '#fff' },
  sortDivider: { width: 1, height: 20, backgroundColor: theme.colors.border, marginHorizontal: 2 },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: theme.colors.surfaceMuted, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6 },
  sortChipActive: { backgroundColor: '#0f172a' },
  sortText: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  sortTextActive: { color: '#fff' },

  list: { padding: 16, paddingBottom: 28 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pagerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  pagerBtnDisabled: { backgroundColor: '#cbd5e1' },
  pagerText: { color: '#fff', fontSize: 11, fontFamily: 'Manrope-Bold' },
  pagerLabel: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
});