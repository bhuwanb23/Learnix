// F-10 Notifications — what this office has sent (docs/users/06 §3.9).
//
// This screen did not exist at all. The old broadcast form could send a fee
// reminder and left no record the office could show anybody: no history, no
// audience, no sender, no date. When a family says they were never told, the
// answer was "it must have gone out" — which is not an answer.
//
// Every row here comes from a real `Broadcast` row, so this is a record rather
// than a local log. `audienceLabel` is resolved server-side, and a row whose
// stored audience string cannot be parsed still appears with a readable label
// rather than disappearing from the history.
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { THEME, SLATE, MUTED } from '../../notificationsMeta';
import {
  NotificationEmpty, NotificationScreen, Section, useNotifications,
} from '../../notificationsUi';

export default function NotificationHistory({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useNotifications(
    () => accountsApi.broadcasts({ take: 30 }),
  );

  const rows = data?.broadcasts ?? [];

  return (
    <NotificationScreen
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Send history</Text>
        <Text style={styles.heroValue}>
          {rows.length === 1 ? '1 announcement' : `${rows.length} announcements`}
        </Text>
        <Text style={styles.heroHint}>
          What this office has sent, to whom, and who sent it. An announcement a family disputes can
          be shown here.
        </Text>
      </View>

      <Section title="Recent" note="Newest first">
        {rows.length === 0 ? (
          <NotificationEmpty
            icon="megaphone-outline"
            title="Nothing sent yet"
            subtitle="When you broadcast a fee reminder or an office announcement, it is recorded here."
          />
        ) : (
          rows.map((b) => (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.icon}>
                  <Ionicons name="megaphone-outline" size={16} color={THEME} />
                </View>
                <Text style={styles.title} numberOfLines={2}>{b.title}</Text>
              </View>
              <Text style={styles.body} numberOfLines={3}>{b.body}</Text>
              <View style={styles.foot}>
                <View style={styles.footChip}>
                  <Text style={styles.footChipText}>{b.audienceLabel}</Text>
                </View>
                <Text style={styles.footText} numberOfLines={1}>
                  {b.sentBy} · {new Date(b.sentAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          ))
        )}
      </Section>

      <TouchableOpacity
        style={styles.composeLink}
        onPress={() => navigation.openModule('NotificationCompose')}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Ionicons name="create-outline" size={16} color={THEME} />
        <Text style={styles.composeText}>Compose another announcement</Text>
      </TouchableOpacity>

      <Text style={styles.footnote}>
        Only this institution's announcements are listed. Each one was delivered in-app and appears
        in the recipients' inboxes as an Announcement.
      </Text>
    </NotificationScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 16,
  },
  heroLabel: { fontSize: 12, color: SLATE, fontWeight: '600' },
  heroValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  heroHint: { fontSize: 11, color: SLATE, lineHeight: 16, marginTop: 8 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 13, marginBottom: 9,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  icon: { width: 30, height: 30, borderRadius: 10, backgroundColor: `${THEME}14`, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  body: { fontSize: 11, color: SLATE, lineHeight: 16, marginTop: 7 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  footChip: { backgroundColor: '#f1f5f9', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  footChipText: { fontSize: 10, fontWeight: '700', color: SLATE },
  footText: { flex: 1, fontSize: 10, color: MUTED },

  composeLink: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, justifyContent: 'center' },
  composeText: { fontSize: 12, fontWeight: '700', color: THEME },
  footnote: { fontSize: 10, color: MUTED, lineHeight: 15, marginTop: 16 },
});