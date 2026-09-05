import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const drivers = [
  { id: 'D1', name: 'Ramesh K.', phone: '98450 11223', license: 'KA-2021-88432', exp: '11 yrs', route: 'Route 01', bus: 'KA-01-2045', status: 'On Duty', color: '#2563eb', licenseValid: 'Mar 2029' },
  { id: 'D2', name: 'Suresh P.', phone: '98860 33445', license: 'KA-2019-55210', exp: '14 yrs', route: 'Route 07', bus: 'KA-01-1876', status: 'On Duty', color: '#0891b2', licenseValid: 'Nov 2028' },
  { id: 'D3', name: 'Manoj G.', phone: '99010 55667', license: 'KA-2022-91345', exp: '8 yrs', route: 'Route 12', bus: 'KA-01-2210', status: 'On Duty', color: '#059669', licenseValid: 'Jan 2030' },
  { id: 'D4', name: 'Lakshman R.', phone: '98120 77889', license: 'KA-2020-22768', exp: '12 yrs', route: 'Route 04', bus: 'KA-01-1764', status: 'On Duty', color: '#d97706', licenseValid: 'Aug 2028' },
  { id: 'D5', name: 'Venkat S.', phone: '97430 99001', license: 'KA-2023-44671', exp: '6 yrs', route: 'Route 09', bus: 'KA-01-1982', status: 'Off Duty', color: '#dc2626', licenseValid: 'Jun 2031' },
  { id: 'D6', name: 'Naveen B.', phone: '96320 12345', license: 'KA-2018-77120', exp: '15 yrs', route: 'Standby', bus: '—', status: 'On Leave', color: '#6b7280', licenseValid: 'Feb 2027' },
];

const statusStyle = (s) => {
  if (s === 'On Duty') return { bg: '#dcfce7', color: '#059669' };
  if (s === 'Off Duty') return { bg: '#fef3c7', color: '#d97706' };
  return { bg: '#e5e7eb', color: '#6b7280' };
};

export default function DriversModule({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>22</Text>
          <Text style={styles.statLabel}>Total Drivers</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>18</Text>
          <Text style={styles.statLabel}>On Duty</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>9.1</Text>
          <Text style={styles.statLabel}>Avg. Yrs Exp</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Driver Roster</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Add Driver', 'Driver onboarding form opens here — license, medical and documents.')}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addText}>Add Driver</Text>
        </TouchableOpacity>
      </View>

      {drivers.map((d) => {
        const st = statusStyle(d.status);
        return (
          <View key={d.id} style={styles.card}>
            <View style={[styles.avatar, { backgroundColor: d.color + '1a' }]}>
              <Text style={[styles.avatarText, { color: d.color }]}>{d.name.charAt(0)}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{d.name}</Text>
              <Text style={styles.meta}>
                {d.exp} exp · License {d.license}
              </Text>
              <Text style={styles.meta}>
                {d.route} · {d.bus}
              </Text>
            </View>
            <View style={styles.rightCol}>
              <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{d.status}</Text>
              </View>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Alert.alert('Call', `Calling ${d.name} at ${d.phone}...`)}
              >
                <Ionicons name="call-outline" size={13} color={theme.colors.primary} />
              </TouchableOpacity>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
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
  callBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
  },
});