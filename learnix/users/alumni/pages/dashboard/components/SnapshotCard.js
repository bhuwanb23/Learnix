/**
 * Alumni Snapshot — who you are in this network: batch, department, location, organisation.
 *
 * THE MOST IMPORTANT SECTION ON THE SCREEN
 * ---------------------------------------
 * It is also the one most likely to be partly empty, because the Alumni Relations Office
 * account the app signs in as has no batch and no employer. That is a real gap in the data,
 * not a rendering failure, so every absent field says "Not added yet" and the card offers a
 * route to the profile editor instead of quietly printing "None" or "0".
 *
 * A graduate with an unfilled profile and a graduate with an empty one are different
 * people, and this card is the one place that distinction is visible.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../../../constants/theme';
import DashCard, { DashEmpty, Field } from './DashCard';
import { ACCENT, MISSING, SECTIONS } from '../dashboardMeta';

const META = SECTIONS.find((s) => s.key === 'snapshot');

export default function SnapshotCard({ snapshot, onEditProfile }) {
  if (!snapshot?.hasProfile) {
    return (
      <DashCard title={META.title} icon={META.icon} accent={META.accent}>
        <DashEmpty
          icon="person-add-outline"
          accent={META.accent}
          title="No alumni profile yet"
          body="Create one to appear in the directory and unlock networking."
          actionLabel="Set up"
          onAction={onEditProfile}
        />
      </DashCard>
    );
  }

  const missing = snapshot.missing ?? [];
  const allSet = missing.length === 0;

  return (
    <DashCard
      title={META.title}
      icon={META.icon}
      accent={META.accent}
      actionLabel={allSet ? 'Edit' : 'Complete'}
      onAction={onEditProfile}
    >
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {snapshot.name ?? 'Alumnus'}
        </Text>
        {snapshot.graduationYear ? (
          <View style={[styles.yearPill, { backgroundColor: `${META.accent}18` }]}>
            <Text style={[styles.yearText, { color: META.accent }]}>
              Class of {snapshot.graduationYear}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.fields}>
        <Field
          label="Batch"
          icon="albums-outline"
          accent={META.accent}
          value={snapshot.batchName}
          placeholder={MISSING}
        />
        <Field
          label="Department"
          icon="school-outline"
          accent={META.accent}
          value={snapshot.departmentName ?? snapshot.programName}
          placeholder={MISSING}
        />
        <Field
          label="Location"
          icon="location-outline"
          accent={META.accent}
          value={snapshot.location}
          placeholder={MISSING}
        />
        <Field
          label="Organisation"
          icon="business-outline"
          accent={META.accent}
          value={snapshot.companyName}
          placeholder={MISSING}
        />
      </View>

      {/* Only shown when there is something to fix. A "0 fields missing" banner on a
          complete profile is noise, and it is the kind of nag that trains people to
          ignore prompts. */}
      {!allSet ? (
        <View style={[styles.nudge, { backgroundColor: `${META.accent}0f` }]}>
          <Text style={styles.nudgeText}>
            {missing.length === 1 ? '1 detail' : `${missing.length} details`} missing — a
            complete profile is what makes the directory match work.
          </Text>
        </View>
      ) : null}
    </DashCard>
  );
}

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  yearPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  yearText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fields: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 4,
  },
  nudge: {
    marginTop: 10,
    padding: 8,
    borderRadius: 10,
  },
  nudgeText: {
    fontSize: 10.5,
    lineHeight: 14,
    color: theme.colors.textTertiary,
  },
});