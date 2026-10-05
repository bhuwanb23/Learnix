// F-10 Notifications — the pieces every notification screen shares
// (docs/users/06 §3.9).
//
// The screens are: the hub (categories + alerts + compose), the inbox, the
// financial-alert list, the compose form and the send history. They share one
// shell and one row, and the reason they must is not tidiness: the row is where
// per-item read lives, and a second hand-written row is a second place for
// "tapping this marks everything read" to come back.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, SkeletonCard } from '../../../../components/ui';
import { THEME, RED, SLATE, MUTED, CATEGORIES, categoryMeta, timeAgo, typeMeta } from './notificationsMeta';

/** Fetch-on-mount plus pull-to-refresh. Returns `reload` for after an action. */
export function useNotifications(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await fetcher());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { data, loading, refreshing, error, reload: load, onRefresh };
}

/**
 * The shell every screen renders inside: loading skeleton, error panel with a
 * retry, or the scroll view.
 *
 * The error panel is shown IN PLACE of the content rather than as a toast. A
 * notification desk that fails quietly and shows an empty list is
 * indistinguishable from an office where nothing has happened.
 */
export function NotificationScreen({
  loading, refreshing, error, onRetry, onRefresh, children,
}) {
  if (loading) {
    return (
      <View style={styles.wrap}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={RED} />
        <Text style={styles.errorText}>{error || 'Notifications could not be loaded.'}</Text>
        <TouchableOpacity style={styles.retry} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {children}
    </ScrollView>
  );
}

/**
 * The category filter row.
 *
 * "All" plus the seven, each carrying its LIVE unread count from the server, so
 * an officer can see which category has something waiting without opening all
 * seven. The counts come from `unreadByCategory` and are computed over the WHOLE
 * inbox, so they do not change as you scroll.
 */
export function CategoryBar({ value, onChange, unreadByCategory = [], unreadTotal = 0 }) {
  const countFor = (id) => unreadByCategory.find((c) => c.category === id)?.count ?? 0;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      <FilterChip
        active={!value}
        onPress={() => onChange(null)}
        label="All"
        icon="apps-outline"
        color={THEME}
        count={unreadTotal}
      />
      {CATEGORIES.map((c) => (
        <FilterChip
          key={c.id}
          active={value === c.id}
          onPress={() => onChange(c.id)}
          label={c.label}
          icon={c.icon}
          color={c.color}
          count={countFor(c.id)}
        />
      ))}
    </ScrollView>
  );
}

function FilterChip({ active, onPress, label, icon, color, count }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}${count ? `, ${count} unread` : ''}`}
    >
      <Ionicons name={icon} size={13} color={active ? '#fff' : color} />
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      {count > 0 ? (
        <View style={[styles.badge, active && styles.badgeActive]}>
          <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/**
 * One notification.
 *
 * The icon and colour come from the type registry rather than a fixed bell —
 * that uniformity was the thing that made the old list unreadable, where a fee
 * reminder and a bus delay looked identical.
 *
 * `onPress` marks THIS row read. It does not mark the others: reading one message
 * was impossible before this feature, because the only control called read-all.
 */
export function NotificationRow({ item, onPress, onLongPress }) {
  const meta = typeMeta(item.type);
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={[styles.row, !item.read && styles.rowUnread]}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.body}`}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${item.color ?? meta.color}14` }]}>
        <Ionicons name={item.icon ?? meta.icon} size={17} color={item.color ?? meta.color} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={[styles.rowTitle, !item.read && styles.rowTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.rowMessage} numberOfLines={2}>{item.body}</Text>
        <View style={styles.rowFoot}>
          <Text style={styles.rowType}>{item.typeLabel ?? meta.label}</Text>
          <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * A system alert.
 *
 * `count === 0` is drawn in the neutral colour with a tick, because a clear
 * alert is a good result and painting "0 overruns" in the alarm colour would
 * teach the officer to ignore it.
 */
export function AlertCard({ alert, onPress }) {
  const tone = alert.count > 1 ? RED : alert.count === 1 ? alert.color : '#059669';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.alertCard}
      accessibilityRole="button"
      accessibilityLabel={`${alert.label}, ${alert.count}`}
    >
      <View style={[styles.alertIcon, { backgroundColor: `${tone}14` }]}>
        <Ionicons
          name={alert.count > 0 ? alert.icon : 'checkmark-circle-outline'}
          size={18}
          color={tone}
        />
      </View>
      <View style={styles.alertBody}>
        <Text style={styles.alertLabel}>{alert.label}</Text>
        <Text style={styles.alertBlurb} numberOfLines={2}>{alert.blurb}</Text>
      </View>
      <View style={styles.alertCountWrap}>
        <Text style={[styles.alertCount, { color: tone }]}>{alert.count}</Text>
        {alert.count > 0 ? <Ionicons name="chevron-forward" size={15} color={MUTED} /> : null}
      </View>
    </TouchableOpacity>
  );
}

/** A labelled section with an optional trailing note. */
export function Section({ title, note, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/**
 * An empty state phrased for the notification desk.
 *
 * Never a bare "No notifications": the question an officer has is WHY there is
 * nothing, and "nothing has happened yet" and "you are looking at a filter that
 * excludes everything" are different situations.
 */
export function NotificationEmpty({ icon = 'notifications-outline', title, subtitle }) {
  return <EmptyState icon={icon} title={title} subtitle={subtitle} />;
}

/** The inline spinner for a button that is mid-flight. */
export function ButtonSpinner() {
  return <ActivityIndicator size="small" color="#fff" />;
}

export const categoryLabel = (id) => categoryMeta(id)?.label ?? id;
export { SLATE };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  wrap: { flex: 1, backgroundColor: '#f5f7f9', padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f7f9' },
  errorText: { marginTop: 12, color: RED, textAlign: 'center', fontSize: 13 },
  retry: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },

  filterRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipText: { fontSize: 12, color: SLATE, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  badge: {
    minWidth: 18, paddingHorizontal: 5, height: 18, borderRadius: 9,
    backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
  },
  badgeActive: { backgroundColor: '#ffffff33' },
  badgeText: { fontSize: 10, fontWeight: '700', color: SLATE },
  badgeTextActive: { color: '#fff' },

  row: {
    flexDirection: 'row', gap: 11, backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#eef2f7', padding: 13, marginBottom: 9,
  },
  rowUnread: { borderColor: '#bfdbfe', backgroundColor: '#f8faff' },
  rowIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  rowTitleUnread: { fontWeight: '800' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: THEME },
  rowMessage: { fontSize: 12, color: SLATE, lineHeight: 17, marginTop: 2 },
  rowFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  rowType: { fontSize: 10, color: MUTED, fontWeight: '600' },
  rowTime: { fontSize: 10, color: MUTED },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 13, marginBottom: 9,
  },
  alertIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  alertBody: { flex: 1 },
  alertLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  alertBlurb: { fontSize: 11, color: SLATE, lineHeight: 15, marginTop: 2 },
  alertCountWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertCount: { fontSize: 17, fontWeight: '800' },

  section: { marginTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sectionNote: { fontSize: 11, color: MUTED },
});