/**
 * S-12 Notifications — the hub. Docs: 12-alumni-relations.md §3.7.
 *
 * Replaces a 516-line screen that held two tabs in one file and could not filter,
 * page, read a single row, or save a preference.
 *
 * WHAT IS LOADED, AND WHEN
 * ------------------------
 * `catalogue` and `preferences` are fetched ONCE for the whole hub because both are
 * needed by every tab: the filter chips and the preference grid read the same eight
 * rules, and fetching them per tab meant the two screens could disagree about what
 * categories exist.
 *
 * `inbox` is re-fetched whenever a filter changes, and only for the Inbox tab — the
 * preferences tab has no reason to read the inbox at all. The old screen fetched one
 * blob on mount and re-used it for everything, which is why the Broadcast tab showed
 * a stale unread count after you sent something.
 *
 * `isOffice` comes from the inbox response's `viewerContext`, not from a separate
 * profile call, so the office-only tab appears in the same tick the data arrives.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, StyleSheet } from 'react-native';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { buildCatalogue, applyCounts, graduateTabs, officeTabs } from './notificationsMeta';
import SegmentedTabs from './components/SegmentedTabs';
import InboxPage from './pages/inbox/inbox';
import PreferencesPage from './pages/preferences/preferences';
import BroadcastPage from './pages/broadcast/broadcast';

const PAGE_SIZE = 25;

const EMPTY_CATALOGUE = { categories: [], categoryIds: [], metaFor: () => null };

export default function NotificationsScreen({ navigation }) {
  const [tab, setTab] = useState('Inbox');

  const [catalogue, setCatalogue] = useState(EMPTY_CATALOGUE);
  const [isOffice, setIsOffice] = useState(false);

  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const [importantUnread, setImportantUnread] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, hasMore: false });
  const [filters, setFilters] = useState({ category: null, unreadOnly: false, importantOnly: false });

  const [preferences, setPreferences] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [sweepRunning, setSweepRunning] = useState(false);
  const [sweepReport, setSweepReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);

  const tabs = useMemo(() => (isOffice ? officeTabs() : graduateTabs()), [isOffice]);

  const loadStatic = useCallback(async () => {
    try {
      const [cat, prefs] = await Promise.all([
        alumniApi.notificationCategories(),
        alumniApi.notificationPreferences(),
      ]);
      setCatalogue(buildCatalogue(cat));
      setPreferences(prefs?.preferences ?? null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadInbox = useCallback(
    async ({ reset = false, spinner = false } = {}) => {
      if (spinner) setLoading(true);
      try {
        const page = reset ? 1 : pagination.page + 1;
        const data = await alumniApi.notifications({
          category: filters.category ?? undefined,
          unread: filters.unreadOnly ? 'true' : undefined,
          important: filters.importantOnly ? 'true' : undefined,
          page,
          pageSize: PAGE_SIZE,
        });

        // Counts are patched onto the existing catalogue, not merged as rules — see
        // `applyCounts`. Functional update so `catalogue` stays out of this callback's
        // dependencies, which would otherwise re-trigger the inbox fetch on every
        // count change.
        setCatalogue((prev) => applyCounts(prev, data.counts));
        setIsOffice(!!data.viewerContext?.isOffice);
        setUnread(data.unread ?? 0);
        setImportantUnread(data.importantUnread ?? 0);
        setPagination(data.pagination ?? { page: 1, pageSize: PAGE_SIZE, total: 0, hasMore: false });
        setRows((prev) => (reset || page === 1 ? data.notifications : [...prev, ...(data.notifications ?? [])]));
        setError(null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters.category, filters.unreadOnly, filters.importantOnly, pagination.page],
  );

  useEffect(() => {
    loadStatic();
  }, [loadStatic]);

  useEffect(() => {
    loadInbox({ reset: true, spinner: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.unreadOnly, filters.importantOnly]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInbox({ reset: true });
  }, [loadInbox]);

  const applyFilter = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const onPressRow = useCallback(
    async (row, target) => {
      // Mark read on tap, then follow the deep link. Read state is set first so a
      // failed navigation still leaves the row honestly marked — you did open it.
      if (!row.read) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read: true } : r)));
        try {
          await alumniApi.setNotificationRead(row.id, true);
          setUnread((n) => Math.max(0, n - 1));
        } catch {
          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read: false } : r)));
        }
      }
      if (target?.screen) {
        // The shell's contract is `navigate(screen)` — there is no `setCurrentScreen`
        // and no params channel, so `deepLinkTarget` returns a module and nothing more.
        if (navigation?.navigate) navigation.navigate(target.screen);
        else if (navigation?.openModule) navigation.openModule(target.screen);
      }
    },
    [navigation],
  );

  const onToggleRead = useCallback(async (row, read) => {
    const before = rows;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read } : r)));
    try {
      await alumniApi.setNotificationRead(row.id, read);
      setUnread((n) => (read ? Math.max(0, n - 1) : n + 1));
      if (read) setImportantUnread((n) => Math.max(0, n - 1));
    } catch (e) {
      setRows(before);
      Alert.alert('Could not update', e.message ?? 'Try again.');
    }
  }, [rows]);

  const onMarkAllRead = useCallback(async () => {
    setMarking(true);
    try {
      await alumniApi.markAllRead();
      const snapshot = rows.map((r) => ({ ...r, read: true }));
      setRows(snapshot);
      setUnread(0);
      setImportantUnread(0);
    } catch (e) {
      Alert.alert('Could not mark all read', e.message ?? 'Try again.');
    } finally {
      setMarking(false);
    }
  }, [rows]);

  const onTogglePreference = useCallback(async (category, muted) => {
    setSavingPrefs(true);
    const before = preferences;
    // Optimistic: the switch must move under the thumb. Rolled back on failure so the
    // screen never claims a setting that did not save.
    setPreferences((prev) => (prev ? prev.map((p) => (p.category === category ? { ...p, muted, explicit: true } : p)) : prev));
    try {
      const res = await alumniApi.updateNotificationPreferences({ [category]: muted });
      setPreferences(res.preferences);
    } catch (e) {
      setPreferences(before);
      Alert.alert('Could not save', e.message ?? 'Try again.');
    } finally {
      setSavingPrefs(false);
    }
  }, [preferences]);

  const onSweep = useCallback(async (dryRun) => {
    setSweepRunning(true);
    try {
      const report = await alumniApi.runReminderSweep(dryRun);
      setSweepReport(report);
      if (!dryRun) loadInbox({ reset: true });
    } catch (e) {
      Alert.alert('Sweep failed', e.message ?? 'Try again.');
    } finally {
      setSweepRunning(false);
    }
  }, [loadInbox]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          {unread > 0 ? `${unread} unread` : 'All caught up'}
          {isOffice ? ' · Alumni Relations Office' : ''}
        </Text>
      </View>

      <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} counts={{ Inbox: unread }} />

      <View style={styles.body}>
        {tab === 'Inbox' ? (
          <InboxPage
            loading={loading}
            refreshing={refreshing}
            error={error}
            rows={rows}
            catalogue={catalogue}
            filters={filters}
            pagination={pagination}
            importantUnread={importantUnread}
            isOffice={isOffice}
            onRefresh={onRefresh}
            onLoadMore={() => loadInbox({})}
            onSelectCategory={(c) => applyFilter({ category: c })}
            onToggleUnread={() => applyFilter({ unreadOnly: !filters.unreadOnly })}
            onToggleImportant={() => applyFilter({ importantOnly: !filters.importantOnly })}
            onPressRow={onPressRow}
            onToggleRead={onToggleRead}
            onMarkAllRead={onMarkAllRead}
            marking={marking}
          />
        ) : null}

        {tab === 'Preferences' ? (
          <PreferencesPage
            loading={loading && !preferences}
            error={error}
            catalogue={catalogue}
            preferences={preferences}
            saving={savingPrefs}
            isOffice={isOffice}
            sweepRunning={sweepRunning}
            sweepReport={sweepReport}
            onToggle={onTogglePreference}
            onSweep={onSweep}
          />
        ) : null}

        {tab === 'Broadcast' && isOffice ? (
          <BroadcastPage onSent={() => loadInbox({ reset: true })} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
});