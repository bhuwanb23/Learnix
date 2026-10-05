// F-10 Notifications — the notification desk hub (docs/users/06 §3.9).
//
// What this screen replaced: two tabs. "Inbox" listed the newest 50 rows of
// ANY type the platform had ever written to this officer — a transport DELAY and
// a hostel complaint sat above the fee reminders, every row wearing the same
// blue bell — and tapping ANY row called markAllRead, so reading one message
// meant declaring all of them read. "Broadcast" was a form with no history, so
// an office could send a fee reminder and have no way to prove it.
//
// It is now a hub in the shape of the reports and scholarship desks:
//
//   · the seven categories, each with its LIVE unread count
//   · the four system alerts, computed against the database on every load
//   · compose, and a record of what has already been sent
//
// The category and alert lists are NOT hard-coded. They arrive from
// `/notifications/catalogue` and `/notifications/alerts`, which is where the
// server tells the app each one's id, label, colour and route.
// `notificationsMeta.js` still mirrors the ids because the audit asserts the two
// agree — a category added on one side alone would ship a chip the server
// answers 422.
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { THEME, RED, GREEN, SLATE, MUTED } from './notificationsMeta';
import {
  AlertCard, NotificationEmpty, NotificationScreen, Section, useNotifications,
} from './notificationsUi';

export default function NotificationsModule({ navigation }) {
  const [catalogueError, setCatalogueError] = useState(null);

  const loadCatalogue = useCallback(async () => {
    try {
      setCatalogueError(null);
      return await accountsApi.notificationCatalogue();
    } catch (err) {
      setCatalogueError(err.message);
      return null;
    }
  }, []);

  // The hub opens on three things: the category list, the live alerts, and how
  // much is waiting. The third is a cheap `take: 1` page — the unread total it
  // returns covers the WHOLE inbox, so one row is enough to know the number.
  const catalogue = useNotifications(loadCatalogue);
  const alerts = useNotifications(() => accountsApi.notificationAlerts());
  const inbox = useNotifications(() => accountsApi.notifications({ take: 1 }));

  const reload = useCallback(() => {
    catalogue.reload();
    alerts.reload();
    inbox.reload();
  }, [catalogue, alerts, inbox]);

  const unread = inbox.data?.unread ?? null;
  const outOfScope = inbox.data?.outOfScope ?? 0;

  const categories = catalogue.data?.categories ?? [];
  const audiences = catalogue.data?.audiences ?? [];
  const alertList = alerts.data?.alerts ?? [];
  const firing = alerts.data?.firing ?? 0;
  const total = alerts.data?.total ?? 0;

  return (
    <NotificationScreen
      loading={catalogue.loading && alerts.loading && inbox.loading}
      refreshing={catalogue.refreshing || alerts.refreshing || inbox.refreshing}
      error={catalogue.error ?? alerts.error ?? inbox.error ?? catalogueError}
      onRetry={reload}
      onRefresh={reload}
    >
      {/* The one number the officer opens this screen for. */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Unread messages</Text>
        <Text style={[styles.heroValue, unread > 0 && { color: RED }]}>
          {unread === null ? '—' : unread === 1 ? '1 waiting' : `${unread} waiting`}
        </Text>
        <TouchableOpacity
          style={styles.heroLink}
          activeOpacity={0.8}
          onPress={() => navigation.openModule('NotificationInbox')}
          accessibilityRole="button"
        >
          <Text style={styles.heroLinkText}>Open the inbox</Text>
          <Ionicons name="arrow-forward" size={14} color={THEME} />
        </TouchableOpacity>
        {outOfScope > 0 ? (
          <Text style={styles.heroScope}>
            {outOfScope} message{outOfScope === 1 ? '' : 's'} from other modules {outOfScope === 1 ? 'is' : 'are'}
            filtered out of this desk.
          </Text>
        ) : null}
      </View>

      {/* What needs attention, computed live. Zero is drawn with a tick: an alert
          kind that is clear is a good result. */}
      <Section
        title="Financial alerts"
        note={firing > 0 ? `${total} to look at` : 'All clear'}
      >
        {alertList.length === 0 ? (
          <NotificationEmpty
            icon="shield-checkmark-outline"
            title="No alerts published"
            subtitle="The server did not return any alert kinds."
          />
        ) : (
          alertList.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              onPress={() => navigation.openModule('NotificationAlerts', { kind: a.id })}
            />
          ))
        )}
      </Section>

      {/* The seven kinds of message this desk answers for. The list comes from
          the server so a new category cannot go missing here. */}
      <Section title="Categories" note="Open the inbox filtered">
        {categories.length === 0 ? (
          <NotificationEmpty
            icon="file-tray-outline"
            title="No categories published"
            subtitle="The server did not return a notification catalogue."
          />
        ) : (
          <View style={styles.catGrid}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.catCard}
                activeOpacity={0.8}
                onPress={() => navigation.openModule('NotificationInbox', { category: c.id })}
                accessibilityRole="button"
                accessibilityLabel={c.label}
              >
                <View style={[styles.catIcon, { backgroundColor: `${c.color}14` }]}>
                  <Ionicons name={c.icon} size={17} color={c.color} />
                </View>
                <Text style={styles.catLabel} numberOfLines={2}>{c.label}</Text>
                <Text style={styles.catBlurb} numberOfLines={2}>{c.blurb}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Section>

      {/* Compose is here, not buried: an announcement IS an accounts action. */}
      <Section title="Send an announcement" note="To a group you choose">
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => navigation.openModule('NotificationCompose')}
          accessibilityRole="button"
        >
          <View style={styles.actionIcon}>
            <Ionicons name="megaphone-outline" size={18} color={THEME} />
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionLabel}>Compose a broadcast</Text>
            <Text style={styles.actionBlurb}>
              Fee reminders, deadline notices and office announcements.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => navigation.openModule('NotificationHistory')}
          accessibilityRole="button"
        >
          <View style={styles.actionIcon}>
            <Ionicons name="time-outline" size={18} color={SLATE} />
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionLabel}>Send history</Text>
            <Text style={styles.actionBlurb}>
              What this office has sent, to whom, and how many people it reached.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        </TouchableOpacity>
      </Section>

      {/* The audience sizes are live and come from the server, so an officer sees
          "Defaulters (24)" before composing rather than after sending to nobody. */}
      {audiences.length > 0 ? (
        <Text style={styles.footnote}>
          {audiences.map((a) => `${a.label} (${a.recipientCount})`).join('  ·  ')}
          {'\n'}Defaulters means a bill at least {catalogue.data?.defaulterMinDays ?? 7} days past its due
          date, worked out from the due date itself rather than a stored counter that can drift.
        </Text>
      ) : null}

      <Text style={styles.footnote}>
        Messages from other modules — transport, hostel, grades — are not shown here.
        They stay in their own screens, and the inbox reports how many were filtered out so a
        message you remember is never simply lost.
      </Text>
    </NotificationScreen>
  );
}

export { RED, GREEN };

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 16, marginBottom: 4,
  },
  heroLabel: { fontSize: 12, color: SLATE, fontWeight: '600' },
  heroValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  heroLinkText: { fontSize: 12, fontWeight: '700', color: THEME },
  heroScope: { fontSize: 10, color: MUTED, lineHeight: 15, marginTop: 9 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  catCard: {
    width: '48.5%', backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#eef2f7', padding: 12,
  },
  catIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  catBlurb: { fontSize: 10, color: SLATE, lineHeight: 14, marginTop: 3 },

  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1, borderColor: '#eef2f7', padding: 13, marginBottom: 9,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: `${THEME}14`, alignItems: 'center', justifyContent: 'center' },
  actionBody: { flex: 1 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  actionBlurb: { fontSize: 11, color: SLATE, lineHeight: 15, marginTop: 2 },

  footnote: { fontSize: 10, color: MUTED, lineHeight: 15, marginTop: 16 },
});