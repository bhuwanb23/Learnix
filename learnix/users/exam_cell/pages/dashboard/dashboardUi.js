/**
 * X-11 — The exam cell dashboard: the pieces every dashboard screen draws with.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHY THE COMPONENTS ARE HERE AND NOT IN THE SCREEN
 * ---------------------------------------------------
 * A stat tile is drawn in the overview, in the Student Statistics section and in the Performance
 * section. Three copies of it is three chances for them to disagree about what a "clear" count
 * looks like — and the symptom of that disagreement is a screen where "0 absent" is painted in the
 * alarm colour. So the tile, the section card, the alert row and the empty/error states live here,
 * and the screen composes them.
 *
 * THE FETCH HOOK
 * --------------
 * `useDashboard` is the one place a dashboard screen loads something, and it does the same three
 * things every time: it tracks loading and error, it exposes a `reload`, and it survives a screen
 * that unmounts mid-flight. That last one matters more than it sounds — a request that resolves
 * after the screen is gone will call `setState` on a dead component, and in React Native that is a
 * warning on some platforms and a crash on others.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { SkeletonCard, SkeletonStatRow } from '../../../../components/ui/SkeletonLoader';
import { MUTED, SLATE, THEME, toneMeta } from './dashboardMeta';

// ── The fetch hook ────────────────────────────────────────────────────────

/**
 * Load something, with loading and error state and a `reload`.
 *
 * `ALIVE` is what stops the setState-after-unmount warning, and it costs one boolean.
 */
export function useDashboard(loader, deps = []) {
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
 * The frame: a skeleton, an error panel, or the scroll view.
 *
 * The error is shown IN PLACE of the content rather than as a toast. A dashboard that fails
 * quietly and shows zeroes is the most dangerous screen in the app — "0 conflicts" and "0 because
 * the request failed" look identical, and the first one is read out in a meeting.
 */
export function DashboardScreen({ loading, refreshing, error, onRetry, onRefresh, children }) {
  if (loading) {
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={styles.pad}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.error} />
        <Text style={styles.errorText}>{error || 'The dashboard could not be loaded.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {children}
    </ScrollView>
  );
}

// ── A section ──────────────────────────────────────────────────────────────

/**
 * A titled card.
 *
 * The blurb is part of the section, not decoration: "Papers evaluated, still to mark, scripts in
 * custody" tells the reader what the numbers under it MEAN, which a bare "Evaluation status"
 * does not.
 */
export function Section({ title, blurb, icon, color, right, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: `${color ?? THEME}18` }]}>
          <Ionicons name={icon ?? 'ellipse-outline'} size={15} color={color ?? THEME} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {blurb ? <Text style={styles.sectionBlurb}>{blurb}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

// ── A stat tile ────────────────────────────────────────────────────────────

/**
 * One number with its label.
 *
 * The `tone` decides the COLOUR, and a clear count is green rather than alarming. That is the same
 * rule the server applies in `alertTone`: a screen that paints "0" in the alarm colour teaches
 * its reader to ignore the alarm colour.
 */
export function StatTile({ label, value, hint, tone, icon, color, onPress }) {
  const t = toneMeta(tone);
  const body = (
    <View style={[styles.tile, { borderColor: tone ? t.border : theme.colors.border }]}>
      {icon ? (
        <View style={[styles.tileIcon, { backgroundColor: `${color ?? THEME}18` }]}>
          <Ionicons name={icon} size={15} color={color ?? THEME} />
        </View>
      ) : null}
      <Text style={[styles.tileValue, tone ? { color: t.color } : null]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity style={styles.flex} onPress={onPress} activeOpacity={0.75}>
      {body}
    </TouchableOpacity>
  );
}

/** A row of stat tiles. */
export function StatRow({ children }) {
  return <View style={styles.statRow}>{children}</View>;
}

// ── An alert row ───────────────────────────────────────────────────────────

/**
 * One alert kind, with its count.
 *
 * A kind with a ZERO is still drawn — the section's job is to answer "is anything wrong?", and a
 * section that hides the clear kinds cannot answer it. A zero is drawn in the CLEAR colour, so it
 * reads as a result rather than as noise.
 */
export function AlertRow({ alert, onPress }) {
  const t = toneMeta(alert.tone);
  return (
    <TouchableOpacity
      style={[styles.alertRow, { backgroundColor: t.bg, borderColor: t.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={alert.icon ?? 'alert-circle-outline'} size={16} color={t.color} />
      <View style={styles.flex}>
        <Text style={[styles.alertLabel, { color: t.color }]}>{alert.label}</Text>
        <Text style={styles.alertBlurb} numberOfLines={1}>
          {alert.blurb}
        </Text>
      </View>
      <Text style={[styles.alertCount, { color: t.color }]}>{alert.count}</Text>
    </TouchableOpacity>
  );
}

// ── A quick-action tile ────────────────────────────────────────────────────

/**
 * One of the four actions, with the count of what it would act on.
 *
 * A tile that says "Generate hall tickets" and one that says "Generate hall tickets (3)" are
 * different screens: the first asks the officer to go and look, the second tells them whether it is
 * worth the walk.
 */
export function ActionTile({ action, count, tone, onPress }) {
  const t = toneMeta(tone);
  return (
    <TouchableOpacity style={styles.actionTile} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}>
        <Ionicons name={action.icon} size={17} color={action.color} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={2}>
        {action.label}
      </Text>
      <Text style={[styles.actionCount, { color: count > 0 ? t.color : MUTED }]}>{count}</Text>
    </TouchableOpacity>
  );
}

// ── A labelled row ─────────────────────────────────────────────────────────

/** A label and a value, on one line. The building block of the detail lists. */
export function DetailRow({ label, value, tone }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

// ── A progress bar ─────────────────────────────────────────────────────────

/**
 * A proportion, as a bar.
 *
 * The bar is CLAMPED to 100 and the true value is printed beside it, because a bar that renders
 * past its own end is a lie about a proportion. A value over 100 shows as a full bar and says so.
 */
export function ProgressBar({ percent: value, color, label }) {
  const p = Math.max(0, Math.min(100, Number(value) || 0));
  const over = (Number(value) || 0) > 100;
  return (
    <View style={styles.barWrap}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${p}%`, backgroundColor: color ?? THEME }]} />
      </View>
      {label ? <Text style={styles.barLabel}>{label}</Text> : null}
      {over ? <Text style={styles.barOver}>over 100%</Text> : null}
    </View>
  );
}

// ── An empty state ─────────────────────────────────────────────────────────

export function DashboardEmpty({ icon = 'file-tray-outline', title, message }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={26} color={MUTED} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
    </View>
  );
}

/** A note strip — the "here is what this number does NOT mean" line. */
export function NoteStrip({ tone = 'info', children }) {
  const color = tone === 'warn' ? '#d97706' : tone === 'bad' ? '#dc2626' : SLATE;
  return (
    <View style={[styles.note, { borderLeftColor: color }]}>
      <Text style={[styles.noteText, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  errorText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: theme.spacing.md,
    backgroundColor: THEME,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  retryText: { color: '#fff', fontWeight: '700' },

  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  sectionBlurb: { fontSize: 11, color: theme.colors.textMuted, lineHeight: 15, marginTop: 1 },

  statRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  tile: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    minWidth: 92,
    flexGrow: 1,
  },
  tileIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileValue: { fontSize: 19, fontWeight: '700', color: theme.colors.text },
  tileLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  tileHint: { fontSize: 9, color: MUTED, marginTop: 1 },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.sm,
  },
  alertLabel: { fontSize: 13, fontWeight: '700' },
  alertBlurb: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  alertCount: { fontSize: 17, fontWeight: '800' },

  actionTile: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.text, lineHeight: 15 },
  actionCount: { fontSize: 16, fontWeight: '800', marginTop: 3 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingVertical: 3,
  },
  detailLabel: { fontSize: 12, color: theme.colors.textMuted },
  detailValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text, flexShrink: 1, textAlign: 'right' },

  barWrap: { gap: 3 },
  barTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, color: theme.colors.textMuted },
  barOver: { fontSize: 10, color: '#d97706', fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: theme.spacing.lg, gap: 4 },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  emptyMessage: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center' },

  note: {
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.sm,
    paddingVertical: 2,
  },
  noteText: { fontSize: 11, lineHeight: 15 },
});
