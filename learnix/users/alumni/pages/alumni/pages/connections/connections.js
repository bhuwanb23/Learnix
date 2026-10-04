import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { EmptyState, SkeletonCard } from '../../../../../../components/ui';

const TABS = [
  { id: 'incoming', label: 'Requests', icon: 'mail-unread-outline' },
  { id: 'outgoing', label: 'Sent', icon: 'send-outline' },
  { id: 'accepted', label: 'Connected', icon: 'checkmark-done-outline' },
];

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Connection inbox — incoming requests, sent requests, accepted connections.
 *
 * The tab counts come from a single `/connections/stats` call so the badge on
 * "Requests" is real before the user opens the tab, rather than appearing only
 * after the first fetch lands.
 */
export default function ConnectionsInbox({ navigation, onOpenProfile }) {
  const [tab, setTab] = useState('incoming');
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(
    async (box, showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        const [list, s] = await Promise.all([alumniApi.connections(box), alumniApi.connectionStats()]);
        setData(list);
        setStats(s);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    load(tab);
  }, [tab, load]);

  const act = async (id, action, name) => {
    try {
      setBusyId(id);
      await alumniApi.respondToConnection(id, action);
      Alert.alert(
        action === 'accept' ? 'Connected' : action === 'decline' ? 'Declined' : 'Withdrawn',
        action === 'accept' ? `You are now connected with ${name}.` : `Request with ${name} ${action}d.`,
      );
      load(tab, false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.container}>
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={{ marginHorizontal: 16, marginBottom: 8 }} />
        ))}
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load(tab)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items = data?.items ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const count =
            t.id === 'incoming' ? stats?.incoming : t.id === 'outgoing' ? stats?.outgoing : stats?.accepted;
          const active = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.id)}
            >
              <Ionicons name={t.icon} size={14} color={active ? '#fff' : theme.colors.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(tab, false);
            }}
          />
        }
      >
        {items.length === 0 ? (
          <EmptyState
            icon={tab === 'incoming' ? 'mail-open-outline' : tab === 'outgoing' ? 'send-outline' : 'people-outline'}
            title={
              tab === 'incoming'
                ? 'No pending requests'
                : tab === 'outgoing'
                  ? 'No requests sent'
                  : 'Not connected yet'
            }
            subtitle={
              tab === 'incoming'
                ? 'Connection requests from other alumni appear here.'
                : tab === 'outgoing'
                  ? 'Requests you send will show here until answered.'
                  : 'Accept a request to build your network.'
            }
            color="#2563eb"
          />
        ) : (
          items.map((c) => (
            <View key={c.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardTop}
                onPress={() => onOpenProfile?.(c.profileId)}
                disabled={!onOpenProfile}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(c.person.name)}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {c.person.name}
                    </Text>
                    {c.direction === 'INCOMING' && (
                      <View style={styles.inChip}>
                        <Text style={styles.inChipText}>INCOMING</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.role} numberOfLines={1}>
                    {c.person.headline ?? '—'}
                    {c.person.company ? ` · ${c.person.company}` : ''}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {c.person.graduationYear ? `Batch ${c.person.graduationYear}` : ''}
                    {c.person.chapter ? ` · ${c.person.chapter}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>

              {c.message ? (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>“{c.message}”</Text>
                </View>
              ) : null}

              {c.status === 'PENDING' && tab === 'incoming' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnAccept]}
                    disabled={busyId === c.id}
                    onPress={() => act(c.id, 'accept', c.person.name)}
                  >
                    {busyId === c.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.btnAcceptText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnDecline]}
                    disabled={busyId === c.id}
                    onPress={() => act(c.id, 'decline', c.person.name)}
                  >
                    <Text style={styles.btnDeclineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}

              {c.status === 'PENDING' && tab === 'outgoing' && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnWithdraw]}
                  disabled={busyId === c.id}
                  onPress={() => act(c.id, 'cancel', c.person.name)}
                >
                  <Text style={styles.btnWithdrawText}>Withdraw request</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 9, gap: 5 },
  tabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: '#fff' },
  tabBadge: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Manrope-Bold' },
  tabBadgeTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginHorizontal: 16, marginTop: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 13, fontFamily: 'Manrope-ExtraBold', color: '#2563eb' },
  cardBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginRight: 6, flexShrink: 1 },
  inChip: { backgroundColor: '#fef3c7', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  inChipText: { color: '#d97706', fontSize: 8, fontFamily: 'Manrope-Bold' },
  role: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },

  messageBox: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 10, padding: 10, marginTop: 10 },
  messageText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text, fontStyle: 'italic' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 9 },
  btnAccept: { backgroundColor: '#059669' },
  btnAcceptText: { color: '#fff', fontSize: 12, fontFamily: 'Manrope-Bold' },
  btnDecline: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  btnDeclineText: { color: '#dc2626', fontSize: 12, fontFamily: 'Manrope-SemiBold' },
  btnWithdraw: { marginTop: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  btnWithdrawText: { color: theme.colors.textMuted, fontSize: 12, fontFamily: 'Manrope-SemiBold' },
});