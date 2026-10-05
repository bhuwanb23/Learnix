// F-11 Dashboard — the pieces every dashboard screen shares (docs/users/06 §3.11).
//
// Eight screens: the hub and seven block sub-screens. They share one shell, one
// fetch hook, one stat grid and one bar row, and the reason they must is not
// tidiness. Two of them are load-bearing:
//
//   1. `goToRoute` decides between `switchTab` and `openModule`. A block's
//      `route` may be a bottom-nav TAB or a sub-SCREEN, and they are reached by
//      different calls. Passing a tab name to `openModule` finds no such key in
//      FEATURE_MODULES, `renderContent` falls through to the tab switcher, and
//      the officer lands back on the dashboard with no error anywhere — the
//      exact silent failure the notification alerts screen had to work around
//      with its own hand-written TAB_ROUTES list. Here the distinction is
//      published BY THE SERVER on every route and consumed in one place, so a
//      new block cannot get it wrong.
//
//   2. The bar width is clamped and the NUMBER IS NOT. The old screen clamped
//      utilisation itself, so a budget at 180% of plan drew a full bar and
//      printed "100%". Clamping belongs at draw time, where a pixel width is the
//      only thing at stake; the figure itself has to stay honest.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import { THEME, RED, GREEN, AMBER, SLATE, MUTED, TONE_COLOR, SPEND_COLOR, barWidth } from './dashboardMeta';

/**
 * The bottom-nav tabs.
 *
 * Declared HERE, in the one place that navigates, rather than in each screen.
 * A screen that navigates needs to know the difference; a screen that only draws
 * does not. The audit asserts every published `isTab: true` route is a real tab,
 * so this list and the server's flag cannot disagree.
 */
export const TAB_ROUTES = ['Dashboard', 'Collections', 'Dues', 'Payroll', 'Profile'];

/**
 * Go where a published route points.
 *
 * A TAB goes through `switchTab` (which also resets the sub-screen stack); a
 * SUB-SCREEN goes through `openModule`. Getting this backwards is silent, which
 * is exactly why it is written once, here, rather than in nine call sites.
 */
export function goToRoute(navigation, route, isTab, params) {
  if (!route) return;
  if (isTab && TAB_ROUTES.includes(route)) navigation.switchTab(route);
  else navigation.openModule(route, params || {});
}

/** Fetch-on-mount plus pull-to-refresh. Returns `reload` for after an action. */
export function useDashboard(fetcher, deps = []) {
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
 * The error is shown IN PLACE of the content rather than as a toast. A
 * dashboard that fails quietly and shows zeros is the most dangerous screen in
 * the app — "₹0 outstanding" and "₹0 because the request failed" look identical,
 * and the first one is read out in a meeting.
 */
export function DashboardScreen({
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
        <Text style={styles.errorText}>{error || 'The dashboard could not be loaded.'}</Text>
        <Text style={styles.errorHint}>
          These figures are not shown rather than shown as zero — a failed request
          must never look like a settled account.
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

/**
 * A card of headline figures.
 *
 * `tone` colours the VALUE, never the card. A red card holding a number is a
 * different claim from a red number on a white card, and the dashboard makes
 * that claim about money often enough that the distinction has to hold.
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
 * A bar row for a spend-against-plan figure.
 *
 * The bar is clamped to the track; `display` is the UNCLAMPED number, passed in
 * by the caller from the server's own figure. That is the whole point of the
 * component existing separately from the tone rule: `barWidth` is a pixel
 * concern, `spendTone` is a judgement, and neither is allowed to alter the
 * figure the officer reads.
 */
export function SpendBar({ label, percent, display, sublabel, over }) {
  const tone = percent === null || percent === undefined ? 'under'
    : Number(percent) > 100 ? 'over' : Number(percent) >= 80 ? 'near' : 'under';
  return (
    <View style={styles.barRow}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
        <Text style={[styles.barValue, { color: tone === 'under' ? '#0f172a' : SPEND_COLOR[tone] }]}>
          {display}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: barWidth(percent), backgroundColor: SPEND_COLOR[tone] }]} />
      </View>
      {over ? <Text style={styles.barOver}>Over the amount planned for this line</Text> : null}
      {sublabel ? <Text style={styles.barSub}>{sublabel}</Text> : null}
    </View>
  );
}

/**
 * One alert kind.
 *
 * A CLEAR alert draws a tick in green, never the alarm icon in amber. An alert
 * list where "0 problems" is painted as a problem is a screen whose colours
 * stop meaning anything, and the officer is the one who pays for that.
 */
export function AlertRow({ alert, onPress }) {
  const tone = alert.count > 0 ? TONE_COLOR[alert.tone] : TONE_COLOR.clear;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.alertRow, alert.count > 0 && styles.alertRowFiring]}
      accessibilityRole="button"
      accessibilityLabel={`${alert.label}, ${alert.count === 0 ? 'clear' : `${alert.count} found`}`}
    >
      <View style={[styles.alertIcon, { backgroundColor: `${tone}14` }]}>
        <Ionicons
          name={alert.count > 0 ? alert.icon : 'checkmark-circle-outline'}
          size={18}
          color={tone}
        />
      </View>
      <View style={styles.alertBody}>
        <Text style={styles.alertLabel}>{alert.label}</Text>
        <Text style={styles.alertBlurb} numberOfLines={2}>{alert.blurb}</Text>
      </View>
      <View style={styles.alertCountWrap}>
        <Text style={[styles.alertCount, { color: tone }]}>{alert.count}</Text>
        {alert.count > 0 ? <Ionicons name="chevron-forward" size={15} color={MUTED} /> : null}
      </View>
    </TouchableOpacity>
  );
}

/** The family header above a group of alert kinds. */
export function FamilyHeader({ family, count }) {
  return (
    <View style={styles.familyHead}>
      <View style={[styles.familyIcon, { backgroundColor: `${family.color}14` }]}>
        <Ionicons name={family.icon} size={15} color={family.color} />
      </View>
      <View style={styles.familyBody}>
        <Text style={styles.familyLabel}>{family.label}</Text>
        <Text style={styles.familyBlurb}>{family.blurb}</Text>
      </View>
      <Text style={[styles.familyCount, { color: count > 0 ? family.color : GREEN }]}>
        {count === 0 ? 'clear' : count}
      </Text>
    </View>
  );
}

/**
 * A quick action.
 *
 * The COUNT is the reason this component exists. "Send a reminder" is
 * meaningless without saying how many families would be reached, and it is the
 * number the officer most needs BEFORE tapping — because reminding 40 people and
 * reminding 400 are very different decisions.
 *
 * A blocked action is drawn greyed with its reason IN WORDS. It is never hidden
 * and never silently inert: a tile that is enabled and then refuses is worse than
 * one that says why it cannot.
 */
export function ActionTile({ action, onPress }) {
  const enabled = action.enabled !== false;
  const color = enabled ? action.color : MUTED;
  return (
    <TouchableOpacity
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      activeOpacity={0.8}
      style={[styles.action, !enabled && styles.actionBlocked]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      accessibilityLabel={`${action.label}. ${action.countLabel ?? ''}. ${action.blockedReason ?? ''}`}
    >
      <View style={[styles.actionIcon, { backgroundColor: enabled ? `${color}14` : '#f1f5f9' }]}>
        <Ionicons name={action.icon} size={20} color={color} />
      </View>
      <View style={styles.actionBody}>
        <Text style={[styles.actionLabel, !enabled && styles.actionLabelBlocked]}>{action.label}</Text>
        <Text style={styles.actionBlurb} numberOfLines={2}>{action.blurb}</Text>
        <Text style={[styles.actionCount, { color: enabled ? color : MUTED }]}>
          {action.countLabel ?? ''}
        </Text>
        {action.blockedReason ? (
          <Text style={styles.actionBlockedReason}>{action.blockedReason}</Text>
        ) : null}
      </View>
      {enabled ? <Ionicons name="chevron-forward" size={18} color={MUTED} /> : null}
    </TouchableOpacity>
  );
}

/**
 * A block card on the hub — the seven things the screen answers.
 *
 * `onPress` is always supplied by the caller, which resolves the route through
 * `goToRoute`. A card that cannot be opened is not drawn.
 */
export function BlockCard({ block, children, onPress, badge }) {
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
        {badge !== undefined && badge !== null ? (
          <View style={[styles.blockBadge, badge > 0 && { backgroundColor: RED }]}>
            <Text style={[styles.blockBadgeText, badge > 0 && { color: '#fff' }]}>{badge}</Text>
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
 * An empty state phrased for the dashboard.
 *
 * Never a bare "no data". The question an officer has is WHY there is nothing,
 * and "nothing has happened" and "you are looking at a filter that excludes
 * everything" are different situations.
 */
export function DashboardEmpty({ icon = 'stats-chart-outline', title, subtitle }) {
  return <EmptyState icon={icon} title={title} subtitle={subtitle} />;
}

export { AnimatedCardSafe };

// `AnimatedCard` is re-exported for screens that want the fade-in, but the
// dashboard does not use it for the hero: the hero's job is to be legible
// instantly on a screen an officer opens dozens of times a day, and an animation
// on it costs a frame every single time.
function AnimatedCardSafe({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  wrap: { flex: 1, backgroundColor: '#f5f7f9', padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f7f9' },
  errorText: { marginTop: 12, color: RED, textAlign: 'center', fontSize: 13 },
  errorHint: { marginTop: 8, color: MUTED, textAlign: 'center', fontSize: 11, lineHeight: 16 },
  retry: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },

  screenTitle: { fontSize: 19, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4 },
  screenSubtitle: { fontSize: 11, color: SLATE, marginTop: 3, lineHeight: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 15, marginTop: 12 },

  section: { marginTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sectionNote: { fontSize: 10, color: MUTED, flex: 1, textAlign: 'right' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', paddingVertical: 8, paddingRight: 10 },
  cellLabel: { fontSize: 10, color: SLATE },
  cellValue: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  cellHint: { fontSize: 10, color: MUTED, marginTop: 1 },

  barRow: { marginBottom: 12 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a', flex: 1, marginRight: 8 },
  barValue: { fontSize: 12, fontWeight: '800' },
  barTrack: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', overflow: 'hidden', marginTop: 5 },
  barFill: { height: 7, borderRadius: 4 },
  barOver: { fontSize: 10, color: RED, fontWeight: '700', marginTop: 4 },
  barSub: { fontSize: 10, color: MUTED, marginTop: 3 },

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
    backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
  },
  blockBadgeText: { fontSize: 10, fontWeight: '700', color: SLATE },

  figureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  figureBody: { flex: 1, marginRight: 10 },
  figureLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  figureSub: { fontSize: 10, color: SLATE, marginTop: 2, lineHeight: 14 },
  figureValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  familyHead: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 12, marginTop: 10, marginBottom: 8,
  },
  familyIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  familyBody: { flex: 1 },
  familyLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  familyBlurb: { fontSize: 10, color: SLATE, marginTop: 1, lineHeight: 14 },
  familyCount: { fontSize: 13, fontWeight: '800' },

  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 12, marginBottom: 8,
  },
  alertRowFiring: { borderColor: '#fecaca' },
  alertIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  alertBody: { flex: 1 },
  alertLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  alertBlurb: { fontSize: 10, color: SLATE, marginTop: 2, lineHeight: 14 },
  alertCountWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertCount: { fontSize: 17, fontWeight: '800' },

  action: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#eef2f7', padding: 14, marginBottom: 10,
  },
  actionBlocked: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  actionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionBody: { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  actionLabelBlocked: { color: MUTED },
  actionBlurb: { fontSize: 11, color: SLATE, marginTop: 2, lineHeight: 15 },
  actionCount: { fontSize: 11, fontWeight: '700', marginTop: 5 },
  actionBlockedReason: { fontSize: 10, color: MUTED, marginTop: 5, lineHeight: 14, fontStyle: 'italic' },
});
