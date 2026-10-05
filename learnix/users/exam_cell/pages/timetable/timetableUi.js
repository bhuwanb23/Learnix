// X-02 Timetable — the pieces all nine timetable screens share
// (docs/users/05 §3.9).
//
// Nine screens: the hub and eight block sub-screens. They share one shell, one
// fetch hook, one stat grid and one conflict row, and the reason they must is
// not tidiness. Three of them are load-bearing:
//
//   1. `goToRoute` decides between `switchTab` and `openModule`. A block's
//      `route` may be a bottom-nav TAB or a sub-SCREEN, and they are reached by
//      different calls. Passing a tab name to `openModule` finds no such key in
//      FEATURE_MODULES, `renderContent` falls through to the tab switcher, and
//      the controller lands back on the hub with no error anywhere. Here the
//      distinction is published BY THE SERVER on every route and consumed in
//      one place.
//
//   2. THE FAILED REQUEST IS SHOWN IN PLACE OF THE CONTENT. This matters more
//      on this screen than anywhere else in the app. A timetable that fails to
//      load and renders "0 clashes" is worse than an error message: "no clashes"
//      is the exact reading that lets a controller publish a broken schedule.
//      Zero because nothing was fetched and zero because nothing is wrong look
//      identical, and only one of them is safe.
//
//   3. A CLEAR CONFLICT DRAWS A TICK, NEVER THE ALARM ICON. A conflict list
//      where every row is painted is a list whose colours have stopped meaning
//      anything, and then the red rows are not read either.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import {
  THEME, RED, GREEN, AMBER, SLATE, MUTED, SEVERITY_COLOR, TONE_COLOR,
  conflictMeta, conflictTone, shortDayLabel,
} from './timetableMeta';

/**
 * The bottom-nav tabs of the exam cell app.
 *
 * Declared HERE, in the one place that navigates, rather than in each screen. A
 * screen that navigates needs to know the difference; a screen that only draws
 * does not. The audit asserts every published `isTab: true` route is a real
 * tab, so this list and the server's flag cannot disagree.
 */
export const TAB_ROUTES = ['Dashboard', 'Timetable', 'Evaluations', 'Results', 'Profile'];

/**
 * Go where a published route points.
 *
 * A TAB goes through `switchTab`; a SUB-SCREEN goes through `openModule`.
 * Getting this backwards is silent, which is exactly why it is written once,
 * here, rather than in nine call sites.
 */
export function goToRoute(navigation, route, isTab, params) {
  if (!route) return;
  if (isTab && TAB_ROUTES.includes(route)) navigation.switchTab(route);
  else navigation.openModule(route, params || {});
}

/**
 * Fetch-on-mount plus pull-to-refresh.
 *
 * Returns `reload` so a screen that has just WRITTEN something can re-read the
 * server's version rather than patching a local copy. On this screen that
 * matters more than usual: a write runs the clash engine and can be refused,
 * and a locally-patched row would show the controller a slot that the server
 * never accepted.
 */
export function useTimetable(fetcher, deps = []) {
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
 * The shell: skeleton, error panel, or the scroll view.
 *
 * The error is shown IN PLACE OF the content, never as a toast and never as an
 * empty list. See note 2 at the top of this file.
 */
export function TimetableScreen({
  title, subtitle, loading, refreshing, error, onRetry, onRefresh, children, header,
}) {
  if (loading) {
    return (
      <View style={styles.wrap}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={RED} />
        <Text style={styles.errorText}>{error || 'The timetable could not be loaded.'}</Text>
        <Text style={styles.errorHint}>
          Nothing is shown rather than shown as clear. A timetable that failed to
          load is not a timetable with no clashes.
        </Text>
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
      {title ? <Text style={styles.screenTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      {header}
      {children}
    </ScrollView>
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

/** A plain white card. Most sections are one of these. */
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/**
 * A card of headline figures.
 *
 * `tone` colours the VALUE, never the card. A red card holding a number is a
 * different claim from a red number on a white card.
 */
export function StatGrid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

export function StatCell({ label, value, tone, hint, onPress }) {
  const body = (
    <>
      <Text style={styles.cellLabel} numberOfLines={2}>{label}</Text>
      <Text style={[styles.cellValue, tone ? { color: tone } : null]} numberOfLines={1}>{value}</Text>
      {hint ? <Text style={styles.cellHint} numberOfLines={2}>{hint}</Text> : null}
    </>
  );
  if (!onPress) return <View style={styles.cell}>{body}</View>;
  return (
    <TouchableOpacity
      style={styles.cell}
      activeOpacity={0.75}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      {body}
    </TouchableOpacity>
  );
}

/**
 * A clash badge.
 *
 * A zero-count row draws a tick in GREEN and the word "clear". It never draws
 * the kind's own alarm icon at zero — see note 3 at the top of this file.
 */
export function ClashBadge({ count = 0, severity = 'MEDIUM', blocking = false }) {
  const tone = conflictTone(count);
  const color = count === 0 ? TONE_COLOR.clear : SEVERITY_COLOR[severity] ?? AMBER;
  const text = count === 0
    ? 'clear'
    : `${count}${blocking ? ' blocking' : severity === 'HIGH' ? ' high' : ''}`;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}14` }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

/**
 * One conflict kind, with its list underneath.
 *
 * The severity is stated twice when it matters — once as a coloured badge and
 * once as the word "Blocking" — because a HIGH clash that does not stop a write
 * and a HIGH clash that does are different situations, and only one of them is
 * worth waking somebody for.
 */
export function ConflictRow({ kind, count = 0, items = [], onPress }) {
  const meta = conflictMeta(kind) ?? {
    label: kind, blurb: '', icon: 'warning-outline', color: AMBER, severity: 'MEDIUM', blocking: false,
  };
  const tone = conflictTone(count);
  const color = count === 0 ? TONE_COLOR.clear : meta.color;
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.8}
        style={[styles.conflictRow, count > 0 && styles.conflictRowFiring]}
        accessibilityRole="button"
        accessibilityLabel={`${meta.label}, ${count === 0 ? 'clear' : `${count} found`}`}
      >
        <View style={[styles.conflictIcon, { backgroundColor: `${color}14` }]}>
          <Ionicons
            name={count > 0 ? meta.icon : 'checkmark-circle-outline'}
            size={18}
            color={color}
          />
        </View>
        <View style={styles.conflictBody}>
          <Text style={styles.conflictLabel}>{meta.label}</Text>
          <Text style={styles.conflictBlurb} numberOfLines={2}>{meta.blurb}</Text>
          <View style={styles.conflictTags}>
            <View style={[styles.tag, { borderColor: color }]}>
              <Text style={[styles.tagText, { color }]}>
                {meta.severity}{meta.blocking ? ' · blocking' : ''}
              </Text>
            </View>
            {tone !== 'clear' ? (
              <Text style={styles.conflictCountText}>
                {count} found · recorded, not refused
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={[styles.conflictCount, { color }]}>{count}</Text>
      </TouchableOpacity>

      {/* Each found clash, in the server's own words. The messages name the
          slots, because "student double-booked" without saying WHICH two papers
          is not something a controller can act on. */}
      {count > 0 && items.length ? (
        <View style={styles.conflictItems}>
          {items.map((item, i) => (
            <View key={`${item.message}-${i}`} style={styles.conflictItem}>
              <View style={[styles.conflictDot, { backgroundColor: color }]} />
              <Text style={styles.conflictItemText}>{item.message}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * A block card on the hub — the eight things the screen answers.
 *
 * `onPress` is always supplied by the caller, which resolves the route through
 * `goToRoute`. A card that cannot be opened is not drawn.
 */
export function BlockCard({ block, onPress, badge, badgeTone, children }) {
  const badgeColor = badgeTone ?? (badge > 0 ? RED : MUTED);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.blockCard}
      accessibilityRole="button"
      accessibilityLabel={block.label}
    >
      <View style={styles.blockHead}>
        <View style={[styles.blockIcon, { backgroundColor: `${block.color}14` }]}>
          <Ionicons name={block.icon} size={18} color={block.color} />
        </View>
        <View style={styles.blockHeadBody}>
          <Text style={styles.blockLabel}>{block.label}</Text>
          <Text style={styles.blockBlurb}>{block.blurb}</Text>
        </View>
        {badge !== undefined && badge !== null && badge !== 0 ? (
          <View style={[styles.blockBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.blockBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
      </View>
      {children}
    </TouchableOpacity>
  );
}

/** A plain labelled row, for a list of figures. */
export function FigureRow({ label, value, tone, sublabel }) {
  return (
    <View style={styles.figureRow}>
      <View style={styles.figureBody}>
        <Text style={styles.figureLabel} numberOfLines={1}>{label}</Text>
        {sublabel ? <Text style={styles.figureSub} numberOfLines={2}>{sublabel}</Text> : null}
      </View>
      <Text style={[styles.figureValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

/**
 * A day header on the calendar and the slots screen.
 *
 * The conflict count beside the paper count is the whole point: a day with four
 * papers and two clashes is a different day from a day with four papers and none,
 * and the controller needs to see which before tapping in.
 */
export function DayHeader({ date, count, conflictCount, onPress }) {
  const tone = conflictTone(conflictCount ?? 0);
  const color = TONE_COLOR[tone];
  const body = (
    <View style={styles.dayHead}>
      <View style={styles.dayHeadBody}>
        <Text style={styles.dayLabel}>{shortDayLabel(date)}</Text>
        <Text style={styles.dayCount}>
          {count} paper{count === 1 ? '' : 's'}
        </Text>
      </View>
      {conflictCount > 0 ? <ClashBadge count={conflictCount} /> : <ClashBadge count={0} />}
      {onPress ? <Ionicons name="chevron-forward" size={15} color="#cbd5e1" /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${shortDayLabel(date)}, ${count} papers, ${conflictCount ?? 0} clashes`}
    >
      {body}
    </TouchableOpacity>
  );
}

/** A small pill, for a status or a count. */
export function Pill({ text, color = SLATE, onPress, icon }) {
  const body = (
    <View style={[styles.pill, { backgroundColor: `${color}14` }]}>
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
      {body}
    </TouchableOpacity>
  );
}

/** A row of buttons, for the actions a screen offers. */
export function ActionRow({ actions }) {
  if (!actions?.length) return null;
  return (
    <View style={styles.actionRow}>
      {actions.map((a) => (
        <TouchableOpacity
          key={a.label}
          onPress={a.onPress}
          disabled={a.disabled}
          activeOpacity={0.85}
          style={[
            styles.actionBtn,
            { backgroundColor: a.disabled ? '#f1f5f9' : a.color ?? THEME },
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!a.disabled }}
          accessibilityLabel={a.label}
        >
          {a.icon ? (
            <Ionicons name={a.icon} size={15} color={a.disabled ? MUTED : '#fff'} />
          ) : null}
          <Text style={[styles.actionBtnText, a.disabled && { color: MUTED }]}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** A note strip — a policy sentence, an explanation, or a warning. */
export function NoteStrip({ text, tone = 'info', icon }) {
  const color = tone === 'bad' ? RED : tone === 'warn' ? AMBER : tone === 'ok' ? GREEN : SLATE;
  const fallback = tone === 'bad' ? 'alert-circle' : tone === 'warn' ? 'warning' : 'information-circle';
  return (
    <View style={[styles.note, { backgroundColor: `${color}0f`, borderColor: `${color}33` }]}>
      <Ionicons name={icon ?? fallback} size={14} color={color} />
      <Text style={[styles.noteText, { color }]}>{text}</Text>
    </View>
  );
}

/**
 * An empty state phrased for the timetable.
 *
 * Never a bare "no data". The question a controller has is WHY there is nothing,
 * and "nothing is scheduled" and "you are looking at a filter that excludes
 * everything" are different situations with different next actions.
 */
export function TimetableEmpty({ icon = 'calendar-outline', title, subtitle }) {
  return <EmptyState icon={icon} title={title} subtitle={subtitle} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  wrap: { flex: 1, backgroundColor: '#f5f7f9', padding: 16, gap: 10 },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, backgroundColor: '#f5f7f9',
  },
  errorText: { marginTop: 12, color: RED, textAlign: 'center', fontSize: 13 },
  errorHint: { marginTop: 8, color: MUTED, textAlign: 'center', fontSize: 11, lineHeight: 16 },
  retry: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },

  screenTitle: { fontSize: 19, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4 },
  screenSubtitle: { fontSize: 11, color: SLATE, marginTop: 3, lineHeight: 16 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#eef2f7', padding: 15, marginTop: 12,
  },

  section: { marginTop: 18 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between', marginBottom: 9, gap: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sectionNote: { fontSize: 10, color: MUTED, flex: 1, textAlign: 'right' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', paddingVertical: 8, paddingRight: 10 },
  cellLabel: { fontSize: 10, color: SLATE },
  cellValue: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  cellHint: { fontSize: 10, color: MUTED, marginTop: 1 },

  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  conflictRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 12, marginBottom: 8,
  },
  conflictRowFiring: { borderColor: '#fecaca' },
  conflictIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  conflictBody: { flex: 1 },
  conflictLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  conflictBlurb: { fontSize: 10, color: SLATE, marginTop: 2, lineHeight: 14 },
  conflictTags: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' },
  conflictCount: { fontSize: 17, fontWeight: '800' },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  tagText: { fontSize: 9, fontWeight: '800' },
  conflictCountText: { fontSize: 9, color: MUTED },
  conflictItems: { paddingLeft: 12, marginBottom: 10, marginTop: -4 },
  conflictItem: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
  conflictDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5 },
  conflictItemText: { flex: 1, fontSize: 11, color: SLATE, lineHeight: 16 },

  blockCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#eef2f7', padding: 14, marginBottom: 10,
  },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  blockHeadBody: { flex: 1 },
  blockLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  blockBlurb: { fontSize: 10, color: SLATE, marginTop: 1, lineHeight: 14 },
  blockBadge: {
    minWidth: 20, paddingHorizontal: 6, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  blockBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  figureRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  figureBody: { flex: 1, marginRight: 10 },
  figureLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  figureSub: { fontSize: 10, color: SLATE, marginTop: 2, lineHeight: 14 },
  figureValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  dayHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', marginBottom: 8,
  },
  dayHeadBody: { flex: 1 },
  dayLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  dayCount: { fontSize: 10, color: SLATE, marginTop: 1 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
  },
  pillText: { fontSize: 10, fontWeight: '700' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  note: {
    flexDirection: 'row', gap: 9, alignItems: 'flex-start',
    borderRadius: 12, borderWidth: 1, padding: 11, marginTop: 10,
  },
  noteText: { flex: 1, fontSize: 11, lineHeight: 16 },
});