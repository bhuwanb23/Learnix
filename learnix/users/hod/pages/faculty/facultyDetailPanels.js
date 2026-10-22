/**
 * HD-02 — The HOD's Faculty desk: the subjects and the classes panels.
 * Docs: 11-hod.md §3.2
 *
 * A SUBJECT IS A COURSE; A CLASS IS ONE OFFERING OF IT.
 * -------------------------------------------
 * A teacher who teaches the same course to two sections holds ONE subject and TWO classes, and
 * the difference matters the moment a HOD is deciding what to move.
 *
 * They are in their own file because the detail screen is the longest file in the desk, and these
 * two panels are the part of it that answer the same question: what does this teacher actually
 * carry.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../../constants/theme';
import { DetailRow, FacultyEmpty, Section, Tag } from './facultyUi';
import {
  AMBER,
  CYAN,
  GREEN,
  RED,
  THEME,
  VIOLET,
  dayName,
  hours,
  percent,
  plural,
} from './facultyMeta';

const styles = StyleSheet.create({
  rowCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  rowMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  timetableRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
});

// ── The subjects ───────────────────────────────────────────────────────────

export function SubjectsPanel({ data }) {
  return (
    <Section
      title="Assigned subjects"
      blurb="The courses this teacher holds. A class is one offering of a subject — a course taught to one section."
      icon="layers-outline"
      color={VIOLET}
    >
      {(data?.subjects ?? []).length === 0 ? (
        <FacultyEmpty
          icon="layers-outline"
          title="No subjects"
          message="This teacher holds no course this year."
        />
      ) : (
        data.subjects.map((s: any) => (
          <View key={s.courseId} style={styles.rowCard}>
            <View style={styles.rowHead}>
              <Text style={styles.rowTitle}>{s.code}</Text>
              <Tag label={`${plural(s.classes, 'class', 'classes')}`} color={VIOLET} />
            </View>
            <Text style={styles.rowMeta}>{s.name}</Text>
            <DetailRow label="Weekly hours" value={hours(s.weeklyHours)} />
          </View>
        ))
      )}
    </Section>
  );
}

// ── The classes ────────────────────────────────────────────────────────────

export function ClassesPanel({ data }) {
  return (
    <Section
      title="Classes"
      blurb="Each class this teacher takes: its timetable, its register and its results."
      icon="school-outline"
      color={GREEN}
    >
      {(data?.classes ?? []).length === 0 ? (
        <FacultyEmpty
          icon="school-outline"
          title="No classes"
          message="This teacher has no class this year."
        />
      ) : (
        data.classes.map((c: any) => (
          <View key={c.offeringId} style={styles.rowCard}>
            <View style={styles.rowHead}>
              <Text style={styles.rowTitle}>
                {c.code} · {c.section}
              </Text>
              <Tag label={`${plural(c.students, 'student', 'students')}`} color={THEME} />
            </View>
            <Text style={styles.rowMeta}>{c.name}</Text>
            <DetailRow label="Weekly hours" value={hours(c.weeklyHours)} />
            <DetailRow
              label="Attendance"
              value={c.attendance.pct === null ? '—' : percent(c.attendance.pct)}
              tone={c.attendance.pct !== null && c.attendance.pct < 75 ? AMBER : null}
            />
            <DetailRow
              label="Pass rate"
              value={c.performance.passPercent === null ? '—' : percent(c.performance.passPercent)}
              tone={
                c.performance.passPercent !== null && c.performance.passPercent < 75 ? RED : null
              }
            />
            {c.timetable.length > 0 ? (
              <View style={styles.timetableRow}>
                {c.timetable.map((t: any) => (
                  <Tag
                    key={t.dayOfWeek}
                    label={`${dayName(t.dayOfWeek)} ${t.hours}h`}
                    color={CYAN}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}
    </Section>
  );
}
