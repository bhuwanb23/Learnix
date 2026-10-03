import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SearchBar, SkeletonCard } from '../../../../../components/ui';
import { THEME, typeMeta, scopeMeta } from '../resourceMeta';

export default function AccessGrants({ navigation, route }) {
  const presetResourceId = route?.params?.resourceId;

  const [resources, setResources] = useState([]);
  const [audiences, setAudiences] = useState({ programs: [], batches: [] });
  const [resourceId, setResourceId] = useState(presetResourceId ?? null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('PROGRAMS');
  const [busy, setBusy] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [res, aud] = await Promise.all([
        libraryApi.digitalResources({ status: 'ALL', sort: 'TITLE' }),
        libraryApi.digitalAudiences(),
      ]);
      setResources(res.resources || []);
      setAudiences({ programs: aud.programs || [], batches: aud.batches || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchDetail = useCallback(async () => {
    if (!resourceId) {
      setDetail(null);
      return;
    }
    try {
      const result = await libraryApi.digitalResource(resourceId);
      setDetail(result);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, [resourceId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll().then(fetchDetail);
  };

  const filteredResources = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subject?.toLowerCase().includes(q),
    );
  }, [resources, search]);

  // Already-granted audiences cannot be granted again.
  const grantedProgramIds = new Set(
    (detail?.grants ?? []).filter((g) => g.scope === 'PROGRAM').map((g) => g.programId),
  );
  const grantedBatchIds = new Set(
    (detail?.grants ?? []).filter((g) => g.scope === 'BATCH').map((g) => g.batchId),
  );

  const grant = async (payload, label) => {
    setBusy(label);
    try {
      await libraryApi.grantAccess(resourceId, payload);
      await fetchDetail();
      Alert.alert('Access Granted', `${label} can now access this resource.`);
    } catch (err) {
      Alert.alert('Cannot Grant', err.message);
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (g) => {
    setBusy(g.id);
    try {
      await libraryApi.revokeAccess(resourceId, g.id);
      await fetchDetail();
    } catch (err) {
      Alert.alert('Cannot Revoke', err.message);
    } finally {
      setBusy(null);
    }
  };

  const confirmRevoke = (g) => {
    Alert.alert('Revoke Access?', `${g.label} will lose access to this resource.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revoke(g) },
    ]);
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Resource picker ──
  if (!detail) {
    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedCard delay={0} style={styles.block}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="key-outline" size={18} color={THEME} />
            </View>
            <View style={styles.headerBody}>
              <Text style={styles.headerTitle}>Choose a resource</Text>
              <Text style={styles.headerSub}>Select which resource to manage access for.</Text>
            </View>
          </View>
        </AnimatedCard>

        <SearchBar placeholder="Search resources…" onSearch={setSearch} style={styles.search} />

        {filteredResources.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No resources found"
            subtitle="Try a different search term."
            color={THEME}
          />
        ) : (
          filteredResources.map((r, idx) => {
            const meta = typeMeta(r.type);
            return (
              <AnimatedCard
                key={r.id}
                delay={80 + idx * 40}
                style={styles.block}
                onPress={() => setResourceId(r.id)}
              >
                <View style={styles.pickRow}>
                  <View style={[styles.pickIcon, { backgroundColor: meta.color + '14' }]}>
                    <Ionicons name={meta.icon} size={19} color={meta.color} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{r.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {r.isPublic ? 'Open access to all' : `${r.grants.length} audience(s)`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </View>
              </AnimatedCard>
            );
          })
        )}
      </ScrollView>
    );
  }

  // ── Grant manager ──
  const meta = typeMeta(detail.type);
  const list = tab === 'PROGRAMS' ? audiences.programs : audiences.batches;
  const grantedIds = tab === 'PROGRAMS' ? grantedProgramIds : grantedBatchIds;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Selected resource */}
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.selectedRow}>
          <View style={[styles.pickIcon, { backgroundColor: meta.color + '14' }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.selectedTitle} numberOfLines={2}>{detail.title}</Text>
            <Text style={styles.rowSub}>
              {detail.grants.length === 0
                ? 'Open to all students'
                : `${detail.grants.length} audience${detail.grants.length === 1 ? '' : 's'} · ${detail.programCount} program(s)`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setResourceId(null)} activeOpacity={0.8} style={styles.changeBtn}>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        </View>
      </AnimatedCard>

      {/* Current grants */}
      <Text style={styles.sectionLabel}>Current Access</Text>
      {detail.grants.length === 0 ? (
        <AnimatedCard delay={60} style={styles.block}>
          <View style={styles.openBox}>
            <Ionicons name="globe-outline" size={20} color="#059669" />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Open access</Text>
              <Text style={styles.rowSub}>Every student can read this resource. Add a grant below to restrict it.</Text>
            </View>
          </View>
        </AnimatedCard>
      ) : (
        detail.grants.map((g, idx) => {
          const scope = scopeMeta(g.scope);
          return (
            <AnimatedCard key={g.id} delay={60 + idx * 40} style={styles.block}>
              <View style={styles.grantRow}>
                <View style={[styles.grantIcon, { backgroundColor: scope.bg }]}>
                  <Ionicons name={scope.icon} size={17} color={scope.color} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{g.label}</Text>
                  <Text style={styles.rowSub}>{scope.label} · {g.detail}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.revokeBtn, busy === g.id && styles.btnDisabled]}
                  onPress={() => confirmRevoke(g)}
                  activeOpacity={0.8}
                  disabled={busy === g.id}
                >
                  {busy === g.id
                    ? <ActivityIndicator size="small" color="#dc2626" />
                    : <Ionicons name="trash-outline" size={15} color="#dc2626" />}
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          );
        })
      )}

      {/* Add grants */}
      <View style={styles.tabsRow}>
        {[
          { id: 'PROGRAMS', label: `Programs (${audiences.programs.length})` },
          { id: 'BATCHES', label: `Batches (${audiences.batches.length})` },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Grant Access To</Text>

      {list.length === 0 ? (
        <EmptyState
          icon={tab === 'PROGRAMS' ? 'school-outline' : 'people-outline'}
          title={`No ${tab === 'PROGRAMS' ? 'programs' : 'batches'} found`}
          subtitle="Programs and batches must exist before access can be granted."
          color={THEME}
        />
      ) : (
        list.map((a, idx) => {
          const alreadyGranted = grantedIds.has(a.id);
          const label = tab === 'PROGRAMS' ? a.name : a.name;
          return (
            <AnimatedCard key={a.id} delay={100 + idx * 30} style={styles.block}>
              <View style={styles.grantRow}>
                <View style={[
                  styles.grantIcon,
                  { backgroundColor: tab === 'PROGRAMS' ? '#eff6ff' : '#f5f3ff' },
                ]}>
                  <Ionicons
                    name={tab === 'PROGRAMS' ? 'school-outline' : 'people-outline'}
                    size={17}
                    color={tab === 'PROGRAMS' ? '#2563eb' : '#7c3aed'}
                  />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{label}</Text>
                  <Text style={styles.rowSub}>
                    {tab === 'PROGRAMS' ? `${a.code} · ${a.level} · ${a.batchCount} batches` : a.yearRange}
                  </Text>
                </View>
                {alreadyGranted ? (
                  <View style={styles.grantedChip}>
                    <Ionicons name="checkmark" size={11} color="#059669" />
                    <Text style={styles.grantedText}>Granted</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.grantBtn, busy === label && styles.btnDisabled]}
                    onPress={() => grant(tab === 'PROGRAMS' ? { programId: a.id } : { batchId: a.id }, label)}
                    activeOpacity={0.85}
                    disabled={Boolean(busy)}
                  >
                    {busy === label
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="add" size={15} color="#fff" />}
                  </TouchableOpacity>
                )}
              </View>
            </AnimatedCard>
          );
        })
      )}

      <AnimatedCard delay={200} style={[styles.block, styles.noteBox]}>
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
          <Text style={styles.noteText}>
            Granting to a program covers all its batches. Granting to a batch is narrower — use it when only one cohort should have access.
          </Text>
        </View>
      </AnimatedCard>
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
  btnDisabled: { opacity: 0.5 },
  rowBody: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  headerIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerBody: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  headerSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  search: { marginBottom: 12 },

  pickRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  pickIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  selectedRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  selectedTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold', lineHeight: 19 },
  changeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: THEME + '14' },
  changeText: { fontSize: 11, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 18, marginBottom: 10 },

  grantRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  grantIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  revokeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', justifyContent: 'center', alignItems: 'center' },
  openBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },

  tabsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', padding: 4, marginTop: 18 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: THEME + '14' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  tabTextActive: { color: THEME, fontWeight: '700' },

  grantBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center' },
  grantedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: '#f0fdf4' },
  grantedText: { fontSize: 10, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold' },

  noteBox: { padding: 12, marginTop: 8 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
});