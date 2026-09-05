import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import VehicleDetail from './pages/vehicle_detail/vehicle_detail';

const vehicles = [
  { id: 'V1', reg: 'KA-01-2045', model: 'TATA Starbus Ultra', capacity: 50, odometer: '86,400', fuel: '68%', status: 'On Road', route: 'Route 01', driver: 'Ramesh K.', color: '#2563eb' },
  { id: 'V2', reg: 'KA-01-1876', model: 'Ashok Leyland Viking', capacity: 60, odometer: '9,800', fuel: '41%', status: 'On Road', route: 'Route 07', driver: 'Suresh P.', color: '#0891b2' },
  { id: 'V3', reg: 'KA-01-2210', model: 'Eicher Skyline Pro', capacity: 55, odometer: '54,200', fuel: '27%', status: 'On Road', route: 'Route 12', driver: 'Manoj G.', color: '#059669' },
  { id: 'V4', reg: 'KA-01-1764', model: 'TATA Starbus Ultra', capacity: 50, odometer: '61,900', fuel: '82%', status: 'Idle', route: 'Standby', driver: '—', color: '#d97706' },
  { id: 'V5', reg: 'KA-01-1982', model: 'Force Traveller', capacity: 30, odometer: '42,300', fuel: '55%', status: 'Servicing', route: '—', driver: '—', color: '#dc2626' },
];

const statusStyle = (s) => {
  if (s === 'On Road') return { bg: '#dcfce7', color: '#059669' };
  if (s === 'Idle') return { bg: '#fef3c7', color: '#d97706' };
  return { bg: '#fee2e2', color: '#dc2626' };
};

export default function FleetModule({ navigation }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  if (selectedVehicle) {
    return <VehicleDetail vehicle={selectedVehicle} onBack={() => setSelectedVehicle(null)} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>30</Text>
          <Text style={styles.statLabel}>Fleet Size</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>26</Text>
          <Text style={styles.statLabel}>On Road</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>2</Text>
          <Text style={styles.statLabel}>In Service</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vehicles</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Add Vehicle', 'Vehicle registration form opens here.')}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      {vehicles.map((v) => {
        const st = statusStyle(v.status);
        return (
          <TouchableOpacity
            key={v.id}
            style={styles.card}
            onPress={() => setSelectedVehicle(v)}
          >
            <View style={[styles.vehicleIcon, { backgroundColor: v.color + '1a' }]}>
              <Ionicons name="bus-outline" size={18} color={v.color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.reg}>{v.reg}</Text>
              <Text style={styles.meta}>
                {v.model} · {v.capacity} seats
              </Text>
              <View style={styles.fuelRow}>
                <View style={styles.fuelTrack}>
                  <View
                    style={[
                      styles.fuelFill,
                      { width: v.fuel, backgroundColor: parseInt(v.fuel) < 30 ? '#dc2626' : '#059669' },
                    ]}
                  />
                </View>
                <Text style={styles.fuelText}>{v.fuel}</Text>
              </View>
            </View>
            <View style={styles.rightCol}>
              <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{v.status}</Text>
              </View>
              <Text style={styles.routeText}>{v.route}</Text>
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
  vehicleIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  reg: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
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
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.textMuted,
  },
  rightCol: { alignItems: 'flex-end' },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
  routeText: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 5,
  },
});