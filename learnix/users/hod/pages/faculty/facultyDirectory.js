/**
 * HD-02 — The HOD's Faculty desk: the three smart features.
 * Docs: 11-hod.md §3.2
 *
 *   · THE WORKLOAD BALANCER      — who is carrying too much, and who could take a class
 *   · THE AVAILABILITY MATRIX    — the department's faculty against the teaching week
 *   · THE TEACHING PROGRESS MONITOR — is the syllabus being finished, and are the classes running
 *
 * THE BALANCER'S SUGGESTION IS ADVISORY, AND IT IS HONEST
 * ------------------------------------------------------
 * The suggestion is a move the HOD can make, not a move the platform has made. The server only
 * suggests a target who has the HOURS to absorb the class — because a suggestion that would be
 * refused the moment it was pressed is a bad suggestion, and a HOD who learns to ignore the
 * suggestions learns to ignore the screen.
 *
 * THE MATRIX IS DERIVED
 * ---------------------
 * The platform has no availability concept of its own, so the matrix is read off the timetable
 * and the leave. A matrix that is DERIVED cannot disagree with the schedule that actually exists.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { FacultyEmpty, NoteStrip, Section, Tag } from './facultyUi';
import { AMBER, CYAN, MUTED, RED, SLATE, hours } from './facultyMeta';

// ── The Workload Balancer ──────────────────────────────────────────────────

/**
 * THE WORKLOAD BALANCER.
 *
 * For each overloaded teacher, how far over they are and who could take one of their classes.
 */
export function WorkloadBalancer({ balancer, onOpen }) {
  if (!balancer) return null;
  const overloaded = balancer.overloaded ?? [];

  return (
    <Section
      title="Workload balancer"
      blurb="Who is carrying more than their agreed maximum, and who has room to take a class."
      icon="swap-horizontal-outline"
      color={RED}
    >
      {overloaded.length === 0 ? (
        <FacultyEmpty
          icon="checkmark-done-outline"
          title="Nobody is overloaded"
          message="Every teacher's load sits inside their own agreed maximum."
        />
      ) : (
        overloaded.map((o: any) => (
          <View key={o.userId} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{o.name}</Text>
                <Text style={styles.cardMeta}>
                  {hours(o.assignedWeeklyHours)} of {hours(o.maxWorkloadHours)} · over by{' '}
                  {hours(o.overBy)}
                </Text>
              </View>
              <Tag label="Overloaded" color={RED} bg={`${RED}18`} />
            </View>
            {o.targets.length === 0 ? (
              <NoteStrip tone="warn">
                Nobody in the department has the headroom to take a class from {o.name} right now.
              </NoteStrip>
            ) : (
              <>
                <Text style={styles.subLabel}>Could take a class</Text>
                {o.targets.map((t: any) => (
                  <TouchableOpacity
                    key={t.userId}
                    style={styles.targetRow}
                    onPress={() => onOpen?.(t.userId)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="person-outline" size={14} color={SLATE} />
                    <Text style={styles.targetName}>{t.name}</Text>
                    <View style={styles.flex} />
                    <Text style={styles.targetFree}>{hours(t.freeHours)} free</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        ))
      )}
      {balancer.note ? <NoteStrip tone="warn">{balancer.note}</NoteStrip> : null}
    </Section>
  );
}

// ── The Availability Matrix ────────────────────────────────────────────────

/**
 * THE AVAILABILITY MATRIX.
 *
 * The department's faculty against the teaching week: the hours each has already scheduled on
 * each day, their free hours in the week, and whether they are on leave today.
 */
export function AvailabilityMatrix({ matrix }) {
  if (!matrix) return null;
  const days = matrix.days ?? [];
  const rows = matrix.rows ?? [];

  return (
    <Section
      title="Availability matrix"
      blurb="The teaching week, faculty by faculty. Free hours are what is left against their own maximum."
      icon="grid-outline"
      color={CYAN}
    >
      {rows.length === 0 ? (
        <FacultyEmpty icon="grid-outline" title="No faculty yet" message="The matrix is empty." />
      ) : (
        <View style={styles.matrix}>
          <View style={styles.matrixRow}>
            <Text style={[styles.matrixHead, styles.matrixName]}>Teacher</Text>
            {days.map((d: any) => (
              <Text key={d.id} style={styles.matrixHead}>
                {d.short}
              </Text>
            ))}
            <Text style={styles.matrixHead}>Free</Text>
          </View>
          {rows.map((r: any) => (
            <View key={r.userId} style={styles.matrixRow}>
              <TouchableOpacity
                style={styles.matrixNameBox}
                onPress={() => {}}
                activeOpacity={0.75}
              >
                <Text style={styles.matrixName} numberOfLines={1}>
                  {r.name}
                </Text>
                {r.onLeaveNow ? (
                  <Text style={styles.matrixLeave}>on leave</Text>
                ) : null}
              </TouchableOpacity>
              {r.days.map((d: any) => (
                <View key={d.id} style={styles.matrixCell}>
                  {d.hours > 0 ? (
                    <Text style={styles.matrixBusy}>{d.hours}h</Text>
                  ) : (
                    <Text style={styles.matrixFree}>—</Text>
                  )}
                </View>
              ))}
              <Text
                style={[
                  styles.matrixFreeHours,
                  r.freeHours < 0 ? { color: RED } : r.freeHours === 0 ? { color: AMBER } : null,
                ]}
              >
                {r.freeHours}h
              </Text>
            </View>
          ))}
        </View>
      )}
      <NoteStrip>
        A dash is a day with nothing scheduled. The free hours are measured against each teacher's
        OWN maximum, so a teacher with a small cap is not flattered by a colleague's big one.
      </NoteStrip>
    </Section>
  );
}

// ── The Teaching Progress Monitor ──────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  cardMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  targetName: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  targetFree: { fontSize: 11, fontWeight: '700', color: GREEN },

  matrix: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  matrixHead: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 6,
  },
  matrixName: { flex: 0, width: 96, textAlign: 'left' },
  matrixNameBox: { width: 96, paddingHorizontal: 8, paddingVertical: 6 },
  matrixCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  matrixBusy: { fontSize: 10, fontWeight: '700', color: theme.colors.text },
  matrixFree: { fontSize: 10, color: MUTED },
  matrixLeave: { fontSize: 9, color: AMBER, fontWeight: '700' },
  matrixFreeHours: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
});
