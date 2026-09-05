import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const stops = [
  { id: '1', name: 'Central City Depot', time: '7:05 AM', boarding: 12, passed: true },
  { id: '2', name: 'M.G. Road Junction', time: '7:18 AM', boarding: 24, passed: true },
  { id: '3', name: 'Indiranagar Metro', time: '7:32 AM', boarding: 31, passed: true },
  { id: '4', name: 'Domlur Flyover', time: '7:44 AM', boarding: 28, passed: true },
  { id: '5', name: 'Marathahalli Bridge', time: '7:56 AM', boarding: 35, passed: false },
  { id: '6', name: 'Learnix Campus Gate', time: '8:40 AM', boarding: 26, passed: false },
];

export default function RouteDetail({ route, onBack }) {
  const [showPassengers, setShowPassengers] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.routeSub}>
            {route.departure} → {route.arrival} · {route.distance}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{route.stops}</Text>
              <Text style={styles.heroStatLabel}>Stops</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{route.students}</Text>
              <Text style={styles.heroStatLabel}>Students</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>91%</Text>
              <Text style={styles.heroStatLabel}>On-Time</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.vehicleCard}>
          <View style={[styles.vehicleIcon, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="bus-outline" size={20} color="#2563eb" />
          </View>
          <View style={styles.vehicleBody}>
            <Text style={styles.vehicleLabel}>Assigned Bus</Text>
            <Text style={styles.vehicleName}>{route.bus}</Text>
          </View>
          <View style={[styles.vehicleIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="person-outline" size={20} color="#059669" />
          </View>
          <View style={styles.vehicleBody}>
            <Text style={styles.vehicleLabel}>Driver</Text>
            <Text style={styles.vehicleName}>{route.driver}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert('Route Map', 'Live route map with GPS positions opens here.')}
          >
            <Ionicons name="navigate-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Live Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowPassengers(!showPassengers)}
          >
            <Ionicons name="people-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Passengers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              Alert.alert('Delay Notice', 'Push a delay notification to all students on this route.')
            }
          >
            <Ionicons name="megaphone-outline" size={16} color="#dc2626" />
            <Text style={[styles.actionText, { color: '#dc2626' }]}>Delay Alert</Text>
          </TouchableOpacity>
        </View>

        {showPassengers && (
          <View style={styles.passengerCard}>
            <Text style={styles.passengerTitle}>
              {route.students} students on this route
            </Text>
            {['Aarav Gupta', 'Meera Joshi', 'Rohan Kulkarni', 'Sana Sheikh'].map((s, i) => (
              <View key={s} style={styles.passengerRow}>
                <View style={styles.passengerAvatar}>
                  <Text style={styles.passengerAvatarText}>{s.charAt(0)}</Text>
                </View>
                <Text style={styles.passengerName}>{s}</Text>
                <Text style={styles.passengerStop}>Boarding at stop {i + 2}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Stop Timeline</Text>
        {stops.map((s, idx) => (
          <View key={s.id} style={styles.stopRow}>
            <View style={styles.timeline}>
              <View
                style={[
                  styles.timelineDot,
                  s.passed ? styles.timelineDotPassed : styles.timelineDotUpcoming,
                ]}
              >
                {s.passed && <Ionicons name="checkmark" size={10} color="#fff" />}
              </View>
              {idx < stops.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.stopBody}>
              <Text style={[styles.stopName, !s.passed && styles.stopNameUpcoming]}>
                {s.name}
              </Text>
              <Text style={styles.stopMeta}>
                {s.time} · {s.boarding} boarding
              </Text>
            </View>
            <View
              style={[
                styles.stopChip,
                { backgroundColor: s.passed ? '#dcfce7' : '#f1f5f9' },
              ]}
            >
              <Text style={[styles.stopChipText, { color: s.passed ? '#059669' : '#9ca3af' }]}>
                {s.passed ? 'Passed' : 'Upcoming'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  routeName: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  routeSub: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vehicleBody: { flex: 1 },
  vehicleLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehicleName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  passengerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  passengerTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  passengerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  passengerAvatarText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  passengerName: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  passengerStop: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  stopRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotPassed: { backgroundColor: '#059669' },
  timelineDotUpcoming: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 2,
  },
  stopBody: { flex: 1, marginLeft: 8, paddingBottom: 18 },
  stopName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  stopNameUpcoming: { color: theme.colors.textMuted },
  stopMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  stopChip: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stopChipText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});