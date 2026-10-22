/**
 * HD-02 — The HOD's Faculty desk: the pieces the desk draws with.
 * Docs: 11-hod.md §3.2
 *
 * WHY THESE LIVE HERE AND NOT IN THE SCREEN
 * -----------------------------------------
 * A workload bar is drawn on a directory row, on the balancer's target list and on the detail's
 * gauge. Three copies of it is three chances for them to disagree about what "overloaded" looks
 * like — and the symptom of that disagreement is a directory that says a teacher is overloaded
 * and a detail page that says they are not.
 *
 * So the bar, the badge, the gauge, the section, the tile, the chip, the progress bar, the empty
 * state and the screen frame live here, and the screens compose them.
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
import { MUTED, SLATE, insightBandMeta, toneMeta } from './facultyMeta';
import { styles } from './facultyStyles';

// ── The fetch hook ─────────────────────────────────────────────────────────

/**
 * Load something, with loading and error state and a `reload`.
 *
 * `ALIVE` is what stops the setState-after-unmount warning, and it costs one boolean.
 */
export function useFaculty(loader, deps = []) {
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
 * The error is shown IN PLACE OF the content, not as a toast. A desk that fails quietly and
 * shows zeroes is dangerous: "0 overloaded" and "0 because the request failed" look identical.
 */
export function FacultyScreen({
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
          {error || 'The faculty could not be loaded.'}
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
 * The blurb is part of the section, not decoration: "Assigned hours against their own maximum"
 * tells the reader what the numbers under it MEAN.
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

// ── The workload bar ───────────────────────────────────────────────────────

/**
 * THE WORKLOAD BAR — assigned hours against the teacher's OWN maximum.
 *
 * The bar is CLAMPED to 100 and the true figure is printed beside it, because a bar that renders
 * past its own end is a lie about a proportion — and an overloaded teacher is exactly the case
 * where the bar would run past the end.
 */
export function WorkloadBar({ assigned, max, band, color, small }) {
  const pct = max === 0 ? 0 : Math.round((assigned / max) * 100);
  const width = Math.max(0, Math.min(100, pct));
  const over = pct > 100;
  return (
    <View style={styles.barWrap}>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${width}%`, backgroundColor: color ?? band?.color ?? '#2563eb' },
          ]}
        />
      </View>
      <Text style={styles.barLabel}>
        {assigned}h of {max}h · {pct}%{over ? ' · over their maximum' : ''}
      </Text>
    </View>
  );
}

// ── The band chip ──────────────────────────────────────────────────────────

/** A workload band, as a chip. */
export function BandChip({ band, small }) {
  if (!band) {
    return (
      <View style={[styles.badge, styles.badgeNone]}>
        <Ionicons name="help-circle-outline" size={small ? 11 : 13} color={MUTED} />
        <Text style={[styles.badgeText, { color: MUTED }]}>No data</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: `${band.color}18` }]}>
      <Ionicons name="ellipse-outline" size={small ? 9 : 11} color={band.color} />
      <Text style={[styles.badgeText, { color: band.color }]}>{band.label}</Text>
    </View>
  );
}

// ── The insight badge ──────────────────────────────────────────────────────

/**
 * THE PERFORMANCE INSIGHT, as a badge.
 *
 * A teacher with nothing measured shows NO BADGE. Scoring a teacher in their first fortnight as
 * failing because they have no attendance yet is a false alarm, and the band is a DECISION about
 * how alarming something is — so it has to be the same decision everywhere.
 */
export function InsightBadge({ insight, small }) {
  if (!insight || insight.score === null || insight.score === undefined || !insight.band) {
    return (
      <View style={[styles.badge, styles.badgeNone]}>
        <Ionicons name="help-circle-outline" size={small ? 11 : 13} color={MUTED} />
        <Text style={[styles.badgeText, { color: MUTED }]}>No data yet</Text>
      </View>
    );
  }
  const meta = insightBandMeta(insight.band);
  const color = meta?.color ?? SLATE;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
      <Ionicons name="pulse-outline" size={small ? 11 : 13} color={color} />
      <Text style={[styles.badgeText, { color }]}>
        {Math.round(insight.score)} {meta?.label ?? insight.band}
      </Text>
    </View>
  );
}

// ── The insight gauge ──────────────────────────────────────────────────────

/** THE PERFORMANCE INSIGHT, as a gauge, with the legs it is made of. */
export function InsightGauge({ insight }) {
  if (!insight) return null;
  const meta = insight.band ? insightBandMeta(insight.band) : null;
  const color = meta?.color ?? MUTED;
  const value = insight.score === null || insight.score === undefined ? null : Math.round(insight.score);
  const weakest = (insight.legs ?? []).find((l: any) => l.id === insight.weakest);

  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeRow}>
        <View style={styles.flex}>
          <Text style={styles.gaugeLabel}>Performance insight</Text>
          <Text style={[styles.gaugeBand, { color }]}>
            {value === null ? 'Not enough data' : meta?.label ?? insight.band}
          </Text>
          {weakest ? (
            <Text style={styles.gaugeWeakest}>
              Weakest: {weakest.label}
            </Text>
          ) : null}
        </View>
        <View style={[styles.gaugeScore, { borderColor: color, backgroundColor: `${color}14` }]}>
          <Text style={[styles.gaugeValue, { color }]}>{value === null ? '—' : value}</Text>
        </View>
      </View>
      {insight.note ? <Text style={styles.gaugeNote}>{insight.note}</Text> : null}
    </View>
  );
}

// ── The insight breakdown ──────────────────────────────────────────────────

/** The four legs, and which of them counted. */
export function InsightBreakdown({ insight }) {
  if (!insight) return null;
  return (
    <View style={styles.breakdown}>
      {(insight.legs ?? []).map((l: any) => (
        <View key={l.id} style={styles.legRow}>
          <View style={[styles.legIcon, { backgroundColor: `${l.color ?? SLATE}18` }]}>
            <Ionicons name={l.icon ?? 'ellipse-outline'} size={14} color={l.color ?? SLATE} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.legLabel}>{l.label}</Text>
            <Text style={styles.legMeta}>
              {l.included
                ? `${l.value}% · ${Math.round((l.weight ?? 0) * 100)}% of the score`
                : 'no data yet — left out of the score'}
            </Text>
          </View>
          <Text style={[styles.legValue, { color: l.included ? (l.color ?? SLATE) : MUTED }]}>
            {l.included ? `${Math.round(l.value)}%` : '—'}
          </Text>
        </View>
      ))}
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

/** A label and a value, on one line. */
export function DetailRow({ label, value, tone }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

// ── A progress bar ─────────────────────────────────────────────────────────

/** A proportion, as a bar. */
export function ProgressBar({ percent: value, color, label }) {
  const p = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={styles.barWrap}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${p}%`, backgroundColor: color ?? '#2563eb' }]} />
      </View>
      {label ? <Text style={styles.barLabel}>{label}</Text> : null}
    </View>
  );
}

// ── An empty state ─────────────────────────────────────────────────────────

export function FacultyEmpty({ icon = 'file-tray-outline', title, message }) {
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
export function ChipRow({ options, value, onChange }) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <TouchableOpacity
            key={String(o.id)}
            style={[
              styles.chip,
              active && {
                backgroundColor: `${o.color ?? '#2563eb'}18`,
                borderColor: o.color ?? '#2563eb',
              },
            ]}
            onPress={() => onChange?.(o.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active ? { color: o.color ?? '#2563eb' } : null]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
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
export function FacultyLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
