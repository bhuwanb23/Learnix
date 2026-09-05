import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const stats = [
  { label: 'Events', value: '24' },
  { label: 'Teams', value: '12' },
  { label: 'Coaches', value: '9' },
];

const menuItems = [
  { icon: 'people-outline', label: 'Coaches & Staff', color: '#2563eb' },
  { icon: 'medal-outline', label: 'Achievements & Trophies', color: '#d97706' },
  { icon: 'shield-checkmark-outline', label: 'Access & Permissions', color: '#059669' },
  { icon: 'document-text-outline', label: 'Event Reports', color: '#0891b2' },
  { icon: 'help-circle-outline', label: 'Help & Support', color: '#dc2626' },
];

export default function Profile({ navigation }) {
  const [eventAlerts, setEventAlerts] = useState(true);
  const [tryoutAlerts, setTryoutAlerts] = useState(true);
  const [equipmentAlerts, setEquipmentAlerts] = useState(true);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive' },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.name}>Mr. R. Subramaniam</Text>
          <Text style={styles.role}>Director · Sports & Cultural Affairs</Text>
          <Text style={styles.dept}>Student Activities, Learnix Campus</Text>
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.rowItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#2563eb1a' }]}>
                <Ionicons name="calendar-outline" size={18} color="#2563eb" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Event alerts</Text>
                <Text style={styles.rowSub}>New registrations and event updates</Text>
              </View>
              <Switch
                value={eventAlerts}
                onValueChange={setEventAlerts}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={eventAlerts ? '#2563eb' : '#f4f4f5'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.rowItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#dc26261a' }]}>
                <Ionicons name="fitness-outline" size={18} color="#dc2626" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Tryout alerts</Text>
                <Text style={styles.rowSub}>Team tryout registrations and results</Text>
              </View>
              <Switch
                value={tryoutAlerts}
                onValueChange={setTryoutAlerts}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={tryoutAlerts ? '#2563eb' : '#f4f4f5'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.rowItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#d977061a' }]}>
                <Ionicons name="basketball-outline" size={18} color="#d97706" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Equipment alerts</Text>
                <Text style={styles.rowSub}>Overdue returns and low stock warnings</Text>
              </View>
              <Switch
                value={equipmentAlerts}
                onValueChange={setEquipmentAlerts}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={equipmentAlerts ? '#2563eb' : '#f4f4f5'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            {menuItems.map((item, idx) => (
              <View key={item.label}>
                <TouchableOpacity
                  style={styles.rowItem}
                  onPress={() => Alert.alert(item.label, 'Coming soon')}
                >
                  <View style={[styles.iconWrap, { backgroundColor: item.color + '1a' }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
                {idx < menuItems.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.version}>Learnix ERP v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  header: {
    paddingTop: theme.spacing.xl + 10,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  avatarWrap: { position: 'relative', marginTop: theme.spacing.sm },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    marginTop: 12,
  },
  role: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  dept: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  section: { marginTop: 20, paddingHorizontal: theme.spacing.lg },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: { flex: 1, marginRight: 8 },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: theme.colors.text,
  },
  rowSub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: theme.spacing.lg,
    marginTop: 24,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#dc2626',
    marginLeft: 8,
  },
  version: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});