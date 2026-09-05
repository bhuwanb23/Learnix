import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import RouteDetail from './pages/route_detail/route_detail';

const routes = [
  { id: 'R1', name: 'Route 01 — Central City', stops: 12, students: 156, bus: 'KA-01-2045', driver: 'Ramesh K.', departure: '7:05 AM', arrival: '8:40 AM', status: 'On Time', distance: '18 km', color: '#2563eb' },
  { id: 'R2', name: 'Route 07 — Electronic City', stops: 10, students: 142, bus: 'KA-01-1876', driver: 'Suresh P.', departure: '7:15 AM', arrival: '9:00 AM', status: 'Delayed', distance: '22 km', color: '#dc2626' },
  { id: 'R3', name: 'Route 12 — Whitefield', stops: 14, students: 178, bus: 'KA-01-2210', driver: 'Manoj G.', departure: '7:20 AM', arrival: '8:55 AM', status: 'On Time', distance: '20 km', color: '#0891b2' },
  { id: 'R4', name: 'Route 04 — Koramangala', stops: 9, students: 134, bus: 'KA-01-1764', driver: 'Lakshman R.', departure: '7:10 AM', arrival: '8:35 AM', status: 'Completed', distance: '16 km', color: '#059669' },
  { id: 'R5', name: 'Route 09 — Hebbal', stops: 11, students: 121, bus: 'KA-01-1982', driver: 'Venkat S.', departure: '7:25 AM', arrival: '9:10 AM', status: 'On Time', distance: '24 km', color: '#d97706' },
];

const statusStyle = (s) => {
  if (s === 'On Time') return { bg: '#dcfce7', color: '#059669' };
  if (s === 'Delayed') return { bg: '#fee2e2', color: '#dc2626' };
  return { bg: '#dbeafe', color: '#2563eb' };
};

export default function RoutesModule({ navigation }) {
  const [selectedRoute, setSelectedRoute] = useState(null);

  if (selectedRoute) {
    return <RouteDetail route={selectedRoute} onBack={() => setSelectedRoute(null)} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>18</Text>
          <Text style={styles.statLabel}>Active Routes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>2,340</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>91%</Text>
          <Text style={styles.statLabel}>On-Time Rate</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Routes</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('New Route', 'Route builder opens here — add stops and assign a bus.')}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>New Route</Text>
        </TouchableOpacity>
      </View>

      {routes.map((r) => {
        const st = statusStyle(r.status);
        return (
          <TouchableOpacity
            key={r.id}
            style={styles.card}
            onPress={() => setSelectedRoute(r)}
          >
            <View style={[styles.routeIcon, { backgroundColor: r.color + '1a' }]}>
              <Ionicons name="bus-outline" size={18} color={r.color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.meta}>
                {r.stops} stops · {r.students} students · {r.distance}
              </Text>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                <Text style={styles.timeText}>
                  {r.departure} → {r.arrival} · {r.bus}
                </Text>
              </View>
            </View>
            <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.color }]}>{r.status}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
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
    fontFamily: 'Manrope_800ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
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
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    marginLeft: 3,
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
  routeIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
});