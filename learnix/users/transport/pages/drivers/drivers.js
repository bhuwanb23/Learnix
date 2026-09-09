import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { transportApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, StatusChip, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';

const DUTY_CYCLE = { ON_DUTY: 'OFF_DUTY', OFF_DUTY: 'ON_DUTY', ON_LEAVE: 'ON_DUTY' };

const DUTY_STYLE = {
  ON_DUTY: { bg: '#dcfce7', color: '#059669' },
  OFF_DUTY: { bg: '#f1f5f9', color: '#64748b' },
  ON_LEAVE: { bg: '#fef3c7', color: '#d97706' },
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

export default function DriversModule({ navigation }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return drivers;
    const q = query.toLowerCase();
    return drivers.filter((d) => d.name.toLowerCase().includes(q) || (d.route || '').toLowerCase().includes(q));
  }, [drivers, query]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await transportApi.drivers();
      setDrivers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const toggleDuty = async (driver) => {
    const next = DUTY_CYCLE[driver.dutyStatus] || 'ON_DUTY';
    try {
      const res = await transportApi.setDuty(driver.id, next);
      Alert.alert('Duty updated', `${res.name} is now ${res.dutyStatus.replace('_', ' ').toLowerCase()}.`);
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  if (loading && drivers.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 }}>
        <SkeletonStatRow count={3} style={{ marginTop: 16 }} />
        <SkeletonCard style={{ marginTop: 14 }} />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (error && drivers.length === 0) {
    return (
      <EmptyState icon="cloud-offline-outline" title="Couldn't load drivers" subtitle={error} />
    );
  }

  const onDuty = drivers.filter((d) => d.dutyStatus === 'ON_DUTY').length;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{drivers.length}</Text>
          <Text style={styles.statLabel}>Drivers</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{onDuty}</Text>
          <Text style={styles.statLabel}>On Duty</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{drivers.length - onDuty}</Text>
          <Text style={styles.statLabel}>Off / Leave</Text>
        </View>
      </View>

      <SearchBar placeholder="Search drivers..." onSearch={setQuery} style={{ marginTop: 16 }} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Driver Roster</Text>
        <Text style={styles.resultCount}>{filtered.length} driver{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {filtered.length === 0 && (
        <EmptyState
          icon={query ? 'search-outline' : 'people-outline'}
          title={query ? `No results for "${query}"` : 'No drivers registered'}
          subtitle={query ? 'Try a different search term' : 'Drivers will appear here once added.'}
        />
      )}
      {filtered.map((d, idx) => {
        const st = DUTY_STYLE[d.dutyStatus] || DUTY_STYLE.OFF_DUTY;
        const licSoon = d.licenseDaysLeft <= 90;
        return (
          <AnimatedCard key={d.id} delay={idx * 50} style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{d.name.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{d.name}</Text>
                <Text style={styles.meta}>{d.experienceYears} yrs exp · {d.route || 'unassigned'}</Text>
                <Text style={[styles.license, licSoon && { color: '#dc2626' }]}>Lic {d.licenseNo.slice(-6)} · exp {fmtDate(d.licenseExpiry)}{licSoon ? ' ⚠' : ''}</Text>
              </View>
              <TouchableOpacity style={[styles.dutyChip, { backgroundColor: st.bg }]} onPress={() => toggleDuty(d)}>
                <Text style={[styles.dutyText, { color: st.color }]}>{d.dutyStatus.replace('_', ' ')}</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 20 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  license: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  dutyChip: {
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dutyText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});
