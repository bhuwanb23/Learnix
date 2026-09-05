import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const stats = [
  { label: 'Faculty', value: '18', sub: '2 on leave', color: '#2563eb', icon: 'people-outline' },
  { label: 'Students', value: '410', sub: '3 programs', color: '#059669', icon: 'school-outline' },
  { label: 'Courses', value: '32', sub: '5 pending', color: '#d97706', icon: 'book-outline' },
  { label: 'Avg. CGPA', value: '7.8', sub: 'up 0.2', color: '#0891b2', icon: 'trending-up-outline' },
];

const pendingApprovals = [
  { id: '1', type: 'Syllabus', item: 'DBMS Syllabus — Sem 5', by: 'Dr. Sunita Rao', time: '2 hrs ago' },
  { id: '2', type: 'Syllabus', item: 'Thermodynamics Syllabus — Sem 5', by: 'Prof. Anand Krishnan', time: '5 hrs ago' },
  { id: '3', type: 'Leave', item: 'Medical Leave — Oct 12-14 (3 days)', by: 'Prof. Anand Krishnan', time: 'Yesterday' },
];

const classAlerts = [
  { id: '1', title: 'CS301 attendance below 75%', detail: 'Data Structures — 68% this week, 6 students at risk', severity: 'High' },
  { id: '2', title: 'Dr. Sunita Rao at 22/24 workload', detail: 'Consider balancing DBMS with another faculty', severity: 'Medium' },
];

const modules = [
  { id: 'Syllabus', title: 'Syllabus Approvals', icon: 'document-text-outline', color: '#2563eb' },
  { id: 'Leave', title: 'Leave Requests', icon: 'calendar-outline', color: '#059669' },
  { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#d97706' },
];

const activity = [
  { text: 'Syllabus approved — Operating Systems (Sem 5)', time: '1 hr ago', icon: 'checkmark-circle-outline', color: '#059669' },
  { text: 'Leave approved for Dr. Neha Kapoor (Oct 20-21)', time: '3 hrs ago', icon: 'calendar-outline', color: '#2563eb' },
  { text: 'New course CS306 (AI) added by Dr. Meera Iyer', time: '5 hrs ago', icon: 'add-circle-outline', color: '#0891b2' },
  { text: 'Faculty meeting scheduled for Friday 4 PM', time: 'Yesterday', icon: 'people-outline', color: '#d97706' },
];

export default function HodDashboard({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <Text style={styles.heroLabel}>COMPUTER SCIENCE DEPARTMENT</Text>
        <Text style={styles.heroTitle}>Department Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: '82%' }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>82%</Text>
            <Text style={styles.heroSub}>workload utilized · 410 students</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>NAAC Ready</Text>
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
          <Text style={styles.sectionTitle}>Pending Approvals</Text>
          <TouchableOpacity onPress={() => navigation.openModule('Syllabus')}>
            <Text style={styles.seeAll}>Review</Text>
          </TouchableOpacity>
        </View>
        {pendingApprovals.map((p) => (
          <View key={p.id} style={styles.listCard}>
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
              <Text style={styles.listSub}>
                {p.by} · {p.time}
              </Text>
            </View>
            <View style={styles.pendingChip}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Department Alerts</Text>
        {classAlerts.map((a) => (
          <View key={a.id} style={styles.alertCard}>
            <View
              style={[
                styles.alertIcon,
                { backgroundColor: a.severity === 'High' ? '#fee2e2' : '#fef3c7' },
              ]}
            >
              <Ionicons
                name={a.severity === 'High' ? 'warning-outline' : 'alert-circle-outline'}
                size={16}
                color={a.severity === 'High' ? '#dc2626' : '#d97706'}
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