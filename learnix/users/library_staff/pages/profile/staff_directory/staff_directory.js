import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonCard } from '../../../../../components/ui';

const THEME = '#b45309';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const relative = (d) => {
  if (!d) return 'Never signed in';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  if (days < 30) return `Active ${days}d ago`;
  return `Active ${formatDate(d)}`;
};

const statusColor = (status) => (status === 'ACTIVE' ? '#059669' : '#dc2626');

export default function StaffDirectory({ navigation }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await libraryApi.libraryStaff();
      setStaff(result.staff || []);
    } catch (err) {
      setStaff([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openMember = async (id) => {
    setDetailLoading(true);
    // Show the cached row immediately so the transition is not a blank screen.
    setDetail(staff.find((s) => s.id === id) || null);
    try {
      setDetail(await libraryApi.libraryStaffMember(id));
    } catch {
      // Keep the cached row; the detail simply shows no activity list.
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return staff;
    return staff.filter((s) =>
      [s.fullName, s.email, s.designation, s.employeeNo]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [staff, q]);

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (detail) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AnimatedCard delay={0} style={styles.block}>
          <View style={styles.detailHeader}>
            <View style={styles.detailAvatar}>
              <Text style={styles.detailInitials}>{detail.initials ?? '??'}</Text>
            </View>
            <View style={styles.detailHeaderBody}>
              <Text style={styles.detailName}>{detail.fullName}</Text>
              <Text style={styles.detailDesignation}>{detail.designation}</Text>
              <View style={styles.detailChips}>
                <View style={[styles.chip, { backgroundColor: statusColor(detail.status) + '14' }]}>
                  <Ionicons name="ellipse" size={8} color={statusColor(detail.status)} />
                  <Text style={[styles.chipText, { color: statusColor(detail.status) }]}>{detail.status}</Text>
                </View>
                {relative(detail.lastLoginAt) !== 'Never signed in' ? (
                  <View style={[styles.chip, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="time-outline" size={11} color="#64748b" />
                    <Text style={[styles.chipText, { color: '#64748b' }]}>{relative(detail.lastLoginAt)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </AnimatedCard>

        <AnimatedCard delay={60} style={[styles.block, styles.statsRow]}>
          {[
            { label: 'Loans Issued', value: detail.loansIssued ?? 0, color: '#2563eb' },
            { label: 'Broadcasts', value: detail.broadcastsSent ?? 0, color: THEME },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </AnimatedCard>

        <AnimatedCard delay={120} style={styles.block}>
          {[
            { label: 'Employee No', value: detail.employeeNo ?? '—' },
            { label: 'Email', value: detail.email ?? '—' },
            { label: 'Phone', value: detail.phone || 'Not set' },
            { label: 'Joined', value: formatDate(detail.joiningDate) },
            { label: 'Roles', value: (detail.roles || []).join(', ') },
          ].map((f, idx) => (
            <View key={f.label}>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{f.label}</Text>
                <Text style={styles.factValue} numberOfLines={1}>{f.value}</Text>
              </View>
              {idx < 4 && <View style={styles.divider} />}
            </View>
          ))}
        </AnimatedCard>

        <Text style={styles.sectionLabel}>Recent loans issued</Text>
        {(detail.recentLoans || []).length === 0 ? (
          <AnimatedCard delay={180} style={styles.block}>
            <View style={styles.noteRow}>
              <Ionicons name="book-outline" size={16} color="#94a3b8" />
              <Text style={styles.noteText}>No loans issued from this desk yet.</Text>
            </View>
          </AnimatedCard>
        ) : (
          detail.recentLoans.map((l, idx) => (
            <AnimatedCard key={l.id} delay={200 + idx * 35} style={styles.block}>
              <View style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <Ionicons name="arrow-forward-circle" size={17} color="#2563eb" />
                </View>
                <View style={styles.activityBody}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{l.book}</Text>
                  <Text style={styles.activitySub}>
                    {l.student} · {l.rollNo} · {formatDate(l.issueDate)}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: l.status === 'OVERDUE' ? '#fef2f2' : '#eff6ff' }]}>
                  <Text style={[styles.statusPillText, { color: l.status === 'OVERDUE' ? '#dc2626' : '#2563eb' }]}>
                    {l.status}
                  </Text>
                </View>
              </View>
            </AnimatedCard>
          ))
        )}

        {(detail.recentBroadcasts || []).length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Recent broadcasts</Text>
            {detail.recentBroadcasts.map((b, idx) => (
              <AnimatedCard key={b.id} delay={260 + idx * 35} style={styles.block}>
                <View style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: '#fffbeb' }]}>
                    <Ionicons name="megaphone" size={17} color={THEME} />
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={styles.activityTitle} numberOfLines={1}>{b.title}</Text>
                    <Text style={styles.activitySub}>{b.audience} · {formatDate(b.sentAt)}</Text>
                  </View>
                </View>
              </AnimatedCard>
            ))}
          </>
        ) : null}

        <TouchableOpacity style={styles.backBtn} onPress={() => setDetail(null)} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={15} color={THEME} />
          <Text style={styles.backText}>All staff</Text>
        </TouchableOpacity>
        {detailLoading ? <Text style={styles.loadingNote}>Refreshing activity…</Text> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <SearchBar placeholder="Search name, employee no, email" onSearch={setQ} style={styles.search} />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {filtered.length} of {staff.length} staff member{staff.length === 1 ? '' : 's'}
        </Text>
        <Text style={styles.summaryText}>{staff.filter((s) => s.status === 'ACTIVE').length} active</Text>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={q ? 'No one matches that search' : 'No library staff yet'}
          subtitle={
            q
              ? 'Try a different name, employee number or email.'
              : 'Staff accounts with the LIBRARY role will appear here.'
          }
          color={THEME}
        />
      ) : (
        filtered.map((s, idx) => (
          <AnimatedCard key={s.id} delay={idx * 45} style={styles.block} onPress={() => openMember(s.id)}>
            <View style={styles.row}>
              <View style={[styles.avatar, s.status !== 'ACTIVE' && styles.avatarInactive]}>
                <Text style={styles.initials}>{s.initials}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{s.fullName}</Text>
                <Text style={styles.rowSub}>
                  {s.designation}{s.employeeNo ? ` · ${s.employeeNo}` : ''}
                </Text>
                <Text style={styles.rowActivity}>
                  {s.loansIssued} loans · {s.broadcastsSent} broadcasts · {relative(s.lastLoginAt)}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <View style={[styles.dot, { backgroundColor: statusColor(s.status) }]} />
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </View>
          </AnimatedCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  block: { marginBottom: 10 },
  search: { marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryText: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: THEME + '14', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarInactive: { backgroundColor: '#f1f5f9' },
  initials: { fontSize: 15, fontFamily: 'Manrope-Bold', color: THEME },
  rowBody: { flex: 1 },
  rowName: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#0f172a' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 1 },
  rowActivity: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 3 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Detail
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  detailAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: THEME + '14', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  detailInitials: { fontSize: 20, fontFamily: 'Manrope-Bold', color: THEME },
  detailHeaderBody: { flex: 1 },
  detailName: { fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: '#0f172a' },
  detailDesignation: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  detailChips: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  chipText: { fontSize: 10, fontFamily: 'Manrope-Bold' },

  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  factRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  factLabel: { flex: 1, fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  factValue: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: '#0f172a', maxWidth: '58%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#eef2f7' },

  sectionLabel: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 10 },
  activityRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  activityIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  activitySub: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, marginLeft: 8 },
  statusPillText: { fontSize: 9, fontFamily: 'Manrope-Bold' },

  noteRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', marginLeft: 9 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8, paddingVertical: 12, borderRadius: 11, backgroundColor: THEME + '12', borderWidth: 1, borderColor: THEME + '33' },
  backText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: THEME },
  loadingNote: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', textAlign: 'center', marginTop: 10 },
});
