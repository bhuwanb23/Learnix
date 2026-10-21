/**
 * X-08 — Cheating cases: the pieces every cheating screen draws with.
 * (docs/users/05 §3.6)
 *
 * WHY THE COMPONENTS ARE HERE AND NOT IN EACH SCREEN
 * --------------------------------------------------
 * A case row is drawn in the queue, in the committee queue, in the history and on the case file. Four
 * copies of it is four chances for them to disagree about what a risk badge looks like — and the
 * symptom of that disagreement is a screen where a HIGH case is amber. So the row, the stat grid, the
 * filter chips and the empty/error states live here, and each screen composes them.
 *
 * THE FETCH HOOK
 * --------------
 * `useCheating` is the one place a cheating screen loads something, and it does the same three things
 * every time: it tracks loading and error, it exposes a `reload`, and it survives a screen that
 * unmounts mid-flight. That last one matters more than it sounds — a request that resolves after the
 * screen is gone will call `setState` on a dead component, and in React Native that is a warning on
 * some platforms and a crash on others.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AMBER,
  GREEN,
  MUTED,
  RED,
  SLATE,
  THEME,
  VIOLET,
  classificationMeta,
  fmtDate,
  initials,
  plural,
  riskIcon,
  riskMeta,
  sourceMeta,
  statusIcon,
  statusMeta,
  timeAgo,
} from './cheating_casesMeta';

// ── The fetch hook ────────────────────────────────────────────────────────

/**
 * Load something, with loading and error state and a `reload`.
 *
 * `ALIVE` is what stops the setState-after-unmount warning, and it costs one boolean.
 */
export function useCheating(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [alive, setAlive] = useState(true);

  useEffect(() => () => setAlive(false), []);

  const run = useCallback(
    async (mode) => {
      try {
        if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);
        const result = await loader();
        if (alive) setData(result);
      } catch (e) {
        if (alive) setError(e.message || 'Something went wrong');
      } finally {
        if (alive) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alive, ...deps],
  );

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refreshing, reload: () => run('refresh'), refetch: run };
}

// ── The screen shell ───────────────────────────────────────────────────────

/**
 * The frame every cheating screen sits in: a title, a blurb, a back affordance and a body.
 *
 * The back affordance is here because a sub-screen that cannot be left is a trap, and because the
 * shell already knows how to go back — the screen does not have to be told.
 */
export function CheatingScreen({ title, blurb, onBack, children, right }) {
  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <View style={styles.screenHeaderText}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={THEME} />
            </TouchableOpacity>
          ) : null}
          <View style={styles.flex}>
            <Text style={styles.screenTitle}>{title}</Text>
            {blurb ? <Text style={styles.screenBlurb}>{blurb}</Text> : null}
          </View>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────

/**
 * A row of figures.
 *
 * A figure of zero is NOT drawn. A row of zeroes is noise, and a stat that is zero because there has
 * never been any of that thing is different from a stat that is zero because the query failed — so an
 * absent figure is left out rather than shown as 0.
 */
export function StatGrid({ stats }) {
  const shown = (stats ?? []).filter((s) => s.value !== undefined && s.value !== null);
  if (!shown.length) return null;
  return (
    <View style={styles.statGrid}>
      {shown.map((s) => (
        <View key={s.label} style={[styles.statCell, s.tone ? { borderColor: s.tone } : null]}>
          <Text style={[styles.statValue, s.tone ? { color: s.tone } : null]}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Filter chips ───────────────────────────────────────────────────────────

/**
 * The filter row.
 *
 * The chips come from the caller because which filters make sense depends on the screen, but the
 * CHIP is the same everywhere — so a case filtered by risk in the queue looks identical to one
 * filtered by risk in the history.
 */
export function FilterChips({ options, value, onChange, style }) {
  if (!options?.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.chipRow, style]}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              on && { backgroundColor: o.color ?? THEME, borderColor: o.color ?? THEME },
            ]}
            activeOpacity={0.75}
          >
            {o.icon ? (
              <Ionicons
                name={o.icon}
                size={12}
                color={on ? '#fff' : (o.color ?? SLATE)}
                style={{ marginRight: 4 }}
              />
            ) : null}
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
            {o.count !== undefined && o.count !== null ? (
              <Text style={[styles.chipCount, on && styles.chipCountOn]}>{o.count}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── The case row ──────────────────────────────────────────────────────────

/**
 * ONE case, as a row.
 *
 * It shows: the student (initials, not a photo — there is no file-serving route for an avatar that
 * this screen can rely on), the risk, the status, what it is waiting for, and whether it is OVERDUE.
 *
 * The overdue badge is the point of the row. A high-risk case that has sat unreviewed for a fortnight
 * is a failure of the desk and not of the student, and a queue that cannot say so is a queue nobody
 * triages.
 */
export function CaseRow({ item, onPress }) {
  const risk = riskMeta(item.riskLevel);
  const status = statusMeta(item.status);
  const cls = classificationMeta(item.classification);

  return (
    <TouchableOpacity style={styles.caseRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.caseTop}>
        <View style={[styles.avatar, { backgroundColor: risk.bg }]}>
          <Text style={[styles.avatarText, { color: risk.color }]}>{initials(item.student?.name)}</Text>
        </View>
        <View style={styles.flex}>
          <View style={styles.caseNameRow}>
            <Text style={styles.caseName} numberOfLines={1}>
              {item.student?.name ?? 'Unknown student'}
            </Text>
            {item.overdue ? (
              <View style={styles.overdueBadge}>
                <Ionicons name="time-outline" size={10} color="#fff" />
                <Text style={styles.overdueText}>Overdue</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.caseMeta} numberOfLines={1}>
            {item.student?.rollNo ?? '—'} · {item.course?.code ?? '—'} · {item.exam?.name ?? '—'}
          </Text>
          <Text style={styles.caseIssue} numberOfLines={2}>
            {item.issue}
          </Text>
        </View>
        <View style={styles.caseBadges}>
          <View style={[styles.riskChip, { backgroundColor: risk.bg }]}>
            <Ionicons name={riskIcon(item.riskLevel)} size={10} color={risk.color} />
            <Text style={[styles.riskChipText, { color: risk.color }]}>{risk.label}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: status.color + '1A' }]}>
            <Ionicons name={statusIcon(item.status)} size={10} color={status.color} />
            <Text style={[styles.statusChipText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.caseFoot}>
        <View style={styles.caseFootItem}>
          <Ionicons name={sourceMeta(item.source).icon} size={11} color={MUTED} />
          <Text style={styles.caseFootText}>{sourceMeta(item.source).label}</Text>
        </View>
        <View style={styles.caseFootItem}>
          <Ionicons name="pricetag-outline" size={11} color={MUTED} />
          <Text style={styles.caseFootText}>{cls.label}</Text>
        </View>
        <View style={styles.caseFootItem}>
          <Ionicons name="time-outline" size={11} color={MUTED} />
          <Text style={styles.caseFootText}>{timeAgo(item.createdAt)}</Text>
        </View>
        {item.evidenceCount ? (
          <View style={styles.caseFootItem}>
            <Ionicons name="attach-outline" size={11} color={MUTED} />
            <Text style={styles.caseFootText}>{plural(item.evidenceCount, 'file')}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── The empty and error states ─────────────────────────────────────────────

/**
 * Nothing to show.
 *
 * The message says WHY it is empty rather than "No data" — "no cases match this filter" and "no
 * cases have ever been raised" are different facts, and a screen that cannot tell them apart looks
 * broken.
 */
export function EmptyState({ icon = 'file-tray-outline', title, message, action, onAction }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={MUTED} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {action ? (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.emptyActionText}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** The error state. It always offers a way back. */
export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cloud-offline-outline" size={30} color={RED} />
      </View>
      <Text style={styles.emptyTitle}>Could not load</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {onRetry ? (
        <TouchableOpacity style={styles.emptyAction} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.emptyActionText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** The loading state. */
export function LoadingState({ label = 'Loading' }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={THEME} />
      <Text style={styles.loadingText}>{label}…</Text>
    </View>
  );
}

// ── A labelled field, for the case file ───────────────────────────────────

/** One fact about a case, with its label. */
export function DetailRow({ label, value, tone }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, tone ? { color: tone } : null]}>{value ?? '—'}</Text>
    </View>
  );
}

/** A section heading inside the case file. */
export function SectionHeading({ title, right }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionHeadingText}>{title}</Text>
      {right}
    </View>
  );
}

/**
 * A banner for a rule the reader needs to know.
 *
 * "The emergency always comes through" is a rule, and a screen that hides it teaches a resident the
 * wrong thing about their own mutes.
 */
export function NoteStrip({ tone = 'info', children }) {
  const color = tone === 'warn' ? AMBER : tone === 'danger' ? RED : tone === 'ok' ? GREEN : VIOLET;
  return (
    <View style={[styles.noteStrip, { borderLeftColor: color }]}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f9' },
  flex: { flex: 1 },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenHeaderText: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { paddingRight: 10, paddingTop: 2 },
  screenTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  screenBlurb: { fontSize: 12, color: SLATE, marginTop: 2, lineHeight: 17 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  statCell: {
    minWidth: 78,
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statValue: { fontSize: 19, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 10, color: MUTED, marginTop: 1 },

  chipRow: { gap: 7, paddingHorizontal: 20, paddingBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: { fontSize: 11, fontWeight: '600', color: SLATE },
  chipTextOn: { color: '#fff' },
  chipCount: { fontSize: 10, fontWeight: '700', color: MUTED, marginLeft: 5 },
  chipCountOn: { color: '#fff' },

  caseRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 13,
    marginHorizontal: 20,
    marginBottom: 9,
  },
  caseTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  caseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caseName: { fontSize: 14, fontWeight: '700', color: '#0f172a', flexShrink: 1 },
  caseMeta: { fontSize: 11, color: SLATE, marginTop: 1 },
  caseIssue: { fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 17 },
  caseBadges: { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
  riskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskChipText: { fontSize: 9, fontWeight: '800' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusChipText: { fontSize: 9, fontWeight: '700' },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: RED,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  overdueText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  caseFoot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  caseFootItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  caseFootText: { fontSize: 10, color: MUTED },

  empty: { alignItems: 'center', paddingVertical: 46, paddingHorizontal: 34 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  emptyMessage: {
    fontSize: 12,
    color: SLATE,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
  emptyAction: {
    marginTop: 14,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
  },
  emptyActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  loading: { alignItems: 'center', paddingVertical: 46 },
  loadingText: { marginTop: 10, fontSize: 12, color: SLATE },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  detailLabel: { width: 108, fontSize: 12, color: MUTED },
  detailValue: { flex: 1, fontSize: 12, color: '#0f172a', fontWeight: '600' },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionHeadingText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  noteStrip: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  noteText: { fontSize: 11, color: '#475569', lineHeight: 17 },
});
