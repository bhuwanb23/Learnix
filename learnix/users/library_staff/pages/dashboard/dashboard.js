import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';

const THEME = '#b45309';

/** Bottom-nav tabs vs feature modules. `tab: true` routes through switchTab. */
const MODULES = [
  { key: 'Catalog', tab: true, label: 'Catalog', desc: 'Books & stock', icon: 'book-outline', color: '#2563eb' },
  { key: 'Circulation', tab: true, label: 'Circulation', desc: 'Issue & return', icon: 'swap-horizontal-outline', color: '#059669' },
  { key: 'Fines', tab: true, label: 'Fines', desc: 'Collect & waive', icon: 'cash-outline', color: '#d97706' },
  { key: 'Requests', label: 'Book Requests', desc: 'Decide & procure', icon: 'cart-outline', color: '#0284c7' },
  { key: 'DigitalLibrary', label: 'Digital Library', desc: 'E-books & access', icon: 'cloud-outline', color: '#4f46e5' },
  { key: 'Notifications', label: 'Notifications', desc: 'Activity & broadcasts', icon: 'notifications-outline', color: '#dc2626' },
  { key: 'LibrarySettings', label: 'Settings', desc: 'Loan rules & timings', icon: 'settings-outline', color: '#0891b2' },
  { key: 'ReminderSchedule', label: 'Reminders', desc: 'Who needs a nudge', icon: 'alarm-outline', color: '#7c3aed' },
  { key: 'StaffDirectory', label: 'Staff', desc: 'Who is on this desk', icon: 'people-outline', color: '#64748b' },
];

const ALERT_STYLE = {
  OVERDUE: { color: '#dc2626', bg: '#fef2f2', icon: 'alert-circle-outline', target: 'Fines', tab: true },
  PENDING_REQUESTS: { color: THEME, bg: '#fffbeb', icon: 'cart-outline', target: 'Requests' },
  PROCUREMENT: { color: '#2563eb', bg: '#eff6ff', icon: 'cube-outline', target: 'ProcurementDesk' },
  ALL_ON_LOAN: { color: '#d97706', bg: '#fffbeb', icon: 'book-outline', target: 'Catalog', tab: true },
  LOW_COPIES: { color: '#94a3b8', bg: '#f1f5f9', icon: 'book-outline', target: 'Catalog', tab: true },
};

export default function LibraryDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await libraryApi.dashboard());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const go = (m) => {
    if (m.tab) navigation.switchTab(m.key);
    else navigation.openModule(m.key);
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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
  const today = data?.today || {};
  const shelf = data?.shelf || {};
  const dueSoon = data?.dueSoon || [];
  const popular = data?.popular || [];
  const alerts = data?.alerts || [];

  const overdueDue = dueSoon.filter((d) => d.isOverdue).length;

  const heroStats = [
    { label: 'Copies', value: (hero.totalCopies ?? 0).toLocaleString() },
    { label: 'On loan', value: (hero.onLoan ?? 0).toLocaleString() },
    { label: 'Members', value: (hero.totalMembers ?? 0).toLocaleString() },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Hero — real figures only */}
      <AnimatedCard delay={0} style={[styles.block, styles.heroCard]}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="book" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Central Library</Text>
            <Text style={styles.heroSubtitle}>
              {hero.titles ?? 0} titles · {hero.availableCopies ?? 0} of {hero.totalCopies ?? 0} copies on the shelf
            </Text>
          </View>
        </View>
        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: `${hero.circulationRatePct ?? 0}%` }]} />
        </View>
        <Text style={styles.heroNote}>
          {hero.circulationRatePct ?? 0}% of the collection is out on loan
          {hero.overdueCount
            ? ` — ${hero.overdueCount} book${hero.overdueCount === 1 ? '' : 's'} overdue`
            : ''}
        </Text>
        <View style={styles.heroStats}>
          {heroStats.map((s) => (
            <View key={s.label} style={styles.heroStatCell}>
              <Text style={styles.heroStatValue}>{s.value}</Text>
              <Text style={styles.heroStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </AnimatedCard>

      {/* Today's desk */}
      <AnimatedCard delay={60} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Due today', value: today.dueToday ?? 0, icon: 'today-outline', color: THEME },
          { label: 'Overdue', value: today.overdue ?? 0, icon: 'alert-circle', color: '#dc2626' },
          { label: 'Issued today', value: today.issuesToday ?? 0, icon: 'arrow-forward-circle', color: '#059669' },
          { label: 'Returned today', value: today.returnsToday ?? 0, icon: 'arrow-undo-circle', color: '#2563eb' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}>
                <Ionicons name={s.icon} size={17} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.value === 0 ? '#cbd5e1' : s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </AnimatedCard>

      {/* Live counters, each opening the screen that owns it */}
      <AnimatedCard delay={120} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'On loan', value: stats.onLoan ?? 0, icon: 'swap-horizontal', color: '#059669', to: { tab: true, key: 'Circulation' } },
          { label: 'Overdue', value: stats.overdue ?? 0, icon: 'alert-circle', color: '#dc2626', to: { tab: true, key: 'Fines' } },
          { label: 'Fines due', value: stats.pendingFines ?? 0, icon: 'cash', color: '#d97706', to: { tab: true, key: 'Fines' } },
          { label: 'Requests', value: stats.pendingRequests ?? 0, icon: 'cart', color: '#7c3aed', to: { key: 'Requests' } },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <TouchableOpacity style={styles.statCell} activeOpacity={0.7} onPress={() => go(s.to)}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}>
                <Ionicons name={s.icon} size={17} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.value === 0 ? '#cbd5e1' : s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </AnimatedCard>

      {/* Alerts */}
      {alerts.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Needs attention</Text>
          </View>
          {alerts.map((a, idx) => {
            const style = ALERT_STYLE[a.type] ?? ALERT_STYLE.LOW_COPIES;
            return (
              <AnimatedCard
                key={`${a.type}-${idx}`}
                delay={180 + idx * 40}
                style={styles.block}
                onPress={() =>
                  go(style.tab ? { key: style.target, tab: true } : { key: style.target })
                }
              >
                <View style={styles.alertRow}>
                  <View style={[styles.alertIcon, { backgroundColor: style.bg }]}>
                    <Ionicons name={style.icon} size={16} color={style.color} />
                  </View>
                  <Text style={styles.alertText}>{a.message}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </View>
              </AnimatedCard>
            );
          })}
        </>
      ) : null}

      {/* Returns to chase */}
      {dueSoon.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Returns to chase</Text>
            <Text style={styles.sectionMeta}>
              {overdueDue} overdue{overdueDue < dueSoon.length ? ` · ${dueSoon.length - overdueDue} due soon` : ''}
            </Text>
          </View>
          {dueSoon.map((item, idx) => (
            <AnimatedCard
              key={item.id}
              delay={280 + idx * 40}
              style={styles.block}
              onPress={() => navigation.openModule('LoanDetail', { loanId: item.id })}
            >
              <View style={styles.listRow}>
                <View style={[styles.listIcon, { backgroundColor: (item.isOverdue ? '#dc2626' : THEME) + '14' }]}>
                  <Ionicons name="book-outline" size={16} color={item.isOverdue ? '#dc2626' : THEME} />
                </View>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle} numberOfLines={1}>{item.book}</Text>
                  <Text style={styles.listMeta} numberOfLines={1}>{item.student} · {item.rollNo}</Text>
                </View>
                <View style={[styles.dueChip, { backgroundColor: (item.isOverdue ? '#dc2626' : THEME) + '1A' }]}>
                  <Text style={[styles.dueText, { color: item.isOverdue ? '#dc2626' : THEME }]}>
                    {item.isOverdue
                      ? `${item.daysOverdue}d late`
                      : item.dueToday
                        ? 'Due today'
                        : 'Tomorrow'}
                  </Text>
                </View>
              </View>
            </AnimatedCard>
          ))}
        </>
      ) : null}

      {/* Shelf pressure */}
      <AnimatedCard delay={360} style={styles.block}>
        <Text style={styles.cardLabel}>Shelf</Text>
        <View style={styles.shelfRow}>
          <Text style={styles.shelfValue}>{shelf.onShelf ?? 0}</Text>
          <Text style={styles.shelfText}>
            of {shelf.totalCopies ?? 0} copies on the shelf · {shelf.ratePct ?? 0}% issued
          </Text>
        </View>
        <View style={styles.shelfTrack}>
          <View style={[styles.shelfFill, { width: `${shelf.ratePct ?? 0}%` }]} />
        </View>
        {(shelf.lowStock || []).length > 0 ? (
          <View style={styles.lowStockWrap}>
            {shelf.lowStock.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.lowChip, b.allOnLoan && styles.lowChipAllOut]}
                activeOpacity={0.8}
                onPress={() => navigation.switchTab('Catalog')}
              >
                <Ionicons
                  name={b.allOnLoan ? 'lock-closed-outline' : 'alert-circle-outline'}
                  size={12}
                  color={b.allOnLoan ? '#d97706' : '#94a3b8'}
                />
                <Text style={[styles.lowChipText, b.allOnLoan && { color: '#b45309' }]} numberOfLines={1}>
                  {b.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.shelfHint}>Every title has at least two copies on the shelf.</Text>
        )}
      </AnimatedCard>

      {/* Most borrowed */}
      {popular.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most borrowed</Text>
          </View>
          {popular.map((item, idx) => (
            <AnimatedCard key={item.id} delay={420 + idx * 40} style={styles.block}>
              <View style={styles.listRow}>
                <View style={[styles.listIcon, { backgroundColor: '#f5f3ff' }]}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.listMeta} numberOfLines={1}>{item.author ?? 'Author unknown'}</Text>
                </View>
                <View style={styles.popularRight}>
                  <Text style={styles.popularCount}>{item.borrowed}</Text>
                  <Text style={styles.popularLabel}>borrowed</Text>
                </View>
              </View>
            </AnimatedCard>
          ))}
        </>
      ) : null}

      {/* Module hub */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Library tools</Text>
      </View>
      <View style={styles.moduleGrid}>
        {MODULES.map((mod) => (
          <AnimatedCard key={mod.key} delay={480 + MODULES.indexOf(mod) * 30} style={styles.moduleCard}>
            <TouchableOpacity style={styles.moduleInner} activeOpacity={0.75} onPress={() => go(mod)}>
              <View style={[styles.moduleIcon, { backgroundColor: mod.color + '14' }]}>
                <Ionicons name={mod.icon} size={19} color={mod.color} />
              </View>
              <Text style={styles.moduleLabel}>{mod.label}</Text>
              <Text style={styles.moduleDesc} numberOfLines={2}>{mod.desc}</Text>
            </TouchableOpacity>
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
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Skeleton
  skeletonHeroIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  skeletonLineLight: { height: 14, width: '55%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  skeletonTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 16 },

  // Hero
  heroCard: { backgroundColor: THEME, padding: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: 'Manrope-Regular', marginTop: 2 },
  heroProgressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 16, overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFFFFF' },
  heroNote: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontFamily: 'Manrope-Medium', marginTop: 8 },
  heroStats: { flexDirection: 'row', marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  heroStatCell: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 16, fontWeight: '800', color: '#fff', fontFamily: 'PlusJakartaSans-Bold' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Stat rows
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 31, height: 31, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 9 },
  statValue: { fontSize: 17, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 9, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2, textAlign: 'center' },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sectionMeta: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },

  // Alerts
  alertRow: { flexDirection: 'row', alignItems: 'center', padding: 13 },
  alertIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  alertText: { flex: 1, fontSize: 12, color: '#334155', fontFamily: 'Manrope-SemiBold', lineHeight: 17, marginRight: 8 },

  // Rows
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 13 },
  listIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  listBody: { flex: 1 },
  listTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  listMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  rankText: { fontSize: 13, fontWeight: '800', color: '#7c3aed', fontFamily: 'PlusJakartaSans-Bold' },
  dueChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, marginLeft: 8 },
  dueText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  popularRight: { alignItems: 'flex-end', marginLeft: 8 },
  popularCount: { fontSize: 15, fontWeight: '800', color: '#7c3aed', fontFamily: 'PlusJakartaSans-Bold' },
  popularLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  // Shelf
  shelfRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  shelfValue: { fontSize: 26, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.8 },
  shelfText: { flex: 1, fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },
  shelfTrack: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', marginTop: 10, overflow: 'hidden' },
  shelfFill: { height: '100%', borderRadius: 4, backgroundColor: '#2563eb' },
  lowStockWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  lowChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 18, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', maxWidth: '100%' },
  lowChipAllOut: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  lowChipText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: '#64748b', flexShrink: 1 },
  shelfHint: { fontSize: 11, color: '#059669', fontFamily: 'Manrope-Medium', marginTop: 12 },

  // Modules
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleCard: { width: '31.5%', padding: 0, overflow: 'hidden' },
  moduleInner: { padding: 12, alignItems: 'flex-start' },
  moduleIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 9 },
  moduleLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  moduleDesc: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 14, marginTop: 2 },
});
