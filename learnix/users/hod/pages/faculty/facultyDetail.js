/**
 * HD-02 — The HOD's Faculty desk: the individual faculty view.
 * Docs: 11-hod.md §3.2
 *
 * THE CHAIN
 * ---------
 *   Faculty → Assigned Subjects → Classes → Workload → Attendance → Syllabus
 *         → Student Performance → Activity History
 *
 * ONE CALL, because the chain is a chain: a HOD opens a teacher and wants their subjects, their
 * classes, their workload, their attendance, their syllabus and their students' results
 * TOGETHER. Six round trips to assemble one screen is six chances to show a half-drawn teacher.
 *
 * THE PARAM CHANNEL
 * -----------------
 * The screen is registered in the shell's `FEATURE_MODULES` as `FacultyDetail`, and the shell
 * passes `route.params`. The teacher arrives as `route.params.userId`.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import {
  BandChip,
  DetailRow,
  FacultyEmpty,
  FacultyScreen,
  InsightBreakdown,
  InsightGauge,
  NoteStrip,
  ProgressBar,
  Section,
  StatRow,
  StatTile,
  Tag,
  WorkloadBar,
  useFaculty,
} from './facultyUi';
import {
  AMBER,
  GREEN,
  RED,
  SLATE,
  THEME,
  VIOLET,
  count,
  dayName,
  hours,
  percent,
  plural,
  timeAgo,
  workloadBandMeta,
} from './facultyMeta';

export default function FacultyDetailScreen({ navigation, route }) {
  const userId = route?.params?.userId ?? null;

  const detail = useFaculty(
    () => (userId ? hodApi.facultyDetail2(userId) : Promise.resolve(null)),
    [userId],
  );

  const data = detail.data;
  const faculty = data?.faculty ?? null;
  const band = workloadBandMeta(data?.workload?.band);
  const workload = data?.workload;
  const activity = data?.activity;

  if (!userId) {
    return (
      <FacultyScreen loading={false} refreshing={false} error={null} onRetry={() => {}} onRefresh={() => {}}>
        <NoteStrip tone="warn">
          No teacher was named, so there is nothing to show. Open a teacher from the Faculty tab.
        </NoteStrip>
      </FacultyScreen>
    );
  }

  return (
    <FacultyScreen
      loading={detail.loading && !data}
      refreshing={detail.refreshing}
      error={detail.error}
      onRetry={detail.reload}
      onRefresh={detail.reload}
    >
      {/* ── The masthead ────────────────────────────────────────────────── */}
      <View style={styles.masthead}>
        <View style={styles.mastheadTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(faculty?.name ?? '?').charAt(0)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.title} numberOfLines={2}>
              {faculty?.name ?? '—'}
            </Text>
            <Text style={styles.meta}>
              {faculty?.designation} · {data?.department?.name}
            </Text>
          </View>
          <BandChip band={band} />
        </View>
        {data?.leave?.onLeaveNow ? (
          <View style={styles.leaveStrip}>
            <Ionicons name="moon-outline" size={14} color={AMBER} />
            <Text style={styles.leaveText}>On leave today</Text>
          </View>
        ) : null}
      </View>

      {/* ── The performance insight ──────────────────────────────────────── */}
      <InsightGauge insight={data?.insight} />

      <Section
        title="What the insight is made of"
        blurb="The four measures, and the ones left out."
        icon="pie-chart-outline"
        color={SLATE}
      >
        <InsightBreakdown insight={data?.insight} />
      </Section>

      {/* ── The workload ─────────────────────────────────────────────────── */}
      <Section
        title="Workload"
        blurb="Assigned hours against this teacher's own maximum, and how much was actually delivered."
        icon="speedometer-outline"
        color={THEME}
      >
        <WorkloadBar
          assigned={workload?.assignedWeeklyHours ?? 0}
          max={workload?.maxWorkloadHours ?? 0}
          band={band}
        />
        <StatRow>
          <StatTile
            label="Assigned"
            value={hours(workload?.assignedWeeklyHours)}
            hint="a week"
            icon="calendar-outline"
            color={THEME}
          />
          <StatTile
            label="Delivered"
            value={hours(workload?.deliveredHours)}
            hint="of the classes held"
            icon="checkmark-done-outline"
            color={GREEN}
          />
          <StatTile
            label="Free"
            value={hours(workload?.freeHours)}
            hint="room to teach"
            icon="add-circle-outline"
            color={VIOLET}
            tone={workload?.freeHours < 0 ? 'bad' : 'clear'}
          />
        </StatRow>
        {workload?.deliveryPct === null ? (
          <NoteStrip>
            No class has been recorded yet, so there is no delivery figure — which is a different
            thing from delivering none of it.
          </NoteStrip>
        ) : null}
      </Section>

      {/* ── The subjects and the classes ────────────────────────────────── */}
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
                <Tag
                  label={`${plural(s.classes, 'class', 'classes')}`}
                  color={VIOLET}
                />
              </View>
              <Text style={styles.rowMeta}>{s.name}</Text>
              <DetailRow label="Weekly hours" value={hours(s.weeklyHours)} />
            </View>
          ))
        )}
      </Section>

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
                tone={
                  c.attendance.pct !== null && c.attendance.pct < 75 ? AMBER : null
                }
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
                      color={CYAN_SAFE}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ))
        )}
      </Section>

      {/* ── The attendance ───────────────────────────────────────────────── */}
      <Section
        title="Attendance"
        blurb="The register across this teacher's classes."
        icon="checkbox-outline"
        color={GREEN}
      >
        <StatRow>
          <StatTile label="Present" value={count(data?.attendance?.present)} icon="checkmark-outline" color={GREEN} />
          <StatTile label="Late" value={count(data?.attendance?.late)} icon="time-outline" color={AMBER} />
          <StatTile label="Absent" value={count(data?.attendance?.absent)} icon="close-outline" color={RED} />
        </StatRow>
        <ProgressBar
          percent={data?.attendance?.pct}
          color={(data?.attendance?.pct ?? 0) < 75 ? RED : GREEN}
          label={
            data?.attendance?.records
              ? `${percent(data.attendance.pct)} across ${plural(data.attendance.records, 'record', 'records')}`
              : 'No class has been marked for this teacher yet'
          }
        />
      </Section>

      {/* ── The syllabus ─────────────────────────────────────────────────── */}
      <Section
        title="Syllabus"
        blurb="How much of their courses' syllabus is complete."
        icon="book-outline"
        color={VIOLET}
      >
        {data?.syllabus?.topics === 0 ? (
          <FacultyEmpty
            icon="book-outline"
            title="No syllabus"
            message="None of this teacher's courses has a syllabus yet — which is not the same as a syllabus that is zero percent done."
          />
        ) : (
          <>
            <ProgressBar
              percent={data?.syllabus?.percent}
              color={data?.syllabus?.stale > 0 ? AMBER : VIOLET}
              label={`${count(data?.syllabus?.completed)} of ${count(
                data?.syllabus?.topics,
              )} topics complete`}
            />
            {(data?.syllabus?.versions ?? []).map((v: any) => (
              <DetailRow
                key={v.courseId}
                label={`v${v.version} · ${v.status}`}
                value={`${v.completed}/${v.topics}`}
              />
            ))}
            {data?.syllabus?.stale > 0 ? (
              <NoteStrip tone="warn">
                {plural(data.syllabus.stale, 'syllabus', 'syllabi')} of this teacher's{' '}
                {plural(data.syllabus.courses, 'course', 'courses')} have not moved in a month.
              </NoteStrip>
            ) : null}
          </>
        )}
      </Section>

      {/* ── The student performance ──────────────────────────────────────── */}
      <Section
        title="Student performance"
        blurb="How the students in this teacher's classes did."
        icon="trophy-outline"
        color={THEME}
      >
        {data?.performance?.results === 0 ? (
          <FacultyEmpty
            icon="trophy-outline"
            title="No results yet"
            message="None of this teacher's classes has been examined, so there is no pass rate — it is not zero percent."
          />
        ) : (
          <StatRow>
            <StatTile
              label="Pass rate"
              value={percent(data?.performance?.passPercent)}
              hint={`${count(data?.performance?.passed)} of ${count(data?.performance?.results)}`}
              icon="trending-up-outline"
              color={(data?.performance?.passPercent ?? 0) < 75 ? RED : GREEN}
              tone={(data?.performance?.passPercent ?? 0) < 75 ? 'bad' : 'good'}
            />
            <StatTile
              label="Passed"
              value={count(data?.performance?.passed)}
              icon="checkmark-circle-outline"
              color={GREEN}
            />
            <StatTile
              label="Failed"
              value={count(data?.performance?.failed)}
              icon="close-circle-outline"
              color={RED}
            />
          </StatRow>
        )}
      </Section>

      {/* ── The activity ─────────────────────────────────────────────────── */}
      <Section
        title="Activity history"
        blurb="What this teacher has actually done, counted from the records themselves."
        icon="time-outline"
        color={SLATE}
      >
        <StatRow>
          <StatTile label="Notes" value={count(activity?.notes)} icon="document-text-outline" color={VIOLET} />
          <StatTile label="Assignments" value={count(activity?.assignments)} icon="clipboard-outline" color={THEME} />
          <StatTile label="Classes marked" value={count(activity?.sessionsTaken)} icon="checkbox-outline" color={GREEN} />
        </StatRow>
        <StatRow>
          <StatTile label="Syllabus versions" value={count(activity?.syllabusVersions)} icon="book-outline" color={VIOLET} />
          <StatTile label="Papers evaluated" value={count(activity?.evaluations)} icon="reader-outline" color={AMBER} />
          <StatTile
            label="Leave"
            value={count(data?.leave?.pending)}
            hint="requests pending"
            icon="calendar-outline"
            color={SLATE}
          />
        </StatRow>
        {(activity?.recent ?? []).length > 0 ? (
          <>
            <Text style={styles.subLabel}>Recent moves</Text>
            {activity.recent.map((r: any) => (
              <View key={r.id} style={styles.historyRow}>
                <View style={styles.historyDot} />
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{r.action}</Text>
                  <Text style={styles.rowMeta}>
                    {r.byThem ? 'By this teacher' : 'By the office'} · {timeAgo(r.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : null}
      </Section>
    </FacultyScreen>
  );
}

const CYAN_SAFE = '#0891b2';

const styles = StyleSheet.create({
  flex: { flex: 1 },

  masthead: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  mastheadTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${THEME}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '800', color: THEME },
  title: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  meta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  leaveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  leaveText: { fontSize: 11, fontWeight: '700', color: AMBER },

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
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  rowMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  timetableRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
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
