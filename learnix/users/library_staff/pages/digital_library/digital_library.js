import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';

const THEME = '#b45309';

const TYPE_META = {
  PDF: { color: '#b45309', icon: 'book' },
  EBOOK: { color: '#2563eb', icon: 'book-outline' },
  JOURNAL: { color: '#059669', icon: 'newspaper' },
};

const defaultMeta = { color: '#64748b', icon: 'document-text-outline' };

export default function DigitalLibrary({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState('All');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.digitalResources();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const resources = data?.resources || [];
  const stats = data?.stats || {};
  const types = useMemo(() => ['All', ...new Set(resources.map((r) => r.type))], [resources]);
  const filtered = useMemo(
    () => (activeType === 'All' ? resources : resources.filter((r) => r.type === activeType)),
    [resources, activeType],
  );

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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}>
        <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
          {[
            { label: 'Resources', value: stats.total ?? 0, icon: 'cloud-outline', color: THEME },
            { label: 'Access Grants', value: stats.totalAccessGrants ?? 0, icon: 'key-outline', color: '#2563eb' },
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

        {types.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <View style={styles.chipsRow}>
              {types.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, activeType === t && styles.chipActive]}
                  onPress={() => setActiveType(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, activeType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <Text style={styles.sectionLabel}>
          {activeType === 'All' ? 'All Digital Resources' : `${activeType} Resources`}
        </Text>

        {filtered.length === 0 ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="No resources found"
            subtitle="Digital resources for this category will appear here once they are added."
            color={THEME}
          />
        ) : (
          filtered.map((item, idx) => {
            const meta = TYPE_META[item.type] || defaultMeta;
            return (
              <AnimatedCard key={item.id} delay={100 + idx * 60} style={styles.block}>
                <View style={styles.resourceRow}>
                  <View style={[styles.resourceIcon, { backgroundColor: meta.color + '14' }]}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={styles.resourceBody}>
                    <Text style={styles.resourceTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{item.subject || 'General'}</Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.typeChip, { backgroundColor: meta.color + '1A' }]}>
                        <Text style={[styles.typeText, { color: meta.color }]}>{item.type}</Text>
                      </View>
                      {item.license ? (
                        <View style={styles.licenseChip}>
                          <Ionicons name="shield-checkmark-outline" size={10} color="#64748b" />
                          <Text style={styles.licenseText}>{item.license}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.viewsBox}>
                    <Ionicons name="eye-outline" size={13} color="#94a3b8" />
                    <Text style={styles.viewsText}>{item.accessCount ?? 0}</Text>
                  </View>
                </View>
              </AnimatedCard>
            );
          })
        )}
      </ScrollView>
    </View>
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

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Chips
  chipsScroll: { flexGrow: 0, marginHorizontal: -24, marginTop: 16 },
  chipsRow: { flexDirection: 'row', paddingHorizontal: 24 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  chipActive: { backgroundColor: THEME, borderColor: THEME },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff' },

  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10, marginTop: 18 },

  // Resource rows
  resourceRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  resourceIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  resourceBody: { flex: 1, paddingRight: 8 },
  resourceTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 6 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  licenseChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f1f5f9' },
  licenseText: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium' },
  viewsBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, gap: 2 },
  viewsText: { fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
});
