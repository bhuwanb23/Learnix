/**
 * HD-01 — The HOD dashboard: the four state sections.
 * Docs: 11-hod.md §HD-01
 *
 * WHAT IS IN THIS FILE
 * --------------------
 * The four sections that describe the STATE of the department: its KPIs, what is happening today,
 * its attendance, and how far through the syllabus it is.
 *
 * EVERY FIGURE IS WHAT THE SERVER SENT
 * ------------------------------------
 * No section computes anything about the data. The server owns the counts, the percentages and
 * the verdicts; a section draws them. A number the client derived is a number the client can get
 * wrong, and the whole point of this rewrite was that every figure comes from one place.
 *
 * A FIGURE WITH NO DATA IS "—", NOT ZERO
 * ---------------------------------------
 * A department with no attendance records yet has an attendance of `null`, not `0`. The two are
 * different facts, and a screen that cannot tell them apart will tell a HOD that a brand-new
 * department is failing.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { MUTED, SLATE, blockMeta, fmtDay, percent, plural } from './dashboardMeta';
import {
  DashboardEmpty,
  DetailRow,
  NoteStrip,
  ProgressBar,
  Section,
  StatRow,
  StatTile,
  Tag,
} from './dashboardUi';

// ═══ 1. Department KPIs ═══════════════════════════════════════════════════

export function DepartmentKpisSection({ data, onRoute }) {
  const meta = blockMeta('DEPARTMENT_KPIS');
  const k = data?.kpis;
  if (!k) return null;

  // THE VERDICT COLOURS. The server decides whether a figure is above or below the threshold; the
  // screen only paints it.
  const attTone =
    k.attendanceVerdict === 'NO_DATA'
      ? undefined
      : k.attendanceVerdict === 'OK'
        ? 'clear'
        : 'bad';
  const passTone =
    k.passVerdict === 'NO_DATA' ? undefined : k.passVerdict === 'OK' ? 'clear' : 'bad';

  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
    >
      <StatRow>
        <StatTile label="Students" value={k.students ?? 0} icon="school-outline" />
        <StatTile label="Faculty" value={k.faculty ?? 0} icon="people-outline" />
        <StatTile label="Courses" value={k.courses ?? 0} icon="book-outline" />
        <StatTile
          label="Attendance"
          value={percent(k.attendancePct)}
          tone={attTone}
          icon="checkbox-outline"
        />
        <StatTile
          label="Pass rate"
          value={percent(k.passRate)}
          tone={passTone}
          icon="trophy-outline"
        />
      </StatRow>
      {k.attendanceVerdict === 'NO_DATA' || k.passVerdict === 'NO_DATA' ? (
        <NoteStrip>
          {k.attendanceVerdict === 'NO_DATA' && k.passVerdict === 'NO_DATA'
            ? 'No attendance records and no results yet — these figures fill in as the term goes on.'
            : k.attendanceVerdict === 'NO_DATA'
              ? 'No attendance records yet, so the attendance figure does not exist yet.'
              : 'No results yet, so the pass rate does not exist yet.'}
        </NoteStrip>
      ) : null}
      {k.averageMarks !== null && k.averageMarks !== undefined ? (
        <DetailRow
          label="Average marks"
          value={`${k.averageMarks} (${k.averagePercent}%)`}
        />
      ) : null}
      <DetailRow
        label="Considered"
        value={`${k.considered?.attendanceRecords ?? 0} attendance records · ${k.considered?.results ?? 0} results`}
      />
    </Section>
  );
}

// ═══ 2. Today's overview ═══════════════════════════════════════════════════

export function TodayOverviewSection({ data, onRoute }) {
  const meta = blockMeta('TODAY_OVERVIEW');
  const t = data?.today;
  if (!t) return null;

  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
    >
      <StatRow>
        <StatTile
          label="Classes today"
          value={t.classCount ?? 0}
          hint={`${t.teachingHours ?? 0} hrs`}
          icon="albums-outline"
        />
        <StatTile
          label="Faculty available"
          value={t.faculty?.available ?? 0}
          hint={`of ${t.faculty?.total ?? 0}`}
          icon="people-outline"
        />
        <StatTile
          label="Away today"
          value={t.faculty?.onLeave?.length ?? 0}
          tone={(t.faculty?.onLeave?.length ?? 0) > 0 ? 'warn' : 'clear'}
          icon="airplane-outline"
        />
        <StatTile
          label="Sessions taken"
          value={t.sessions?.taken ?? 0}
          hint={`${t.sessions?.open ?? 0} open`}
          icon="checkmark-done-outline"
        />
      </StatRow>

      {(t.faculty?.onLeave?.length ?? 0) > 0 ? (
        <NoteStrip tone="warn">
          {plural(t.faculty.onLeave.length, 'teacher is', 'teachers are')} on leave today:{' '}
          {t.faculty.onLeave.map((f) => f.name).join(', ')}.
        </NoteStrip>
      ) : null}

      {t.classCount === 0 ? (
        <DashboardEmpty
          icon="cafe-outline"
          title="No classes today"
          message="The weekly timetable has nothing on today."
        />
      ) : (
        (t.classes ?? []).map((c) => (
          <View key={c.slotId} style={styles.classRow}>
            <View style={styles.classWhen}>
              <Text style={styles.classTime}>{c.startTime}</Text>
              <Text style={styles.classTimeEnd}>{c.endTime}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.classTitle} numberOfLines={1}>
                {c.courseName}
              </Text>
              <Text style={styles.classMeta} numberOfLines={1}>
                {c.courseCode} · {c.sectionName}
                {c.room ? ` · ${c.room}` : ''}
              </Text>
            </View>
            <Text style={styles.classHours}>{c.hours}h</Text>
          </View>
        ))
      )}
    </Section>
  );
}

// ═══ 3. Attendance snapshot ═══════════════════════════════════════════════

export function AttendanceSnapshotSection({ data, onRoute }) {
  const meta = blockMeta('ATTENDANCE_SNAPSHOT');
  const a = data?.attendance;
  if (!a) return null;

  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
    >
      <StatRow>
        <StatTile label="Department" value={percent(a.attendancePct)} />
        <StatTile label="Present" value={a.present ?? 0} tone="clear" />
        <StatTile label="Late" value={a.late ?? 0} />
        <StatTile
          label="Absent"
          value={a.absent ?? 0}
          tone={(a.absent ?? 0) > 0 ? 'warn' : 'clear'}
        />
      </StatRow>
      {a.attendancePct === null ? (
        <NoteStrip>
          No attendance has been recorded yet, so there is no percentage to report.
        </NoteStrip>
      ) : a.belowThreshold ? (
        <NoteStrip tone="bad">
          Department attendance is {percent(a.attendancePct)}, below the {a.threshold}% threshold.
        </NoteStrip>
      ) : null}
      <ProgressBar
        percent={a.attendancePct ?? 0}
        color={meta?.color}
        label={`${a.total ?? 0} records across ${a.sessions ?? 0} sessions`}
      />

      {(a.subjects ?? []).length === 0 ? (
        <DashboardEmpty
          icon="checkbox-outline"
          title="No subject attendance yet"
          message="Attendance appears here once teachers mark their registers."
        />
      ) : (
        (a.subjects ?? []).map((s) => (
          <View key={s.code} style={styles.subjectRow}>
            <View style={styles.flex}>
              <Text style={styles.subjectTitle} numberOfLines={1}>
                {s.subject}
              </Text>
              <Text style={styles.subjectMeta}>
                {s.code} · {s.attended}/{s.total} attended
              </Text>
            </View>
            <Text
              style={[
                styles.subjectPct,
                {
                  color:
                    s.attendancePct >= a.threshold
                      ? '#059669'
                      : s.attendancePct > 0
                        ? '#d97706'
                        : '#dc2626',
                },
              ]}
            >
              {percent(s.attendancePct)}
            </Text>
          </View>
        ))
      )}
    </Section>
  );
}

// ═══ 4. Academic progress ══════════════════════════════════════════════════

export function AcademicProgressSection({ data, onRoute }) {
  const meta = blockMeta('ACADEMIC_PROGRESS');
  const p = data?.progress;
  if (!p) return null;

  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
    >
      <StatRow>
        <StatTile
          label="Syllabus complete"
          value={percent(p.percent)}
          tone={p.percent === null ? undefined : p.percent >= 60 ? 'clear' : 'warn'}
        />
        <StatTile
          label="Courses with a syllabus"
          value={`${p.withSyllabus ?? 0}/${p.courses ?? 0}`}
          icon="book-outline"
        />
        <StatTile
          label="Topics done"
          value={`${p.completed ?? 0}/${p.topics ?? 0}`}
          icon="checkmark-circle-outline"
        />
        <StatTile
          label="Stalled"
          value={p.stalled ?? 0}
          tone={(p.stalled ?? 0) > 0 ? 'warn' : 'clear'}
          icon="hourglass-outline"
        />
      </StatRow>

      {p.percent === null ? (
        <NoteStrip>
          No course in this department has a syllabus yet, so there is no completion figure to
          report.
        </NoteStrip>
      ) : null}
      {p.withoutSyllabus > 0 ? (
        <NoteStrip>
          {plural(p.withoutSyllabus, 'course has', 'courses have')} no syllabus at all. The
          completion figure covers only the {p.withSyllabus} that do.
        </NoteStrip>
      ) : null}
      {p.awaitingApproval > 0 ? (
        <NoteStrip tone="warn">
          {plural(p.awaitingApproval, 'syllabus version is', 'syllabus versions are')} waiting on
          this HOD's approval.
        </NoteStrip>
      ) : null}

      <ProgressBar
        percent={p.percent ?? 0}
        color={meta?.color}
        label={`${p.completed ?? 0} of ${p.topics ?? 0} topics complete`}
      />

      {(p.stalledCourses ?? []).length > 0 ? (
        <>
          <Text style={styles.subLabel}>Stalled</Text>
          {(p.stalledCourses ?? []).map((c) => (
            <View key={c.code} style={styles.subjectRow}>
              <View style={styles.flex}>
                <Text style={styles.subjectTitle} numberOfLines={1}>
                  {c.subject}
                </Text>
                <Text style={styles.subjectMeta}>{c.code}</Text>
              </View>
              <Tag label={`${c.days}d idle`} color="#d97706" />
            </View>
          ))}
        </>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  link: { color: theme.colors.primary, fontWeight: '600', fontSize: 12 },

  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  classWhen: { width: 44 },
  classTime: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  classTimeEnd: { fontSize: 10, color: MUTED },
  classTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  classMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  classHours: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  subjectTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  subjectMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  subjectPct: { fontSize: 14, fontWeight: '700' },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
