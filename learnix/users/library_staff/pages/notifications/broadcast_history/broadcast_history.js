import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../../components/ui';
import { THEME, audienceMeta, formatDateTime, relativeTime } from '../notificationMeta';

export default function BroadcastHistory({ navigation, route }) {
  const openId = route?.params?.broadcastId;

  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.broadcasts();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    libraryApi.broadcast(openId).then(setDetail).catch((err) => Alert.alert('Cannot Load', err.message));
  }, [openId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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

  // ── Detail view ──
  if (detail) {
    const meta = audienceMeta(detail.audience);
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AnimatedCard delay={0} style={styles.block}>
          <View style={styles.detailHeader}>
            <View style={[styles.detailIcon, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={22} color={meta.color} />
            </View>
            <Text style={styles.detailTitle}>{detail.title}</Text>
          </View>

          <View style={styles.detailChips}>
            <View style={[styles.detailChip, { backgroundColor: meta.bg }]}>
              <Text style={[styles.detailChipText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <View style={styles.detailChip}>
              <Text style={styles.detailChipText}>{detail.channels?.replace(/_/g, ' ')}</Text>
            </View>
          </View>

          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{detail.body}</Text>
          </View>
        </AnimatedCard>

        <AnimatedCard delay={60} style={styles.block}>
          <View style={styles.statRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{detail.recipientCount}</Text>
              <Text style={styles.statLabel}>Reachable now</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#059669' }]}>{detail.deliveredCount}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>Sent by {detail.sender.fullName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>{formatDateTime(detail.sentAt ?? detail.createdAt)}</Text>
          </View>
        </AnimatedCard>

        {detail.recipients.length > 0 && (
          <AnimatedCard delay={120} style={styles.block}>
            <Text style={styles.label}>Recipients ({detail.recipients.length})</Text>
            {detail.recipients.map((name, i) => (
              <View key={`${name}-${i}`} style={styles.recipientRow}>
                <View style={styles.recipientAvatar}>
                  <Text style={styles.recipientInitial}>{name.charAt(0)}</Text>
                </View>
                <Text style={styles.recipientName}>{name}</Text>
              </View>
            ))}
          </AnimatedCard>
        )}
      </ScrollView>
    );
  }

  // ── List view ──
  const broadcasts = data?.broadcasts || [];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <AnimatedCard delay={0} style={[styles.block, styles.composeCard]}>
        <View style={styles.composeRow}>
          <View style={styles.composeIcon}>
            <Ionicons name="megaphone" size={18} color="#fff" />
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.composeTitle}>Send an announcement</Text>
            <Text style={styles.composeSub}>Reach students by audience</Text>
          </View>
          <TouchableOpacity
            style={styles.composeBtn}
            onPress={() => navigation.openModule('ComposeBroadcast')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </AnimatedCard>

      <Text style={styles.sectionLabel}>Sent Broadcasts</Text>

      {broadcasts.length === 0 ? (
        <EmptyState
          icon="paper-plane-outline"
          title="Nothing sent yet"
          subtitle="Announcements you send to students will be listed here with their reach."
          color={THEME}
          actionLabel="Compose Broadcast"
          onAction={() => navigation.openModule('ComposeBroadcast')}
        />
      ) : (
        broadcasts.map((b, idx) => {
          const meta = audienceMeta(b.audience);
          const foreign = !b.ownedByLibrary;
          return (
            <AnimatedCard
              key={b.id}
              delay={80 + idx * 45}
              style={styles.block}
              onPress={() => navigation.openModule('BroadcastHistory', { broadcastId: b.id })}
            >
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={17} color={meta.color} />
                </View>
                <View style={styles.headerBody}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{b.title}</Text>
                  <Text style={styles.rowSub} numberOfLines={2}>{b.body}</Text>

                  <View style={styles.chipRow}>
                    <View style={[styles.chip, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.chipText, { color: meta.color }]}>{b.audienceLabel}</Text>
                    </View>
                    {foreign ? (
                      <View style={styles.chip}>
                        <Text style={[styles.chipText, { color: '#64748b' }]}>Other module</Text>
                      </View>
                    ) : (
                      <View style={styles.reachChip}>
                        <Text style={styles.reachText}>{b.currentAudienceSize} reachable</Text>
                      </View>
                    )}
                    <Text style={styles.rowTime}>{relativeTime(b.sentAt)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
              </View>
            </AnimatedCard>
          );
        })
      )}
    </ScrollView>
  );
}

// Alert is imported from react-native above.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },
  headerBody: { flex: 1 },

  composeCard: { padding: 14 },
  composeRow: { flexDirection: 'row', alignItems: 'center' },
  composeIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  composeTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  composeSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  composeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center' },

  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 8, marginBottom: 10 },

  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 16 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f1f5f9' },
  chipText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  reachChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#ecfeff' },
  reachText: { fontSize: 10, fontWeight: '600', color: '#0891b2', fontFamily: 'Manrope-SemiBold' },
  rowTime: { fontSize: 10, color: '#cbd5e1', fontFamily: 'Manrope-Medium' },

  // Detail
  detailHeader: { alignItems: 'center', paddingVertical: 8 },
  detailIcon: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  detailTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  detailChips: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 12 },
  detailChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: '#f1f5f9' },
  detailChipText: { fontSize: 10, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
  messageBox: { marginTop: 16, padding: 13, borderRadius: 11, backgroundColor: '#f8fafc' },
  messageText: { fontSize: 12, color: '#334155', fontFamily: 'Manrope-Regular', lineHeight: 19 },

  statRow: { flexDirection: 'row', marginBottom: 14 },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#eef2f7' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  metaText: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },

  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  recipientAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center' },
  recipientInitial: { fontSize: 12, fontWeight: '800', color: THEME, fontFamily: 'Manrope-Bold' },
  recipientName: { fontSize: 12, color: '#334155', fontFamily: 'Manrope-Medium' },
});