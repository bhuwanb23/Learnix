import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import AlumniDetail from './pages/alumni_detail/alumni_detail';

const COLORS = ['#2563eb', '#059669', '#d97706', '#0891b2', '#dc2626', '#7c3aed', '#0d9488', '#64748b'];

export default function AlumniDirectory({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [batch, setBatch] = useState(null); // null = All
  const [selected, setSelected] = useState(null);

  const load = useCallback(
    async (params = {}, showSpinner = false) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        const d = await alumniApi.directory(params);
        setData(d);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Debounced server-side search: query + batch → /alumni/directory
  useEffect(() => {
    const t = setTimeout(() => {
      load({ q: query || undefined, batch: batch || undefined });
    }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, batch, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load({ q: query || undefined, batch: batch || undefined }, false);
  };

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

  const stats = data?.stats ?? { total: 0, active: 0 };
  const inactive = Math.max(stats.total - stats.active, 0);
  const alumni = data?.alumni ?? [];
  const batches = [...new Set(alumni.map((a) => a.graduationYear))].sort((a, b) => b - a);

  const statCards = [
    { label: 'Total Alumni', value: String(stats.total), icon: 'people-outline', color: '#2563eb' },
    { label: 'Active', value: String(stats.active), icon: 'checkmark-circle-outline', color: '#059669' },
    { label: 'Needs Outreach', value: String(inactive), icon: 'warning-outline', color: '#d97706' },
  ];

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {error && !data ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load({}, true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search alumni, role, city..."
              placeholderTextColor={theme.colors.textMuted}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {batches.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsRow}
              contentContainerStyle={styles.chipsContent}
            >
              {[null, ...batches].map((b) => (
                <TouchableOpacity
                  key={b ?? 'all'}
                  style={[styles.chip, batch === b && styles.chipActive]}
                  onPress={() => setBatch(b)}
                >
                  <Text style={[styles.chipText, batch === b && styles.chipTextActive]}>
                    {b === null ? 'All Batches' : `Batch ${b}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={styles.countText}>{alumni.length} alumni found</Text>

          {alumni.map((a, idx) => {
            const color = COLORS[idx % COLORS.length];
            const active = a.engagementStatus === 'ACTIVE';
            return (
              <TouchableOpacity
                key={a.id}
                style={styles.card}
                onPress={() => setSelected(a.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.avatar, { backgroundColor: color + '1a' }]}>
                  <Text style={[styles.avatarText, { color }]}>
                    {a.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{a.name}</Text>
                    <View style={[styles.statusChip, { backgroundColor: active ? '#dcfce7' : '#f1f5f9' }]}>
                      <Text style={[styles.statusText, { color: active ? '#059669' : '#64748b' }]}>
                        {a.engagementStatus}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.role} numberOfLines={1}>
                    {a.currentRole || '—'}{a.company ? ` · ${a.company}` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    Batch {a.graduationYear}{a.location ? ` · ${a.location}` : ''}
                    {a.chapter ? ` · ${a.chapter.city} Chapter` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            );
          })}
          {!loading && alumni.length === 0 && (
            <Text style={styles.emptyText}>No alumni match your search.</Text>
          )}
        </ScrollView>
      )}
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
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    width: '31.5%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  chipsRow: {
    marginTop: 12,
  },
  chipsContent: {
    paddingHorizontal: 16,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  chipTextActive: {
    color: '#fff',
  },
  countText: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Manrope-ExtraBold',
  },
  cardBody: { flex: 1, marginRight: 8 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginRight: 8,
    flexShrink: 1,
  },
  statusChip: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },
  role: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  meta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
