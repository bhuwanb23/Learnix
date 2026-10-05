// F-10 Notifications — the inbox (docs/users/06 §3.9).
//
// What this screen makes possible that the old one did not:
//
//   · Reading ONE message. The old inbox had exactly one read control and it
//     marked everything read, so opening the desk to read a single fee reminder
//     silently cleared every other unread message in the account. Tapping a row
//     here marks THAT row and nothing else.
//
//   · Filtering. The old list was the newest 50 rows of any type, so a bus delay
//     sat above a bill. The category filter asks the server, and the server's
//     `.strict()` schema means a chip this screen renders wrongly comes back a
//     400 rather than a silently unfiltered list.
//
//   · Paging. `take`/`skip` are real, and the unread badge counts the WHOLE inbox
//     rather than the page on screen, so it does not jump when you scroll.
//
// The unread-only toggle sends the literal string "true"/"false", because the
// schema coerces rather than running `Boolean(v)` — the query string "false" is a
// truthy string, and treating it as true would show the wrong list.
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { THEME, SLATE, MUTED, RED, deepLink, categoryMeta } from '../../notificationsMeta';
import {
  CategoryBar, NotificationEmpty, NotificationRow, NotificationScreen,
  Section, useNotifications,
} from '../../notificationsUi';

const PAGE = 25;

export default function NotificationInbox({ route, navigation }) {
  // The category may be set by the hub's grid, so the screen opens already
  // filtered rather than showing the officer the whole desk again.
  const [category, setCategory] = useState(route?.params?.category ?? null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [skip, setSkip] = useState(0);
  // `accumulated` holds every row loaded so far. The server pages; the list on
  // screen does not jump when the next page arrives, which is what a plain
  // `setData(page)` would do.
  const [accumulated, setAccumulated] = useState(null);

  const fetcher = useCallback(
    () => accountsApi.notifications({
      category: category ?? undefined,
      unreadOnly: unreadOnly ? 'true' : undefined,
      take: PAGE,
      skip,
    }),
    [category, unreadOnly, skip],
  );

  const { data, loading, refreshing, error, reload, onRefresh } = useNotifications(fetcher, [fetcher]);

  // Each new page replaces the accumulated list up to that offset.
  useEffect(() => {
    if (!data) return;
    setAccumulated((prev) => {
      const rows = data.notifications ?? [];
      if (skip === 0) return rows;
      const keep = (prev ?? []).slice(0, skip);
      return [...keep, ...rows];
    });
  }, [data, skip]);

  // A filter change restarts paging — otherwise page 3 of the previous filter is
  // spliced onto page 1 of the new one.
  const changeCategory = useCallback((next) => {
    setCategory(next);
    setSkip(0);
    setAccumulated(null);
  }, []);

  const toggleUnreadOnly = useCallback(() => {
    setUnreadOnly((v) => !v);
    setSkip(0);
    setAccumulated(null);
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await accountsApi.markAllRead();
      await reload();
    } catch (err) {
      Alert.alert('Could not mark all read', err.message);
    }
  }, [reload]);

  /**
   * Read ONE message, then follow its deep link if it has one.
   *
   * Marking read happens FIRST and is not undone if the link fails — a receipt
   * whose target screen does not exist should still not stay unread forever.
   */
  const openItem = useCallback(async (item) => {
    try {
      if (!item.read) await accountsApi.markNotificationRead(item.id);
      const link = deepLink(item.data);
      if (link) {
        navigation.openModule(link.screen, link.params);
        return;
      }
      // No destination: mark read and say so, rather than opening nothing and
      // leaving the officer wondering whether the tap registered.
      await reload();
    } catch (err) {
      Alert.alert('Could not open that message', err.message);
    }
  }, [navigation, reload]);

  const markUnread = useCallback(async (item) => {
    try {
      await accountsApi.setNotificationRead(item.id, false);
      await reload();
    } catch (err) {
      Alert.alert('Could not change that message', err.message);
    }
  }, [reload]);

  const rows = accumulated ?? [];
  const unread = data?.unread ?? 0;
  const hasMore = Boolean(data?.hasMore);
  const outOfScope = data?.outOfScope ?? 0;
  const cat = categoryMeta(category);

  return (
    <NotificationScreen
      loading={loading && rows.length === 0}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <CategoryBar
        value={category}
        onChange={changeCategory}
        unreadByCategory={data?.unreadByCategory ?? []}
        unreadTotal={unread}
      />

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.tool, unreadOnly && styles.toolActive]}
          onPress={toggleUnreadOnly}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: unreadOnly }}
        >
          <Ionicons name="ellipse" size={12} color={unreadOnly ? '#fff' : THEME} />
          <Text style={[styles.toolText, unreadOnly && styles.toolTextActive]}>Unread only</Text>
        </TouchableOpacity>

        {unread > 0 && !unreadOnly ? (
          <TouchableOpacity style={styles.tool} onPress={markAllRead} activeOpacity={0.8} accessibilityRole="button">
            <Ionicons name="checkmark-done-outline" size={14} color={THEME} />
            <Text style={styles.toolText}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {cat ? (
        <Text style={styles.filterNote}>{cat.blurb}</Text>
      ) : (
        <Text style={styles.filterNote}>
          Everything this desk is answerable for. Messages from other modules are left out.
        </Text>
      )}

      {outOfScope > 0 ? (
        <View style={styles.scopeNote}>
          <Ionicons name="information-circle-outline" size={13} color={MUTED} />
          <Text style={styles.scopeText}>
            {outOfScope} message{outOfScope === 1 ? '' : 's'} from other modules filtered out — they stay in
            their own screens.
          </Text>
        </View>
      ) : null}

      <Section title={cat ? cat.label : 'All messages'} note={`${data?.total ?? 0} total`}>
        {rows.length === 0 ? (
          <NotificationEmpty
            icon={unreadOnly ? 'checkmark-done-outline' : 'notifications-outline'}
            title={
              loading ? 'Loading…'
                : unreadOnly ? 'Nothing unread'
                  : category ? `No ${cat?.label.toLowerCase() ?? 'messages'}`
                    : 'No messages yet'
            }
            subtitle={
              unreadOnly
                ? 'Everything here has been read.'
                : category
                  ? 'Nothing has landed in this category. Try another filter.'
                  : 'When a fee reminder, payment, receipt, scholarship decision or payslip happens, it appears here.'
            }
          />
        ) : (
          rows.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onPress={() => openItem(item)}
              onLongPress={() => (item.read ? markUnread(item) : undefined)}
            />
          ))
        )}
      </Section>

      {hasMore ? (
        <TouchableOpacity
          style={styles.more}
          onPress={() => setSkip((s) => s + PAGE)}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.moreText}>Load older messages</Text>
          <Ionicons name="chevron-down" size={16} color={THEME} />
        </TouchableOpacity>
      ) : null}

      {rows.length > 0 ? (
        <Text style={styles.footnote}>
          Long-press a read message to put it back in the unread list. Opening a message marks only
          that one — the rest stay as they were.
        </Text>
      ) : null}
    </NotificationScreen>
  );
}

export { RED, SLATE };

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  tool: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11,
    paddingVertical: 7, borderRadius: 9, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  toolActive: { backgroundColor: THEME, borderColor: THEME },
  toolText: { fontSize: 11, fontWeight: '700', color: THEME },
  toolTextActive: { color: '#fff' },

  filterNote: { fontSize: 11, color: SLATE, lineHeight: 16, marginTop: 9 },
  scopeNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 9 },
  scopeText: { flex: 1, fontSize: 10, color: MUTED, lineHeight: 15 },

  more: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 11, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  moreText: { fontSize: 12, fontWeight: '700', color: THEME },

  footnote: { fontSize: 10, color: MUTED, lineHeight: 15, marginTop: 14 },
});