// F-10 Notifications — compose an announcement (docs/users/06 §3.9).
//
// Two things this screen does that the old broadcast form did not:
//
//   1. It shows the RECIPIENT COUNT for each audience before the officer writes
//      anything. "Defaulters (0)" is the difference between composing a fee
//      reminder and sending one to nobody and finding out afterwards. The count
//      is live, from `/notifications/catalogue`.
//
//   2. It confirms what actually happened: the number of people reached, from
//      the response, rather than a hard-coded "Broadcast sent".
//
// The audience is resolved server-side and scoped to this institution for every
// branch. The old `DEFAULTERS` branch had no institution filter at all, which
// meant one college's fee reminder was delivered to every college's defaulters
// on the instance — a bug no amount of care in this file could have prevented,
// and the reason the count is shown rather than trusted.
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { THEME, SLATE, MUTED, RED, GREEN } from '../../notificationsMeta';
import {
  NotificationEmpty, NotificationScreen, Section, useNotifications,
} from '../../notificationsUi';

const TITLE_MAX = 120;
const BODY_MAX = 2000;

export default function NotificationCompose({ navigation }) {
  const [audience, setAudience] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  const { data, loading, refreshing, error, reload, onRefresh } = useNotifications(
    () => accountsApi.notificationCatalogue(),
  );

  const audiences = data?.audiences ?? [];
  // Default to the first audience once the catalogue arrives, so the officer is
  // never looking at a form with nothing selected.
  const chosen = audience ?? audiences[0]?.id ?? null;
  const chosenMeta = audiences.find((a) => a.id === chosen) ?? null;

  const titleError = title.length > 0 && title.trim().length < 2;
  const bodyError = body.length > 0 && body.trim().length < 2;
  const canSend = title.trim().length >= 2 && body.trim().length >= 2 && !!chosen && !sending;

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await accountsApi.broadcast({
        audience: chosen,
        title: title.trim(),
        body: body.trim(),
      });
      setSent(res);
      setTitle('');
      setBody('');
    } catch (err) {
      // A rejected send is shown as-is. The server's `.strict()` schema means a
      // 400 here is a real problem with what was typed, and swallowing it into a
      // generic "something went wrong" is how a broadcast goes out half-empty.
      Alert.alert('Could not send that', err.message);
    } finally {
      setSending(false);
    }
  }, [canSend, chosen, title, body]);

  return (
    <NotificationScreen
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      {sent ? (
        <View style={styles.sentBanner}>
          <Ionicons name="checkmark-circle" size={19} color={GREEN} />
          <View style={styles.sentBody}>
            <Text style={styles.sentTitle}>
              Sent to {sent.recipients} {sent.recipients === 1 ? 'person' : 'people'}
            </Text>
            <Text style={styles.sentText}>
              {sent.audienceLabel} · "{sent.title}"
              {sent.refreshedDues ? ` · ${sent.refreshedDues} overdue counts refreshed` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      <Section title="Audience" note="Who receives this">
        {audiences.length === 0 ? (
          <NotificationEmpty
            icon="people-outline"
            title="No audiences available"
            subtitle="The server did not return an audience list."
          />
        ) : (
          <View>
            {audiences.map((a) => {
              const active = a.id === chosen;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.aud, active && styles.audActive]}
                  onPress={() => setAudience(a.id)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${a.label}, ${a.recipientCount} recipients`}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={17}
                    color={active ? THEME : MUTED}
                  />
                  <View style={styles.audBody}>
                    <View style={styles.audHead}>
                      <Text style={styles.audLabel}>{a.label}</Text>
                      <Text style={[styles.audCount, a.recipientCount === 0 && styles.audCountZero]}>
                        {a.recipientCount}
                      </Text>
                    </View>
                    <Text style={styles.audHint}>{a.hint}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {chosenMeta?.recipientCount === 0 ? (
              <Text style={styles.zeroWarn}>
                This audience is empty right now, so sending reaches nobody.
              </Text>
            ) : null}
          </View>
        )}
      </Section>

      <Section title="Message">
        <Text style={styles.fieldLabel}>Subject</Text>
        <View style={[styles.inputWrap, titleError && styles.inputError]}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Last date for fee payment without late fee"
            placeholderTextColor={MUTED}
            maxLength={TITLE_MAX}
            accessibilityLabel="Subject"
          />
          <Text style={styles.counter}>{title.length}/{TITLE_MAX}</Text>
        </View>
        {titleError ? <Text style={styles.errorText}>A subject needs at least two characters.</Text> : null}

        <Text style={styles.fieldLabel}>Message</Text>
        <View style={[styles.inputWrap, styles.textAreaWrap, bodyError && styles.inputError]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={body}
            onChangeText={setBody}
            placeholder="What does the reader need to know, and by when?"
            placeholderTextColor={MUTED}
            multiline
            maxLength={BODY_MAX}
            accessibilityLabel="Message"
          />
          <Text style={styles.counter}>{body.length}/{BODY_MAX}</Text>
        </View>
        {bodyError ? <Text style={styles.errorText}>A message needs at least two characters.</Text> : null}
      </Section>

      <TouchableOpacity
        style={[styles.send, (!canSend || chosenMeta?.recipientCount === 0) && styles.sendDisabled]}
        onPress={send}
        activeOpacity={0.85}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
      >
        <Ionicons name="send" size={16} color="#fff" />
        <Text style={styles.sendText}>
          {sending
            ? 'Sending…'
            : chosenMeta
              ? `Send to ${chosenMeta.recipientCount} ${chosenMeta.recipientCount === 1 ? 'person' : 'people'}`
              : 'Send'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => navigation.openModule('NotificationHistory')}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Ionicons name="time-outline" size={15} color={THEME} />
        <Text style={styles.historyText}>See what this office has sent before</Text>
      </TouchableOpacity>

      <Text style={styles.footnote}>
        An announcement is delivered in-app and appears in each recipient's notifications as an
        Announcement. Recipients are resolved server-side and are always drawn from this institution
        only.
        {chosenMeta?.needsBalance
          ? ` Defaulters here means a bill at least ${data?.defaulterMinDays ?? 7} days past its due date, worked out from the due date itself.`
          : ''}
      </Text>
    </NotificationScreen>
  );
}

export { RED, SLATE };

const styles = StyleSheet.create({
  sentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: `${GREEN}12`,
    borderRadius: 12, borderWidth: 1, borderColor: `${GREEN}33`, padding: 13, marginBottom: 4,
  },
  sentBody: { flex: 1 },
  sentTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  sentText: { fontSize: 10, color: SLATE, lineHeight: 15, marginTop: 2 },

  aud: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 13, marginBottom: 8,
  },
  audActive: { borderColor: THEME, backgroundColor: '#f8faff' },
  audBody: { flex: 1 },
  audHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  audLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  audCount: { fontSize: 14, fontWeight: '800', color: THEME },
  audCountZero: { color: RED },
  audHint: { fontSize: 11, color: SLATE, lineHeight: 15, marginTop: 3 },
  zeroWarn: { fontSize: 10, color: RED, marginTop: 2, marginBottom: 4 },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: SLATE, marginBottom: 6, marginTop: 10 },
  inputWrap: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 13, paddingVertical: 4,
  },
  inputError: { borderColor: RED },
  input: { fontSize: 13, color: '#0f172a', minHeight: 42, paddingVertical: 8 },
  textAreaWrap: { paddingVertical: 4 },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  counter: { fontSize: 9, color: MUTED, textAlign: 'right', paddingBottom: 6 },
  errorText: { fontSize: 10, color: RED, marginTop: 4 },

  send: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, marginTop: 18,
  },
  sendDisabled: { backgroundColor: '#cbd5e1' },
  sendText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'center' },
  historyText: { fontSize: 12, fontWeight: '700', color: THEME },

  footnote: { fontSize: 10, color: MUTED, lineHeight: 15, marginTop: 16 },
});