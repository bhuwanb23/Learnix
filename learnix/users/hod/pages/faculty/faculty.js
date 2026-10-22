/**
 * HD-02 — The HOD's Faculty desk: the directory screen.
 * Docs: 11-hod.md §3.2
 *
 * THE SCREEN, AND WHAT IT IS FOR
 * ------------------------------
 * A HOD opens this tab to answer "who can teach what, and who is carrying too much?". So the
 * screen opens with the ANSWERS — the balancer, the availability matrix and the progress
 * monitor — and the list of teachers is under them, because the list is the detail and the
 * answers are the point.
 *
 * THE FILTERS ARE THE SERVER'S
 * -----------------------------
 * The status list, the workload bands, the sorts and the thresholds come from
 * `GET /hod/faculty/catalogue`. The mirror in `facultyMeta.js` is the fallback for the frame
 * before the catalogue lands, and the audit script asserts the two never drift.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import {
  ChipRow,
  FacultyEmpty,
  SearchBox,
  StatRow,
  StatTile,
} from './facultyUi';
import { FacultyScreen, useFaculty } from './facultyFrame';
import {
  AvailabilityMatrix,
  TeachingProgress,
  WorkloadBalancer,
} from './facultyDirectory';
import { FacultyRow } from './facultyRow';
import {
  FACULTY_SORTS,
  FACULTY_STATUSES,
  GREEN,
  RED,
  SLATE,
  THEME,
  WORKLOAD_BANDS,
  count,
  countTone,
} from './facultyMeta';

export default function FacultyModule({ navigation }) {
  const [status, setStatus] = useState(null);
  const [band, setBand] = useState(null);
  const [sort, setSort] = useState('name');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  // THE CATALOGUE, once. It is the SERVER's vocabulary and it does not change when the filter does.
  const catalogue = useFaculty(() => hodApi.facultyCatalogue(), []);

  // THE DIRECTORY, and it reloads whenever a filter changes.
  const queryKey = `${status ?? ''}|${band ?? ''}|${sort}|${query}`;
  const directory = useFaculty(
    () =>
      hodApi.facultyDirectory({
        status: status ?? undefined,
        band: band ?? undefined,
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
  //
  // The fallback is the mirror in `facultyMeta.js` — ONE list, not a second copy written here.
  // A second copy in the screen is a list that eventually disagrees with the mirror, and the
  // mirror is the thing the audit script checks against the server.
  const statusOptions = useMemo(() => {
    const server = catalogue.data?.statuses;
    if (Array.isArray(server) && server.length) {
      return server.map((s: any) => ({ id: s.id, label: s.label, color: s.color }));
    }
    return FACULTY_STATUSES.map((s) => ({ id: s.id, label: s.label, color: s.color }));
  }, [catalogue.data]);

  const bandOptions = useMemo(() => {
    const server = catalogue.data?.workloadBands;
    if (Array.isArray(server) && server.length) {
      return server.map((b: any) => ({ id: b.id, label: b.label, color: b.color }));
    }
    return WORKLOAD_BANDS.map((b) => ({ id: b.id, label: b.label, color: b.color }));
  }, [catalogue.data]);

  const sortOptions = useMemo(() => {
    const server = catalogue.data?.sorts;
    if (Array.isArray(server) && server.length) {
      return server.map((s: any) => ({ id: s.id, label: s.label }));
    }
    return FACULTY_SORTS.map((s) => ({ id: s.id, label: s.label }));
  }, [catalogue.data]);

  const data = directory.data;
  const totals = data?.totals ?? {};
  const faculty = data?.faculty ?? [];

  const openFaculty = (userId) => {
    // THE PARAM CHANNEL. The shell carries `route.params` to the module, so the detail screen
    // knows WHICH teacher it is showing.
    navigation?.openModule?.('FacultyDetail', { userId });
  };

  return (
    <FacultyScreen
      loading={directory.loading && !data}
      refreshing={directory.refreshing}
      error={directory.error}
      onRetry={directory.reload}
      onRefresh={reload}
    >
      {/* ── The counters ─────────────────────────────────────────────────── */}
      <StatRow>
        <StatTile
          label="Faculty"
          value={count(totals.faculty)}
          hint={`${count(totals.onLeave)} on leave`}
          icon="people-outline"
          color={THEME}
        />
        <StatTile
          label="Overloaded"
          value={count(totals.overloaded)}
          hint="over their maximum"
          icon="alert-circle-outline"
          color={RED}
          tone={countTone(totals.overloaded)}
        />
        <StatTile
          label="Has capacity"
          value={count(totals.available)}
          hint={`${count(totals.underutilised)} underused`}
          icon="add-circle-outline"
          color={GREEN}
          tone={countTone(totals.overloaded)}
        />
      </StatRow>

      {/* ── The three smart features ─────────────────────────────────────── */}
      <WorkloadBalancer balancer={data?.balancer} onOpen={openFaculty} />
      <AvailabilityMatrix matrix={data?.availability} />
      <TeachingProgress progress={data?.progress} />

      {/* ── The filters ──────────────────────────────────────────────────── */}
      <View style={styles.filterBlock}>
        <SearchBox
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or designation"
        />
        <ChipRow
          options={[{ id: null, label: 'Everyone', color: THEME }, ...statusOptions]}
          value={status}
          onChange={setStatus}
        />
        <ChipRow
          options={[{ id: null, label: 'Any load', color: THEME }, ...bandOptions]}
          value={band}
          onChange={setBand}
        />
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort</Text>
          <ChipRow options={sortOptions} value={sort} onChange={setSort} />
        </View>
      </View>

      {/* ── The list ─────────────────────────────────────────────────────── */}
      {faculty.length === 0 ? (
        <FacultyEmpty
          icon="people-outline"
          title={totals.faculty === 0 ? 'No faculty yet' : 'Nothing matches'}
          message={
            totals.faculty === 0
              ? 'Faculty appear here once the Admin assigns them to your department.'
              : 'No teacher matches these filters. Clear the search or the filters to see them all.'
          }
        />
      ) : (
        faculty.map((f: any) => (
          <FacultyRow key={f.userId} faculty={f} onPress={() => openFaculty(f.userId)} />
        ))
      )}

      {/* THE CREATION RULE, STATED RATHER THAN FAKED.
          The old screen had an "Add" button that opened an alert saying the Admin adds faculty.
          A button that opens an alert is a dead button, and a dead button teaches the reader that
          the screen's controls are decorative. So the rule is a NOTE, and the note names who
          does it. */}
      <View style={styles.createNote}>
        <Ionicons name="information-circle-outline" size={14} color={SLATE} />
        <Text style={styles.createText}>
          A teacher joins the department through the Admin. You can move their classes, and see
          everything they are carrying.
        </Text>
      </View>
    </FacultyScreen>
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
