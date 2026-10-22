/**
 * HD-02 — The HOD's Courses desk: the detail panels.
 * Docs: 11-hod.md §3.3
 *
 * THE CHAIN, IN PANELS
 * --------------------
 *   Subjects → Faculty → Students → Timetable → Syllabus → Attendance → Performance
 *            → Curriculum → Prerequisites → History
 *
 * "SUBJECTS" ARE THE COURSE'S OFFERINGS, and that is not a renaming — it is what the platform
 * means. `Evaluation.subjectOffering` is a `CourseOffering`, the exam cell's "course & subject
 * allocation" block compares `ExamSlot.offerings` against the course offerings, and every
 * "subject" in this platform is a course taught to one section by one teacher. So the Subjects
 * panel lists the course's offerings, each with its section, its teacher and its student count.
 *
 * THE COUNTS ARE TRUE COUNTS
 * --------------------------
 * A panel that says "12 students" because it fetched 12 students is worse than one that says
 * nothing, because it looks measured. So every count here is the server's total.
 *
 * A NUMBER WITH NO DATA IS AN EM DASH, NOT A ZERO
 * ------------------------------------------------
 * A course with no results has NO pass rate. Drawing "0%" reports a failing course where the
 * truth is an unexamined one, and the reader has no way to tell those apart.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import {
  ActionButton,
  CoursesEmpty,
  DetailRow,
  NoteStrip,
  ProgressBar,
  Section,
  StatRow,
  StatTile,
  Tag,
} from './coursesUi';
import {
  AMBER,
  CYAN,
  GREEN,
  MUTED,
  RED,
  SLATE,
  THEME,
  VIOLET,
  count,
  dayName,
  percent,
  plural,
  prerequisiteTypeMeta,
  timeAgo,
} from './coursesMeta';

// ── 1. Subjects (the course's offerings) ───────────────────────────────────

export function SubjectsPanel({ course, onAssign }) {
  const subjects = course?.subjects ?? [];
  return (
    <Section
      title="Subjects"
      blurb="Each offering of this course: the section, who teaches it, and how many students are in it."
      icon="layers-outline"
      color={THEME}
    >
      {subjects.length === 0 ? (
        <CoursesEmpty
          icon="layers-outline"
          title="Not offered"
          message="This course has no offering this year, so it has no subjects, no timetable and no students."
        />
      ) : (
        subjects.map((s) => (
          <View key={s.id} style={styles.rowCard}>
            <View style={styles.rowHead}>
              <Text style={styles.rowTitle}>{s.section}</Text>
              <Tag
                label={`${plural(s.students ?? 0, 'student', 'students')}`}
                color={THEME}
              />
            </View>
            <DetailRow label="Teacher" value={s.teacherName} />
            <DetailRow label="Weekly slots" value={count(s.weeklySlots)} />
            <DetailRow
              label="Weekly hours"
              value={count(s.weeklyHours)}
              tone={s.weeklyHours === 0 ? AMBER : null}
            />
            {s.teacherEmail ? (
              <DetailRow label="Contact" value={s.teacherEmail} />
            ) : null}
          </View>
        ))
      )}
      {onAssign && subjects.length > 0 ? (
        <ActionButton
          label="Assign a teacher"
          icon="person-add-outline"
          color={THEME}
          onPress={onAssign}
        />
      ) : null}
    </Section>
  );
}

// ── 2. Faculty ─────────────────────────────────────────────────────────────

export function FacultyPanel({ course }) {
  const faculty = course?.faculty ?? [];
  return (
    <Section
      title="Faculty"
      blurb="Who teaches this course, and how much of it is theirs."
      icon="people-outline"
      color={VIOLET}
    >
      {faculty.length === 0 ? (
        <CoursesEmpty
          icon="people-outline"
          title="No teacher assigned"
          message="This course has no offering, so nobody is teaching it yet."
        />
      ) : (
        faculty.map((f) => (
          <View key={f.userId} style={styles.rowCard}>
            <View style={styles.rowHead}>
              <Text style={styles.rowTitle}>{f.name}</Text>
              <Tag label={`${plural(f.offerings ?? 0, 'subject', 'subjects')}`} color={VIOLET} />
            </View>
            <DetailRow label="Students" value={count(f.students)} />
            {f.email ? <DetailRow label="Contact" value={f.email} /> : null}
          </View>
        ))
      )}
    </Section>
  );
}

// ── 3. Students ────────────────────────────────────────────────────────────

export function StudentsPanel({ course }) {
  const students = course?.students;
  const roll = students?.roll ?? [];
  return (
    <Section
      title="Students"
      blurb="Everyone enrolled in this course, and the state of their enrolment."
      icon="school-outline"
      color={GREEN}
    >
      <StatRow>
        <StatTile label="Enrolled" value={count(students?.total)} icon="people-outline" color={GREEN} />
        <StatTile label="Active" value={count(students?.active)} icon="checkmark-outline" color={GREEN} />
        <StatTile
          label="Not active"
          value={count((students?.dropped ?? 0) + (students?.completed ?? 0))}
          icon="remove-circle-outline"
          color={SLATE}
        />
      </StatRow>

      {roll.length === 0 ? (
        <CoursesEmpty
          icon="school-outline"
          title="Nobody enrolled"
          message="The course has no enrolments yet."
        />
      ) : (
        roll.map((s) => (
          <View key={s.enrollmentId} style={styles.rollRow}>
            <View style={styles.rollMain}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {s.rollNumber} · {s.program} · {s.section}
              </Text>
            </View>
            {s.status !== 'ACTIVE' ? (
              <Tag label={s.status} color={s.status === 'COMPLETED' ? GREEN : AMBER} />
            ) : null}
          </View>
        ))
      )}
    </Section>
  );
}

// ── 4. Timetable ───────────────────────────────────────────────────────────

export function TimetablePanel({ course }) {
  const timetable = course?.timetable;
  const slots = timetable?.slots ?? [];
  const byDay = slots.reduce((acc, s) => {
    const list = acc[s.dayOfWeek] ?? [];
    list.push(s);
    acc[s.dayOfWeek] = list;
    return acc;
  }, {});

  return (
    <Section
      title="Timetable"
      blurb="When this course meets, and for how long."
      icon="calendar-outline"
      color={CYAN}
    >
      {slots.length === 0 ? (
        <CoursesEmpty
          icon="calendar-outline"
          title="No timetable"
          message="This course has no schedule slots, so it has no weekly hours."
        />
      ) : (
        <>
          {Object.keys(byDay)
            .map(Number)
            .sort((a, b) => a - b)
            .map((d) => (
              <View key={d} style={styles.dayRow}>
                <Text style={styles.dayLabel}>{dayName(d)}</Text>
                <View style={styles.flex}>
                  {byDay[d].map((s) => (
                    <Text key={s.id} style={styles.slotText}>
                      {s.startTime} – {s.endTime}
                      {s.room ? ` · ${s.room}` : ''}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          <DetailRow label="Weekly hours" value={count(timetable?.weeklyHours)} />
        </>
      )}
    </Section>
  );
}

// ── 5. Syllabus ────────────────────────────────────────────────────────────

export function SyllabusPanel({ course }) {
  const s = course?.syllabus;
  if (!s?.hasSyllabus) {
    return (
      <Section
        title="Syllabus"
        blurb="What the course covers, and how much of it is done."
        icon="book-outline"
        color={VIOLET}
      >
        <CoursesEmpty
          icon="book-outline"
          title="No syllabus"
          message="This course has no syllabus yet. A course with no syllabus has no syllabus progress — it is not at zero percent."
        />
      </Section>
    );
  }
  return (
    <Section
      title="Syllabus"
      blurb="What the course covers, and how much of it is done."
      icon="book-outline"
      color={VIOLET}
    >
      <DetailRow label="Version" value={`v${s.version}`} />
      <DetailRow label="State" value={s.status} />
      <DetailRow
        label="Topics"
        value={`${count(s.completed)} of ${count(s.topics)} complete`}
      />
      <DetailRow
        label="Last moved"
        value={
          s.daysSinceUpdate === null
            ? '—'
            : s.daysSinceUpdate === 0
              ? 'today'
              : `${plural(s.daysSinceUpdate, 'day', 'days')} ago`
        }
        tone={s.delayed ? AMBER : null}
      />
      <ProgressBar
        percent={s.percent}
        color={VIOLET}
        label={`${percent(s.percent)} of the syllabus is complete`}
      />
      {s.delayed ? (
        <NoteStrip tone="warn">
          This syllabus has not moved for {plural(s.daysSinceUpdate, 'day', 'days')}. A course
          whose syllabus has stalled is a course nobody is finishing.
        </NoteStrip>
      ) : null}
    </Section>
  );
}

// ── 6. Attendance ──────────────────────────────────────────────────────────

export function AttendancePanel({ course }) {
  const a = course?.attendance;
  if (!a || a.records === 0) {
    return (
      <Section
        title="Attendance"
        blurb="The register across this course's classes."
        icon="checkbox-outline"
        color={GREEN}
      >
        <CoursesEmpty
          icon="checkbox-outline"
          title="No attendance recorded"
          message="No class has been marked for this course, so it has no attendance figure — it is not at zero percent."
        />
      </Section>
    );
  }
  return (
    <Section
      title="Attendance"
      blurb="The register across this course's classes."
      icon="checkbox-outline"
      color={GREEN}
    >
      <StatRow>
        <StatTile label="Present" value={count(a.present)} icon="checkmark-outline" color={GREEN} />
        <StatTile label="Late" value={count(a.late)} icon="time-outline" color={AMBER} />
        <StatTile label="Absent" value={count(a.absent)} icon="close-outline" color={RED} />
      </StatRow>
      <ProgressBar
        percent={a.attendancePct}
        color={a.belowThreshold ? RED : GREEN}
        label={`${percent(a.attendancePct)} attended — the threshold is ${a.threshold}%`}
      />
      {a.belowThreshold ? (
        <NoteStrip tone="bad">
          This course is below the {a.threshold}% attendance threshold. The dashboard's low
          attendance alert points here.
        </NoteStrip>
      ) : null}
    </Section>
  );
}

// ── 7. Performance ─────────────────────────────────────────────────────────

export function PerformancePanel({ course }) {
  const p = course?.performance;
  if (!p || p.results === 0) {
    return (
      <Section
        title="Performance"
        blurb="How the students who sat this course's exam did."
        icon="trophy-outline"
        color={THEME}
      >
        <CoursesEmpty
          icon="trophy-outline"
          title="No results yet"
          message="This course has not been examined, so it has no pass rate — it is not at zero percent."
        />
      </Section>
    );
  }
  return (
    <Section
      title="Performance"
      blurb="How the students who sat this course's exam did."
      icon="trophy-outline"
      color={THEME}
    >
      <StatRow>
        <StatTile
          label="Pass rate"
          value={percent(p.passPercent)}
          hint={`threshold ${p.threshold}%`}
          icon="trending-up-outline"
          color={p.belowThreshold ? RED : GREEN}
          tone={p.belowThreshold ? 'bad' : 'good'}
        />
        <StatTile
          label="Passed"
          value={count(p.passed)}
          hint={`of ${count(p.results)}`}
          icon="checkmark-outline"
          color={GREEN}
        />
        <StatTile
          label="Average"
          value={count(p.averageMarks)}
          hint={`${percent(p.averagePercent)} of the marks`}
          icon="calculator-outline"
          color={SLATE}
        />
      </StatRow>
      {p.belowThreshold ? (
        <NoteStrip tone="bad">
          This course is below the {p.threshold}% pass threshold. The dashboard's poor performance
          alert points here.
        </NoteStrip>
      ) : null}
      {(p.distribution ?? []).length > 0 ? (
        <>
          <Text style={styles.subLabel}>Grade spread</Text>
          {p.distribution.map((g) => (
            <View key={g.grade} style={styles.gradeRow}>
              <Text style={styles.gradeLetter}>{g.grade}</Text>
              <View style={styles.gradeBarTrack}>
                <View
                  style={[
                    styles.gradeBarFill,
                    {
                      width: `${Math.round((g.count / p.results) * 100)}%`,
                      backgroundColor: g.grade === 'F' ? RED : THEME,
                    },
                  ]}
                />
              </View>
              <Text style={styles.gradeCount}>{g.count}</Text>
            </View>
          ))}
        </>
      ) : null}
    </Section>
  );
}

// ── 8. Curriculum ──────────────────────────────────────────────────────────

export function CurriculumPanel({ course, onMap, onUnmap }) {
  const c = course?.curriculum;
  const declared = c?.declared ?? [];
  return (
    <Section
      title="Curriculum"
      blurb="The programmes the department DECLARES this course for. A curriculum is decided before it is taught."
      icon="git-branch-outline"
      color={CYAN}
      right={
        onMap ? (
          <TouchableOpacity onPress={onMap} activeOpacity={0.75}>
            <Ionicons name="add-circle-outline" size={20} color={THEME} />
          </TouchableOpacity>
        ) : null
      }
    >
      {declared.length === 0 ? (
        <CoursesEmpty
          icon="git-branch-outline"
          title="Not mapped"
          message="No programme declares this course yet."
        />
      ) : (
        declared.map((d) => (
          <View key={d.programId} style={styles.rowCard}>
            <View style={styles.rowHead}>
              <Text style={styles.rowTitle}>{d.programName}</Text>
              <Tag
                label={d.type === 'ELECTIVE' ? 'Elective' : 'Core'}
                color={d.type === 'ELECTIVE' ? VIOLET : THEME}
              />
            </View>
            <DetailRow label="Semester" value={count(d.semester)} />
            {d.isElective ? <DetailRow label="Elective choice" value="Yes" /> : null}
            {onUnmap ? (
              <ActionButton
                label="Unmap"
                icon="unlink-outline"
                color={RED}
                onPress={() => onUnmap(d.programId)}
              />
            ) : null}
          </View>
        ))
      )}
      {c?.unmapped ? (
        <NoteStrip tone="warn">
          This course is TAUGHT but no programme DECLARES it. The offering is the evidence; the
          declaration is the intent — and this one is missing.
        </NoteStrip>
      ) : null}
    </Section>
  );
}

// ── 9. Prerequisites ───────────────────────────────────────────────────────

export function PrerequisitesPanel({ course, onAdd, onRemove }) {
  const requires = course?.prerequisites ?? [];
  const requiredBy = course?.prerequisiteFor ?? [];
  return (
    <Section
      title="Prerequisites"
      blurb="What this course demands first, and who is waiting for it."
      icon="git-compare-outline"
      color={AMBER}
      right={
        onAdd ? (
          <TouchableOpacity onPress={onAdd} activeOpacity={0.75}>
            <Ionicons name="add-circle-outline" size={20} color={THEME} />
          </TouchableOpacity>
        ) : null
      }
    >
      <Text style={styles.subLabel}>This course demands</Text>
      {requires.length === 0 ? (
        <Text style={styles.plainLine}>
          Nothing. This course has no prerequisites.
        </Text>
      ) : (
        requires.map((p) => {
          const meta = prerequisiteTypeMeta(p.type);
          return (
            <View key={p.id} style={styles.prereqRow}>
              <Ionicons name="arrow-up-circle-outline" size={15} color={meta?.color ?? SLATE} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.rowMeta}>{p.code}</Text>
              </View>
              <Tag label={meta?.label ?? p.type} color={meta?.color ?? SLATE} />
              {onRemove ? (
                <TouchableOpacity onPress={() => onRemove(p.courseId)} activeOpacity={0.75}>
                  <Ionicons name="close-circle-outline" size={16} color={MUTED} />
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      )}

      <Text style={styles.subLabel}>Waiting for this course</Text>
      {requiredBy.length === 0 ? (
        <Text style={styles.plainLine}>
          Nothing. No course in the department demands this one yet.
        </Text>
      ) : (
        requiredBy.map((p) => {
          const meta = prerequisiteTypeMeta(p.type);
          return (
            <View key={p.id} style={styles.prereqRow}>
              <Ionicons name="arrow-down-circle-outline" size={15} color={meta?.color ?? SLATE} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.rowMeta}>{p.code}</Text>
              </View>
              <Tag label={meta?.label ?? p.type} color={meta?.color ?? SLATE} />
            </View>
          );
        })
      )}
    </Section>
  );
}

// ── 10. History ────────────────────────────────────────────────────────────

export function HistoryPanel({ course }) {
  const h = course?.history;
  const entries = h?.entries ?? [];
  return (
    <Section
      title="History"
      blurb="Every change to this course, and who made it."
      icon="time-outline"
      color={SLATE}
    >
      {entries.length === 0 ? (
        <CoursesEmpty
          icon="time-outline"
          title="Nothing recorded yet"
          message="The first edit, archive or curriculum change will appear here."
        />
      ) : (
        entries.map((e) => (
          <View key={e.id} style={styles.historyRow}>
            <View style={styles.historyDot} />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{e.action}</Text>
              <Text style={styles.rowMeta}>
                {e.actorName} · {timeAgo(e.createdAt)}
              </Text>
            </View>
          </View>
        ))
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  rowCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  rowMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  rollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rollMain: { flex: 1 },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dayLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, width: 34 },
  slotText: { fontSize: 12, color: theme.colors.text, fontWeight: '600' },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  plainLine: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },

  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  gradeLetter: { fontSize: 12, fontWeight: '800', color: theme.colors.text, width: 18 },
  gradeBarTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  gradeBarFill: { height: 7, borderRadius: 4 },
  gradeCount: { fontSize: 11, fontWeight: '700', color: theme.colors.text, width: 22, textAlign: 'right' },

  prereqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SLATE },
});
