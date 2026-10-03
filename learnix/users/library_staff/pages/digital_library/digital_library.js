import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SearchBar, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';
import { THEME, typeMeta, scopeMeta } from './resourceMeta';

const TYPES = ['ALL', 'PDF', 'EBOOK', 'JOURNAL'];
const AUDIENCES = [
  { id: 'ALL', label: 'All' },
  { id: 'GRANTED', label: 'Restricted' },
  { id: 'PUBLIC', label: 'Open Access' },
];
const SORTS = [
  { id: 'TITLE', label: 'A–Z', icon: 'text-outline' },
  { id: 'NEWEST', label: 'Newest', icon: 'time-outline' },
  { id: 'POPULAR', label: 'Popular', icon: 'trending-up-outline' },
];

export default function DigitalLibrary({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [audience, setAudience] = useState('ALL');
  const [sort, setSort] = useState('TITLE');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.digitalResources({
        q: search, type, audience, sort, status: 'ACTIVE',
      });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, type, audience, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = data?.stats || {};
  const resources = data?.resources || [];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Shortcuts */}
      <View style={styles.shortcutRow}>
        <TouchableOpacity style={styles.shortcut} onPress={() => navigation.openModule('ResourceForm')} activeOpacity={0.85}>
          <View style={[styles.shortcutIcon, { backgroundColor: THEME }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
          <Text style={styles.shortcutLabel}>Add Resource</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shortcut} onPress={() => navigation.openModule('AccessGrants')} activeOpacity={0.85}>
          <View style={[styles.shortcutIcon, { backgroundColor: '#2563eb' }]}>
            <Ionicons name="key-outline" size={20} color="#fff" />
          </View>
          <Text style={styles.shortcutLabel}>Grants</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shortcut} onPress={() => navigation.openModule('DigitalUsage')} activeOpacity={0.85}>
          <View style={[styles.shortcutIcon, { backgroundColor: '#059669' }]}>
            <Ionicons name="stats-chart" size={20} color="#fff" />
          </View>
          <Text style={styles.shortcutLabel}>Usage</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Resources', value: stats.active ?? 0, icon: 'library', color: THEME },
          { label: 'Grants', value: stats.totalAccessGrants ?? 0, icon: 'key', color: '#2563eb' },
          { label: 'Accesses', value: stats.totalAccesses ?? 0, icon: 'eye', color: '#059669' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </AnimatedCard>

      <SearchBar placeholder="Search title, subject, publisher…" onSearch={setSearch} style={styles.search} />

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          {TYPES.map((t) => {
            const meta = t === 'ALL' ? null : typeMeta(t);
            const count = t === 'ALL' ? stats.active : stats.byType?.[t];
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.chip,
                  type === t && { backgroundColor: meta ? meta.color : THEME, borderColor: meta ? meta.color : THEME },
                ]}
                onPress={() => setType(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                  {meta ? meta.label : 'All'} · {count ?? 0}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Audience + sort */}
      <View style={styles.controlRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.audienceScroll}>
          <View style={styles.audienceRow}>
            {AUDIENCES.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.audienceChip, audience === a.id && styles.audienceChipActive]}
                onPress={() => setAudience(a.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.audienceText, audience === a.id && styles.audienceTextActive]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>
          {search ? `Results for “${search}”` : type === 'ALL' ? 'All Resources' : `${typeMeta(type).label}s`}
        </Text>
        <View style={styles.sortRow}>
          {SORTS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sortBtn, sort === s.id && styles.sortBtnActive]}
              onPress={() => setSort(s.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={s.icon} size={13} color={sort === s.id ? THEME : '#94a3b8'} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {resources.length === 0 ? (
        <EmptyState
          icon={search ? 'search-outline' : 'library-outline'}
          title={search ? 'No matching resources' : 'No resources here'}
          subtitle={
            search
              ? 'Try a different title, subject or publisher.'
              : 'Add an e-resource to get the digital shelf started.'
          }
          color={THEME}
          actionLabel="Add Resource"
          onAction={() => navigation.openModule('ResourceForm')}
        />
      ) : (
        resources.map((r, idx) => {
          const meta = typeMeta(r.type);
          const firstGrant = r.grants[0];
          const scope = firstGrant ? scopeMeta(firstGrant.scope) : null;
          return (
            <AnimatedCard
              key={r.id}
              delay={100 + idx * 45}
              style={styles.block}
              onPress={() => navigation.openModule('ResourceDetail', { resourceId: r.id })}
            >
              <View style={styles.resourceRow}>
                <View style={[styles.resourceIcon, { backgroundColor: meta.color + '14' }]}>
                  <Ionicons name={meta.icon} size={21} color={meta.color} />
                </View>

                <View style={styles.resourceBody}>
                  <Text style={styles.resourceTitle} numberOfLines={2}>{r.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[r.publisher, r.subject].filter(Boolean).join(' · ') || 'Uncategorised'}
                  </Text>

                  <View style={styles.chipRow}>
                    <View style={[styles.typeChip, { backgroundColor: meta.color + '1A' }]}>
                      <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {r.isPublic ? (
                      <View style={styles.publicChip}>
                        <Ionicons name="globe-outline" size={10} color="#059669" />
                        <Text style={styles.publicText}>Open access</Text>
                      </View>
                    ) : scope ? (
                      <View style={[styles.scopeChip, { backgroundColor: scope.bg }]}>
                        <Ionicons name={scope.icon} size={10} color={scope.color} />
                        <Text style={[styles.scopeText, { color: scope.color }]}>
                          {r.grants.length === 1 ? firstGrant.label : `${r.grants.length} audiences`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.right}>
                  <View style={styles.accessBox}>
                    <Ionicons name="eye-outline" size={12} color="#94a3b8" />
                    <Text style={styles.accessValue}>{r.accessCount}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
                </View>
              </View>
            </AnimatedCard>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Shortcuts
  shortcutRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  shortcut: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 12, alignItems: 'center' },
  shortcutIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  shortcutLabel: { fontSize: 11, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold' },

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  search: { marginBottom: 12 },

  // Type chips
  chipsScroll: { flexGrow: 0, marginHorizontal: -24 },
  chipsRow: { flexDirection: 'row', paddingHorizontal: 24 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff' },

  // Audience
  controlRow: { marginTop: 10, marginHorizontal: -24 },
  audienceScroll: { flexGrow: 0 },
  audienceRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8 },
  audienceChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9, backgroundColor: '#eef2f7' },
  audienceChipActive: { backgroundColor: '#0f172a' },
  audienceText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  audienceTextActive: { color: '#fff' },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', flex: 1, marginRight: 10 },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  sortBtnActive: { backgroundColor: THEME + '14', borderColor: THEME + '55' },

  // Rows
  resourceRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  resourceIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  resourceBody: { flex: 1, paddingRight: 8 },
  resourceTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  scopeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  scopeText: { fontSize: 10, fontWeight: '600', fontFamily: 'Manrope-SemiBold' },
  publicChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f0fdf4' },
  publicText: { fontSize: 10, fontWeight: '600', color: '#059669', fontFamily: 'Manrope-SemiBold' },

  right: { alignItems: 'center', gap: 6 },
  accessBox: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f8fafc', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  accessValue: { fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
});