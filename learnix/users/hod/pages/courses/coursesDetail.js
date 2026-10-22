/**
 * HD-02 — The HOD's Courses desk: the course detail.
 * Docs: 11-hod.md §3.3
 *
 * THE WHOLE COURSE, IN ONE SCREEN
 * -------------------------------
 * The chain is a chain: a HOD opens a course and wants its subjects, faculty, students, timetable,
 * syllabus, attendance and results TOGETHER. So the screen asks the server for the whole course in
 * one call and draws the panels from it — rather than making six round trips to assemble one
 * screen, which is six chances to show a half-drawn course.
 *
 * THE PARAM CHANNEL
 * -----------------
 * The screen is registered in the shell's `FEATURE_MODULES` as `CourseDetail`, and the shell
 * passes `route.params`. The course id arrives as `route.params.courseId`.
 *
 * `navigation.openModule('CourseDetail', { courseId })` is what opens it, and the directory's
 * course cards call exactly that.
 *
 * THE WRITES
 * ----------
 * The HOD may edit the course, change its status, map it to a programme and change its
 * prerequisites. The HOD may NOT create one — a course is created by the Admin — and the screen
 * says so rather than offering a button that opens an alert.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import {
  ActionButton,
  CoursesScreen,
  HealthBreakdown,
  HealthGauge,
  NoteStrip,
  Section,
  Tag,
  useCourses,
} from './coursesUi';
import {
  AMBER,
  GREEN,
  THEME,
  courseTypeMeta,
  statusActionIcon,
  statusActionLabel,
  statusActionTarget,
  statusChip,
} from './coursesMeta';
import {
  EditCourseSheet,
  MapCourseSheet,
  PrerequisiteSheet,
} from './coursesDetailActions';
import {
  AttendancePanel,
  CurriculumPanel,
  FacultyPanel,
  HistoryPanel,
  PerformancePanel,
  PrerequisitesPanel,
  StudentsPanel,
  SubjectsPanel,
  SyllabusPanel,
  TimetablePanel,
} from './coursesDetailPanels';

export default function CourseDetailScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const courseId = params.courseId ?? null;

  const [sheet, setSheet] = useState(null); // 'edit' | 'map' | 'prereq' | null
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  const detail = useCourses(
    () => (courseId ? hodApi.courseDetail2(courseId) : Promise.resolve(null)),
    [courseId],
  );

  // THE SIBLING COURSES, for the prerequisite picker. The directory's list is enough — the
  // prerequisite sheet needs the department's other courses, and it needs their codes and
  // semesters.
  const siblings = useCourses(() => hodApi.coursesDirectory({}), []);

  const data = detail.data;
  const course = data?.course ?? null;
  const chip = statusChip(course?.status);
  const typeMeta = courseTypeMeta(course?.type);

  const reloadAll = useCallback(() => {
    detail.reload();
    siblings.reload();
  }, [detail, siblings]);

  // A NOTICE FROM A WRITE. The server returns one — "Archived. This course still has 2 live
  // offerings" — and it is shown here rather than in a toast, because a toast disappears before
  // it has been read.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const runWrite = async (fn, onDone) => {
    setSaving(true);
    setActionError(null);
    try {
      const res = await fn();
      setSheet(null);
      reloadAll();
      if (res?.notice) setNotice(res.notice);
      onDone?.(res);
    } catch (e) {
      setActionError(e.message || 'That did not work.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = () => {
    if (!course) return;
    const next = statusActionTarget(course.status);
    runWrite(() => hodApi.setCourseStatus(course.id, next));
  };

  if (!courseId) {
    return (
      <CoursesScreen loading={false} refreshing={false} error={null} onRetry={() => {}} onRefresh={() => {}}>
        <NoteStrip tone="warn">
          No course was named, so there is nothing to show. Open a course from the Courses tab.
        </NoteStrip>
      </CoursesScreen>
    );
  }

  return (
    <CoursesScreen
      loading={detail.loading && !data}
      refreshing={detail.refreshing}
      error={detail.error}
      onRetry={detail.reload}
      onRefresh={reloadAll}
    >
      {/* ── The masthead ────────────────────────────────────────────────── */}
      <View style={styles.masthead}>
        <View style={styles.mastheadTop}>
          <View
            style={[
              styles.codeBox,
              { backgroundColor: `${typeMeta?.color ?? THEME}18` },
            ]}
          >
            <Text style={[styles.codeText, { color: typeMeta?.color ?? THEME }]}>
              {course?.code ?? '—'}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.title} numberOfLines={2}>
              {course?.name ?? '—'}
            </Text>
            <Text style={styles.meta}>
              Sem {course?.semester} · {course?.credits} credits ·{' '}
              {typeMeta?.label ?? course?.type}
            </Text>
          </View>
          <Tag label={chip.label} color={chip.color} bg={chip.bg} />
        </View>

        <View style={styles.actionRow}>
          <ActionButton
            label="Edit course"
            icon="create-outline"
            color={THEME}
            onPress={() => {
              setActionError(null);
              setSheet('edit');
            }}
          />
          <ActionButton
            label={statusActionLabel(course?.status)}
            icon={statusActionIcon(course?.status)}
            color={course?.status === 'ARCHIVED' ? GREEN : AMBER}
            onPress={changeStatus}
            disabled={saving}
          />
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={14} color={THEME} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}
      </View>

      {/* ── The health ──────────────────────────────────────────────────── */}
      <HealthGauge health={data?.health} />

      <Section
        title="What the score is made of"
        blurb="The three measures, and the ones left out."
        icon="pie-chart-outline"
        color={SLATE}
      >
        <HealthBreakdown health={data?.health} />
      </Section>

      {/* ── The chain ───────────────────────────────────────────────────── */}
      <SubjectsPanel course={data} />
      <FacultyPanel course={data} />
      <StudentsPanel course={data} />
      <TimetablePanel course={data} />
      <SyllabusPanel course={data} />
      <AttendancePanel course={data} />
      <PerformancePanel course={data} />

      {/* ── The curriculum and the graph ────────────────────────────────── */}
      <CurriculumPanel
        course={data}
        onMap={() => {
          setActionError(null);
          setSheet('map');
        }}
        onUnmap={(programId) =>
          runWrite(() => hodApi.unmapCourseFromProgram(course.id, programId))
        }
      />
      <PrerequisitesPanel
        course={data}
        onAdd={() => {
          setActionError(null);
          setSheet('prereq');
        }}
        onRemove={(prerequisiteCourseId) =>
          runWrite(() =>
            hodApi.removeCoursePrerequisite(course.id, prerequisiteCourseId),
          )
        }
      />

      <HistoryPanel course={data} />

      {/* ── The sheets ──────────────────────────────────────────────────── */}
      <EditCourseSheet
        visible={sheet === 'edit'}
        course={course}
        onClose={() => setSheet(null)}
        saving={saving}
        error={actionError}
        onSave={(body) => runWrite(() => hodApi.updateCourse(course.id, body))}
      />
      <MapCourseSheet
        visible={sheet === 'map'}
        course={data}
        onClose={() => setSheet(null)}
        saving={saving}
        error={actionError}
        onMap={(body) => runWrite(() => hodApi.mapCourseToProgram(course.id, body))}
        onUnmap={(programId) =>
          runWrite(() => hodApi.unmapCourseFromProgram(course.id, programId))
        }
      />
      <PrerequisiteSheet
        visible={sheet === 'prereq'}
        course={data}
        courses={siblings.data?.courses ?? []}
        onClose={() => setSheet(null)}
        saving={saving}
        error={actionError}
        onAdd={(body) => runWrite(() => hodApi.addCoursePrerequisite(course.id, body))}
      />
    </CoursesScreen>
  );
}

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
  codeBox: {
    width: 58,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  codeText: { fontSize: 10, fontWeight: '800' },
  title: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  meta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.sm,
    backgroundColor: `${THEME}0d`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noticeText: { flex: 1, fontSize: 11, color: THEME, fontWeight: '600', lineHeight: 15 },
});
