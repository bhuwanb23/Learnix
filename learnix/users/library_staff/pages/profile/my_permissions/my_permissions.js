import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../../components/ui';

const THEME = '#d97706';

const CATEGORY_META = {
  LIBRARY: { color: '#b45309', bg: '#fffbeb', icon: 'library-outline', label: 'Library' },
  ACADEMICS: { color: '#2563eb', bg: '#eff6ff', icon: 'school-outline', label: 'Academics' },
  EXAMS: { color: '#7c3aed', bg: '#f5f3ff', icon: 'clipboard-outline', label: 'Exams' },
  STUDENTS: { color: '#059669', bg: '#f0fdf4', icon: 'people-outline', label: 'Students' },
  FINANCE: { color: '#dc2626', bg: '#fef2f2', icon: 'cash-outline', label: 'Finance' },
  PLACEMENT: { color: '#0891b2', bg: '#ecfeff', icon: 'briefcase-outline', label: 'Placement' },
  HOSTEL: { color: '#0891b2', bg: '#ecfeff', icon: 'bed-outline', label: 'Hostel' },
  TRANSPORT: { color: '#2563eb', bg: '#eff6ff', icon: 'bus-outline', label: 'Transport' },
  SPORTS: { color: '#d97706', bg: '#fffbeb', icon: 'trophy-outline', label: 'Sports' },
  ALUMNI: { color: '#7c3aed', bg: '#f5f3ff', icon: 'heart-outline', label: 'Alumni' },
  SYSTEM: { color: '#64748b', bg: '#f1f5f9', icon: 'server-outline', label: 'System' },
};

const categoryMeta = (c) => CATEGORY_META[c] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'apps-outline', label: c };

export default function MyPermissions({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setData(await libraryApi.libraryPermissions());
    } catch (err) {
      setData({ error: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (data?.error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{data.error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groups = data?.groups || [];
  const library = data?.library || [];
  const total = data?.total ?? 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.roleRow}>
          <View style={styles.roleIcon}>
            <Ionicons name="shield-checkmark" size={20} color={THEME} />
          </View>
          <View style={styles.roleBody}>
            <Text style={styles.roleLabel}>Your role{(data?.roles || []).length > 1 ? 's' : ''}</Text>
            <Text style={styles.roleValue}>{(data?.roles || []).join(', ') || 'None assigned'}</Text>
          </View>
        </View>
        <View style={styles.roleStats}>
          <View style={styles.roleStat}>
            <Text style={styles.roleStatValue}>{total}</Text>
            <Text style={styles.roleStatLabel}>Permissions granted</Text>
          </View>
          <View style={styles.roleStatDivider} />
          <View style={styles.roleStat}>
            <Text style={[styles.roleStatValue, { color: '#b45309' }]}>{library.length}</Text>
            <Text style={styles.roleStatLabel}>Library-specific</Text>
          </View>
        </View>
      </AnimatedCard>

      {groups.length === 0 ? (
        <EmptyState
          icon="shield-outline"
          title="No permissions mapped"
          subtitle="Your account has a role but no permissions have been attached to it yet. An administrator maps these in Admin → Roles."
          color={THEME}
        />
      ) : (
        groups.map((g, gi) => {
          const meta = categoryMeta(g.category);
          return (
            <View key={g.category}>
              <View style={styles.listHeader}>
                <View style={[styles.catIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={14} color={meta.color} />
                </View>
                <Text style={styles.sectionLabel}>{meta.label}</Text>
                <Text style={styles.countLabel}>{g.permissions.length}</Text>
              </View>
              <AnimatedCard delay={80 + gi * 45} style={styles.block}>
                {g.permissions.map((p, pi) => (
                  <View key={p.key}>
                    <View style={styles.permRow}>
                      <Ionicons name="checkmark-circle" size={16} color={meta.color} />
                      <View style={styles.permBody}>
                        <Text style={styles.permName}>{p.name}</Text>
                        <Text style={styles.permKey}>{p.key}</Text>
                      </View>
                    </View>
                    {pi < g.permissions.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </AnimatedCard>
            </View>
          );
        })
      )}

      {(data?.ungrantedCategories || []).length > 0 ? (
        <AnimatedCard delay={300} style={styles.block}>
          <View style={styles.noteRow}>
            <Ionicons name="lock-closed-outline" size={15} color="#64748b" />
            <Text style={styles.noteText}>
              Not granted to your role: {(data.ungrantedCategories || []).map((c) => categoryMeta(c).label).join(', ')}.
              Those modules stay closed to this account.
            </Text>
          </View>
        </AnimatedCard>
      ) : null}

      <AnimatedCard delay={320} style={styles.block}>
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={15} color="#2563eb" />
          <Text style={styles.noteText}>
            This list is read from the role-permission map in the database — it is not a client-side guess. Changing what
            you can do is an administrator action in Admin → Roles, so this screen is read-only by design.
          </Text>
        </View>
      </AnimatedCard>
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

  roleRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  roleIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: THEME + '14', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  roleBody: { flex: 1 },
  roleLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  roleValue: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#0f172a', marginTop: 3 },
  roleStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eef2f7', marginTop: 6, paddingTop: 13 },
  roleStat: { flex: 1, alignItems: 'center' },
  roleStatDivider: { width: 1, backgroundColor: '#eef2f7' },
  roleStatValue: { fontSize: 19, fontFamily: 'PlusJakartaSans-Bold', color: '#0f172a' },
  roleStatLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 },

  listHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 9, gap: 8 },
  catIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6, flex: 1 },
  countLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  permRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  permBody: { flex: 1, marginLeft: 10 },
  permName: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  permKey: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#eef2f7', marginLeft: 40 },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },
});
