import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const stats = [
  { label: 'Buses On Road', value: '26/30', sub: '86%', color: '#2563eb', icon: 'bus-outline' },
  { label: 'Active Routes', value: '18', sub: '2 delayed', color: '#d97706', icon: 'map-outline' },
  { label: 'Students', value: '2,340', sub: 'using service', color: '#0891b2', icon: 'people-outline' },
  { label: 'Avg. On-Time', value: '91%', sub: 'this week', color: '#059669', icon: 'time-outline' },
];

const todayRoutes = [
  { id: '1', name: 'Route 01 — Central City', time: '7:05 AM', status: 'On Time', bus: 'KA-01-2045', delay: null },
  { id: '2', name: 'Route 07 — Electronic City', time: '7:15 AM', status: 'Delayed', bus: 'KA-01-1876', delay: '12 min' },
  { id: '3', name: 'Route 12 — Whitefield', time: '7:20 AM', status: 'On Time', bus: 'KA-01-2210', delay: null },
];

const alerts = [
  { id: '1', title: 'Bus KA-01-1876 needs service', detail: 'Odometer at 9,800 km — service due in 200 km', type: 'service', severity: 'Due Soon' },
  { id: '2', title: 'Route 07 morning delay', detail: 'Traffic on Outer Ring Road — arrived 12 min late', type: 'delay', severity: 'Delayed' },
  { id: '3', title: 'Fuel level low — Bus KA-01-2045', detail: '27% remaining, refuel before evening trip', type: 'fuel', severity: 'Low Fuel' },
];

const modules = [
  { id: 'Tracking', title: 'Live Tracking', icon: 'navigate-outline', color: '#2563eb' },
  { id: 'Maintenance', title: 'Maintenance', icon: 'construct-outline', color: '#dc2626' },
  { id: 'Fees', title: 'Transport Fees', icon: 'cash-outline', color: '#059669' },
  { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#d97706' },
];

const activity = [
  { text: 'Route 04 morning trip completed on time', time: '40 min ago', icon: 'checkmark-circle-outline', color: '#059669' },
  { text: 'Service logged for Bus KA-01-1764 (oil change)', time: '2 hrs ago', icon: 'construct-outline', color: '#2563eb' },
  { text: 'Driver Ramesh K. assigned to Route 12', time: '4 hrs ago', icon: 'person-add-outline', color: '#0891b2' },
  { text: 'Fuel refill recorded — ₹9,200 for Bus KA-01-2210', time: '6 hrs ago', icon: 'flame-outline', color: '#d97706' },
];

export default function TransportDashboard({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <Text style={styles.heroLabel}>FLEET OPERATIONS · SEP 2026</Text>
        <Text style={styles.heroTitle}>Transport Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: '86%' }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>26 of 30</Text>
            <Text style={styles.heroSub}>buses on road · 4 idle</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="radio-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>GPS Live</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '1a' }]}>
              <Ionicons name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statSub, { color: s.color }]}>{s.sub}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Routes</Text>
          <TouchableOpacity onPress={() => navigation.switchTab('Routes')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {todayRoutes.map((r) => (
          <View key={r.id} style={styles.listCard}>
            <View style={[styles.routeIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="bus-outline" size={17} color="#2563eb" />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{r.name}</Text>
              <Text style={styles.listSub}>
                {r.time} · {r.bus}
              </Text>
            </View>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: r.status === 'On Time' ? '#dcfce7' : '#fee2e2' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: r.status === 'On Time' ? '#059669' : '#dc2626' },
                ]}
              >
                {r.status === 'On Time' ? 'On Time' : `${r.delay} late`}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          <TouchableOpacity onPress={() => navigation.openModule('Maintenance')}>
            <Text style={styles.seeAll}>View</Text>
          </TouchableOpacity>
        </View>
        {alerts.map((a) => (
          <View key={a.id} style={styles.alertCard}>
            <View
              style={[
                styles.alertIcon,
                {
                  backgroundColor:
                    a.type === 'service'
                      ? '#fef3c7'
                      : a.type === 'delay'
                      ? '#fee2e2'
                      : '#dcfce7',
                },
              ]}
            >
              <Ionicons
                name={a.type === 'service' ? 'construct-outline' : a.type === 'delay' ? 'time-outline' : 'flame-outline'}
                size={16}
                color={a.type === 'service' ? '#d97706' : a.type === 'delay' ? '#dc2626' : '#059669'}
              />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{a.title}</Text>
              <Text style={styles.listSub}>{a.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Tools</Text>
        <View style={styles.moduleGrid}>
          {modules.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.moduleCard}
              onPress={() => navigation.openModule(m.id)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: m.color + '1a' }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={styles.moduleTitle}>{m.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {activity.map((a, idx) => (
          <View key={idx} style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: a.color + '1a' }]}>
              <Ionicons name={a.icon} size={14} color={a.color} />
            </View>
            <View style={styles.activityBody}>
              <Text style={styles.activityText}>{a.text}</Text>
              <Text style={styles.activityTime}>{a.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 0 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 4,
  },
  heroProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 14,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
  },
  heroValue: {
    fontSize: 26,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 17,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    marginTop: 4,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.primary,
  },
  listCard: {
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
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listBody: { flex: 1, marginRight: 8 },
  listTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  listSub: {
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
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  alertIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 10,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moduleTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityBody: { flex: 1 },
  activityText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  activityTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
});