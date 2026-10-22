/**
 * HD-06 — The HOD's Courses desk: the pieces the desk draws with.
 * Docs: 11-hod.md §3.3
 *
 * WHY THESE LIVE HERE AND NOT IN THE SCREEN
 * -----------------------------------------
 * A health badge is drawn on a directory row, on the detail's gauge, on the health list and in
 * the editor's summary. Four copies of it is four chances for them to disagree about what a
 * "watch" course looks like — and the symptom of that disagreement is a directory where a course
 * is amber and a detail page where the same course is red.
 *
 * So the badge, the section, the chip, the progress bar, the empty state and the screen frame
 * live here, and the screens compose them. The health gauge and its breakdown live in
 * `coursesHealth.js`, and the stylesheet is shared through `coursesStyles.js`.
 *
 * THE FETCH HOOK
 * --------------
 * `useCourses` is the one place a Courses screen loads something, and it does the same three
 * things every time: it tracks loading and error, it exposes a `reload`, and it survives a screen
 * that unmounts mid-flight. That last one matters — a request that resolves after the screen is
 * gone calls `setState` on a dead component, which is a warning on some platforms and a crash on
 * others.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import { MUTED, SLATE, healthBandMeta, toneMeta } from './coursesMeta';
import { styles } from './coursesStyles';

// ── The fetch hook ─────────────────────────────────────────────────────────

/**
 * Load something, with loading and error state and a `reload`.
 *
 * `ALIVE` is what stops the setState-after-unmount warning, and it costs one boolean.
 */
export function useCourses(loader, deps = []) {
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

// ── The screen frame ───────────────────────────────────────────────────────

/**
 * The frame: a skeleton, an error panel, or the scroll view.
 *
 * The error is shown IN PLACE OF the content, not as a toast. A desk that fails quietly and shows
 * zeroes is dangerous: "0 courses" and "0 because the request failed" look identical, and the
 * first one gets read out in a meeting.
 */
export function CoursesScreen({
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
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.error} />
        <Text style={styles.errorText}>
          {error || 'The courses could not be loaded.'}
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
 * The blurb is part of the section, not decoration: "The courses the department has declared"
 * tells the reader what the list MEANs, which a bare "Curriculum" does not.
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

// ── The health badge ───────────────────────────────────────────────────────

/**
 * THE COURSE HEALTH BADGE.
 *
 * The BAND is the decision and the NUMBER is the tracking. A HOD acts on "WATCH", not on "68.4" —
 * but they want the number to see whether it is moving.
 *
 * A COURSE WITH NO DATA SHOWS NO BADGE AT ALL. A course in its first fortnight has no results and
 * no attendance yet, and painting it "At risk" is a false alarm that teaches the reader to ignore
 * the alarm colour. So an unmeasured course shows "No data yet", in the muted grey.
 */
export function HealthBadge({ score, band, weakest, small }) {
  if (score === null || score === undefined || !band) {
    return (
      <View style={[styles.badge, styles.badgeNone]}>
        <Ionicons name="help-circle-outline" size={small ? 11 : 13} color={MUTED} />
        <Text style={[styles.badgeText, { color: MUTED }]}>No data yet</Text>
      </View>
    );
  }
  const meta = healthBandMeta(band);
  const color = meta?.color ?? SLATE;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
      <Ionicons name="pulse-outline" size={small ? 11 : 13} color={color} />
      <Text style={[styles.badgeText, { color }]}>
        {Math.round(score)}% {meta?.label ?? band}
      </Text>
      {weakest ? (
        <Text style={[styles.badgeWeakest, { color }]} numberOfLines={1}>
          · weakest {weakest}
        </Text>
      ) : null}
    </View>
  );
}

// ── A stat tile ────────────────────────────────────────────────────────────

/** One number with its label. A clear count is green rather than alarming. */
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

// ── A chip ──────────────────────────────────────────────────────────────────

/** A small tag, for a status word. */
export function Tag({ label, color, bg, onPress }) {
  const body = (
    <View style={[styles.tag, { backgroundColor: bg ?? `${color ?? SLATE}18` }]}>
      <Text style={[styles.tagText, { color: color ?? SLATE }]}>{label}</Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      {body}
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
 * past its own end is a lie about a proportion.
 */
export function ProgressBar({ percent: value, color, label }) {
  const p = Math.max(0, Math.min(100, Number(value) || 0));
  const over = (Number(value) || 0) > 100;
  return (
    <View style={styles.barWrap}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${p}%`, backgroundColor: color ?? '#2563eb' }]} />
      </View>
      {label ? <Text style={styles.barLabel}>{label}</Text> : null}
      {over ? <Text style={styles.barOver}>over 100%</Text> : null}
    </View>
  );
}

// ── An empty state ─────────────────────────────────────────────────────────

export function CoursesEmpty({ icon = 'file-tray-outline', title, message }) {
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

/** A search box. */
export function SearchBox({ value, onChangeText, placeholder = 'Search' }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search-outline" size={15} color={MUTED} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.75}>
          <Ionicons name="close-circle" size={15} color={MUTED} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** A row of selectable chips — the filters. */
export function ChipRow({ options, value, onChange, scrollable }) {
  const body = options.map((o) => {
    const active = o.id === value;
    return (
      <TouchableOpacity
        key={String(o.id)}
        style={[
          styles.chip,
          active && { backgroundColor: `${o.color ?? '#2563eb'}18`, borderColor: o.color ?? '#2563eb' },
        ]}
        onPress={() => onChange?.(o.id)}
        activeOpacity={0.75}
      >
        <Text style={[styles.chipText, active ? { color: o.color ?? '#2563eb' } : null]}>
          {o.label}
        </Text>
      </TouchableOpacity>
    );
  });
  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {body}
      </ScrollView>
    );
  }
  return <View style={styles.chipRow}>{body}</View>;
}

/** A small button. */
export function ActionButton({ label, icon, color = '#2563eb', onPress, disabled, filled }) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        filled
          ? { backgroundColor: color, borderColor: color }
          : { borderColor: `${color}66` },
        disabled ? styles.btnDisabled : null,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.75}
    >
      {icon ? <Ionicons name={icon} size={13} color={filled ? '#fff' : color} /> : null}
      <Text style={[styles.btnText, { color: filled ? '#fff' : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** A spinner, for a section that is still loading on its own. */
export function CoursesLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
