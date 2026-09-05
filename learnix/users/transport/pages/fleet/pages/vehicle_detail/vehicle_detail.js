import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const serviceHistory = [
  { date: '28 Aug 2026', type: 'Oil change + filter', cost: '₹6,200', odometer: '86,100', status: 'Completed' },
  { date: '15 Jul 2026', type: 'Brake pad replacement', cost: '₹9,800', odometer: '83,400', status: 'Completed' },
  { date: '02 Jun 2026', type: 'Wheel alignment + tyres', cost: '₹14,500', odometer: '80,100', status: 'Completed' },
];

export default function VehicleDetail({ vehicle, onBack }) {
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceNote, setServiceNote] = useState('');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.reg}>{vehicle.reg}</Text>
          <Text style={styles.model}>
            {vehicle.model} · {vehicle.capacity} seats
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{vehicle.odometer} km</Text>
              <Text style={styles.heroStatLabel}>Odometer</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{vehicle.fuel}</Text>
              <Text style={styles.heroStatLabel}>Fuel</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{vehicle.route}</Text>
              <Text style={styles.heroStatLabel}>Assigned</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.infoLabel}>Registration</Text>
            <Text style={styles.infoValue}>{vehicle.reg}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.infoLabel}>Insurance valid till</Text>
            <Text style={styles.infoValue}>14 Mar 2027</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.infoLabel}>Fitness certificate</Text>
            <Text style={styles.infoValue}>Valid · Dec 2026</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="speedometer-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.infoLabel}>Avg. mileage</Text>
            <Text style={styles.infoValue}>4.2 km/l</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.serviceBtn}
          onPress={() => setShowServiceForm(!showServiceForm)}
        >
          <Ionicons name="construct-outline" size={16} color="#fff" />
          <Text style={styles.serviceBtnText}>
            {showServiceForm ? 'Cancel' : 'Record Service'}
          </Text>
        </TouchableOpacity>

        {showServiceForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Log service for {vehicle.reg}</Text>
            <Text style={styles.formLabel}>Work done</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Engine oil change"
              placeholderTextColor="#9ca3af"
              value={serviceNote}
              onChangeText={setServiceNote}
            />
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                if (!serviceNote.trim()) {
                  Alert.alert('Incomplete', 'Describe the service work done.');
                  return;
                }
                Alert.alert('Service Logged', `${vehicle.reg} service recorded — maintenance staff notified.`);
                setServiceNote('');
                setShowServiceForm(false);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.confirmText}>Save Service Record</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Service History</Text>
        {serviceHistory.map((s, idx) => (
          <View key={idx} style={styles.historyCard}>
            <View style={styles.historyIcon}>
              <Ionicons name="construct-outline" size={15} color="#2563eb" />
            </View>
            <View style={styles.historyBody}>
              <Text style={styles.historyType}>{s.type}</Text>
              <Text style={styles.historyMeta}>
                {s.date} · {s.odometer} km
              </Text>
            </View>
            <View style={styles.historyRight}>
              <Text style={styles.historyCost}>{s.cost}</Text>
              <View style={styles.doneChip}>
                <Text style={styles.doneText}>{s.status}</Text>
              </View>
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
  reg: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  model: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
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
    fontSize: 14,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginLeft: 10,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  serviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginHorizontal: 16,
    marginTop: 12,
  },
  serviceBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    marginLeft: 6,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  formTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.text,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  confirmText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  historyCard: {
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
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyBody: { flex: 1 },
  historyType: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.text,
  },
  historyMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  historyRight: { alignItems: 'flex-end' },
  historyCost: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
  },
  doneChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
  },
  doneText: {
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
    color: '#059669',
  },
});