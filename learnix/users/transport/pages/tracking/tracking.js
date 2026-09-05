import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const buses = [
  { id: '1', reg: 'KA-01-2045', route: 'Route 01 — Central City', status: 'On Time', position: 'Indiranagar Metro', progress: 55, eta: '8:22 AM', speed: '34 km/h', color: '#059669' },
  { id: '2', reg: 'KA-01-1876', route: 'Route 07 — Electronic City', status: 'Delayed', position: 'Domlur Flyover', progress: 48, eta: '9:12 AM', speed: '18 km/h', color: '#dc2626' },
  { id: '3', reg: 'KA-01-2210', route: 'Route 12 — Whitefield', status: 'On Time', position: 'Marathahalli Bridge', progress: 42, eta: '8:58 AM', speed: '31 km/h', color: '#059669' },
  { id: '4', reg: 'KA-01-1764', route: 'Route 04 — Koramangala', status: 'Completed', position: 'Learnix Campus', progress: 100, eta: 'Arrived', speed: '0 km/h', color: '#2563eb' },
  { id: '5', reg: 'KA-01-1982', route: 'Route 09 — Hebbal', status: 'On Time', position: 'Hebbal Junction', progress: 30, eta: '9:05 AM', speed: '29 km/h', color: '#059669' },
];

export default function TrackingModule({ navigation }) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? buses : buses.slice(0, 3);
  const onRoad = buses.filter((b) => b.status !== 'Completed').length;
  const delayed = buses.filter((b) => b.status === 'Delayed').length;

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{onRoad}</Text>
          <Text style={styles.statLabel}>On Road</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{delayed}</Text>
          <Text style={styles.statLabel}>Delayed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>91%</Text>
          <Text style={styles.statLabel}>On-Time</Text>
        </View>
      </View>

      <View style={styles.mapCard}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={40} color="#93c5fd" />
          <Text style={styles.mapText}>Live GPS map</Text>
          <Text style={styles.mapSub}>All 18 routes rendering with real-time positions</Text>
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => Alert.alert('Live Map', 'Full-screen live map with bus markers opens here.')}
          >
            <Ionicons name="navigate-outline" size={15} color="#fff" />
            <Text style={styles.mapBtnText}>Open Live Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Buses on Road</Text>
        <TouchableOpacity onPress={() => setShowAll(!showAll)}>
          <Text style={styles.seeAll}>{showAll ? 'Show less' : 'See all'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {visible.map((b) => (
          <View key={b.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.busIcon, { backgroundColor: b.color + '1a' }]}>
                <Ionicons name="bus-outline" size={17} color={b.color} />
              </View>
              <View style={styles.cardHeader}>
                <Text style={styles.reg}>{b.reg}</Text>
                <Text style={styles.route}>{b.route}</Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor:
                      b.status === 'On Time' ? '#dcfce7' : b.status === 'Delayed' ? '#fee2e2' : '#dbeafe',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: b.status === 'On Time' ? '#059669' : b.status === 'Delayed' ? '#dc2626' : '#2563eb' },
                  ]}
                >
                  {b.status}
                </Text>
              </View>
            </View>
            <View style={styles.positionRow}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
              <Text style={styles.positionText}>Now at: {b.position}</Text>
              <Text style={styles.speedText}>{b.speed}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: b.progress + '%', backgroundColor: b.color }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{b.progress}% of route</Text>
              <Text style={styles.etaText}>ETA {b.eta}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
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
  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginTop: 14,
  },
  mapPlaceholder: {
    height: 150,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 8,
  },
  mapSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 12,
  },
  mapBtnText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.primary,
  },
  list: { paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardHeader: { flex: 1 },
  reg: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  route: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
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
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  positionText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginLeft: 5,
  },
  speedText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 9,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  etaText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
});