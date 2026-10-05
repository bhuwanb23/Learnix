// F-10 Notifications — the system-generated financial alerts (docs/users/06 §3.9).
//
// These four are COMPUTED on every load, not stored. That is the whole design:
// a stored alert goes stale the moment somebody fixes the problem and then has to
// be dismissed by hand, so an office ends up with forty amber rows describing
// problems that no longer exist. Here the alert disappears the instant it is
// fixed, because there is nothing stored to go stale.
//
// The four questions, all answerable right now from live rows:
//
//   BUDGET_OVERRUN         — approved spend past the plan, per budget line
//   PAYROLL_UNFOOTED       — a run header that disagrees with its own payslips
//   SCHOLARSHIP_UNRELEASED — money promised to a student and not yet paid out
//   UNALLOCATED_RECEIPTS   — money received that no bill has been matched to
//
// Each alert names the screen that fixes it, and that screen is a real key in
// FEATURE_MODULES — `audit-notifications-ui.ts` asserts it, so an alert can never
// point at a route that opens a blank page.
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { THEME, GREEN, SLATE, MUTED, RED, rupees, timeAgo } from '../../notificationsMeta';
import {
  AlertCard, NotificationEmpty, NotificationScreen, Section, useNotifications,
} from '../../notificationsUi';

export default function NotificationAlerts({ route, navigation }) {
  // The hub opens this screen focused on whichever alert the officer tapped.
  const [kind, setKind] = useState(route?.params?.kind ?? null);

  const { data, loading, refreshing, error, reload, onRefresh } =
    useNotifications(() => accountsApi.notificationAlerts());

  const alerts = data?.alerts ?? [];
  const firing = data?.firing ?? 0;
  const total = data?.total ?? 0;
  const focused = kind ? alerts.find((a) => a.id === kind) : null;
  const shown = kind ? (focused ? [focused] : []) : alerts;

  /**
   * An alert's `route` is either a SUB-SCREEN or a bottom-nav TAB, and the two
   * are reached differently: `openModule` sets the current screen, while a tab
   * has to go through `switchTab` (which also resets the sub-screen stack).
   *
   * Calling openModule with a tab name opens NOTHING — that key is not in
   * FEATURE_MODULES, so `renderContent` falls through to the tab switcher and the
   * officer lands back on the tab they started from, with no error anywhere.
   * TAB_ROUTES below is the list that makes the difference explicit rather than
   * accidental.
   */
  const TAB_ROUTES = ['Dashboard', 'Collections', 'Dues', 'Payroll', 'Profile'];
  const goToRoute = useCallback((route) => {
    if (!route) return;
    if (TAB_ROUTES.includes(route)) navigation.switchTab(route);
    else navigation.openModule(route, {});
  }, [navigation]);

  const openAlert = useCallback((a) => {
    // An alert with a route goes where the problem can be fixed; one without
    // just expands here.
    if (a.route) goToRoute(a.route);
    else setKind(a.id);
  }, [goToRoute]);

  return (
    <NotificationScreen
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Financial alerts</Text>
        <Text style={[styles.heroValue, firing > 0 && { color: RED }]}>
          {firing === 0 ? 'All clear' : `${firing} of ${alerts.length} firing`}
        </Text>
        <Text style={styles.heroHint}>
          {firing === 0
            ? 'Every budget, payroll run, scholarship award and receipt adds up.'
            : `${total} item${total === 1 ? '' : 's'} need a decision. These are worked out from live data each time you open this screen, so a fixed problem disappears on its own.`}
        </Text>
      </View>

      {kind ? (
        <TouchableOpacity
          style={styles.back}
          onPress={() => setKind(null)}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={14} color={THEME} />
          <Text style={styles.backText}>All four alerts</Text>
        </TouchableOpacity>
      ) : null}

      <Section title={kind ? focused?.label ?? 'Alert' : 'What the system is watching'}>
        {shown.length === 0 ? (
          <NotificationEmpty
            icon="shield-checkmark-outline"
            title="No alerts to show"
            subtitle="The server did not return any alert kinds."
          />
        ) : (
          shown.map((a) => (
            <AlertCard key={a.id} alert={a} onPress={() => openAlert(a)} />
          ))
        )}
      </Section>

      {shown.map((a) => (
        <Section key={`${a.id}-items`} title={a.label} note={`${a.count} found`}>
          <AlertDetail alert={a} />
        </Section>
      ))}

      <Text style={styles.footnote}>
        Nothing here is stored. Each alert is a question the database can answer right now, which is
        why a problem that has been fixed stops being reported without anybody dismissing it, and why
        an alert can never be read twice or left behind.
      </Text>
    </NotificationScreen>
  );
}

/**
 * The rows behind one alert.
 *
 * Each of the four carries a different shape, so they are rendered by kind rather
 * than through one generic list. A generic list would need every row to have the
 * same keys, and the two or three that did would print "undefined" in a column
 * labelled "amount".
 */
function AlertDetail({ alert }) {
  const items = Array.isArray(alert.items) ? alert.items : [];

  if (items.length === 0) {
    return (
      <View style={styles.clearCard}>
        <Ionicons name="checkmark-circle-outline" size={20} color={GREEN} />
        <View style={styles.clearBody}>
          <Text style={styles.clearTitle}>Nothing to fix</Text>
          <Text style={styles.clearText}>{alert.blurb}</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {items.slice(0, 20).map((item, i) => (
        <View key={item.budgetId ?? item.runId ?? item.applicationId ?? item.paymentId ?? i} style={styles.item}>
          <Text style={styles.itemTitle} numberOfLines={1}>{titleFor(alert.id, item)}</Text>
          <Text style={styles.itemSub} numberOfLines={2}>{subtitleFor(alert.id, item)}</Text>
          <View style={styles.itemFoot}>
            <Text style={styles.itemAmount}>{amountFor(alert.id, item)}</Text>
            {footerFor(alert.id, item) ? (
              <Text style={styles.itemFoot2}>{footerFor(alert.id, item)}</Text>
            ) : null}
          </View>
        </View>
      ))}
      {items.length > 20 ? (
        <Text style={styles.moreNote}>
          and {items.length - 20} more — open the linked screen to see them all.
        </Text>
      ) : null}
    </View>
  );
}

const titleFor = (kind, i) => {
  switch (kind) {
    case 'BUDGET_OVERRUN': return i.category;
    case 'PAYROLL_UNFOOTED': return `Payroll run ${i.month}`;
    case 'SCHOLARSHIP_UNRELEASED': return i.scheme;
    default: return i.referenceNo ?? 'Payment';
  }
};

const subtitleFor = (kind, i) => {
  switch (kind) {
    case 'BUDGET_OVERRUN':
      return `FY ${i.fiscalYear} — planned ${rupees(i.plannedRupees)}, spent ${rupees(i.spentRupees)}`;
    case 'PAYROLL_UNFOOTED':
      return `Header says ${rupees(i.headerNetRupees)}, payslips add up to ${rupees(i.entryNetRupees)} — ${i.status}`;
    case 'SCHOLARSHIP_UNRELEASED':
      return `${i.student} (${i.rollNo}) — approved ${rupees(i.approvedRupees)}`;
    default:
      return `Received ${timeAgo(i.receivedAt)} and not yet matched to any bill`;
  }
};

const amountFor = (kind, i) => {
  switch (kind) {
    case 'BUDGET_OVERRUN': return `Over by ${rupees(i.overRupees)}`;
    case 'PAYROLL_UNFOOTED': return `Off by ${rupees(Math.abs(i.differenceRupees))}`;
    case 'SCHOLARSHIP_UNRELEASED': return `${rupees(i.outstandingRupees)} unreleased`;
    default: return `${rupees(i.unallocatedRupees)} unallocated`;
  }
};

const footerFor = (kind, i) => {
  if (kind === 'BUDGET_OVERRUN') return i.percent === null ? null : `${i.percent}% of plan`;
  if (kind === 'SCHOLARSHIP_UNRELEASED' && i.daysWaiting !== null && i.daysWaiting !== undefined) {
    return `Waiting ${i.daysWaiting} day${i.daysWaiting === 1 ? '' : 's'}`;
  }
  if (kind === 'UNALLOCATED_RECEIPTS') return `of ${rupees(i.amountRupees)} received`;
  return null;
};

export { MUTED, SLATE };

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 16,
  },
  heroLabel: { fontSize: 12, color: SLATE, fontWeight: '600' },
  heroValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  heroHint: { fontSize: 11, color: SLATE, lineHeight: 16, marginTop: 8 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  backText: { fontSize: 12, fontWeight: '700', color: THEME },

  clearCard: {
    flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1, borderColor: '#eef2f7', padding: 13,
  },
  clearBody: { flex: 1 },
  clearTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  clearText: { fontSize: 11, color: SLATE, lineHeight: 15, marginTop: 2 },

  item: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 13, marginBottom: 9,
  },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  itemSub: { fontSize: 11, color: SLATE, lineHeight: 16, marginTop: 3 },
  itemFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  itemAmount: { fontSize: 12, fontWeight: '800', color: RED },
  itemFoot2: { fontSize: 10, color: MUTED },
  moreNote: { fontSize: 10, color: MUTED, marginTop: 2 },

  footnote: { fontSize: 10, color: MUTED, lineHeight: 15, marginTop: 16 },
});