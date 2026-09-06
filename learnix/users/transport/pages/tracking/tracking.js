import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { transportApi } from '../../../../services/api';

export default function TrackingModule({ navigation }) {
  const [buses, setBuses] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [tracking, fleetData] = await Promise.all([
        transportApi.tracking(),
        transportApi.fleet().catch(() => []),
      ]);
      setBuses(Array.isArray(tracking) ? tracking : []);
      setFleet(Array.isArray(fleetData) ? fleetData : []);
    } catch (e) {
      setError(e.message || 'Failed to load tracking');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const pingAsOnTime = async (bus) => {
    try {
      await transportApi.ping(bus.vehicleId, {
        speedKmh: 30 + Math.floor(Math.random() * 20),
        etaMin: Math.max(1, (bus.etaMin || 20) - 5),
        status: 'ON_TIME',
      });
      Alert.alert('Ping sent', `${bus.bus} checked in — status ON_TIME.`);
      load(false);
    } catch (e) {
      Alert.alert('Ping failed', e.message);
    }
  };

  const untracked = fleet.filter(
    (v) => v.status === 'ON_ROAD' && !buses.some((b) => b.vehicleId === v.id)
  );

  if (loading && buses.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && buses.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={30} color="#9ca3af" />
        <Text style={styles.mapText}>Live GPS map view</Text>
        <Text style={styles.mapSub}>
          {buses.length} bus(es) broadcasting · pings upsert via API (WS phase later)
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
      >
        <Text style={styles.sectionTitle}>On Live Tracking</Text>
        {buses.length === 0 && <Text style={styles.empty}>No buses broadcasting right now.</Text>}
        {buses.map((b) => {
          const delayed = b.status === 'DELAYED';
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.busIcon}>
                  <Ionicons name="bus-outline" size={18} color={delayed ? '#dc2626' : '#2563eb'} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.routeName}>{b.route}</Text>
                  <Text style={styles.busMeta}>
                    {b.bus} · {b.speedKmh} km/h
                  </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: delayed ? '#fee2e2' : '#dcfce7' }]}>
                  <Text style={[styles.statusText, { color: delayed ? '#dc2626' : '#059669' }]}>
                    {delayed ? 'Delayed' : 'On Time'}
                  </Text>
                </View>
              </View>
              <Text style={styles.atText}>
                {b.currentStop ? `Now at ${b.currentStop}` : 'Between stops'} · ETA {b.etaMin ?? '?'} min
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${b.progressPct}%`, backgroundColor: delayed ? '#dc2626' : '#059669' }]} />
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.progressLabel}>{b.progressPct}% of route</Text>
                {delayed ? (
                  <TouchableOpacity style={styles.pingBtn} onPress={() => pingAsOnTime(b)}>
                    <Ionicons name="refresh-outline" size={12} color="#059669" />
                    <Text style={styles.pingText}>Back on time</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.pingBtn}
                    onPress={() =>
                      transportApi
                        .ping(b.vehicleId, { speedKmh: b.speedKmh, etaMin: (b.etaMin || 20) + 10, status: 'DELAYED' })
                        .then(() => {
                          Alert.alert('Flagged', `${b.bus} marked DELAYED — students notified.`);
                          load(false);
                        })
                        .catch((e) => Alert.alert('Ping failed', e.message))
                    }
                  >
                    <Ionicons name="warning-outline" size={12} color="#dc2626" />
                    <Text style={[styles.pingText, { color: '#dc2626' }]}>Flag delay</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {untracked.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>On Road — No Signal</Text>
            {untracked.map((v) => (
              <View key={v.id} style={[styles.card, styles.untrackedCard]}>
                <View style={styles.busIcon}>
                  <Ionicons name="radio-outline" size={18} color="#9ca3af" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.routeName}>{v.regNo}</Text>
                  <Text style={styles.busMeta}>{v.route || 'unassigned'} · no GPS ping yet</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginBottom: 8 },
  mapPlaceholder: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 130,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  mapSub: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  untrackedCard: { opacity: 0.75 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardBody: { flex: 1, marginRight: 8 },
  routeName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  busMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
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
  atText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    marginTop: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: { height: 6, borderRadius: 3 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  pingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pingText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
    marginLeft: 4,
  },
});
