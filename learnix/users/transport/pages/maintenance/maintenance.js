import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialServices = [
  { id: '1', reg: 'KA-01-1876', issue: 'Routine service due', odometer: '9,800 km', nextDue: '200 km left', priority: 'High', status: 'Scheduled' },
  { id: '2', reg: 'KA-01-2210', issue: 'AC not cooling', odometer: '54,200 km', nextDue: 'In progress', priority: 'Medium', status: 'In Service' },
  { id: '3', reg: 'KA-01-2045', issue: 'Tyre pressure check', odometer: '86,400 km', nextDue: '1,500 km left', priority: 'Low', status: 'Scheduled' },
  { id: '4', reg: 'KA-01-1982', issue: 'Brake inspection', odometer: '42,300 km', nextDue: 'Completed', priority: 'Medium', status: 'Completed' },
];

const fuelLog = [
  { date: 'Today 6:40 AM', reg: 'KA-01-2210', litres: '120 L', amount: '₹9,200', odometer: '54,150' },
  { date: 'Yesterday 5:00 PM', reg: 'KA-01-2045', litres: '105 L', amount: '₹8,050', odometer: '86,200' },
  { date: 'Yesterday 6:10 PM', reg: 'KA-01-1876', litres: '130 L', amount: '₹9,960', odometer: '9,650' },
];

const priorityStyle = (p) => {
  if (p === 'High') return { bg: '#fee2e2', color: '#dc2626' };
  if (p === 'Medium') return { bg: '#fef3c7', color: '#d97706' };
  return { bg: '#dcfce7', color: '#059669' };
};

const statusStyle = (s) => {
  if (s === 'Completed') return { bg: '#dcfce7', color: '#059669' };
  if (s === 'In Service') return { bg: '#dbeafe', color: '#2563eb' };
  return { bg: '#fef3c7', color: '#d97706' };
};

export default function MaintenanceModule({ navigation }) {
  const [services, setServices] = useState(initialServices);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelForm, setFuelForm] = useState({ reg: 'KA-01-2045', litres: '', amount: '' });

  const handleLogFuel = () => {
    if (!fuelForm.litres.trim() || !fuelForm.amount.trim()) {
      Alert.alert('Incomplete', 'Enter litres and amount.');
      return;
    }
    Alert.alert('Fuel Logged', `${fuelForm.litres} L recorded for ${fuelForm.reg} — ₹${fuelForm.amount}.`);
    setFuelForm({ reg: 'KA-01-2045', litres: '', amount: '' });
    setShowFuelForm(false);
  };

  const handleComplete = (id) => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, status: 'Completed', nextDue: 'Completed' } : s))
    );
    Alert.alert('Service Completed', 'Vehicle back in rotation. Maintenance record saved.');
  };

  const handleSchedule = () => {
    Alert.alert('Schedule Service', 'Pick a vehicle and service date to queue it for the workshop.');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>6</Text>
          <Text style={styles.statLabel}>Due Services</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>2</Text>
          <Text style={styles.statLabel}>In Workshop</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹1.8L</Text>
          <Text style={styles.statLabel}>Sep Spend</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Service Queue</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleSchedule}>
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>Schedule</Text>
        </TouchableOpacity>
      </View>

      {services.map((s) => {
        const pr = priorityStyle(s.priority);
        const st = statusStyle(s.status);
        return (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.regIcon}>
                <Ionicons name="construct-outline" size={16} color="#2563eb" />
              </View>
              <View style={styles.cardHeader}>
                <Text style={styles.reg}>{s.reg}</Text>
                <Text style={styles.issue}>{s.issue}</Text>
              </View>
              <View style={[styles.priorityChip, { backgroundColor: pr.bg }]}>
                <Text style={[styles.priorityText, { color: pr.color }]}>{s.priority}</Text>
              </View>
            </View>
            <Text style={styles.odo}>Odometer {s.odometer}</Text>
            <View style={styles.cardBottom}>
              <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{s.status}</Text>
              </View>
              {s.status !== 'Completed' && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(s.id)}>
                  <Text style={styles.completeText}>Mark Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Fuel Log</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowFuelForm(!showFuelForm)}
        >
          <Ionicons name="flame-outline" size={14} color="#fff" />
          <Text style={styles.addText}>{showFuelForm ? 'Cancel' : 'Log Fuel'}</Text>
        </TouchableOpacity>
      </View>

      {showFuelForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Record fuel refill</Text>
          <Text style={styles.formLabel}>Vehicle</Text>
          <View style={styles.vehicleRow}>
            {['KA-01-2045', 'KA-01-1876', 'KA-01-2210'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.vehicleChip, fuelForm.reg === r && styles.vehicleChipActive]}
                onPress={() => setFuelForm({ ...fuelForm, reg: r })}
              >
                <Text style={[styles.vehicleChipText, fuelForm.reg === r && styles.vehicleChipTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Litres</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 120"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={fuelForm.litres}
                onChangeText={(t) => setFuelForm({ ...fuelForm, litres: t })}
              />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9200"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={fuelForm.amount}
                onChangeText={(t) => setFuelForm({ ...fuelForm, amount: t })}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleLogFuel}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.confirmText}>Save Fuel Record</Text>
          </TouchableOpacity>
        </View>
      )}

      {fuelLog.map((f, idx) => (
        <View key={idx} style={styles.fuelCard}>
          <View style={styles.fuelIcon}>
            <Ionicons name="flame-outline" size={15} color="#d97706" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.fuelReg}>{f.reg} · {f.litres}</Text>
            <Text style={styles.fuelMeta}>
              {f.date} · odo {f.odometer}
            </Text>
          </View>
          <Text style={styles.fuelAmount}>{f.amount}</Text>
        </View>
      ))}
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
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
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
  regIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
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
  issue: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  priorityChip: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  priorityText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },
  odo: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 9,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusChip: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  completeBtn: {
    backgroundColor: '#dcfce7',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  completeText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  vehicleChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 6,
    marginBottom: 6,
  },
  vehicleChipActive: { backgroundColor: theme.colors.primary },
  vehicleChipText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  vehicleChipTextActive: { color: '#fff' },
  formRow: { flexDirection: 'row', justifyContent: 'space-between' },
  formHalf: { flex: 1, marginRight: 8 },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
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
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 6,
  },
  fuelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  fuelIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardBody: { flex: 1 },
  fuelReg: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  fuelMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  fuelAmount: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
});