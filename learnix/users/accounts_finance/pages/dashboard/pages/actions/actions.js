// F-11 Dashboard — Quick actions (docs/users/06 §3.11, block 7).
//
// "Add collection, record expense, generate report, send reminder" — four
// actions, and the count beside each is the reason this is a screen rather than
// four buttons in a toolbar.
//
// "Send a reminder" is meaningless without saying how many families would be
// reached, and it is the number the officer most needs BEFORE tapping: the same
// tap that reminds 40 people and the one that reminds 400 are very different
// decisions, and neither is reversible. The count comes from the server, live,
// at the moment this screen opened.
//
// A BLOCKED ACTION IS SHOWN, NOT HIDDEN. It is greyed with its reason in words.
// A tile that is enabled and then refuses to do anything is worse than one that
// says why it cannot, because the first one teaches the user that the screen
// does not know what it is talking about.
//
// Only "send a reminder" can ever be blocked, and only because nobody is late.
// A collection cannot be blocked because nobody owes money: a donation is a real
// collection with no student attached, and a tile that refused would make the
// single most common entry path in the office unusable.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { THEME, GREEN, SLATE, MUTED, rupees } from '../../../dashboardMeta';
import { ActionTile, DashboardEmpty, DashboardScreen, Section, goToRoute, useDashboard } from '../../../dashboardUi';

export default function DashboardActions({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useDashboard(
    () => accountsApi.dashboardActions(),
  );

  const actions = data ?? [];
  const enabled = actions.filter((a) => a.enabled !== false).length;

  return (
    <DashboardScreen
      title="Quick actions"
      subtitle="What each one would act on, counted live as you open this screen."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Available right now</Text>
        <Text style={styles.heroValue}>
          {enabled} of {actions.length}
        </Text>
        <Text style={styles.heroHint}>
          {enabled === actions.length
            ? 'Everything on this list can be used.'
            : 'Anything greyed out says why, in words. A disabled tile is never a dead end — it is a fact about your accounts.'}
        </Text>
      </View>

      <Section title="The four" note={actions.length > 0 ? undefined : 'None published'}>
        {actions.length === 0 ? (
          <DashboardEmpty
            icon="flash-outline"
            title="No actions published"
            subtitle="The server did not return a quick-action list."
          />
        ) : (
          actions.map((a) => (
            <ActionTile
              key={a.id}
              action={a}
              onPress={() => goToRoute(navigation, a.route, a.isTab)}
            />
          ))
        )}
      </Section>

      {/* What "add a collection" would act on, spelled out. The tile says "N
          students owe money", which is a count; this is the list, so a user who
          wants to know whether the number is right can check it. */}
      {actions.length > 0 ? (
        <View style={styles.explain}>
          <Ionicons name="information-circle-outline" size={14} color={SLATE} />
          <View style={styles.explainBody}>
            <Text style={styles.explainTitle}>What the counts mean</Text>
            <Text style={styles.explainText}>
              <Text style={styles.explainStrong}>Add a collection</Text> counts the families with
              an open balance, each once — not the number of bills, so one family owing four fees
              is one person to go and see.
              {'\n'}<Text style={styles.explainStrong}>Record an expense</Text> counts claims
              waiting for your signature. They are not counted as spend until you approve them.
              {'\n'}<Text style={styles.explainStrong}>Generate a report</Text> counts the seven
              reports on the reporting desk. Each exports to Excel, CSV or PDF.
              {'\n'}<Text style={styles.explainStrong}>Send a reminder</Text> counts the families
              with a bill past its due date, worked out from the due date itself rather than a
              stored counter. You will see exactly who would be reached, and why anyone is skipped,
              before anything is sent.
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.footnote}>
        A reminder cannot be unsent, which is why the count is shown first and the dues desk asks
        you to confirm the recipient list before anything goes out. Nothing on this screen writes
        anything by itself.
      </Text>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#eef2f7', padding: 16, marginTop: 4,
  },
  heroLabel: { fontSize: 12, color: SLATE, fontWeight: '600' },
  heroValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  heroHint: { fontSize: 11, color: SLATE, lineHeight: 16, marginTop: 7 },
  explain: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16,
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 13,
  },
  explainBody: { flex: 1 },
  explainTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a', marginBottom: 5 },
  explainText: { fontSize: 11, color: SLATE, lineHeight: 17 },
  explainStrong: { fontWeight: '800', color: '#0f172a' },
  footnote: { fontSize: 10, color: MUTED, marginTop: 18, lineHeight: 15 },
});
