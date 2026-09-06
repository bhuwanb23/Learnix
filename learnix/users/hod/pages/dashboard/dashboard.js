import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';

const modules = [
  { id: 'Syllabus', title: 'Syllabus Approvals', icon: 'document-text-outline', color: '#2563eb' },
  { id: 'Leave', title: 'Leave Requests', icon: 'calendar-outline', color: '#059669' },
  { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#d97706' },
];

export default function HodDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const d = await hodApi.dashboard();
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dept = data.department ?? { name: 'Department' };
  const eng = data.engagement ?? { utilizationPct: 0, totalLoad: 0, totalMax: 0, students: 0 };
  const stats = data.stats ?? {};
  const approvals = data.pendingApprovals ?? { syllabus: 0, leaves: 0 };

  const statCards = [
    { label: 'Faculty', value: String(stats.faculty ?? 0), sub: 'in department', color: '#2563eb', icon: 'people-outline' },
    { label: 'Students', value: String(stats.students ?? 0), sub: 'enrolled', color: '#059669', icon: 'school-outline' },
    { label: 'Courses', value: String(stats.courses ?? 0), sub: 'department', color: '#d97706', icon: 'book-outline' },
    { label: 'Pending', value: String(approvals.syllabus + approvals.leaves), sub: 'approvals', color: '#0891b2', icon: 'hourglass-outline' },
  ];

  const approvalRows = [
    ...(approvals.syllabus > 0
      ? [{ id: 'syl', type: 'Syllabus', item: `${approvals.syllabus} syllabus version(s) awaiting review`, module: 'Syllabus' }]
      : []),
    ...(approvals.leaves > 0
      ? [{ id: 'lv', type: 'Leave', item: `${approvals.leaves} leave request(s) awaiting decision`, module: 'Leave' }]
      : []),
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <Text style={styles.heroLabel}>{dept.name.toUpperCase()}</Text>
        <Text style={styles.heroTitle}>Department Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: `${eng.utilizationPct}%` }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>{eng.utilizationPct}%</Text>
            <Text style={styles.heroSub}>
              workload · {eng.totalLoad}/{eng.totalMax} hrs · {eng.students} students
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>{dept.code}</Text>
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

      {approvalRows.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            <TouchableOpacity onPress={() => navigation.openModule('Syllabus')}>
              <Text style={styles.seeAll}>Review</Text>
            </TouchableOpacity>
          </View>
          {approvalRows.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.listCard}
              onPress={() => navigation.openModule(p.module)}
            >
              <View
                style={[
                  styles.typeIcon,
                  { backgroundColor: p.type === 'Syllabus' ? '#dbeafe' : '#dcfce7' },
                ]}
              >
                <Ionicons
                  name={p.type === 'Syllabus' ? 'document-text-outline' : 'calendar-outline'}
                  size={16}
                  color={p.type === 'Syllabus' ? '#2563eb' : '#059669'}
                />
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{p.item}</Text>
                <Text style={styles.listSub}>Tap to open {p.module}</Text>
              </View>
              <View style={styles.pendingChip}>
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(data.alerts ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Department Alerts</Text>
          {data.alerts.map((a, idx) => (
            <View key={idx} style={styles.alertCard}>
              <View
                style={[
                  styles.alertIcon,
                  { backgroundColor: a.severity === 'HIGH' ? '#fee2e2' : '#fef3c7' },
                ]}
              >
                <Ionicons
                  name={a.severity === 'HIGH' ? 'warning-outline' : 'alert-circle-outline'}
                  size={16}
                  color={a.severity === 'HIGH' ? '#dc2626' : '#d97706'}
                />
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{a.message}</Text>
                <Text style={styles.listSub}>{a.type}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
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
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertIcon: {
    width: 38,
    height: 38,
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
  pendingChip: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
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
});
