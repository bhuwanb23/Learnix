import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { transportApi } from '../../../../services/api';

const rupees = (minor) => `₹${(minor / 100).toLocaleString('en-IN')}`;
const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

const STATUS_STYLE = {
  SCHEDULED: { bg: '#dbeafe', color: '#2563eb' },
  IN_PROGRESS: { bg: '#fef3c7', color: '#d97706' },
  COMPLETED: { bg: '#dcfce7', color: '#059669' },
};

export default function MaintenanceModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('Service Queue');
  const [showFuel, setShowFuel] = useState(false);
  const [form, setForm] = useState({ vehicleId: null, litres: '', amount: '' });

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const d = await transportApi.maintenance();
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load maintenance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const completeService = async (record) => {
    try {
      const res = await transportApi.completeService(record.id);
      Alert.alert('Completed', `${res.vehicle} service marked complete — bus set to Idle.`);
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const submitFuel = async () => {
    const litres = parseFloat(form.litres || '0');
    const amount = Math.round(parseFloat(form.amount || '0') * 100);
    if (!form.vehicleId || !litres || !amount) {
      Alert.alert('Incomplete', 'Pick a vehicle and enter litres + amount.');
      return;
    }
    try {
      const res = await transportApi.addFuel(form.vehicleId, litres, amount);
      Alert.alert('Fuel logged', `${res.vehicle} now at ${res.fuelPct}% fuel.`);
      setShowFuel(false);
      setForm({ vehicleId: null, litres: '', amount: '' });
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && !data) {
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

  const { stats, queue, fuelLogs } = data;
  // vehicles that appear in the fuel-log history are pickable for logging
  const fuelVehicles = [...new Map(fuelLogs.map((f) => [f.vehicleId, f.vehicle])).entries()];

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.scheduled + stats.inProgress}</Text>
          <Text style={styles.statLabel}>Open Jobs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{rupees(stats.fuelSpendMinor)}</Text>
          <Text style={styles.statLabel}>Fuel Spend</Text>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {['Service Queue', 'Fuel Log'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        {tab === 'Fuel Log' && (
          <TouchableOpacity style={styles.logBtn} onPress={() => setShowFuel(true)}>
            <Ionicons name="flame-outline" size={13} color="#fff" />
            <Text style={styles.logBtnText}>Log Fuel</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
      >
        {tab === 'Service Queue' ? (
          <>
            {queue.length === 0 && <Text style={styles.empty}>No service records yet.</Text>}
            {queue.map((q) => {
              const st = STATUS_STYLE[q.status] || STATUS_STYLE.SCHEDULED;
              const open = q.status !== 'COMPLETED';
              return (
                <View key={q.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.svcIcon}>
                      <Ionicons name="construct-outline" size={16} color="#dc2626" />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.svcTitle}>
                        {q.vehicle} · {q.type}
                      </Text>
                      <Text style={styles.svcMeta}>
                        {fmtDate(q.serviceDate)} · {rupees(q.costMinor)}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{q.status.replace('_', ' ')}</Text>
                    </View>
                  </View>
                  {open && (
                    <TouchableOpacity style={styles.completeBtn} onPress={() => completeService(q)}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                      <Text style={styles.completeText}>Mark Completed</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        ) : (
          <>
            {fuelLogs.length === 0 && <Text style={styles.empty}>No fuel fills logged yet.</Text>}
            {fuelLogs.map((f) => (
              <View key={f.id} style={styles.card}>
                <View style={[styles.svcIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="flame-outline" size={16} color="#d97706" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.svcTitle}>
                    {f.vehicle} · {f.litres} L
                  </Text>
                  <Text style={styles.svcMeta}>
                    {fmtDate(f.filledAt)} · {rupees(f.amountMinor)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Log fuel modal */}
      <Modal visible={showFuel} transparent animationType="fade" onRequestClose={() => setShowFuel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Fuel Fill</Text>
            <Text style={styles.modalSub}>
              {fuelVehicles.length === 0
                ? 'No vehicles have fuel history yet — log from the vehicle page first.'
                : 'Pick the vehicle and enter the fill details.'}
            </Text>
            {fuelVehicles.map(([vid, reg]) => (
              <TouchableOpacity
                key={vid}
                style={[styles.vehiclePick, form.vehicleId === vid && styles.vehiclePickActive]}
                onPress={() => setForm({ ...form, vehicleId: vid })}
              >
                <Text style={[styles.vehiclePickText, form.vehicleId === vid && styles.vehiclePickTextActive]}>
                  {reg}
                </Text>
              </TouchableOpacity>
            ))}
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
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowFuel(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={submitFuel}>
                <Text style={styles.modalSaveText}>Log Fill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 24 },
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
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 'auto',
  },
  logBtnText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 3,
  },
  list: { paddingTop: 12, paddingBottom: 24 },
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
  svcIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardBody: { flex: 1, marginRight: 8 },
  svcTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  svcMeta: {
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
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 9,
    paddingVertical: 9,
    marginTop: 10,
  },
  completeText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
    marginBottom: 10,
  },
  vehiclePick: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  vehiclePickActive: { borderColor: theme.colors.primary, backgroundColor: '#eff6ff' },
  vehiclePickText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  vehiclePickTextActive: { color: theme.colors.primary },
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
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  modalSave: { backgroundColor: theme.colors.primary },
  modalSaveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  modalCancel: { backgroundColor: theme.colors.surfaceMuted },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
});
