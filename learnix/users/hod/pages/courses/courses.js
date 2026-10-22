/**
 * HD-06 — The HOD's Courses desk: the directory.
 * Docs: 11-hod.md §3.3
 *
 * THE SCREEN, AND WHAT IT IS FOR
 * ------------------------------
 * A HOD opens this tab to answer one question: "which of my courses is in trouble?" So every row
 * carries its health, its attendance and its pass rate — because an answer that needs a second
 * click per course is an answer that does not get asked.
 *
 * THAT IS ALSO WHY THE DASHBOARD'S TWO ALERTS ROUTE HERE
 * ------------------------------------------------------
 * `LOW_ATTENDANCE` and `POOR_PERFORMANCE` both point at this tab. Before this desk existed, the
 * tab showed neither attendance nor performance — the alert fired and navigated to a screen that
 * could not show the thing that fired. A route that cannot show its own alert is a broken route,
 * so this screen shows both figures on every row.
 *
 * THE FILTERS ARE THE SERVER'S
 * -----------------------------
 * The status list, the type list, the sorts and the thresholds come from
 * `GET /hod/courses/catalogue`. The mirror in `coursesMeta.js` is the fallback for the frame
 * before the catalogue lands, and the audit script asserts the two never drift.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import {
  ActionButton,
  ChipRow,
  CoursesEmpty,
  CoursesScreen,
  HealthBadge,
  NoteStrip,
  SearchBox,
  StatRow,
  StatTile,
  Tag,
  useCourses,
} from './coursesUi';
import {
  AMBER,
  COURSE_SORTS,
  COURSE_STATUSES,
  COURSE_TYPES,
  GREEN,
  RED,
  SLATE,
  THEME,
  countTone,
  courseTypeMeta,
  count,
  percent,
  plural,
  statusChip,
  statusIcon,
} from './coursesMeta';

export default function CoursesModule({ navigation }) {
  const [status, setStatus] = useState(null);
  const [type, setType] = useState(null);
  const [sort, setSort] = useState('code');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');

  // THE CATALOGUE, once. It is the SERVER's vocabulary and it does not change when the filter does.
  const catalogue = useCourses(() => hodApi.coursesCatalogue(), []);

  // THE DIRECTORY, and it reloads whenever a filter changes.
  const queryKey = `${status ?? ''}|${type ?? ''}|${sort}|${query}|${page}`;
  const directory = useCourses(
    () =>
      hodApi.coursesDirectory({
        status: status ?? undefined,
        type: type ?? undefined,
        sort,
        search: query || undefined,
        page,
      }),
    [queryKey],
  );

  // THE SEARCH IS DEBOUNCED, because a search that fires a request per keystroke is a search
  // that queues behind itself on a slow connection.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const reload = useCallback(() => {
    catalogue.reload();
    directory.reload();
  }, [catalogue, directory]);

  // THE VOCABULARY, preferring the server's list and falling back to the MIRROR.
  //
  // The fallback is the mirror in `coursesMeta.js` — ONE list, not a second copy written here.
  // A second copy in the screen is a list that eventually disagrees with the mirror, and the
  // mirror is the thing the audit script checks against the server.
  const statusOptions = useMemo(() => {
    const server = catalogue.data?.statuses;
    if (Array.isArray(server) && server.length) {
      return server.map((s) => ({ id: s.id, label: s.label, color: s.color }));
    }
    return COURSE_STATUSES.map((s) => ({ id: s.id, label: s.label, color: s.color }));
  }, [catalogue.data]);

  const typeOptions = useMemo(() => {
    const server = catalogue.data?.types;
    if (Array.isArray(server) && server.length) {
      return server.map((t) => ({
        id: t.id,
        label: t.label ?? courseTypeMeta(t.id)?.label ?? t.id,
        color: t.color ?? courseTypeMeta(t.id)?.color ?? THEME,
      }));
    }
    return COURSE_TYPES.map((t) => ({ id: t.id, label: t.label, color: t.color }));
  }, [catalogue.data]);

  const sortOptions = useMemo(() => {
    const server = catalogue.data?.sorts;
    if (Array.isArray(server) && server.length) {
      return server.map((s) => ({ id: s.id, label: s.label }));
    }
    return COURSE_SORTS.map((s) => ({ id: s.id, label: s.label }));
  }, [catalogue.data]);

  const data = directory.data;
  const totals = data?.totals ?? {};
  const courses = data?.courses ?? [];
  const pagination = data?.pagination ?? null;

  const openCourse = (courseId) => {
    // THE PARAM CHANNEL. The shell carries `route.params` to the module, so the detail screen
    // knows WHICH course it is showing.
    navigation?.openModule?.('CourseDetail', { courseId });
  };

  return (
    <CoursesScreen
      loading={directory.loading && !data}
      refreshing={directory.refreshing}
      error={directory.error}
      onRetry={directory.reload}
      onRefresh={reload}
    >
      {/* ── The counters ─────────────────────────────────────────────────── */}
      <StatRow>
        <StatTile
          label="Courses"
          value={count(totals.courses)}
          hint={`${count(totals.active)} active`}
          icon="book-outline"
          color={THEME}
        />
        <StatTile
          label="Healthy"
          value={count(totals.healthy)}
          hint="all measured parts in order"
          icon="pulse-outline"
          color={GREEN}
          tone={totals.healthy > 0 ? 'good' : 'clear'}
        />
        <StatTile
          label="Needs work"
          value={count((totals.watch ?? 0) + (totals.atRisk ?? 0))}
          hint={`${count(totals.atRisk)} at risk`}
          icon="alert-circle-outline"
          color={totals.atRisk > 0 ? RED : AMBER}
          tone={countTone((totals.watch ?? 0) + (totals.atRisk ?? 0))}
        />
      </StatRow>

      {/* ── The filters ──────────────────────────────────────────────────── */}
      <View style={styles.filterBlock}>
        <SearchBox
          value={search}
          onChangeText={setSearch}
          placeholder="Search by code or name"
        />
        <ChipRow
          options={[{ id: null, label: 'All', color: THEME }, ...statusOptions]}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <ChipRow
          options={[{ id: null, label: 'Any type', color: THEME }, ...typeOptions]}
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
        />
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort</Text>
          <ChipRow
            options={sortOptions}
            value={sort}
            onChange={(v) => {
              setSort(v);
              setPage(1);
            }}
          />
        </View>
      </View>

      {/* ── The list ─────────────────────────────────────────────────────── */}
      {courses.length === 0 ? (
        <CoursesEmpty
          icon="book-outline"
          title={totals.courses === 0 ? 'No courses yet' : 'Nothing matches'}
          message={
            totals.courses === 0
              ? 'Courses appear here once the Admin adds them to your department.'
              : 'No course matches these filters. Clear the search or the filters to see them all.'
          }
        />
      ) : (
        courses.map((c) => {
          const chip = statusChip(c.status);
          const typeMeta = courseTypeMeta(c.type);
          const legs = c.health?.legs ?? {};
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.card}
              onPress={() => openCourse(c.id)}
              activeOpacity={0.75}
            >
              <View style={styles.cardHead}>
                <View
                  style={[
                    styles.codeBox,
                    { backgroundColor: `${typeMeta?.color ?? THEME}18` },
                  ]}
                >
                  <Text
                    style={[styles.codeText, { color: typeMeta?.color ?? THEME }]}
                    numberOfLines={1}
                  >
                    {c.code}
                  </Text>
                </View>
                <View style={styles.cardHeadBody}>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    Sem {c.semester} · {c.credits} credits ·{' '}
                    {plural(c.offerings ?? 0, 'subject', 'subjects')} ·{' '}
                    {plural(c.programs ?? 0, 'programme', 'programmes')}
                  </Text>
                </View>
                <View style={styles.chipCol}>
                  <Tag
                    label={chip.label}
                    color={chip.color}
                    bg={chip.bg}
                  />
                </View>
              </View>

              {/* THE TWO FIGURES THE DASHBOARD'S ALERTS ROUTE HERE TO SEE. */}
              <View style={styles.legRow}>
                <View style={styles.legItem}>
                  <Ionicons name="checkbox-outline" size={12} color={SLATE} />
                  <Text style={styles.legText}>Attendance {percent(legs.attendance)}</Text>
                </View>
                <View style={styles.legItem}>
                  <Ionicons name="trophy-outline" size={12} color={SLATE} />
                  <Text style={styles.legText}>Pass {percent(legs.results)}</Text>
                </View>
                <View style={styles.legItem}>
                  <Ionicons name="book-outline" size={12} color={SLATE} />
                  <Text style={styles.legText}>Syllabus {percent(legs.syllabus)}</Text>
                </View>
              </View>

              <View style={styles.cardFoot}>
                <HealthBadge
                  score={c.health?.score}
                  band={c.health?.band}
                  weakest={
                    c.health?.weakest
                      ? (c.health.weakest === 'ATTENDANCE'
                          ? 'attendance'
                          : c.health.weakest === 'SYLLABUS'
                            ? 'syllabus'
                            : 'results')
                      : null
                  }
                />
                <View style={styles.statusRow}>
                  <Ionicons
                    name={statusIcon(c.status)}
                    size={12}
                    color={chip.color}
                  />
                  <Text style={[styles.statusText, { color: chip.color }]}>{chip.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* ── The pagination ──────────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 ? (
        <View style={styles.pager}>
          <ActionButton
            label="Previous"
            icon="chevron-back-outline"
            color={SLATE}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrev}
          />
          <Text style={styles.pagerText}>
            Page {pagination.page} of {pagination.totalPages} · {plural(pagination.total, 'course', 'courses')}
          </Text>
          <ActionButton
            label="Next"
            icon="chevron-forward-outline"
            color={SLATE}
            onPress={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNext}
          />
        </View>
      ) : null}

      {/* ── The footnote ─────────────────────────────────────────────────── */}
      <NoteStrip>
        A course with no attendance, no syllabus and no results yet has NO health score. It is
        unmeasured, not unhealthy — so it is left out of the score rather than counted as a zero.
      </NoteStrip>

      {/* THE CREATION RULE, STATED RATHER THAN FAKED.
          The old screen had a "New Course" button that opened an alert saying the Admin creates
          courses. A button that opens an alert is a dead button, and a dead button teaches the
          reader that the screen's controls are decorative. So the rule is a NOTE, and the note
          names who does it. */}
      <View style={styles.createNote}>
        <Ionicons name="information-circle-outline" size={14} color={SLATE} />
        <Text style={styles.createText}>
          A course is created by the Admin. You can edit one, archive one, and map it to a
          programme.
        </Text>
      </View>
    </CoursesScreen>
  );
}

const styles = StyleSheet.create({
  filterBlock: { marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },

  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sortLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeBox: {
    width: 54,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  codeText: { fontSize: 10, fontWeight: '800' },
  cardHeadBody: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  meta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  chipCol: { alignItems: 'flex-end' },

  legRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legText: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  pagerText: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },

  createNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.md,
    paddingHorizontal: 4,
  },
  createText: {
    flex: 1,
    fontSize: 10,
    color: theme.colors.textMuted,
    lineHeight: 14,
  },
});
