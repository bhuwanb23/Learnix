import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { hostelApi } from '../../../../services/api';

const modules = [
  { id: 'GatePasses', title: 'Gate Passes', icon: 'exit-outline', color: '#2563eb' },
  { id: 'Complaints', title: 'Complaints', icon: 'construct-outline', color: '#dc2626' },
  { id: 'Visitors', title: 'Visitors', icon: 'people-outline', color: '#0891b2' },
  { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#d97706' },
];

const fmtTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

export default function HostelDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await hostelApi.dashboard());
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Loading dashboard…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="cloud-offline-outline" size={32} color={theme.colors.textMuted} />
        <Text style={[styles.muted, { marginTop: 8 }]}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const occ = data.occupancy;
  const stats = [
    {
      label: 'Occupancy',
      value: `${occ.occupied}/${occ.total}`,
      sub: `${occ.pct}%`,
      color: '#2563eb',
      icon: 'bed-outline',
    },
    {
      label: 'Pending Passes',
      value: String(data.stats.pendingPasses),
      sub: 'needs action',
      color: '#d97706',
      icon: 'exit-outline',
    },
    {
      label: 'Complaints',
      value: String(data.stats.openComplaints),
      sub: 'open',
      color: '#dc2626',
      icon: 'construct-outline',
    },
    {
      label: 'Mess Rating',
      value: data.stats.messRating ? `${data.stats.messRating}★` : '—',
      sub: 'avg feedback',
      color: '#059669',
      icon: 'restaurant-outline',
    },
  ];

  const sevColor = (s) => (s === 'HIGH' ? '#dc2626' : s === 'MEDIUM' ? '#d97706' : '#4f46e5');

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <Text style={styles.heroLabel}>RESIDENTIAL LIFE</Text>
        <Text style={styles.heroTitle}>Hostel Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: `${occ.pct}%` }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>{occ.pct}%</Text>
            <Text style={styles.heroSub}>
              Beds occupied across {occ.blocks.length} block{occ.blocks.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>{data.stats.residents} residents</Text>
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
          <Text style={styles.sectionTitle}>Today's Gate Passes</Text>
          <TouchableOpacity onPress={() => navigation.openModule('GatePasses')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {data.todayPasses.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.muted}>No gate passes for today.</Text>
          </View>
        )}
        {data.todayPasses.map((p) => (
          <View key={p.id} style={styles.listCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.student.charAt(0)}</Text>
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>
                {p.student} · {p.room}
              </Text>
              <Text style={styles.listSub}>
                {p.reason} · out {fmtTime(p.outAt)}
              </Text>
            </View>
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    p.status === 'APPROVED'
                      ? '#dcfce7'
                      : p.status === 'REJECTED'
                        ? '#fee2e2'
                        : '#fef3c7',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      p.status === 'APPROVED'
                        ? '#059669'
                        : p.status === 'REJECTED'
                          ? '#dc2626'
                          : '#d97706',
                  },
                ]}
              >
                {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Open Complaints</Text>
          <TouchableOpacity onPress={() => navigation.openModule('Complaints')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {data.openComplaints.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.muted}>No open complaints — all clear.</Text>
          </View>
        )}
        {data.openComplaints.map((c) => (
          <View key={c.id} style={styles.listCard}>
            <View style={[styles.complaintIcon, { backgroundColor: sevColor(c.severity) + '1a' }]}>
              <Ionicons name="construct-outline" size={16} color={sevColor(c.severity)} />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {c.description}
              </Text>
              <Text style={styles.listSub}>
                {c.category} · by {c.by}
              </Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: sevColor(c.severity) + '1a' }]}>
              <Text style={[styles.statusText, { color: sevColor(c.severity) }]}>{c.severity}</Text>
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
        {data.activity.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.muted}>No recent activity yet.</Text>
          </View>
        )}
        {data.activity.map((a, idx) => {
          const isResolve = a.action.includes('resolve');
          const isVacate = a.action.includes('vacate');
          const color = isResolve ? '#059669' : isVacate ? '#dc2626' : '#2563eb';
          const icon = isResolve
            ? 'checkmark-circle-outline'
            : isVacate
              ? 'log-out-outline'
              : 'bed-outline';
          return (
            <View key={idx} style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: color + '1a' }]}>
                <Ionicons name={icon} size={14} color={color} />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityText}>{a.action}</Text>
                <Text style={styles.activityTime}>{fmtTime(a.at)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  retryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  complaintIcon: {
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
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 8,
  },
});
