/**
 * Mentorship Activity — the caller's own pairs, as mentor and as mentee.
 *
 * THE COUNTS ARE PER-USER, AND THAT IS THE WHOLE POINT
 * -----------------------------------------------------
 * `GET /alumni/mentorship` returns every pair in the institution. Summing that would put
 * "4 active mentorships" on a graduate who has one, drawn from strangers' pairings. The
 * dashboard service queries the CALLER directly, across all three predicates a pair can
 * match on: mentor side, alumni-mentee side, student-mentee side.
 *
 * AS-MENTOR AND AS-MENTEE ARE SHOWN SEPARATELY
 * -------------------------------------------
 * They are different activities with different costs. Mentoring somebody is work;
 * being mentored is something you receive. A single "mentorships: 4" number cannot say
 * which, so a graduate who mentors three people sees "1 with you" and "3 you're giving
 * to" rather than a figure that reads as passive.
 *
 * A pending count is shown even when zero exists, because "0 pending" is reassuring
 * information — it is the difference between "nothing to chase" and "not loaded".
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import DashCard, { DashEmpty, Stat } from './DashCard';
import { EMPTY_COPY, SECTIONS, countLabel, relativeDay } from '../dashboardMeta';

const META = SECTIONS.find((s) => s.key === 'mentorship');

export default function MentorshipCard({ mentorship, onOpenMentorship }) {
  const m = mentorship ?? { activeCount: 0, pendingCount: 0, asMentorCount: 0, asMenteeCount: 0, fields: [] };
  const engaged = m.activeCount > 0 || m.pendingCount > 0;

  if (!engaged) {
    return (
      <DashCard
        title={META.title}
        icon={META.icon}
        accent={META.accent}
        actionLabel="Browse"
        onAction={onOpenMentorship}
      >
        <DashEmpty
          {...EMPTY_COPY.mentorship}
          accent={META.accent}
          actionLabel="Find a mentor"
          onAction={onOpenMentorship}
        />
      </DashCard>
    );
  }

  return (
    <DashCard
      title={META.title}
      icon={META.icon}
      accent={META.accent}
      actionLabel="Open"
      onAction={onOpenMentorship}
    >
      <View style={styles.stats}>
        <Stat value={m.activeCount} label="Active pairings" accent={META.accent} onPress={onOpenMentorship} />
        <View style={styles.gap} />
        <Stat
          value={m.pendingCount}
          label={m.pendingCount === 1 ? 'Awaiting a decision' : 'Awaiting decisions'}
          accent={m.pendingCount > 0 ? '#d97706' : theme.colors.textLight}
          onPress={onOpenMentorship}
        />
      </View>

      {/* Only rendered when the two sides actually differ. When a person is only a mentee,
          a "0 you're mentoring" tile is a column of nothing. */}
      {m.asMentorCount > 0 || m.asMenteeCount > 0 ? (
        <View style={styles.roles}>
          {m.asMentorCount > 0 ? (
            <RolePill
              icon="hand-left-outline"
              label={countLabel(m.asMentorCount, 'mentoring', 'mentoring')}
              accent={META.accent}
            />
          ) : null}
          {m.asMenteeCount > 0 ? (
            <RolePill
              icon="school-outline"
              label={countLabel(m.asMenteeCount, 'mentee')}
              accent="#0891b2"
            />
          ) : null}
        </View>
      ) : null}

      {m.fields?.length ? (
        <Text style={styles.fields} numberOfLines={1}>
          {m.fields.join(' · ')}
        </Text>
      ) : null}

      {m.nextSession ? (
        <View style={[styles.next, { backgroundColor: `${META.accent}12` }]}>
          <Ionicons name="calendar-number-outline" size={13} color={META.accent} />
          <Text style={styles.nextText}>
            Next session {relativeDay(m.nextSession)}
          </Text>
        </View>
      ) : null}
    </DashCard>
  );
}

function RolePill({ icon, label, accent }) {
  return (
    <View style={styles.rolePill}>
      <Ionicons name={icon} size={12} color={accent} />
      <Text style={styles.roleText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
  },
  gap: { width: 8 },
  roles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  roleText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  fields: {
    marginTop: 9,
    fontSize: 10.5,
    color: theme.colors.textLight,
  },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 10,
  },
  nextText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});