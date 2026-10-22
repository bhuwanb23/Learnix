/**
 * HD-01 — The HOD dashboard: the pieces every dashboard screen draws with.
 * Docs: 11-hod.md §HD-01
 *
 * WHY THE COMPONENTS ARE HERE AND NOT IN THE SCREEN
 * --------------------------------------------------
 * A stat tile is drawn in the KPIs, in the workload and in the trends. Three copies of it is
 * three chances for them to disagree about what a "clear" count looks like — and the symptom of
 * that disagreement is a screen where "0 overloaded" is painted in the alarm colour. So the tile,
 * the section, the alert row, the gauge and the empty states live here, and the screen composes
 * them.
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
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import { MUTED, SLATE, toneMeta } from './dashboardMeta';
import { styles } from './dashboardStyles';

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
export function DashboardScreen({
  loading,
  refreshing,
  error,
  onRetry,
  onRefresh,
  children,
}) {
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
        <Ionicons
          name="cloud-offline-outline"
          size={40}
          color={theme.colors.error}
        />
        <Text style={styles.errorText}>
          {error || 'The dashboard could not be loaded.'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {children}
    </ScrollView>
  );
}

// ── A section ──────────────────────────────────────────────────────────────

/**
 * A titled card.
 *
 * The blurb is part of the section, not decoration: "Assigned hours against the hours actually
 * taught" tells the reader what the numbers under it MEAN, which a bare "Faculty workload" does
 * not.
 */
export function Section({ title, blurb, icon, color, right, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: `${color ?? '#2563eb'}18` }]}>
          <Ionicons name={icon ?? 'ellipse-outline'} size={15} color={color ?? '#2563eb'} />
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
        <View style={[styles.tileIcon, { backgroundColor: `${color ?? '#2563eb'}18` }]}>
          <Ionicons name={icon} size={15} color={color ?? '#2563eb'} />
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
 * A tile that says "Approve leave" and one that says "Approve leave (2)" are different screens:
 * the first asks the HOD to go and look, the second tells them whether it is worth the walk.
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
      <Text style={[styles.actionCount, { color: count > 0 ? t.color : MUTED }]}>
        {count}
      </Text>
    </TouchableOpacity>
  );
}

// ── The health gauge ───────────────────────────────────────────────────────

/**
 * THE DEPARTMENT HEALTH SCORE, as a gauge.
 *
 * The BAND is the decision and the NUMBER is the tracking. A HOD does not act on "68.4" — they
 * act on "WATCH" — but they want the number to see whether it is moving.
 *
 * The WEAKEST component is named underneath, because a single number a HOD cannot act on is a
 * decoration, and the first thing they should read is what to fix.
 */
export function HealthGauge({ score, band, bandColor, weakestLabel, note }) {
  const value = score === null || score === undefined ? null : Math.round(score);
  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeRow}>
        <View style={styles.flex}>
          <Text style={styles.gaugeLabel}>Department health</Text>
          <Text style={[styles.gaugeBand, { color: bandColor }]}>
            {value === null ? 'Not enough data' : band}
          </Text>
        </View>
        <View
          style={[
            styles.gaugeScore,
            { borderColor: bandColor, backgroundColor: `${bandColor}14` },
          ]}
        >
          <Text style={[styles.gaugeValue, { color: bandColor }]}>
            {value === null ? '—' : value}
          </Text>
        </View>
      </View>
      {weakestLabel ? (
        <Text style={styles.gaugeWeakest}>Weakest: {weakestLabel}</Text>
      ) : null}
      {note ? <Text style={styles.gaugeNote}>{note}</Text> : null}
    </View>
  );
}

/**
 * THE "NEEDS ATTENTION" STRIP.
 *
 * A compact row of the alert kinds that are FIRING, above the nine sections. It is not a tenth
 * section — it is the answer to "is anything wrong?" in one glance, and the sections below carry
 * the detail.
 *
 * A kind with a ZERO is not drawn here — the strip is what needs attention. A zero that never
 * appears anywhere is not the same as a zero that is clearly clear, and this strip is where the
 * difference is made visible.
 */
export function AlertStrip({ alerts, onRoute }) {
  const firing = (alerts ?? []).filter((a) => a.count > 0);
  if (firing.length === 0) {
    return (
      <View style={styles.clearStrip}>
        <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
        <Text style={styles.clearText}>
          Nothing needs attention in this department right now.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.strip}>
      {firing.map((a) => {
        const t = toneMeta(a.tone);
        return (
          <TouchableOpacity
            key={a.kind}
            style={[styles.stripChip, { backgroundColor: t.bg, borderColor: t.border }]}
            onPress={() => onRoute?.(a.route, a.isTab)}
            activeOpacity={0.75}
          >
            <Ionicons name={a.icon ?? 'alert-circle-outline'} size={13} color={t.color} />
            <Text style={[styles.stripLabel, { color: t.color }]} numberOfLines={1}>
              {a.label}
            </Text>
            <Text style={[styles.stripCount, { color: t.color }]}>{a.count}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
 * past its own end is a lie about a proportion.
 */
export function ProgressBar({ percent: value, color, label }) {
  const p = Math.max(0, Math.min(100, Number(value) || 0));
  const over = (Number(value) || 0) > 100;
  return (
    <View style={styles.barWrap}>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${p}%`, backgroundColor: color ?? '#2563eb' }]}
        />
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

/** A small tag, for a status word. */
export function Tag({ label, color, bg }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg ?? `${color ?? '#64748b'}18` }]}>
      <Text style={[styles.tagText, { color: color ?? SLATE }]}>{label}</Text>
    </View>
  );
}

/** A spinner, for a section that is still loading on its own. */
export function SectionLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
