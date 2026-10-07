/**
 * Network Highlights — who is new, and who you might want to know.
 *
 * THE TWO LISTS ANSWER DIFFERENT QUESTIONS
 * ----------------------------------------
 * "New alumni" is ordered by `createdAt`, NOT by the directory's `sort=recent`, which
 * sorts on `updatedAt`. A profile edited last week outranks one registered last month, and
 * labelling that list "who's new" would be wrong. The server orders the join date
 * deliberately; this card just reports it.
 *
 * Suggestions carry their own `reasons`, because "we think you should meet" is not
 * actionable and "3 shared skills · same batch · both in Bengaluru" is. The scorer is
 * deliberately a transparent function for exactly that reason, and throwing the reasons
 * away at the last screen would waste the only part a graduate can argue with.
 *
 * THE CALLER IS EXCLUDED FROM "NEW ALUMNI"
 * ---------------------------------------
 * The server excludes them. Nobody wants a "welcome to the network" row naming themselves,
 * and it would be the first row on the list every time.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import DashCard, { DashEmpty } from './DashCard';
import { EMPTY_COPY, SECTIONS, countLabel } from '../dashboardMeta';

const META = SECTIONS.find((s) => s.key === 'network');

export default function NetworkCard({ network, onOpenAlumni, onConnect }) {
  const n = network ?? { newAlumni: [], suggestions: [], connectionCount: 0 };
  const fresh = n.newAlumni ?? [];
  const suggestions = n.suggestions ?? [];
  const empty = fresh.length === 0 && suggestions.length === 0;

  return (
    <DashCard
      title={META.title}
      icon={META.icon}
      accent={META.accent}
      actionLabel="Directory"
      onAction={onOpenAlumni}
    >
      <View style={styles.connectionBar}>
        <Ionicons name="people-outline" size={13} color={META.accent} />
        <Text style={styles.connectionText}>
          {n.connectionCount > 0
            ? `${countLabel(n.connectionCount, 'connection')} · ${fresh.length} new alumni to meet`
            : fresh.length > 0
              ? `No connections yet · ${fresh.length} new alumni to meet`
              : 'No connections yet'}
        </Text>
      </View>

      {empty ? (
        <DashEmpty {...EMPTY_COPY.network} accent={META.accent} />
      ) : (
        <>
          {suggestions.length ? (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>Suggested for you</Text>
              {suggestions.map((s) => (
                <PersonRow
                  key={`s-${s.userId}`}
                  name={s.name}
                  detail={s.headline ?? s.company ?? (s.graduationYear ? `Class of ${s.graduationYear}` : null)}
                  reasons={s.reasons ?? []}
                  score={s.score}
                  onPress={() => onConnect?.(s)}
                  actionLabel="Connect"
                  onAction={() => onConnect?.(s)}
                />
              ))}
            </View>
          ) : null}

          {fresh.length ? (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>Recently joined</Text>
              <View style={styles.pillWrap}>
                {fresh.map((p) => (
                  <TouchableOpacity
                    key={`n-${p.id}`}
                    onPress={() => onOpenAlumni?.(p)}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name}, new to the network`}
                    style={styles.newPill}
                  >
                    <View style={[styles.avatar, { backgroundColor: `${META.accent}18` }]}>
                      <Text style={[styles.avatarText, { color: META.accent }]}>
                        {(p.name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.newName} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </DashCard>
  );
}

function PersonRow({ name, detail, reasons, score, onPress, actionLabel, onAction }) {
  return (
    <View style={styles.person}>
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}${reasons.length ? `: ${reasons.join(', ')}` : ''}`}
        style={styles.personMain}
      >
        <View style={[styles.avatar, { backgroundColor: `${META.accent}18` }]}>
          <Text style={[styles.avatarText, { color: META.accent }]}>
            {(name ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.personBody}>
          <Text style={styles.personName} numberOfLines={1}>
            {name}
          </Text>
          {detail ? (
            <Text style={styles.personDetail} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
          {/* The reasons, not the score. A number cannot be argued with; "same batch"
              can — and if the reasoning is wrong, that is worth surfacing. */}
          {reasons?.length ? (
            <Text style={styles.reasons} numberOfLines={2}>
              {reasons.join(' · ')}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={`Connect with ${name}`}
          style={[styles.connectBtn, { backgroundColor: `${META.accent}14` }]}
        >
          <Text style={[styles.connectText, { color: META.accent }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  connectionText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  group: {
    marginTop: 11,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 7,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  personMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  personBody: {
    flex: 1,
    gap: 1,
  },
  personName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  personDetail: {
    fontSize: 10.5,
    color: theme.colors.textTertiary,
  },
  reasons: {
    fontSize: 10,
    color: META.accent,
    marginTop: 1,
  },
  connectBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  connectText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  newPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    paddingRight: 11,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  newName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    maxWidth: 92,
  },
});