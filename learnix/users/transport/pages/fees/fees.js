import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialDefaulters = [
  { id: '1', name: 'Aarav Gupta', roll: '22CS045', route: 'Route 01', fee: '₹18,000', due: '₹4,200', status: 'Partial' },
  { id: '2', name: 'Meera Joshi', roll: '21EC042', route: 'Route 12', fee: '₹18,000', due: '₹18,000', status: 'Unpaid' },
  { id: '3', name: 'Rohan Kulkarni', roll: '23ME054', route: 'Route 07', fee: '₹18,000', due: '₹9,600', status: 'Partial' },
  { id: '4', name: 'Sana Sheikh', roll: '22IT031', route: 'Route 04', fee: '₹18,000', due: '₹18,000', status: 'Unpaid' },
  { id: '5', name: 'Kabir Anand', roll: '21CS118', route: 'Route 09', fee: '₹18,000', due: '₹0', status: 'Paid' },
];

export default function FeesModule({ navigation }) {
  const [defaulters, setDefaulters] = useState(initialDefaulters);

  const handleCollect = (id) => {
    setDefaulters(
      defaulters.map((d) => (d.id === id ? { ...d, due: '₹0', status: 'Paid' } : d))
    );
    Alert.alert('Payment Collected', 'Receipt issued and forwarded to Accounts & Finance.');
  };

  const handleRemind = (id) => {
    Alert.alert('Reminder Sent', `Payment reminder pushed to the student's app.`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹8.4L</Text>
          <Text style={styles.statLabel}>Collected (FY)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹1.2L</Text>
          <Text style={styles.statLabel}>Outstanding</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>86%</Text>
          <Text style={styles.statLabel}>Collection</Text>
        </View>
      </View>

      <View style={styles.structureCard}>
        <Text style={styles.structureTitle}>Fee Structure 2026-27</Text>
        <View style={styles.feeRow}>
          <View>
            <Text style={styles.feeLabel}>Annual Transport Fee</Text>
            <Text style={styles.feeMeta}>All routes · 2 semesters</Text>
          </View>
          <Text style={styles.feeValue}>₹18,000</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.feeRow}>
          <View>
            <Text style={styles.feeLabel}>Per Semester</Text>
            <Text style={styles.feeMeta}>Payable at semester start</Text>
          </View>
          <Text style={styles.feeValue}>₹9,000</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => Alert.alert('Edit Structure', 'Fee revision opens here — requires Accounts approval.')}
        >
          <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.editText}>Request Revision</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment Status</Text>
      </View>

      {defaulters.map((d) => {
        const st =
          d.status === 'Paid'
            ? { bg: '#dcfce7', color: '#059669' }
            : d.status === 'Partial'
            ? { bg: '#fef3c7', color: '#d97706' }
            : { bg: '#fee2e2', color: '#dc2626' };
        return (
          <View key={d.id} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{d.name.charAt(0)}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{d.name} · {d.roll}</Text>
              <Text style={styles.meta}>{d.route} · Fee {d.fee}</Text>
              <Text style={[styles.due, { color: st.color }]}>Due: {d.due}</Text>
            </View>
            <View style={styles.rightCol}>
              <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{d.status}</Text>
              </View>
              {d.status !== 'Paid' ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.remindBtn}
                    onPress={() => handleRemind(d.id)}
                  >
                    <Ionicons name="megaphone-outline" size={13} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.collectBtn}
                    onPress={() => handleCollect(d.id)}
                  >
                    <Text style={styles.collectText}>Collect</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Ionicons name="checkmark-circle" size={20} color="#059669" style={styles.paidIcon} />
              )}
            </View>
          </View>
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
  structureCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 14,
  },
  structureTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  feeLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.text,
  },
  feeMeta: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  feeValue: {
    fontSize: 15,
    fontFamily: 'Manrope_800ExtraBold',
    color: theme.colors.primary,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  editText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.primary,
    marginLeft: 5,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: '#2563eb',
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
  due: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    marginTop: 4,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  remindBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  collectBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  collectText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
  },
  paidIcon: { marginTop: 7 },
});