import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { transportApi } from '../../../../services/api';

const modules = [
  { id: 'Tracking', title: 'Live Tracking', icon: 'navigate-outline', color: '#2563eb' },
  { id: 'Maintenance', title: 'Maintenance', icon: 'construct-outline', color: '#dc2626' },
  { id: 'Fees', title: 'Transport Fees', icon: 'cash-outline', color: '#059669' },
  { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#d97706' },
];

const fmtPct = (v) => `${v}%`;

export default function TransportDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [dash, notifs] = await Promise.all([
        transportApi.dashboard(),
        transportApi.notifications().catch(() => ({ notifications: [] })),
      ]);
      setData(dash);
      setAlerts((notifs.notifications || []).slice(0, 4));
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(false);
  }, [load]);

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

  const { stats, todayRoutes } = data;
  const idle = stats.vehicles - stats.onRoad - stats.inService;

  const statCards = [
    { label: 'Buses On Road', value: `${stats.onRoad}/${stats.vehicles}`, sub: `${stats.inService} in service`, color: '#2563eb', icon: 'bus-outline' },
    { label: 'Active Routes', value: String(stats.routes), sub: `${stats.delayedRoutes} delayed`, color: '#d97706', icon: 'map-outline' },
    { label: 'Students', value: String(stats.students), sub: 'using service', color: '#0891b2', icon: 'people-outline' },
    { label: 'Avg. On-Time', value: fmtPct(stats.onTimePct), sub: `${stats.servicePending} service open`, color: '#059669', icon: 'time-outline' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <Text style={styles.heroLabel}>FLEET OPERATIONS · LIVE</Text>
        <Text style={styles.heroTitle}>Transport Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: `${stats.onTimePct}%` }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>{stats.onRoad} of {stats.vehicles}</Text>
            <Text style={styles.heroSub}>buses on road · {idle} idle</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="radio-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>GPS Live</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {statCards.map((s) => (
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
        {todayRoutes.length === 0 && (
          <View style={styles.listCard}>
            <Text style={styles.listSub}>No routes configured yet.</Text>
          </View>
        )}
        {todayRoutes.map((r) => (
          <View key={r.id} style={styles.listCard}>
            <View style={styles.routeIcon}>
              <Ionicons name="bus-outline" size={17} color="#2563eb" />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{r.name}</Text>
              <Text style={styles.listSub}>
                {r.students} students · {r.bus || 'no bus'}
              </Text>
            </View>
            {r.status ? (
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: r.status === 'ON_TIME' ? '#dcfce7' : '#fee2e2' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: r.status === 'ON_TIME' ? '#059669' : '#dc2626' },
                  ]}
                >
                  {r.status === 'ON_TIME' ? 'On Time' : 'Delayed'}
                </Text>
              </View>
            ) : (
              <View style={[styles.statusChip, { backgroundColor: '#f1f5f9' }]}>
                <Text style={[styles.statusText, { color: theme.colors.textMuted }]}>Idle</Text>
              </View>
            )}
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
        {data.alerts.length === 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.listSub}>No service or fuel alerts — fleet is healthy.</Text>
          </View>
        )}
        {data.alerts.map((a, idx) => (
          <View key={idx} style={styles.alertCard}>
            <View
              style={[
                styles.alertIcon,
                { backgroundColor: a.type === 'FUEL' ? '#fef3c7' : '#fee2e2' },
              ]}
            >
              <Ionicons
                name={a.type === 'FUEL' ? 'flame-outline' : 'construct-outline'}
                size={16}
                color={a.type === 'FUEL' ? '#d97706' : '#dc2626'}
              />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{a.severity === 'HIGH' ? 'High priority' : 'Due soon'}</Text>
              <Text style={styles.listSub}>{a.message}</Text>
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
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        {alerts.length === 0 && <Text style={styles.listSub}>No recent notifications.</Text>}
        {alerts.map((a) => (
          <View key={a.id} style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: a.read ? theme.colors.surfaceMuted : '#dbeafe' }]}>
              <Ionicons name="notifications-outline" size={14} color={a.read ? theme.colors.textMuted : '#2563eb'} />
            </View>
            <View style={styles.activityBody}>
              <Text style={styles.activityText} numberOfLines={1}>{a.title}</Text>
              <Text style={styles.activityTime}>{new Date(a.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
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
    backgroundColor: '#dbeafe',
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
