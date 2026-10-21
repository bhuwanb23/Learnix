/**
 * X-09 -- The exam office's notification centre: the nine categories, and the composer.
 * Docs: 05-exam-cell.md section 3.7
 *
 * WAS A MOCK, AND A WRONG ONE. This screen fetched the inbox but then GUESSED the icon and the
 * colour from the type string -- `type.includes('EXAM')` gives a calendar, `type.includes('RESULT')`
 * gives a trophy -- so a row the server had no chrome for rendered as a blue bell, and a row of type
 * `EVALUATION_DEADLINE` matched no rule at all and fell through to a generic bell. The categories
 * were not offered, so the inbox could not be filtered. The composer's audience picker was a
 * hardcoded list of three, and there was no "important" flag, so a notice the office had marked as
 * needing attention looked exactly like a notice about anything else.
 *
 * WHAT IT IS NOW
 * --------------
 * The nine categories are read from `GET /examcell/notifications/catalogue`, because the labels,
 * icons and colours are the SERVER's vocabulary -- a second copy in the client is a second thing to
 * forget to update, and the symptom is a chip that says "Results" in the list and "Result
 * publication" in the composer.
 *
 * WHY THE COMPOSER IS LIMITED TO ONE CATEGORY
 * --------------------------------------------
 * IMPORTANT_NOTICE is the one thing the exam office composes. The other eight are facts the SYSTEM
 * reports, and letting a controller publish a RESULT_PUBLISHED would let them forge a result. The
 * screen therefore offers only what the server will accept, and says why.
 *
 * IMPORTANT NOTICES IGNORE MUTES
 * ------------------------------
 * A reader who muted a category gets no row at all for it -- the mute is SUPPRESSION, not hiding.
 * But an IMPORTANT notice is a notice the office marked as needing attention, so it bypasses the
 * mute. That is why the composer says so out loud, and why the row treatment is visibly different.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, EmptyState } from '../../../../components/ui';
import { SkeletonCard, SkeletonStatRow } from '../../../../components/ui/SkeletonLoader';
import { examcellApi } from '../../../../services/api';
import { FALLBACK_AUDIENCES, FALLBACK_CATEGORIES, PAGE_SIZE, ageLabel, styles } from './notificationsUi';
import NoticeComposer from './NoticeComposer';

export default function NotificationsScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [unread, setUnread] = useState(0);
  const [importantUnread, setImportantUnread] = useState(0);
  const [pagination, setPagination] = useState(null);

  const [category, setCategory] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [importantOnly, setImportantOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  const load = useCallback(
    async (targetPage, mode) => {
      try {
        if (mode === 'append') setLoadingMore(true);
        else if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await examcellApi.notifications({
          category: category ?? undefined,
          unread: unreadOnly ? 'true' : undefined,
          important: importantOnly ? 'true' : undefined,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setPagination(res.pagination ?? null);
        setCounts(res.counts ?? []);
        setUnread(res.unread ?? 0);
        setImportantUnread(res.importantUnread ?? 0);
        setRows((prev) =>
          mode === 'append' ? [...prev, ...(res.notifications ?? [])] : res.notifications ?? [],
        );
      } catch (e) {
        setError(e.message || 'Could not load notifications');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [category, unreadOnly, importantOnly],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // The catalogue is fetched once: it is the SERVER's vocabulary, not a filter, so it does not change
  // when the filter does.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cat = await examcellApi.notificationCatalogue();
        if (!alive) return;
        setCatalogue(cat?.categories ?? []);
        setAudiences(cat?.audiences ?? []);
      } catch {
        // The list still works without the catalogue -- the chips fall back to the counts alone.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const applyFilter = useCallback((patch) => {
    setPage(1);
    setRows([]);
    if ('category' in patch) setCategory(patch.category);
    if ('unreadOnly' in patch) setUnreadOnly(patch.unreadOnly);
    if ('importantOnly' in patch) setImportantOnly(patch.importantOnly);
  }, []);

  const loadMore = () => {
    if (!pagination || loadingMore) return;
    const totalPages = pagination.pageSize ? Math.ceil(pagination.total / pagination.pageSize) : 1;
    if (page >= totalPages) return;
    const next = page + 1;
    setPage(next);
    load(next, 'append');
  };

  const markRead = async (row) => {
    if (row.read) return;
    // Optimistic, reverted on failure -- a tap that silently does nothing is indistinguishable from a
    // broken screen.
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read: true } : r)));
    setUnread((n) => Math.max(0, n - 1));
    try {
      await examcellApi.setNotificationRead(row.id, true);
    } catch (e) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read: false } : r)));
      setUnread((n) => n + 1);
      Alert.alert('Could not mark it read', e.message || 'Try again');
    }
  };

  const markAll = async () => {
    try {
      await examcellApi.markAllRead();
      load(page, 'refresh');
    } catch (e) {
      Alert.alert('Could not mark them read', e.message || 'Try again');
    }
  };

  /**
   * Raise the exam reminders.
   *
   * On demand, and IDEMPOTENT: the reminder is keyed on the exam and the day, so pressing this
   * twice leaves one row per student, not two. The screen says so, because an officer who is told
   * "12 sent" and then sees 24 rows will assume the platform duplicated them.
   */
  const runReminderSweep = () => {
    Alert.alert(
      'Send exam reminders?',
      'Every student with an exam in the next 24 hours is reminded once. Running this again does not send a second reminder.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send reminders',
          onPress: async () => {
            setSweeping(true);
            try {
              const res = await examcellApi.sweepExamReminders();
              Alert.alert(
                'Reminders sent',
                res?.raised
                  ? `${res.raised} reminder(s) sent across ${res.exams ?? 0} exam(s).`
                  : 'Every exam in the next 24 hours has already been reminded.',
              );
              load(1);
            } catch (e) {
              Alert.alert('Could not send reminders', e.message || 'Try again');
            } finally {
              setSweeping(false);
            }
          },
        },
      ],
    );
  };

  const openCompose = () => setComposeOpen(true);

  const countFor = (id) => counts.find((c) => c.category === id)?.count ?? 0;

  const chips = useMemo(
    () => (catalogue.length ? catalogue : FALLBACK_CATEGORIES),
    [catalogue],
  );
  const audienceList = useMemo(
    () => (audiences.length ? audiences : FALLBACK_AUDIENCES),
    [audiences],
  );

  if (loading && !rows.length) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(page, 'refresh')} />}
      >
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Text style={styles.h1}>Notifications</Text>
            <Text style={styles.sub}>
              {unread > 0 ? `${unread} unread` : 'All caught up'}
              {importantUnread > 0 ? ` - ${importantUnread} need attention` : ''}
            </Text>
          </View>
          {unread > 0 ? (
            <TouchableOpacity onPress={markAll} hitSlop={8}>
              <Text style={styles.link}>Mark all read</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? (
          <AnimatedCard style={styles.errorCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => load(1)} hitSlop={8}>
                <Text style={styles.link}>Retry</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !category && !unreadOnly && !importantOnly && styles.chipOn]}
              onPress={() => applyFilter({ category: null, unreadOnly: false, importantOnly: false })}
            >
              <Text
                style={[styles.chipText, !category && !unreadOnly && !importantOnly && styles.chipTextOn]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, unreadOnly && styles.chipOn]}
              onPress={() => applyFilter({ unreadOnly: !unreadOnly })}
            >
              <Ionicons
                name="ellipse-outline"
                size={12}
                color={unreadOnly ? theme.colors.white : theme.colors.primary}
              />
              <Text style={[styles.chipText, unreadOnly && styles.chipTextOn]}>Unread</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, importantOnly && styles.chipImportantOn]}
              onPress={() => applyFilter({ importantOnly: !importantOnly })}
            >
              <Ionicons
                name="alert-circle-outline"
                size={12}
                color={importantOnly ? theme.colors.white : theme.colors.error}
              />
              <Text style={[styles.chipText, importantOnly && styles.chipTextOn]}>Important</Text>
            </TouchableOpacity>
            {chips.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.chip,
                  category === c.id && styles.chipOn,
                  c.id === 'IMPORTANT_NOTICE' && category !== c.id && styles.chipImportant,
                ]}
                onPress={() => applyFilter({ category: category === c.id ? null : c.id })}
              >
                <Ionicons
                  name={c.icon ?? 'notifications-outline'}
                  size={12}
                  color={category === c.id ? theme.colors.white : c.color ?? theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.chipText,
                    category === c.id && styles.chipTextOn,
                    c.id === 'IMPORTANT_NOTICE' && category !== c.id && { color: theme.colors.error },
                  ]}
                >
                  {c.label}
                  {countFor(c.id) > 0 ? ` ${countFor(c.id)}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {rows.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="Nothing here"
            message={
              importantOnly
                ? 'No important notice is unread.'
                : unreadOnly
                  ? 'Nothing unread in this category.'
                  : 'No notifications in this category yet.'
            }
          />
        ) : (
          rows.map((n) => (
            <AnimatedCard key={n.id} style={[styles.card, n.important && styles.cardImportant]}>
              <TouchableOpacity onPress={() => markRead(n)}>
                <View style={styles.rowLeft}>
                  <View
                    style={[styles.icon, { backgroundColor: `${n.color ?? theme.colors.primary}1a` }]}
                  >
                    <Ionicons
                      name={n.icon ?? 'notifications-outline'}
                      size={16}
                      color={n.color ?? theme.colors.primary}
                    />
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={2}>
                        {n.title}
                      </Text>
                      {!n.read ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={styles.body} numberOfLines={3}>
                      {n.body}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>{n.categoryLabel ?? n.typeLabel ?? n.type}</Text>
                      <Text style={styles.meta}>·</Text>
                      <Text style={styles.meta}>{ageLabel(n.createdAt)}</Text>
                      {n.important ? (
                        <>
                          <Text style={styles.meta}>·</Text>
                          <Text style={styles.metaUrgent}>Needs attention</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          ))
        )}

        {pagination && pagination.total > rows.length ? (
          <TouchableOpacity style={styles.more} onPress={loadMore} disabled={loadingMore}>
            {loadingMore ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={styles.moreText}>Load more ({pagination.total - rows.length} left)</Text>
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.secondaryBtn} onPress={runReminderSweep} disabled={sweeping}>
          {sweeping ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <Ionicons name="alarm-outline" size={16} color={theme.colors.primary} />
          )}
          <Text style={styles.secondaryText}>Send exam reminders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.composeBtn} onPress={openCompose}>
          <Ionicons name="megaphone-outline" size={18} color={theme.colors.white} />
          <Text style={styles.composeText}>Compose a notice</Text>
        </TouchableOpacity>
      </ScrollView>

      <NoticeComposer
        visible={composeOpen}
        audiences={audienceList}
        onClose={() => setComposeOpen(false)}
        onSent={() => load(1)}
      />
    </View>
  );
}

