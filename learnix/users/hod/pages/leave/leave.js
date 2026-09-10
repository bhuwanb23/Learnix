import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../components/ui';

const typeStyle = (t) => {
  if (t === 'MEDICAL') return { bg: '#fee2e2', color: '#dc2626', label: 'Medical' };
  if (t === 'CASUAL') return { bg: '#dbeafe', color: '#2563eb', label: 'Casual' };
  return { bg: '#fef3c7', color: '#d97706', label: 'Earned' };
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function LeaveModule({ navigation }) {
  const [leaves, setLeaves] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('Pending');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const list = await hodApi.leaves();
      setLeaves(list);
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

  const onApprove = (l) => {
    const others = (leaves ?? [])
      .map((x) => x.teacher)
      .filter((name, i, arr) => arr.indexOf(name) === i && name !== l.teacher);
    if (others.length === 0) {
      // no faculty picker possible from this payload — approve without substitute
      confirmApprove(l, null);
      return;
    }
    Alert.alert(
      'Substitute',
      `Assign a substitute for ${l.teacher}'s classes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve without', onPress: () => confirmApprove(l, null) },
      ],
    );
  };

  const confirmApprove = async (l, substituteUserId) => {
    setBusyId(l.id);
    try {
      await hodApi.approveLeave(l.id, substituteUserId);
      await load(false);
      Alert.alert('Approved', `${l.teacher}'s ${typeStyle(l.type).label.toLowerCase()} leave (${l.days} day${l.days === 1 ? '' : 's'}) approved.`);
    } catch (e) {
      Alert.alert('Cannot approve', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (l) => {
    setBusyId(l.id);
    try {
      await hodApi.rejectLeave(l.id);
      await load(false);
      Alert.alert('Rejected', `${l.teacher}'s leave request rejected. They were notified.`);
    } catch (e) {
      Alert.alert('Cannot reject', e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !leaves) {
    return (
      <View style={styles.center}>
        <SkeletonCard style={{ marginTop: 16 }} />
        <SkeletonCard style={{ marginTop: 10 }} />
      </View>
    );
  }

  if (error && !leaves) {
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

  const list = leaves ?? [];
  const pending = list.filter((l) => l.status === 'PENDING');
  const processed = list.filter((l) => l.status !== 'PENDING');
  const visible = tab === 'Pending' ? pending : processed;

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {['Pending', 'Processed'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t}{t === 'Pending' && pending.length > 0 ? ` (${pending.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {visible.map((l, idx) => {
          const st = typeStyle(l.type);
          return (
            <AnimatedCard key={l.id} delay={idx * 40} style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: st.bg }]}>
                <Text style={[styles.avatarText, { color: st.color }]}>{l.teacher.charAt(0)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.teacher}>{l.teacher}</Text>
                <View style={styles.typeRow}>
                  <View style={[styles.typeChip, { backgroundColor: st.bg }]}>
                    <Text style={[styles.typeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                  <Text style={styles.daysText}>{l.days} days</Text>
                </View>
                <Text style={styles.meta}>
                  {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                </Text>
                <Text style={styles.reason} numberOfLines={1}>
                  Reason: {l.reason}
                </Text>
                {l.status === 'APPROVED' && l.substituteUserId ? (
                  <Text style={styles.substituteNote}>Substitute arranged</Text>
                ) : null}
              </View>
              {l.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    disabled={busyId === l.id}
                    onPress={() => onReject(l)}
                  >
                    <Ionicons name="close-outline" size={15} color="#dc2626" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    disabled={busyId === l.id}
                    onPress={() => onApprove(l)}
                  >
                    {busyId === l.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark-outline" size={15} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.statusChip,
                    { backgroundColor: l.status === 'APPROVED' ? '#dcfce7' : '#fee2e2' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: l.status === 'APPROVED' ? '#059669' : '#dc2626' },
                    ]}
                  >
                    {l.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
        {visible.length === 0 && (
          <EmptyState
            icon="calendar-clear-outline"
            title={tab === 'Pending' ? 'No pending requests' : 'No processed leaves'}
            subtitle={tab === 'Pending' ? 'Leave requests will appear here' : 'Processed leaves will appear here'}
            color="#4f46e5"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  list: { paddingTop: 12, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
  },
  cardBody: { flex: 1, marginRight: 8 },
  teacher: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typeChip: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6,
  },
  typeText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },
  daysText: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  reason: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginTop: 3,
  },
  substituteNote: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: '#059669',
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  approveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 28,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
});
