/**
 * Broadcast send history.
 *
 * Without it, re-sending an announcement is the only way to find out whether one went
 * out. Each row names the audience it went to (from the server's structured
 * `audienceJson`) and whether it was flagged important — the two facts you need when
 * somebody asks "did you tell the 2019 batch?" after the fact.
 *
 * Rows written before the audience became a `{ kind, value }` object store the old
 * bespoke shape, which the server returns as `audience: null`; `audienceLabel`
 * renders that as "Unknown audience" rather than pretending it knows.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { audienceLabel } from '../notificationsMeta';

export default function BroadcastHistory({ broadcasts = [] }) {
  if (broadcasts.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Sent recently</Text>
      {broadcasts.map((b) => (
        <View key={b.id} style={styles.row}>
          <Ionicons name="paper-plane-outline" size={13} color={theme.colors.textLight} />
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={1}>
              {b.title}
            </Text>
            <Text style={styles.meta}>
              {audienceLabel(b.audience)}
              {b.isImportant ? ' · important' : ''}
              {b.sentAt
                ? ` · ${new Date(b.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 6,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  meta: {
    fontSize: 11,
    color: theme.colors.textLight,
  },
});