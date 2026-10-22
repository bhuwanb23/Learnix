/**
 * HD-06 — The HOD's Courses desk: the detail's panels.
 * Docs: 11-hod.md §3.3
 *
 * THE COURSE ITSELF
 * -----------------
 *   Subjects → Faculty → Students → Timetable → Syllabus
 *
 * "SUBJECTS" ARE THE COURSE'S OFFERINGS, and that is not a renaming — it is what the platform
 * means. `Evaluation.subjectOffering` is a `CourseOffering`, the exam cell's "course & subject
 * allocation" block compares `ExamSlot.offerings` against the course offerings, and every
 * "subject" in this platform is a course taught to one section by one teacher. So the Subjects
 * panel lists the course's offerings, each with its section, its teacher and its student count.
 *
 * THE MEASUREMENTS AND THE GRAPH
 * ------------------------------
 * Attendance, performance, the curriculum, the prerequisites and the history live in
 * `coursesDetailResults.js` — they are the same shapes drawn from a different part of the
 * response, and the file that draws the course itself is already long enough.
 *
 * THE COUNTS ARE TRUE COUNTS
 * --------------------------
 * A panel that says "12 students" because it fetched 12 students is worse than one that says
 * nothing, because it looks measured. So every count here is the server's total.
 */
import React from 'react';
import { Text, View } from 'react-native';
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
import { AMBER, GREEN, SLATE, THEME, VIOLET, count, dayName, percent, plural } from './coursesMeta';
import { styles } from './coursesDetailStyles';

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
              <Tag label={`${plural(s.students ?? 0, 'student', 'students')}`} color={THEME} />
            </View>
            <DetailRow label="Teacher" value={s.teacherName} />
            <DetailRow label="Weekly slots" value={count(s.weeklySlots)} />
            <DetailRow
              label="Weekly hours"
              value={count(s.weeklyHours)}
              tone={s.weeklyHours === 0 ? AMBER : null}
            />
            {s.teacherEmail ? <DetailRow label="Contact" value={s.teacherEmail} /> : null}
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
      color="#0891b2"
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
