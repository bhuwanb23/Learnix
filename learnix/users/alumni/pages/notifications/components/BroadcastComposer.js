/**
 * Broadcast composer (office only).
 *
 * Two honest numbers come out of a send, and both are shown:
 *
 *   delivered — rows actually written
 *   muted     — people who have office broadcasts switched off
 *
 * The old composer reported one number (`recipients`) and claimed it had reached
 * everybody, including people who had muted the category and therefore received
 * nothing. The audience picker and the send history are separate components; this file
 * owns the message, the important flag, and the confirm dialog.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { alumniApi } from '../../../../../services/api';
import { TEMPLATES } from '../notificationsMeta';
import AudiencePicker, { buildAudience } from './AudiencePicker';
import BroadcastHistory from './BroadcastHistory';

export default function BroadcastComposer({ onSent }) {
  const [kind, setKind] = useState('ALL_ALUMNI');
  const [audience, setAudience] = useState({ kind: 'ALL_ALUMNI', value: '', chapterId: '' });
  const [templateKey, setTemplateKey] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    alumniApi
      .broadcastHistory({ limit: 8 })
      .then((d) => setHistory(d?.broadcasts ?? []))
      .catch(() => setHistory([]));
  }, []);

  const refreshHistory = () =>
    alumniApi
      .broadcastHistory({ limit: 8 })
      .then((d) => setHistory(d?.broadcasts ?? []))
      .catch(() => {});

  const applyTemplate = (t) => {
    setTemplateKey(t.key);
    if (!title.trim()) setTitle(t.subject);
    if (!body.trim()) setBody(t.body);
  };

  const needsValue = kind === 'GRADUATION_YEAR' || kind === 'CHAPTER_CITY' || kind === 'CHAPTER_MEMBERS';
  const valueReady =
    !needsValue ||
    (kind === 'GRADUATION_YEAR' && audience.value !== '') ||
    (kind === 'CHAPTER_CITY' && String(audience.value ?? '').trim() !== '') ||
    (kind === 'CHAPTER_MEMBERS' && Boolean(audience.chapterId));

  const canSend = title.trim().length >= 3 && body.trim().length >= 3 && valueReady && !sending;

  const send = () => {
    Alert.alert(
      'Send this broadcast?',
      isImportant
        ? 'It will be pinned to the top of every recipient’s inbox until they read it.'
        : 'Every recipient who has not muted office broadcasts will receive this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const res = await alumniApi.broadcast({
                audience: buildAudience(kind, audience.value, audience.chapterId),
                templateKey,
                title: title.trim(),
                body: body.trim(),
                isImportant,
              });
              setLastResult({ delivered: res.delivered, muted: res.muted });
              setTitle('');
              setBody('');
              setTemplateKey(null);
              setIsImportant(false);
              refreshHistory();
              onSent?.();
            } catch (e) {
              Alert.alert('Could not send', e.message ?? 'Something went wrong.');
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <AudiencePicker
          kind={kind}
          onChange={(k) => {
            setKind(k);
            setAudience((a) => ({ ...buildAudience(k, a.value, a.chapterId), kind: k }));
          }}
          audience={audience}
          onAudienceChange={setAudience}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Message</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => applyTemplate(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: templateKey === t.key }}
              style={[styles.chip, templateKey === t.key && styles.chipActive]}
            >
              <Ionicons
                name={t.icon}
                size={13}
                color={templateKey === t.key ? theme.colors.white : theme.colors.textSecondary}
              />
              <Text style={[styles.chipText, templateKey === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={theme.colors.textLight}
          maxLength={120}
          accessibilityLabel="Broadcast title"
          style={styles.input}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="What do you want to say?"
          placeholderTextColor={theme.colors.textLight}
          multiline
          numberOfLines={4}
          maxLength={2000}
          accessibilityLabel="Broadcast body"
          style={[styles.input, styles.inputMulti]}
        />

        <TouchableOpacity
          onPress={() => setIsImportant((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: isImportant }}
          accessibilityHint="Pins this to the top of each inbox until it is read"
          style={[styles.important, isImportant && styles.importantOn]}
        >
          <Ionicons name="alert-circle" size={15} color={isImportant ? theme.colors.white : theme.colors.error} />
          <View style={styles.importantBody}>
            <Text style={[styles.importantLabel, isImportant && styles.onText]}>Mark as important</Text>
            <Text style={[styles.importantHint, isImportant && styles.onHint]}>
              Pins this to the top of each inbox until it is read.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          style={[styles.send, !canSend && styles.sendOff]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <>
              <Ionicons name="megaphone-outline" size={16} color={theme.colors.white} />
              <Text style={styles.sendText}>Send broadcast</Text>
            </>
          )}
        </TouchableOpacity>

        {lastResult ? (
          <Text style={styles.result}>
            Sent to {lastResult.delivered} {lastResult.delivered === 1 ? 'person' : 'people'}
            {lastResult.muted > 0 ? ` · ${lastResult.muted} had broadcasts muted` : ''}
          </Text>
        ) : null}
      </View>

      <BroadcastHistory broadcasts={history} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: theme.spacing.xl,
  },
  card: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  chipRow: {
    gap: 7,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.white,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13.5,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  inputMulti: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  important: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  importantOn: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  importantBody: {
    flex: 1,
  },
  importantLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  importantHint: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  onText: {
    color: theme.colors.white,
  },
  onHint: {
    color: 'rgba(255,255,255,0.85)',
  },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  sendOff: {
    backgroundColor: theme.colors.textLight,
  },
  sendText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.white,
  },
  result: {
    fontSize: 11.5,
    color: theme.colors.success,
    textAlign: 'center',
    fontWeight: '600',
  },
});