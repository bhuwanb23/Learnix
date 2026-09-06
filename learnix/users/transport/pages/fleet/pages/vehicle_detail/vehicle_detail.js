import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { transportApi } from '../../../../../../services/api';

const rupees = (minor) => `₹${(minor / 100).toLocaleString('en-IN')}`;
const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

export default function VehicleDetail({ vehicleId, onBack }) {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showService, setShowService] = useState(false);
  const [showFuel, setShowFuel] = useState(false);
  const [form, setForm] = useState({ type: 'PERIODIC', cost: '', litres: '', amount: '' });

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await transportApi.vehicleDetail(vehicleId);
      setVehicle(data);
    } catch (e) {
      setError(e.message || 'Failed to load vehicle');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const recordService = async () => {
    const cost = Math.round(parseFloat(form.cost || '0') * 100);
    if (!cost || cost <= 0) {
      Alert.alert('Invalid cost', 'Enter the estimated service cost in rupees.');
      return;
    }
    try {
      const res = await transportApi.recordService(vehicleId, {
        type: form.type,
        costMinor: cost,
        serviceDate: new Date().toISOString(),
      });
      Alert.alert('Service recorded', `${res.vehicle} — ${form.type} scheduled.`);
      setShowService(false);
      setForm({ type: 'PERIODIC', cost: '', litres: '', amount: '' });
      load();
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const completeService = async (serviceId) => {
    try {
      const res = await transportApi.completeService(serviceId);
      Alert.alert('Completed', `${res.vehicle} service done — bus set to Idle.`);
      load();
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const logFuel = async () => {
    const litres = parseFloat(form.litres || '0');
    const amount = Math.round(parseFloat(form.amount || '0') * 100);
    if (!litres || litres <= 0 || !amount || amount <= 0) {
      Alert.alert('Invalid input', 'Enter litres and amount in rupees.');
      return;
    }
    try {
      const res = await transportApi.addFuel(vehicleId, litres, amount);
      Alert.alert('Fuel logged', `${res.vehicle} now at ${res.fuelPct}% fuel.`);
      setShowFuel(false);
      setForm({ type: 'PERIODIC', cost: '', litres: '', amount: '' });
      load();
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !vehicle) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Vehicle not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fuelColor = vehicle.fuelPct < 30 ? '#ef4444' : vehicle.fuelPct < 50 ? '#f59e0b' : '#22c55e';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.regNo}>{vehicle.regNo}</Text>
          <Text style={styles.model}>{vehicle.model}</Text>
          {vehicle.live && (
            <View style={styles.liveChip}>
              <Text style={styles.liveText}>
                Live on {vehicle.live.route} · {vehicle.live.status === 'ON_TIME' ? 'On time' : 'Delayed'}
              </Text>
            </View>
          )}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{vehicle.odometerKm.toLocaleString()}</Text>
              <Text style={styles.heroStatLabel}>Odometer km</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{vehicle.fuelPct}%</Text>
              <Text style={styles.heroStatLabel}>Fuel</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{vehicle.capacity}</Text>
              <Text style={styles.heroStatLabel}>Seats</Text>
            </View>
          </View>
          <View style={styles.fuelTrack}>
            <View style={[styles.fuelFill, { width: `${vehicle.fuelPct}%`, backgroundColor: fuelColor }]} />
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowService(!showService)}>
            <Ionicons name="construct-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{showService ? 'Cancel' : 'Record Service'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowFuel(!showFuel)}>
            <Ionicons name="flame-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{showFuel ? 'Cancel' : 'Log Fuel'}</Text>
          </TouchableOpacity>
        </View>

        {showService && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Record service</Text>
            <View style={styles.typeRow}>
              {['PERIODIC', 'REPAIR', 'INSPECTION'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                  onPress={() => setForm({ ...form, type: t })}
                >
                  <Text style={[styles.typeText, form.type === t && styles.typeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Cost (₹)"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.cost}
              onChangeText={(v) => setForm({ ...form, cost: v })}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={recordService}>
              <Text style={styles.confirmText}>Schedule Service</Text>
            </TouchableOpacity>
          </View>
        )}

        {showFuel && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Log fuel fill</Text>
            <TextInput
              style={styles.input}
              placeholder="Litres"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.litres}
              onChangeText={(v) => setForm({ ...form, litres: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(v) => setForm({ ...form, amount: v })}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={logFuel}>
              <Text style={styles.confirmText}>Log Fill</Text>
            </TouchableOpacity>
          </View>
        )}

        {vehicle.documents && (
          <View style={styles.docsCard}>
            <Text style={styles.sectionTitleFlat}>Documents</Text>
            <View style={styles.docRow}>
              <Text style={styles.docLabel}>Registration</Text>
              <Text style={styles.docValue}>{fmtDate(vehicle.documents.registrationExpiry)}</Text>
            </View>
            <View style={styles.docRow}>
              <Text style={styles.docLabel}>Insurance</Text>
              <Text style={styles.docValue}>{fmtDate(vehicle.documents.insuranceExpiry)}</Text>
            </View>
            <View style={styles.docRow}>
              <Text style={styles.docLabel}>Fitness</Text>
              <Text style={styles.docValue}>{fmtDate(vehicle.documents.fitnessExpiry)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitleFlat}>Service History</Text>
        {vehicle.serviceHistory.length === 0 && (
          <Text style={styles.empty}>No service records yet.</Text>
        )}
        {vehicle.serviceHistory.map((s) => {
          const canComplete = s.status !== 'COMPLETED';
          return (
            <View key={s.id} style={styles.historyCard}>
              <View style={styles.historyBody}>
                <Text style={styles.historyTitle}>
                  {s.type} · {rupees(s.costMinor)}
                </Text>
                <Text style={styles.historyMeta}>
                  {fmtDate(s.serviceDate)} · {s.status.replace('_', ' ')}
                </Text>
              </View>
              {canComplete ? (
                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={() => completeService(s.id)}
                >
                  <Text style={styles.completeText}>Complete</Text>
                </TouchableOpacity>
              ) : (
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
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
    marginBottom: 10,
  },
  regNo: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  model: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  liveChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  liveText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
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
    fontSize: 15,
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
  fuelTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 12,
    overflow: 'hidden',
  },
  fuelFill: { height: 6, borderRadius: 3 },
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
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  typeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  typeChipActive: { backgroundColor: theme.colors.primary },
  typeText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  typeTextActive: { color: '#fff' },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginTop: 8,
  },
  confirmBtn: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 12,
  },
  confirmText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  docsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  sectionTitleFlat: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  docLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  docValue: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
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
    marginTop: 8,
  },
  historyBody: { flex: 1, marginRight: 8 },
  historyTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  historyMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  completeBtn: {
    backgroundColor: '#dcfce7',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  completeText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
  },
});
