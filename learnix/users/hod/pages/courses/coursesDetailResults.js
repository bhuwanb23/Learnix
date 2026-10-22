/**
 * HD-06 — The HOD's Courses desk: the measurements and the graph.
 * Docs: 11-hod.md §3.3
 *
 *   Attendance → Performance → Curriculum → Prerequisites → History
 *
 * A NUMBER WITH NO DATA IS AN EM DASH, NOT A ZERO
 * ------------------------------------------------
 * A course with no results has NO pass rate. Drawing "0%" reports a failing course where the
 * truth is an unexamined one, and the reader has no way to tell those apart. The same rule holds
 * for the attendance and the syllabus: a course nobody has marked has no attendance figure, and
 * a course with no syllabus has no syllabus progress.
 *
 * THE CURRICULUM AND THE GRAPH
 * ----------------------------
 * The curriculum is the department's **declaration** — which programmes run this course — and the
 * graph is what the course demands first. A course that is taught but never declared is
 * reported, because that gap is the single most useful thing the screen can tell a HOD.
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  percent,
  prerequisiteTypeMeta,
  timeAgo,
} from './coursesMeta';
import { styles } from './coursesDetailStyles';

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
                      width: `${g.percent}%`,
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
        <Text style={styles.plainLine}>Nothing. This course has no prerequisites.</Text>
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
