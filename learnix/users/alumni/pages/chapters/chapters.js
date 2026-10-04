import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import ChapterDetail from './pages/chapter_detail/chapter_detail';

const COLORS = ['#2563eb', '#059669', '#0891b2', '#d97706', '#dc2626', '#7c3aed'];

const SORTS = [
  { id: 'city', label: 'A–Z' },
  { id: 'members', label: 'Most members' },
  { id: 'activity', label: 'Most active' },
];

/**
 * City chapters — regional directory, chapter events, members, announcements,
 * activities.
 *
 * `GET /chapters` returns `{ count, totalMembers, chapters[] }`. An earlier
 * version of this screen treated the response as a bare array; the object shape
 * is what carries the aggregate totals, and reading it as an array silently
 * produced a chapter list of `undefined`.
 */
export default function ChaptersModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('city');
  const [selected, setSelected] = useState(null);

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        setData(await alumniApi.chapters());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Sorting and searching happen client-side over an already-complete list:
  // a chapter directory is a handful of rows, so paging it would add a round
  // trip per keystroke for no benefit.
  const chapters = useMemo(() => {
    const list = (data?.chapters ?? []).filter((c) =>
      (query || '').toLowerCase() === '' ? true : c.city.toLowerCase().includes(query.toLowerCase()),
    );
    const sorted = [...list];
    if (sort === 'members') sorted.sort((a, b) => b.memberCount - a.memberCount);
    else if (sort === 'activity') {
      sorted.sort((a, b) => b.upcomingEventCount - a.upcomingEventCount || b.memberCount - a.memberCount);
    } else sorted.sort((a, b) => a.city.localeCompare(b.city));
    return sorted;
  }, [data, query, sort]);

  if (selected) {
    return (
      <ChapterDetail
        chapterId={selected}
        navigation={{ goBack: () => setSelected(null) }}
      />
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.container}>
        <SkeletonStatRow count={3} style={{ paddingHorizontal: 16, marginTop: 16 }} />
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={{ marginHorizontal: 16, marginBottom: 8 }} />
        ))}
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = [
    { label: 'Chapters', value: String(data?.count ?? 0), icon: 'location-outline', color: '#2563eb' },
    { label: 'Members', value: String(data?.totalMembers ?? 0), icon: 'people-outline', color: '#059669' },
    {
      label: 'Events ahead',
      value: String((data?.chapters ?? []).reduce((s, c) => s + c.upcomingEventCount, 0)),
      icon: 'calendar-outline',
      color: '#d97706',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
        <SearchBar placeholder="Search chapter city…" onSearch={setQuery} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
      >
        {SORTS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.chip, sort === s.id && styles.chipActive]}
            onPress={() => setSort(s.id)}
          >
            <Text style={[styles.chipText, sort === s.id && styles.chipTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.countText}>{chapters.length} chapters</Text>

      {chapters.map((c, idx) => {
        const color = COLORS[idx % COLORS.length];
        return (
          <AnimatedCard key={c.id} delay={Math.min(idx, 8) * 40} style={styles.chapterCard} onPress={() => setSelected(c.id)}>
            <View style={[styles.cityIcon, { backgroundColor: color + '1a' }]}>
              <Ionicons name="location" size={18} color={color} />
            </View>
            <View style={styles.chapterBody}>
              <Text style={styles.chapterCity}>{c.city} Chapter</Text>
              <Text style={styles.chapterMeta}>
                {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
                {c.president ? ` · ${c.president.name}` : ''}
              </Text>
              {c.president?.company ? <Text style={styles.chapterMeta}>{c.president.company}</Text> : null}
              <View style={styles.badgeRow}>
                <View style={[styles.miniChip, { backgroundColor: color + '18' }]}>
                  <Ionicons name="calendar-outline" size={10} color={color} />
                  <Text style={[styles.miniChipText, { color }]}>
                    {c.upcomingEventCount} upcoming
                  </Text>
                </View>
                <View style={[styles.miniChip, { backgroundColor: color + '18' }]}>
                  <Ionicons name="albums-outline" size={10} color={color} />
                  <Text style={[styles.miniChipText, { color }]}>{c.eventCount} events</Text>
                </View>
              </View>
              {c.nextEventAt ? (
                <View style={styles.eventChip}>
                  <Ionicons name="time-outline" size={11} color={color} />
                  <Text style={[styles.eventText, { color }]}>
                    Next —{' '}
                    {new Date(c.nextEventAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.msgBtn}
              onPress={() =>
                Alert.alert(
                  `${c.city} Chapter`,
                  c.president
                    ? `President: ${c.president.name}\n${c.president.role ?? ''}${
                        c.president.company ? ` at ${c.president.company}` : ''
                      }\nBatch ${c.president.graduationYear ?? '—'}`
                    : 'No president assigned yet.',
                )
              }
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#2563eb" />
            </TouchableOpacity>
          </AnimatedCard>
        );
      })}

      {chapters.length === 0 && (
        <EmptyState
          icon="location-outline"
          title="No chapters found"
          subtitle="Try a different city search"
          color="#059669"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginHorizontal: 4 },
  statValue: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text, marginTop: 8 },
  statLabel: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },

  chipsRow: { marginTop: 12 },
  chipsContent: { paddingHorizontal: 16, gap: 6 },
  chip: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextActive: { color: '#fff' },

  countText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginHorizontal: 16, marginTop: 12, marginBottom: 4 },

  chapterCard: { flexDirection: 'row', alignItems: 'center', padding: 14, marginHorizontal: 16, marginTop: 10 },
  cityIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  chapterBody: { flex: 1, marginRight: 8 },
  chapterCity: { fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  chapterMeta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  miniChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, gap: 3 },
  miniChipText: { fontSize: 9, fontFamily: 'Manrope-SemiBold' },
  eventChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 7, gap: 4 },
  eventText: { fontSize: 10, fontFamily: 'Manrope-Bold' },
  msgBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
});