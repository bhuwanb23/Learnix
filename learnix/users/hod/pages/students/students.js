/**
 * HD-05 — The HOD's Students desk: the directory screen.
 * Docs: 11-hod.md §3.4
 *
 * THE SCREEN, AND WHAT IT IS FOR
 * ------------------------------
 * A HOD opens this tab to answer "who needs me this term?". So the screen opens with the ANSWER —
 * the at-risk list — and the directory of every student is under it, because the list is the work
 * and the directory is the context.
 *
 * THE FILTERS ARE THE SERVER'S
 * -----------------------------
 * The risk states, the sorts and the thresholds come from `GET /hod/students/catalogue`. The
 * mirror in `studentsMeta.js` is the fallback for the frame before the catalogue lands, and the
 * audit script asserts the two never drift.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import {
  ChipRow,
  NoteStrip,
  SearchBox,
  StatRow,
  StatTile,
  StudentsEmpty,
} from './studentsUi';
import { StudentsScreen, useStudents } from './studentsFrame';
import { AtRiskPanel } from './studentsAtRisk';
import { StudentRow } from './studentsRow';
import {
  AMBER,
  GREEN,
  RED,
  SLATE,
  THEME,
  count,
  countTone,
  RISK_STATES,
  STUDENT_SORTS,
} from './studentsMeta';

export default function StudentsModule({ navigation }) {
  const [risk, setRisk] = useState(null);
  const [semester, setSemester] = useState(null);
  const [sort, setSort] = useState('name');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  // THE CATALOGUE, once. It is the SERVER's vocabulary and it does not change when the filter does.
  const catalogue = useStudents(() => hodApi.studentsCatalogue(), []);

  // THE DIRECTORY, and it reloads whenever a filter changes.
  const queryKey = `${risk ?? ''}|${semester ?? ''}|${sort}|${query}`;
  const directory = useStudents(
    () =>
      hodApi.studentsDirectory({
        risk: risk ?? undefined,
        semester: semester ?? undefined,
        sort,
        search: query || undefined,
      }),
    [queryKey],
  );

  // THE SEARCH IS DEBOUNCED, because a search that fires a request per keystroke is a search
  // that queues behind itself on a slow connection.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const reload = useCallback(() => {
    catalogue.reload();
    directory.reload();
  }, [catalogue, directory]);

  // THE VOCABULARY, preferring the server's lists and falling back to the MIRROR.
  const riskOptions = useMemo(() => {
    const server = catalogue.data?.riskStates;
    if (Array.isArray(server) && server.length) {
      return server.map((s: any) => ({ id: s.id, label: s.label, color: s.color }));
    }
    return RISK_STATES.map((s) => ({ id: s.id, label: s.label, color: s.color }));
  }, [catalogue.data]);

  const sortOptions = useMemo(() => {
    const server = catalogue.data?.sorts;
    if (Array.isArray(server) && server.length) {
      return server.map((s: any) => ({ id: s.id, label: s.label }));
    }
    return STUDENT_SORTS.map((s) => ({ id: s.id, label: s.label }));
  }, [catalogue.data]);

  const data = directory.data;
  const totals = data?.totals ?? {};
  const students = data?.students ?? [];
  const semesters = data?.filters2?.semesters ?? [];

  const openStudent = (studentProfileId) => {
    // THE PARAM CHANNEL. The shell carries `route.params` to the module, so the detail screen
    // knows WHICH student it is showing.
    navigation?.openModule?.('StudentDetail', { studentProfileId });
  };

  return (
    <StudentsScreen
      loading={directory.loading && !data}
      refreshing={directory.refreshing}
      error={directory.error}
      onRetry={directory.reload}
      onRefresh={reload}
    >
      {/* ── The counters ─────────────────────────────────────────────────── */}
      <StatRow>
        <StatTile
          label="Students"
          value={count(totals.students)}
          hint={`${count(totals.unmeasured)} not measured`}
          icon="people-outline"
          color={THEME}
        />
        <StatTile
          label="At risk"
          value={count(totals.atRisk)}
          hint={`${count(totals.watch)} to watch`}
          icon="alert-circle-outline"
          color={RED}
          tone={countTone(totals.atRisk)}
        />
        <StatTile
          label="Interventions"
          value={count(totals.interventions)}
          hint={`${count(totals.openInterventions)} open`}
          icon="medkit-outline"
          color={AMBER}
          tone={countTone(totals.openInterventions)}
        />
      </StatRow>

      {/* ── The at-risk detection ─────────────────────────────────────────── */}
      <AtRiskPanel atRisk={data?.atRisk} totals={totals} onOpen={openStudent} />

      {/* ── The filters ──────────────────────────────────────────────────── */}
      <View style={styles.filterBlock}>
        <SearchBox
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or roll number"
        />
        <ChipRow
          options={[{ id: null, label: 'Everyone', color: THEME }, ...riskOptions]}
          value={risk}
          onChange={setRisk}
        />
        {semesters.length > 1 ? (
          <ChipRow
            options={[
              { id: null, label: 'All semesters', color: THEME },
              ...semesters.map((s: number) => ({ id: s, label: `Sem ${s}`, color: GREEN })),
            ]}
            value={semester}
            onChange={setSemester}
          />
        ) : null}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort</Text>
          <ChipRow options={sortOptions} value={sort} onChange={setSort} />
        </View>
      </View>

      {/* ── The directory ─────────────────────────────────────────────────── */}
      {students.length === 0 ? (
        <StudentsEmpty
          icon="school-outline"
          title={totals.students === 0 ? 'No students yet' : 'Nothing matches'}
          message={
            totals.students === 0
              ? 'Students appear here once they are enrolled in one of your programmes.'
              : 'No student matches these filters. Clear the search or the filters to see them all.'
          }
        />
      ) : (
        students.map((s: any) => (
          <StudentRow key={s.studentProfileId} student={s} onPress={() => openStudent(s.studentProfileId)} />
        ))
      )}

      {/* ── The footnote ─────────────────────────────────────────────────── */}
      <NoteStrip>
        A student with no register and no results is NOT on track — they are not measured. The
        unmeasured are counted separately, because a list of students at risk that quietly includes
        everybody the department knows nothing about is a list nobody can act on.
      </NoteStrip>

      <View style={styles.createNote}>
        <Ionicons name="information-circle-outline" size={14} color={SLATE} />
        <Text style={styles.createText}>
          Enrolment and admission are the Admin's. You can watch every student, and record what the
          department does about the ones who need it.
        </Text>
      </View>
    </StudentsScreen>
  );
}

const styles = StyleSheet.create({
  filterBlock: { marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sortLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },
  createNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.md,
    paddingHorizontal: 4,
  },
  createText: { flex: 1, fontSize: 10, color: theme.colors.textMuted, lineHeight: 14 },
});
