import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { transportApi } from '../../../../services/api';
import VehicleDetail from './pages/vehicle_detail/vehicle_detail';
import { AnimatedCard, SearchBar, StatusChip, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';

const STATUS_STYLE = {
  ON_ROAD: { bg: '#dcfce7', color: '#059669', label: 'On Road' },
  IDLE: { bg: '#f1f5f9', color: '#64748b', label: 'Idle' },
  SERVICE: { bg: '#fee2e2', color: '#dc2626', label: 'Service' },
};

export default function FleetModule({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return vehicles;
    const q = query.toLowerCase();
    return vehicles.filter((v) => v.regNo.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || (v.route || '').toLowerCase().includes(q));
  }, [vehicles, query]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await transportApi.fleet();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load fleet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (selectedVehicleId) {
    return (
      <VehicleDetail
        vehicleId={selectedVehicleId}
        onBack={() => {
          setSelectedVehicleId(null);
          load(false);
        }}
      />
    );
  }

  if (loading && vehicles.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 }}>
        <SkeletonStatRow count={3} style={{ marginTop: 16 }} />
        <SkeletonCard style={{ marginTop: 14 }} />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (error && vehicles.length === 0) {
    return (
      <EmptyState icon="cloud-offline-outline" title="Couldn't load fleet" subtitle={error} />
    );
  }

  const onRoad = vehicles.filter((v) => v.status === 'ON_ROAD').length;
  const lowFuel = vehicles.filter((v) => v.fuelPct < 30).length;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{vehicles.length}</Text>
          <Text style={styles.statLabel}>Fleet Size</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{onRoad}</Text>
          <Text style={styles.statLabel}>On Road</Text>
        </View>
        <View style={[styles.statCard, lowFuel > 0 && { borderColor: '#fecaca' }]}>
          <Text style={[styles.statValue, lowFuel > 0 && { color: '#dc2626' }]}>{lowFuel}</Text>
          <Text style={styles.statLabel}>Low Fuel</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vehicles</Text>
      </View>

      {vehicles.length === 0 && <Text style={styles.empty}>No vehicles registered.</Text>}
      {vehicles.map((v) => {
        const st = STATUS_STYLE[v.status] || STATUS_STYLE.IDLE;
        const fuelColor = v.fuelPct < 30 ? '#dc2626' : v.fuelPct < 50 ? '#d97706' : '#059669';
        return (
          <TouchableOpacity
            key={v.id}
            style={styles.card}
            onPress={() => setSelectedVehicleId(v.id)}
          >
            <View style={styles.vehicleIcon}>
              <Ionicons name="bus-outline" size={19} color="#2563eb" />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{v.regNo}</Text>
                {v.docsExpiring.length > 0 && (
                  <View style={styles.docDot}>
                    <Text style={styles.docDotText}>{v.docsExpiring.length} doc</Text>
                  </View>
                )}
              </View>
              <Text style={styles.meta}>
                {v.model} · {v.odometerKm.toLocaleString()} km · {v.route || 'unassigned'}
              </Text>
              <View style={styles.fuelRow}>
                <View style={styles.fuelTrack}>
                  <View style={[styles.fuelFill, { width: `${v.fuelPct}%`, backgroundColor: fuelColor }]} />
                </View>
                <Text style={[styles.fuelText, { color: fuelColor }]}>{v.fuelPct}%</Text>
              </View>
            </View>
            <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </TouchableOpacity>
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
  vehicleIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  },
  docDot: {
    marginLeft: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  docDotText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  fuelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  fuelTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginRight: 8,
  },
  fuelFill: { height: 5, borderRadius: 3 },
  fuelText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});
