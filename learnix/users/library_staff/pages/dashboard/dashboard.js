import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';
import { BORDER_RADIUS } from '../../../../constants/theme';

const MODULES = [
  { id: 'Catalog', label: 'Catalog', desc: 'Manage books & stock', icon: 'book-outline', color: '#2563eb' },
  { id: 'Circulation', label: 'Circulation', desc: 'Issue & return books', icon: 'swap-horizontal-outline', color: '#059669' },
  { id: 'Fines', label: 'Fines & Overdues', desc: 'Collect & waive fines', icon: 'cash-outline', color: '#d97706' },
  { id: 'Requests', label: 'Book Requests', desc: 'Approve student requests', icon: 'cart-outline', color: '#0284c7' },
  { id: 'DigitalLibrary', label: 'Digital Library', desc: 'E-books & resources', icon: 'cloud-outline', color: '#4f46e5' },
  { id: 'Notifications', label: 'Notify Students', desc: 'Due date reminders', icon: 'megaphone-outline', color: '#dc2626' },
];

export default function LibraryDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.dashboard();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleModulePress = (moduleId) => {
    if (moduleId === 'Catalog' || moduleId === 'Circulation' || moduleId === 'Fines') {
      navigation.switchTab(moduleId);
    } else {
      navigation.openModule(moduleId);
    }
  };

  if (loading) {
    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.skeletonHeroIcon} />
            <View style={{ flex: 1 }}>
              <View style={styles.skeletonLineLight} />
              <View style={[styles.skeletonLineLight, { width: '70%', marginTop: 8 }]} />
            </View>
          </View>
          <View style={styles.skeletonTrack} />
        </View>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hero = data?.hero || {};
  const stats = data?.stats || {};
  const dueToday = data?.dueToday || [];
  const popular = data?.popular || [];
  const alerts = data?.alerts || [];
  const heroPct = hero.utilizationPct ?? 95;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#b45309']} />}
    >
      {/* Hero banner */}
      <AnimatedCard delay={0} style={[styles.block, styles.heroCard]}>
        <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="book" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Central Library</Text>
              <Text style={styles.heroSubtitle}>
                {hero.totalBooks?.toLocaleString() ?? '—'} books · {hero.totalIssued?.toLocaleString() ?? '—'} issued · {hero.totalMembers?.toLocaleString() ?? '—'} members
              </Text>
            </View>
          </View>
          <View style={styles.heroProgressTrack}>
            <View style={[styles.heroProgressFill, { width: heroPct + '%' }]} />
          </View>
        <Text style={styles.heroNote}>
          {heroPct}% of the collection is available
          {hero.overdueCount ? ` — ${hero.overdueCount} book${hero.overdueCount === 1 ? '' : 's'} overdue` : ''}
        </Text>
      </AnimatedCard>

      {/* Stats */}
      <AnimatedCard delay={80} style={[styles.block, styles.statsRow]}>
        {[
          { id: 'books', label: 'Total Books', value: stats.totalBooks?.toLocaleString() ?? '0', icon: 'book', color: '#2563eb', tab: 'Catalog' },
          { id: 'issued', label: 'Issued', value: stats.issued?.toLocaleString() ?? '0', icon: 'swap-horizontal', color: '#059669', tab: 'Circulation' },
          { id: 'overdue', label: 'Overdue', value: stats.overdue?.toString() ?? '0', icon: 'alert-circle', color: '#dc2626', tab: 'Fines' },
          { id: 'fines', label: 'Fines Due', value: stats.pendingFines?.toString() ?? '0', icon: 'cash', color: '#d97706', tab: 'Fines' },
        ].map((stat, sIdx) => (
          <React.Fragment key={stat.id}>
            {sIdx > 0 && <View style={styles.statDivider} />}
            <TouchableOpacity
              style={styles.statCell}
              activeOpacity={0.7}
              onPress={() => navigation.switchTab(stat.tab)}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
                <Ionicons name={stat.icon} size={18} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </AnimatedCard>

      {/* Due returns */}
      {dueToday.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Returns Due</Text>
            <TouchableOpacity onPress={() => navigation.switchTab('Circulation')} activeOpacity={0.7}>
              <Text style={styles.sectionAction}>View all</Text>
            </TouchableOpacity>
          </View>
          {dueToday.map((item, idx) => (
            <AnimatedCard key={item.id} delay={160 + idx * 60} style={styles.block} onPress={() => navigation.switchTab('Circulation')}>
              <View style={styles.listRow}>
                <View style={[styles.listIcon, { backgroundColor: (item.isOverdue ? '#dc2626' : '#b45309') + '14' }]}>
                  <Ionicons name="book-outline" size={16} color={item.isOverdue ? '#dc2626' : '#b45309'} />
                </View>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle}>{item.book}</Text>
                  <Text style={styles.listMeta}>{item.student} · {item.rollNo}</Text>
                </View>
                <View style={[styles.dueChip, { backgroundColor: (item.isOverdue ? '#dc2626' : '#b45309') + '1A' }]}>
                  <Text style={[styles.dueText, { color: item.isOverdue ? '#dc2626' : '#b45309' }]}>
                    {item.isOverdue ? 'Overdue' : 'Due soon'}
                  </Text>
                </View>
              </View>
            </AnimatedCard>
          ))}
        </>
      )}

      {/* Popular books */}
      {popular.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Borrowed</Text>
          </View>
          {popular.map((item, idx) => (
            <AnimatedCard key={item.id} delay={300 + idx * 60} style={styles.block}>
              <View style={styles.listRow}>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listMeta}>{item.author}</Text>
                </View>
                <View style={styles.popularRight}>
                  <Text style={styles.popularCount}>{item.borrowed}</Text>
                  <Text style={styles.popularLabel}>borrowed</Text>
                </View>
              </View>
            </AnimatedCard>
          ))}
        </>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Needs Attention</Text>
          </View>
          {alerts.map((item, idx) => {
            const isOverdue = item.type === 'OVERDUE';
            const isRequests = item.type === 'PENDING_REQUESTS';
            const color = isOverdue ? '#dc2626' : isRequests ? '#b45309' : '#d97706';
            const icon = isOverdue ? 'alert-circle-outline' : isRequests ? 'cart-outline' : 'book-outline';
            const target = isOverdue ? 'Fines' : isRequests ? 'Requests' : 'Catalog';
            return (
              <AnimatedCard key={idx} delay={400 + idx * 60} style={styles.block} onPress={() => handleModulePress(target)}>
                <View style={styles.listRow}>
                  <View style={[styles.listIcon, { backgroundColor: color + '14' }]}>
                    <Ionicons name={icon} size={16} color={color} />
                  </View>
                  <View style={styles.listBody}>
                    <Text style={styles.listTitle}>{item.message}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </View>
              </AnimatedCard>
            );
          })}
        </>
      )}

      {/* Module hub */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Library Tools</Text>
      </View>
      <View style={styles.moduleGrid}>
        {MODULES.map((mod, idx) => (
          <AnimatedCard
            key={mod.id}
            delay={500 + idx * 60}
            style={[styles.moduleCell, styles.moduleCard]}
            onPress={() => handleModulePress(mod.id)}
          >
            <View style={[styles.moduleIcon, { backgroundColor: mod.color + '14' }]}>
              <Ionicons name={mod.icon} size={20} color={mod.color} />
            </View>
            <Text style={styles.moduleLabel}>{mod.label}</Text>
            <Text style={styles.moduleDesc} numberOfLines={2}>{mod.desc}</Text>
          </AnimatedCard>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#b45309', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Skeleton hero
  skeletonHeroIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 12 },
  skeletonLineLight: { height: 14, width: '55%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  skeletonTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 16 },

  // Hero (AnimatedCard surface)
  heroCard: { backgroundColor: '#b45309', borderColor: '#b45309', padding: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: 'Manrope-Regular', marginTop: 2 },
  heroProgressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 16, overflow: 'hidden' },
  heroProgressFill: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  heroNote: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontFamily: 'Manrope-Medium', marginTop: 8 },

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.3 },
  sectionAction: { fontSize: 12, color: '#b45309', fontFamily: 'Manrope-SemiBold' },

  // List rows (inside AnimatedCard surface)
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  listIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  listBody: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  listMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  dueChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dueText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  popularRight: { alignItems: 'flex-end' },
  popularCount: { fontSize: 18, fontWeight: '800', color: '#b45309', fontFamily: 'PlusJakartaSans-Bold' },
  popularLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  // Module grid
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  moduleCell: { width: '47.5%', marginBottom: 2 },
  moduleCard: { padding: 16 },
  moduleIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  moduleLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 2 },
  moduleDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16 },
});
