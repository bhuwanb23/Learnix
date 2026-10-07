/**
 * Career Overview — role, company, industry, experience.
 *
 * "Experience" IS DERIVED ON THE SERVER, NOT STORED
 * -------------------------------------------------
 * No column records it, and adding one would immediately drift: a graduate who edits their
 * timeline would have to remember to recompute the total. The service derives it as whole
 * years since the earliest career entry, floored on the MONTH so somebody who started this
 * month reads "0 years" rather than rounding up on the 31st.
 *
 * It is a span, not a sum of durations. A career with a two-year gap is longer than the
 * time spent working, and pretending otherwise would be the flattering lie.
 *
 * THE EMPTY CASE IS COMMON AND NOT AN ERROR
 * -----------------------------------------
 * The office account has no career entries at all. "Add your first role" is the honest
 * prompt; printing "0 years" would read as a claim about a career that does not exist.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import DashCard, { DashEmpty, Progress } from './DashCard';
import { ACCENT, MISSING, SECTIONS, countLabel, yearsLabel } from '../dashboardMeta';

const META = SECTIONS.find((s) => s.key === 'career');

export default function CareerCard({ career, onEditProfile, onOpenMentorship }) {
  if (!career?.hasCareer) {
    return (
      <DashCard title={META.title} icon={META.icon} accent={META.accent}>
        <DashEmpty
          icon="briefcase-outline"
          accent={META.accent}
          title="No career history yet"
          body="Add your roles and they appear here and in the directory."
          actionLabel="Add"
          onAction={onEditProfile}
        />
      </DashCard>
    );
  }

  const yrs = career.yearsExperience;

  return (
    <DashCard
      title={META.title}
      icon={META.icon}
      accent={META.accent}
      actionLabel="Edit"
      onAction={onEditProfile}
    >
      <View style={styles.top}>
        <View style={styles.roleBlock}>
          <Text style={styles.role} numberOfLines={1}>
            {career.role ?? MISSING}
          </Text>
          <Text style={styles.company} numberOfLines={1}>
            {career.company ?? career.industry ?? MISSING}
          </Text>
        </View>

        <View style={[styles.years, { backgroundColor: `${META.accent}14` }]}>
          <Text style={[styles.yearsValue, { color: META.accent }]}>
            {yrs === null || yrs === undefined ? '—' : yrs}
          </Text>
          <Text style={styles.yearsLabel}>
            {yrs === null || yrs === undefined ? 'years' : yrs === 1 ? 'year' : 'years'}
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        {career.industry ? (
          <Chip icon="briefcase-outline" label={career.industry} accent={META.accent} />
        ) : (
          <Chip icon="briefcase-outline" label="Industry not set" accent={theme.colors.textLight} muted />
        )}
        <Chip
          icon="layers-outline"
          label={countLabel(career.entryCount, 'role')}
          accent={META.accent}
        />
        {career.startedLabel ? (
          <Chip icon="calendar-outline" label={`Since ${career.startedLabel}`} accent={META.accent} />
        ) : null}
      </View>

      {/* A timeline strip rather than a bar: it communicates "this is a sequence" where a
          percentage would need a denominator the card does not have. */}
      {career.entryCount > 1 ? (
        <View style={styles.strip}>
          <View style={styles.stripTrack}>
            <View style={[styles.stripFill, { backgroundColor: META.accent, width: `${Math.min(100, (career.entryCount / 5) * 100)}%` }]} />
          </View>
          <Text style={styles.stripCaption}>{yearsLabel(yrs)} of experience</Text>
        </View>
      ) : null}

      {/* Only offered when the card would otherwise be the shortest thing on screen. A
          "find a mentor" nudge under a one-line career summary is a distraction. */}
      {career.entryCount <= 1 ? (
        <TouchableOpacity
          onPress={onOpenMentorship}
          accessibilityRole="button"
          accessibilityLabel="Looking for guidance on your next step"
          style={styles.nudge}
        >
          <Ionicons name="sparkles-outline" size={13} color={ACCENT.mentorship} />
          <Text style={styles.nudgeText}>Looking for guidance on your next step?</Text>
          <Ionicons name="chevron-forward" size={13} color={theme.colors.textLight} />
        </TouchableOpacity>
      ) : null}
    </DashCard>
  );
}

function Chip({ icon, label, accent, muted }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={11} color={accent} />
      <Text style={[styles.chipText, muted && { color: theme.colors.textLight }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleBlock: { flex: 1, gap: 2 },
  role: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  company: {
    fontSize: 11.5,
    color: theme.colors.textTertiary,
  },
  years: {
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 58,
  },
  yearsValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  yearsLabel: {
    fontSize: 9.5,
    color: theme.colors.textTertiary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 11,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  strip: {
    marginTop: 11,
  },
  stripTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  stripFill: {
    height: '100%',
    borderRadius: 2,
  },
  stripCaption: {
    marginTop: 5,
    fontSize: 10,
    color: theme.colors.textLight,
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  nudgeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});