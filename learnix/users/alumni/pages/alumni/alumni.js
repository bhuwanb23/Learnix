import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import AlumniDetail from './pages/alumni_detail/alumni_detail';
import ConnectionsInbox from './pages/connections/connections';

const COLORS = ['#2563eb', '#059669', '#d97706', '#0891b2', '#dc2626', '#7c3aed', '#0d9488', '#64748b'];

const PAGE_SIZE = 20;

const SORTS = [
  { id: 'name', label: 'Name' },
  { id: 'seniority', label: 'Most senior' },
  { id: 'recent', label: 'Recently active' },
];

const LEVEL_COLOR = {
  EXPERT: '#7c3aed',
  ADVANCED: '#2563eb',
  INTERMEDIATE: '#059669',
  BEGINNER: '#64748b',
};

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Alumni Network — directory, filters, profile cards, networking.
 *
 * Filtering is SERVER-side and COMPOSABLE: every filter is a query parameter and
 * they combine with AND. Filtering client-side over one page would be both wrong
 * (a filtered list drawn from page 1 is not "all matching alumni") and would
 * silently ignore every result past the first page.
 *
 * Load-more APPENDS pages rather than replacing the list, so "Load more" means
 * what it says. Filters reset to page 1 — appending to a filtered-out list would
 * leave rows on screen that no longer match the filter.
 */
export default function AlumniDirectory({ navigation }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [facets, setFacets] = useState(null);
  const [stats, setStats] = useState(null);

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    batch: undefined,
    departmentId: undefined,
    companyId: undefined,
    sector: undefined,
    location: undefined,
    skill: undefined,
    chapterId: undefined,
    sort: 'name',
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showConnections, setShowConnections] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState(null);

  const loadFacets = useCallback(async () => {
    try {
      setFacets(await alumniApi.directoryFacets());
    } catch {
      // Facets are an enhancement: the directory still works without them, so a
      // failure here must not surface an error screen over a working list.
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

        const res = await alumniApi.directory({
          q: query || undefined,
          ...filters,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setPagination(res.pagination ?? null);
        setStats(res.stats ?? null);
        setItems((prev) => (mode === 'append' ? [...prev, ...(res.alumni ?? [])] : res.alumni ?? []));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [query, filters],
  );

  useEffect(() => {
    loadFacets();
  }, [loadFacets]);

  // Debounced: `SearchBar` already debounces its own onSearch, but each keystroke
  // still restarts a 300ms timer per character, and a directory query is a
  // round trip. 300ms here collapses a typed word into one request.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchPage(1, 'replace');
    }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, filters, fetchPage]);

  const loadMatches = useCallback(async () => {
    try {
      setMatches(await alumniApi.matches({ type: 'connections', limit: 8 }));
    } catch (e) {
      Alert.alert('Could not load suggestions', e.message);
    }
  }, []);

  const onToggleFilters = () => {
    const next = !showFilters;
    setShowFilters(next);
    if (next && !showMatches) {
      setShowMatches(true);
      loadMatches();
    }
  };

  const activeFilterCount = useMemo(
    () =>
      ['batch', 'departmentId', 'companyId', 'sector', 'location', 'skill', 'chapterId'].filter(
        (k) => filters[k] !== undefined,
      ).length,
    [filters],
  );

  const canLoadMore = pagination && page < pagination.totalPages;

  if (selected) {
    return (
      <AlumniDetail
        alumniId={selected}
        navigation={{
          goBack: () => setSelected(null),
          openModule: (key) => navigation.openModule(key),
        }}
      />
    );
  }

  if (showConnections) {
    return (
      <ConnectionsInbox
        navigation={{ goBack: () => setShowConnections(false) }}
        onOpenProfile={(id) => {
          setShowConnections(false);
          setSelected(id);
        }}
      />
    );
  }

  const statCards = [
    { label: 'Total Alumni', value: String(stats?.total ?? 0), icon: 'people-outline', color: '#2563eb' },
    {
      label: 'Departments',
      value: String(facets?.departments?.length ?? 0),
      icon: 'school-outline',
      color: '#059669',
    },
    {
      label: 'Cities',
      value: String(facets?.locations?.length ?? 0),
      icon: 'location-outline',
      color: '#d97706',
    },
  ];

  return (
    <View style={styles.flex}>
      {error && items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPage(1, 'replace')}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPage(1, 'refresh')} />}
        >
          <View style={styles.statsRow}>
            {statCards.map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Ionicons name={s.icon} size={14} color={s.color} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <SearchBar placeholder="Search name, role, company, city…" onSearch={setQuery} />
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={onToggleFilters}>
              <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#fff' : '#2563eb'} />
              {activeFilterCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowConnections(true)}>
              <Ionicons name="people" size={18} color="#059669" />
            </TouchableOpacity>
          </View>

          {/* ── Suggestions ── */}
          {showMatches && matches && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Suggested connections</Text>
                <TouchableOpacity onPress={loadMatches}>
                  <Text style={styles.seeAll}>Refresh</Text>
                </TouchableOpacity>
              </View>
              {matches.matches?.length === 0 && (
                <Text style={styles.mutedSmall}>No suggestions yet — add skills to your profile.</Text>
              )}
              {(matches.matches ?? []).map((m) => (
                <AnimatedCard key={m.userId} style={styles.matchCard} onPress={() => setSelected(null)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matchName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={styles.matchRole} numberOfLines={1}>
                      {m.headline ?? '—'}
                    </Text>
                    <View style={styles.reasonRow}>
                      {m.reasons.slice(0, 2).map((r) => (
                        <View key={r} style={styles.reasonChip}>
                          <Text style={styles.reasonText}>{r}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{m.score}</Text>
                  </View>
                </AnimatedCard>
              ))}
            </View>
          )}

          {/* ── Filter sheet ── */}
          {showFilters && facets && (
            <View style={styles.filterPanel}>
              <FilterGroup
                title="Batch"
                options={(facets.batches ?? []).map((b) => ({
                  id: b.graduationYear,
                  label: String(b.graduationYear),
                  count: b.count,
                }))}
                value={filters.batch}
                onChange={(v) => setFilters((f) => ({ ...f, batch: v }))}
              />
              <FilterGroup
                title="Department"
                options={(facets.departments ?? []).map((d) => ({ id: d.id, label: d.code, count: d.count }))}
                value={filters.departmentId}
                onChange={(v) => setFilters((f) => ({ ...f, departmentId: v }))}
              />
              <FilterGroup
                title="Industry"
                options={(facets.sectors ?? []).map((s) => ({ id: s, label: s }))}
                value={filters.sector}
                onChange={(v) => setFilters((f) => ({ ...f, sector: v }))}
              />
              <FilterGroup
                title="City"
                options={(facets.locations ?? []).map((l) => ({ id: l.value, label: l.value, count: l.count }))}
                value={filters.location}
                onChange={(v) => setFilters((f) => ({ ...f, location: v }))}
              />
              <FilterGroup
                title="Company"
                options={(facets.companies ?? []).slice(0, 12).map((c) => ({ id: c.id, label: c.name }))}
                value={filters.companyId}
                onChange={(v) => setFilters((f) => ({ ...f, companyId: v }))}
              />
              <FilterGroup
                title="Skill"
                options={(facets.skills ?? []).slice(0, 12).map((s) => ({ id: s.skill, label: s.skill, count: s.count }))}
                value={filters.skill}
                onChange={(v) => setFilters((f) => ({ ...f, skill: v }))}
              />
              <FilterGroup
                title="Sort by"
                options={SORTS.map((s) => ({ id: s.id, label: s.label }))}
                value={filters.sort}
                onChange={(v) => setFilters((f) => ({ ...f, sort: v }))}
              />
              <TouchableOpacity style={styles.clearBtn} onPress={() => setFilters({ sort: 'name' })}>
                <Text style={styles.clearText}>Clear all filters</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.countText}>
            {loading ? 'Loading…' : `${pagination?.total ?? items.length} alumni found`}
            {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'}` : ''}
          </Text>

          {items.map((a, idx) => {
            const color = COLORS[idx % COLORS.length];
            const active = a.engagementStatus === 'ACTIVE';
            return (
              <AnimatedCard
                key={a.id}
                onPress={() => setSelected(a.id)}
                delay={Math.min(idx, 8) * 30}
                style={styles.card}
              >
                <View style={[styles.avatar, { backgroundColor: color + '1a' }]}>
                  <Text style={[styles.avatarText, { color }]}>{initials(a.name)}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {a.name}
                    </Text>
                    {a.isSelf && (
                      <View style={styles.youChip}>
                        <Text style={styles.youText}>YOU</Text>
                      </View>
                    )}
                    {a.connectionStatus === 'ACCEPTED' && (
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    )}
                  </View>
                  <Text style={styles.role} numberOfLines={1}>
                    {a.headline ?? a.currentRole ?? '—'}
                    {a.company ? ` · ${a.company.name}` : ''}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {a.program ? `${a.program.department.code} ` : ''}
                    {a.graduationYear ? `Batch ${a.graduationYear}` : ''}
                    {a.location ? ` · ${a.location}` : ''}
                    {a.chapter ? ` · ${a.chapter.city}` : ''}
                  </Text>
                  {a.skills?.length > 0 && (
                    <View style={styles.skillRow}>
                      {a.skills.slice(0, 3).map((s) => (
                        <View
                          key={s.skill}
                          style={[styles.skillChip, { backgroundColor: (LEVEL_COLOR[s.level] ?? '#64748b') + '18' }]}
                        >
                          <Text style={[styles.skillText, { color: LEVEL_COLOR[s.level] ?? '#64748b' }]}>
                            {s.skill}
                          </Text>
                        </View>
                      ))}
                      {a.skillCount > 3 && (
                        <Text style={styles.moreSkills}>+{a.skillCount - 3}</Text>
                      )}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </AnimatedCard>
            );
          })}

          {loading && items.length === 0 && (
            <View style={{ paddingHorizontal: 16 }}>
              <SkeletonStatRow count={3} />
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} style={{ marginBottom: 8 }} />
              ))}
            </View>
          )}

          {!loading && items.length === 0 && (
            <EmptyState
              icon="people-outline"
              title="No alumni found"
              subtitle="Try clearing a filter or a different search term"
              color="#7c3aed"
            />
          )}

          {canLoadMore && (
            <TouchableOpacity
              style={styles.loadMore}
              disabled={loadingMore}
              onPress={() => {
                const next = page + 1;
                setPage(next);
                fetchPage(next, 'append');
              }}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={styles.loadMoreText}>
                  Load more ({pagination.total - items.length} remaining)
                </Text>
              )}
            </TouchableOpacity>
          )}

          {!canLoadMore && items.length > 0 && (
            <Text style={styles.endText}>End of directory · {items.length} shown</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function FilterGroup({ title, options, value, onChange }) {
  if (!options || options.length === 0) return null;
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
        <TouchableOpacity
          style={[styles.chip, value === undefined && styles.chipActive]}
          onPress={() => onChange(undefined)}
        >
          <Text style={[styles.chipText, value === undefined && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {options.map((o) => (
          <TouchableOpacity
            key={String(o.id)}
            style={[styles.chip, value === o.id && styles.chipActive]}
            onPress={() => onChange(value === o.id ? undefined : o.id)}
          >
            <Text style={[styles.chipText, value === o.id && styles.chipTextActive]}>
              {o.label}
              {o.count !== undefined ? ` (${o.count})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginHorizontal: 4 },
  statValue: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text, marginTop: 8 },
  statLabel: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },

  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'Manrope-Bold' },

  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  seeAll: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.primary },

  matchCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border },
  matchName: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  matchRole: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  reasonChip: { backgroundColor: '#ecfdf5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  reasonText: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: '#047857' },
  scoreBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  scoreText: { color: '#fff', fontSize: 13, fontFamily: 'Manrope-ExtraBold' },

  filterPanel: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
  filterGroup: { marginBottom: 12 },
  filterTitle: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipContent: { gap: 6, paddingVertical: 2 },
  chip: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextActive: { color: '#fff' },
  clearBtn: { alignSelf: 'center', paddingVertical: 8 },
  clearText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: '#dc2626' },

  countText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginHorizontal: 16, marginTop: 14, marginBottom: 8 },
  mutedSmall: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },

  card: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 16, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 13, fontFamily: 'Manrope-ExtraBold' },
  cardBody: { flex: 1, marginRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginRight: 6, flexShrink: 1 },
  youChip: { backgroundColor: '#2563eb', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, marginRight: 5 },
  youText: { color: '#fff', fontSize: 8, fontFamily: 'Manrope-Bold' },
  role: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  skillRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  skillChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  skillText: { fontSize: 9, fontFamily: 'Manrope-SemiBold' },
  moreSkills: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },

  loadMore: { alignItems: 'center', paddingVertical: 14, marginHorizontal: 16 },
  loadMoreText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#2563eb' },
  endText: { textAlign: 'center', fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, paddingVertical: 18 },
});