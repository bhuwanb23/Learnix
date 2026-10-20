/**
 * The warden's notification centre: the eight categories, and the composer.
 *
 * WAS A MOCK. This screen used to hold six hardcoded notifications in `useState` under the name
 * `initialNotifications` — a "Sunday special thali", a "Water supply interruption — Block B", a
 * "Gate pass approved" — and made ZERO calls into `hostelApi`. The composer had a subject, a
 * message and an audience picker over `['All Residents', 'Block A', 'Block B', 'Block C', 'Mess
 * Members']`, and pressing Send did nothing at all.
 *
 * It was also wrong in a way a mock always is: it claimed six categories existed when there were
 * eight, and the two it invented ("Plumbing", "Electrical") are not categories in the schema while
 * the two it omitted (FOOD, SECURITY) are.
 *
 * WHY THE EIGHT CATEGORIES ARE NOT A CLIENT-SIDE LIST
 * --------------------------------------------------
 * They are read from `GET /hostel/notifications/catalogue`. The labels, icons and colours are the
 * SERVER's vocabulary, because a second copy in the client is a second thing to forget to update and
 * the symptom is a chip that says "Food" in the list and "Mess" in the composer.
 *
 * WHY THE COMPOSER IS LIMITED TO THREE
 * ------------------------------------
 * ANNOUNCEMENT, MAINTENANCE and EMERGENCY are things a WARDEN COMPOSES. The other five are things
 * the SYSTEM notices and reports, and the server refuses to compose them — a warden who could publish
 * a gate-pass approval could forge one. The screen therefore only offers the three the server will
 * accept, and says why the others are not there.
 *
 * AN EMERGENCY IS DIFFERENT, AND THE SCREEN SHOWS IT
 * --------------------------------------------------
 * An emergency bypasses a resident's notification mutes, because you cannot opt out of being told
 * to leave a building. It is the one category that is not a matter of preference, so it gets its own
 * colour, its own composer affordance, and a row treatment that is visibly not an announcement.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, EmptyState } from '../../../../components/ui';
import { SkeletonCard, SkeletonStatRow } from '../../../../components/ui/SkeletonLoader';
import { hostelApi } from '../../../../services/api';

const PAGE_SIZE = 20;

/** The composer offers the categories the SERVER will accept. Not a filter — a permission. */
const COMPOSABLE = ['ANNOUNCEMENT', 'MAINTENANCE', 'EMERGENCY'];

const CATEGORY_HINT = {
  ANNOUNCEMENT: 'General hostel news — timings, rules, events.',
  MAINTENANCE: 'Work affecting a block or a service: water, power, lifts.',
  EMERGENCY: 'Evacuations, curfew changes, anything urgent. These ignore mutes.',
};

const AUDIENCES = [
  { kind: 'ALL_RESIDENTS', label: 'All residents' },
  { kind: 'MESS_MEMBERS', label: 'Mess members' },
];

function ageLabel(iso) {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsScreen() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [unread, setUnread] = useState(0);
  const [importantUnread, setImportantUnread] = useState(0);
  const [pagination, setPagination] = useState(null);

  const [category, setCategory] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeCategory, setComposeCategory] = useState('ANNOUNCEMENT');
  const [audience, setAudience] = useState('ALL_RESIDENTS');
  const [blockId, setBlockId] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(
    async (targetPage, mode) => {
      try {
        if (mode === 'append') setLoadingMore(true);
        else if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await hostelApi.notifications({
          category: category ?? undefined,
          unread: unreadOnly ? 'true' : undefined,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setPagination(res.pagination ?? null);
        setCounts(res.counts ?? []);
        setUnread(res.unread ?? 0);
        setImportantUnread(res.importantUnread ?? 0);
        setRows((prev) => (mode === 'append' ? [...prev, ...(res.notifications ?? [])] : res.notifications ?? []));
      } catch (e) {
        setError(e.message || 'Could not load notifications');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [category, unreadOnly],
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
        const cat = await hostelApi.notificationCatalogue();
        if (alive) setCatalogue(cat?.categories ?? []);
      } catch {
        // The list still works without the catalogue — the chips fall back to the counts alone.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // The blocks a warden can address, for the BLOCK audience. Read from the rooms API rather than
  // hardcoded: a hardcoded list of blocks is a list that is wrong the day a fourth block opens.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await hostelApi.rooms({ pageSize: 100 });
        const seen = new Map();
        for (const room of res?.rooms ?? []) {
          if (room?.block?.id) seen.set(room.block.id, room.block.name);
        }
        if (alive) setBlocks([...seen.entries()].map(([id, name]) => ({ id, name })));
      } catch {
        // Without blocks the picker offers only the audiences that need none.
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
  }, []);

  const loadMore = () => {
    if (!pagination || loadingMore || page >= (pagination.total ? Math.ceil(pagination.total / PAGE_SIZE) : 1)) return;
    const next = page + 1;
    setPage(next);
    load(next, 'append');
  };

  const markRead = async (row) => {
    if (row.read) return;
    // Optimistic, reverted on failure — a tap that silently does nothing is indistinguishable from a
    // broken screen.
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read: true } : r)));
    setUnread((n) => Math.max(0, n - 1));
    try {
      await hostelApi.setNotificationRead(row.id, true);
    } catch (e) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read: false } : r)));
      setUnread((n) => n + 1);
      Alert.alert('Could not mark it read', e.message || 'Try again');
    }
  };

  const markAll = async () => {
    try {
      await hostelApi.markAllNotificationsRead();
      load(page, 'refresh');
    } catch (e) {
      Alert.alert('Could not mark them read', e.message || 'Try again');
    }
  };

  const openCompose = () => {
    setComposeCategory('ANNOUNCEMENT');
    setAudience('ALL_RESIDENTS');
    setBlockId(null);
    setTitle('');
    setBody('');
    setComposeOpen(true);
  };

  const send = async () => {
    if (title.trim().length < 3 || body.trim().length < 3) {
      Alert.alert('Almost there', 'Give it a subject and a message of at least three characters.');
      return;
    }
    const target =
      audience === 'BLOCK' ? { kind: 'BLOCK', blockId } : { kind: audience };
    if (target.kind === 'BLOCK' && !blockId) {
      Alert.alert('Pick a block', 'Choose which block this is for.');
      return;
    }
    setSending(true);
    try {
      const res = await hostelApi.broadcastNotification({
        category: composeCategory,
        audience: target,
        title: title.trim(),
        body: body.trim(),
      });
      setComposeOpen(false);
      Alert.alert(
        'Sent',
        `${res?.recipients ?? 0} resident(s) notified${res?.muted ? `, ${res.muted} muted it` : ''}.`,
      );
      load(1);
    } catch (e) {
      Alert.alert('Could not send', e.message || 'Try again');
    } finally {
      setSending(false);
    }
  };

  const countFor = (id) => counts.find((c) => c.category === id)?.count ?? 0;

  const chips = useMemo(() => {
    const list = catalogue.length
      ? catalogue
      : [
          { id: 'ANNOUNCEMENT', label: 'Hostel announcements' },
          { id: 'MAINTENANCE', label: 'Maintenance alerts' },
          { id: 'EMERGENCY', label: 'Emergency notifications' },
          { id: 'GATE_PASS', label: 'Gate-pass approvals' },
          { id: 'LATE_RETURN', label: 'Late-return alerts' },
          { id: 'VISITOR', label: 'Visitor alerts' },
          { id: 'COMPLAINT', label: 'Complaint updates' },
          { id: 'MESS', label: 'Mess announcements' },
        ];
    return list;
  }, [catalogue]);

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
              {importantUnread > 0 ? ` · ${importantUnread} need attention` : ''}
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
              style={[styles.chip, !category && !unreadOnly && styles.chipOn]}
              onPress={() => applyFilter({ category: null, unreadOnly: false })}
            >
              <Text style={[styles.chipText, !category && !unreadOnly && styles.chipTextOn]}>All</Text>
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
            {chips.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.chip,
                  category === c.id && styles.chipOn,
                  c.id === 'EMERGENCY' && category !== c.id && styles.chipEmergency,
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
                    c.id === 'EMERGENCY' && category !== c.id && { color: theme.colors.error },
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
            message={unreadOnly ? 'Nothing unread in this category.' : 'No notifications in this category yet.'}
          />
        ) : (
          rows.map((n) => {
            const emergency = n.category === 'EMERGENCY';
            return (
              <AnimatedCard key={n.id} style={[styles.card, emergency && styles.cardEmergency]}>
                <TouchableOpacity onPress={() => markRead(n)}>
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.icon,
                        { backgroundColor: `${n.color ?? theme.colors.primary}1a` },
                      ]}
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
            );
          })
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

        <TouchableOpacity style={styles.composeBtn} onPress={openCompose}>
          <Ionicons name="megaphone-outline" size={18} color={theme.colors.white} />
          <Text style={styles.composeText}>Compose a notice</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={composeOpen} animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <ScrollView style={styles.container} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Compose a notice</Text>
          <Text style={styles.sub}>
            Only the three composable categories are here. The others are reported by the system, and a
            warden who could publish a gate-pass approval could forge one.
          </Text>

          {COMPOSABLE.map((id) => {
            const meta = catalogue.find((c) => c.id === id);
            const isEmergency = id === 'EMERGENCY';
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.catRow,
                  composeCategory === id && styles.catRowOn,
                  isEmergency && composeCategory === id && styles.catRowEmergency,
                ]}
                onPress={() => setComposeCategory(id)}
              >
                <Ionicons
                  name={composeCategory === id ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={isEmergency ? theme.colors.error : theme.colors.primary}
                />
                <View style={styles.flex}>
                  <Text style={[styles.catLabel, isEmergency && { color: theme.colors.error }]}>
                    {meta?.label ?? id}
                  </Text>
                  <Text style={styles.catHint}>{CATEGORY_HINT[id]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.label}>Who is it for?</Text>
          <View style={styles.chipRow}>
            {AUDIENCES.map((a) => (
              <TouchableOpacity
                key={a.kind}
                style={[styles.chip, audience === a.kind && styles.chipOn]}
                onPress={() => setAudience(a.kind)}
              >
                <Text style={[styles.chipText, audience === a.kind && styles.chipTextOn]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.chip, audience === 'BLOCK' && styles.chipOn]}
              onPress={() => setAudience('BLOCK')}
            >
              <Text style={[styles.chipText, audience === 'BLOCK' && styles.chipTextOn]}>One block</Text>
            </TouchableOpacity>
          </View>

          {audience === 'BLOCK' ? (
            <View style={styles.chipRow}>
              {blocks.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.chip, blockId === b.id && styles.chipOn]}
                  onPress={() => setBlockId(b.id)}
                >
                  <Text style={[styles.chipText, blockId === b.id && styles.chipTextOn]}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Overhead tank cleaning on Friday"
            placeholderTextColor={theme.colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.inputTall]}
            placeholder="What do they need to know, and what should they do?"
            placeholderTextColor={theme.colors.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1000}
          />

          {composeCategory === 'EMERGENCY' ? (
            <Text style={styles.emergencyNote}>
              This reaches residents even if they muted notices. Use it for something they must act on.
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendOff]}
            onPress={send}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => setComposeOpen(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  rowLeft: { flexDirection: 'row', gap: theme.spacing.sm, flex: 1 },
  link: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },

  errorCard: { borderColor: theme.colors.error, borderWidth: 1 },
  errorText: { color: theme.colors.error, fontSize: 13, flex: 1 },

  chipScroll: { marginHorizontal: -theme.spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipEmergency: { borderColor: theme.colors.error },
  chipText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '500' },
  chipTextOn: { color: theme.colors.white },

  card: { gap: 6 },
  cardEmergency: { borderColor: theme.colors.error, borderWidth: 1 },
  icon: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  titleUnread: { fontWeight: '700' },
  body: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' },
  meta: { fontSize: 11, color: theme.colors.textMuted },
  metaUrgent: { fontSize: 11, color: theme.colors.error, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginTop: 4 },

  more: { alignItems: 'center', paddingVertical: theme.spacing.md },
  moreText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },

  composeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radius.md, marginTop: theme.spacing.sm,
  },
  composeText: { color: theme.colors.white, fontWeight: '700', fontSize: 14 },

  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.sm,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface, marginBottom: 6,
  },
  catRowOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  catRowEmergency: { borderColor: theme.colors.error, backgroundColor: '#fef2f2' },
  catLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  catHint: { fontSize: 11, color: theme.colors.textMuted },

  label: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.sm },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    padding: theme.spacing.sm, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface,
  },
  inputTall: { minHeight: 96, textAlignVertical: 'top' },
  emergencyNote: { fontSize: 12, color: theme.colors.error, marginTop: theme.spacing.sm },
  sendBtn: {
    backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radius.md, alignItems: 'center', marginTop: theme.spacing.md,
  },
  sendOff: { opacity: 0.5 },
  sendText: { color: theme.colors.white, fontWeight: '700', fontSize: 14 },
  cancel: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  cancelText: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 14 },
});
