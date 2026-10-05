// X-02 Timetable — Student timetable (docs/users/05 §3.9, block 7).
//
// Requirement 8 is "student timetable", and the honest version of it is not a
// list of papers a student happens to be enrolled in. It is a list of papers
// PLUS the courses they are enrolled in and have NOT been given a date.
//
// Those two must not look the same. "I have not been told when to sit" and "I am
// not sitting this" are different facts with opposite urgency, and a screen that
// shows only the first trains the student to believe they have no gap when they
// do. So `unallocated` is reported by name, with the section, right beside the
// papers.
//
// The whole thing is DERIVED FROM ENROLLMENTS on the server, not from a stored
// student-timetable table. That is the point: a stored copy can disagree with
// what a student is actually enrolled in, and then it is wrong in the one
// direction nobody checks.
//
// THE CLASH COUNT IS PROVED, NOT ASSERTED. The screen reports the number of
// overlapping pairs in this student's own papers, computed server-side. It
// should be zero, because a student double-booking is refused at write time —
// so a non-zero count here means the student is looking at papers from two
// different examinations whose clash was written before the engine covered it.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import {
  THEME, RED, GREEN, AMBER, SLATE, MUTED,
  dayLabel, plural, shortDayLabel,
} from '../../timetableMeta';
import {
  Card, ClashBadge, DayHeader, NoteStrip, Pill, Section, StatGrid, StatCell,
  TimetableEmpty, TimetableScreen, useTimetable,
} from '../../timetableUi';

export default function TimetableStudents({ navigation }) {
  // Opened with a student already chosen, or picked from the list here.
  const presetId = navigation?.getParam?.('studentProfileId') ?? navigation?.params?.studentProfileId ?? null;
  const [pickedId, setPickedId] = useState(presetId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data, loading, refreshing, error, reload, onRefresh } = useTimetable(
    () => examcellApi.timetableBlock('STUDENTS'),
    [],
  );

  // The LIST is always the block. One student's detail is a different route
  // (`/timetable/students/:id`), fetched only once a student is chosen — so
  // opening this screen costs one request, not fifty.
  const one = useTimetable(
    () => (pickedId ? examcellApi.timetableStudents(pickedId) : Promise.resolve(null)),
    [pickedId],
  );

  const students = data ?? [];
  const s = one.data;

  // Group the chosen student's papers by day, so the screen reads as a
  // calendar of their season rather than an arbitrary list.
  const byDay = useMemo(() => {
    const map = new Map();
    for (const p of s?.papers ?? []) {
      const list = map.get(p.date) ?? [];
      list.push(p);
      map.set(p.date, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [s]);

  return (
    <TimetableScreen
      title="Student timetable"
      subtitle="One student's whole season, with anything unallocated shown as unallocated."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <View style={styles.pickRow}>
          <TouchableOpacity
            style={styles.pickBtn}
            activeOpacity={0.85}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="people-outline" size={15} color="#fff" />
            <Text style={styles.pickBtnText}>
              {s ? s.name : 'Choose a student'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#fff" />
          </TouchableOpacity>
          {s ? (
            <TouchableOpacity
              style={styles.clearBtn}
              activeOpacity={0.85}
              onPress={() => setPickedId(null)}
              accessibilityRole="button"
              accessibilityLabel="Clear the chosen student"
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      }
    >
      {students.length === 0 ? (
        <TimetableEmpty
          icon="person-outline"
          title="No students to show"
          subtitle="A student timetable is derived from real enrolments. With no active student profiles there is nothing to derive."
        />
      ) : null}

      {/* ── Roster overview, before one is chosen ── */}
      {!s && students.length > 0 ? (
        <>
          <Card>
            <StatGrid>
              <StatCell label="Students" value={students.length} hint="active profiles" />
              <StatCell
                label="With papers"
                value={students.filter((x) => x.paperCount > 0).length}
                tone={THEME}
                hint="have at least one slot"
              />
              <StatCell
                label="With a gap"
                value={students.filter((x) => x.unallocatedCount > 0).length}
                tone={students.some((x) => x.unallocatedCount > 0) ? AMBER : GREEN}
                hint="enrolled, unscheduled"
              />
              <StatCell
                label="Clashing"
                value={students.filter((x) => x.clashes > 0).length}
                tone={students.some((x) => x.clashes > 0) ? RED : GREEN}
                hint="two papers overlap"
              />
            </StatGrid>
          </Card>

          <Section title="Students" note={plural(students.length, 'student')}>
            {students.map((x) => (
              <TouchableOpacity
                key={x.studentProfileId}
                style={styles.stuRow}
                activeOpacity={0.85}
                onPress={() => setPickedId(x.studentProfileId)}
                accessibilityRole="button"
                accessibilityLabel={`${x.name}, ${x.paperCount} papers`}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{(x.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.stuBody}>
                  <Text style={styles.stuName}>{x.name}</Text>
                  <Text style={styles.stuMeta}>
                    {x.rollNo} · Sem {x.currentSemester} · {plural(x.paperCount, 'paper')}
                  </Text>
                </View>
                <View style={styles.stuFlags}>
                  {x.clashes > 0 ? <ClashBadge count={x.clashes} severity="HIGH" /> : null}
                  {x.unallocatedCount > 0 ? (
                    <Pill text={`${x.unallocatedCount} no date`} color={AMBER} />
                  ) : (
                    <ClashBadge count={0} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </Section>
        </>
      ) : null}

      {/* ── One student ── */}
      {s ? (
        one.loading ? (
          <Card><Text style={styles.loading}>Loading this student…</Text></Card>
        ) : one.error ? (
          <NoteStrip tone="bad" text={one.error} />
        ) : (
          <>
            <Card>
              <View style={styles.whoRow}>
                <View style={styles.avatarBig}>
                  <Text style={styles.avatarBigInitial}>{(s.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.whoBody}>
                  <Text style={styles.whoName}>{s.name}</Text>
                  <Text style={styles.whoMeta}>{s.rollNo} · Semester {s.currentSemester}</Text>
                </View>
              </View>

              <View style={styles.whoStats}>
                <StatGrid>
                  <StatCell label="Enrolled" value={s.enrolled} hint="active courses" />
                  <StatCell
                    label="Papers"
                    value={s.paperCount}
                    tone={THEME}
                    hint={s.firstDay ? `from ${shortDayLabel(s.firstDay)}` : 'none dated'}
                  />
                  <StatCell
                    label="Overlaps"
                    value={s.clashes}
                    tone={s.clashes ? RED : GREEN}
                    hint={s.clashes ? 'must be resolved' : 'nothing collides'}
                  />
                  <StatCell
                    label="No date yet"
                    value={s.unallocatedCount}
                    tone={s.unallocatedCount ? AMBER : GREEN}
                    hint="enrolled, unscheduled"
                  />
                </StatGrid>
              </View>
            </Card>

            {s.unallocatedCount > 0 ? (
              <View style={styles.unallocBox}>
                <View style={styles.unallocHead}>
                  <Ionicons name="help-circle" size={15} color={AMBER} />
                  <Text style={styles.unallocTitle}>
                    {plural(s.unallocatedCount, 'course', 'courses')} with no date
                  </Text>
                </View>
                <Text style={styles.unallocNote}>
                  Enrolled and eligible for this exam, but no slot exists yet. This
                  student is not sitting these — nobody has told them when.
                </Text>
                {s.unallocated.map((u) => (
                  <View key={u.offeringId} style={styles.unallocRow}>
                    <Text style={styles.unallocCode}>{u.courseCode}</Text>
                    <View style={styles.unallocBody}>
                      <Text style={styles.unallocName} numberOfLines={1}>{u.courseName}</Text>
                      <Text style={styles.unallocMeta}>Section {u.section}</Text>
                    </View>
                    <Pill text="no date" color={AMBER} />
                  </View>
                ))}
              </View>
            ) : null}

            {s.clashes > 0 ? (
              <NoteStrip
                tone="bad"
                text={`${plural(s.clashes, 'pair of papers overlaps', 'pairs of papers overlap')} for this student. A student double-booking is refused at write time, so this means papers written before the engine covered them — check the Clashes screen.`}
              />
            ) : null}

            <Section
              title="Their season"
              note={byDay.length ? `${plural(byDay.length, 'day')}` : undefined}
            >
              {byDay.length === 0 ? (
                <TimetableEmpty
                  icon="calendar-outline"
                  title="No papers scheduled"
                  subtitle="This student is enrolled in courses with no slots yet. Their timetable is empty because nothing has been dated."
                />
              ) : null}

              {byDay.map(([date, papers]) => (
                <View key={date} style={styles.dayBlock}>
                  <DayHeader date={date} count={papers.length} conflictCount={0} />
                  {papers.map((p) => (
                    <View key={p.slotId} style={styles.paperRow}>
                      <View style={styles.paperTime}>
                        <Text style={styles.paperStart}>{p.startTime}</Text>
                        <Text style={styles.paperEnd}>{p.endTime}</Text>
                      </View>
                      <View style={styles.paperBody}>
                        <Text style={styles.paperCourse} numberOfLines={1}>
                          {p.courseCode} · {p.courseName}
                        </Text>
                        <Text style={styles.paperMeta} numberOfLines={1}>{p.examName}</Text>
                        <View style={styles.paperFlags}>
                          <Pill
                            text={p.venueIds.length
                              ? plural(p.venueIds.length, 'room')
                              : 'no room yet'}
                            color={p.venueIds.length ? GREEN : AMBER}
                          />
                          {p.status !== 'SCHEDULED' ? (
                            <Pill text={p.status.toLowerCase()} color={SLATE} />
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </Section>

            {s.firstDay && s.lastDay ? (
              <Card>
                <Text style={styles.rangeText}>
                  {s.firstDay === s.lastDay
                    ? dayLabel(s.firstDay)
                    : `${dayLabel(s.firstDay)} → ${dayLabel(s.lastDay)}`}
                </Text>
              </Card>
            ) : null}
          </>
        )
      ) : null}

      <StudentPicker
        open={pickerOpen}
        students={students}
        currentId={pickedId}
        onClose={() => setPickerOpen(false)}
        onPick={(id) => { setPickedId(id); setPickerOpen(false); }}
      />
    </TimetableScreen>
  );
}

function StudentPicker({ open, students, currentId, onClose, onPick }) {
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pickBack}>
        <View style={styles.pickSheet}>
          <Text style={styles.pickTitle}>Choose a student</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {students.map((x) => (
              <TouchableOpacity
                key={x.studentProfileId}
                style={[styles.pickRowItem, x.studentProfileId === currentId && styles.pickRowOn]}
                activeOpacity={0.85}
                onPress={() => onPick(x.studentProfileId)}
                accessibilityRole="button"
              >
                <View style={styles.stuBody}>
                  <Text style={styles.stuName}>{x.name}</Text>
                  <Text style={styles.stuMeta}>
                    {x.rollNo} · Sem {x.currentSemester} · {plural(x.paperCount, 'paper')}
                    {x.unallocatedCount ? ` · ${x.unallocatedCount} undated` : ''}
                  </Text>
                </View>
                {x.studentProfileId === currentId ? (
                  <Ionicons name="checkmark-circle" size={17} color={THEME} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.pickClose} onPress={onClose} accessibilityRole="button">
            <Text style={styles.pickCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  pickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: THEME, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11,
  },
  pickBtnText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#fff' },
  clearBtn: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  clearText: { fontSize: 12, fontWeight: '700', color: SLATE },
  loading: { fontSize: 12, color: SLATE, textAlign: 'center', paddingVertical: 8 },

  stuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 12, marginBottom: 8,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 15, fontWeight: '800', color: THEME },
  stuBody: { flex: 1 },
  stuName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  stuMeta: { fontSize: 10, color: SLATE, marginTop: 1 },
  stuFlags: { alignItems: 'flex-end', gap: 4 },

  whoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBig: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBigInitial: { fontSize: 21, fontWeight: '800', color: THEME },
  whoBody: { flex: 1 },
  whoName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  whoMeta: { fontSize: 11, color: SLATE, marginTop: 2 },
  whoStats: {
    marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },

  unallocBox: {
    backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1,
    borderColor: '#fde68a', padding: 13, marginTop: 10,
  },
  unallocHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  unallocTitle: { fontSize: 13, fontWeight: '800', color: AMBER, flex: 1 },
  unallocNote: { fontSize: 10, color: SLATE, marginTop: 4, lineHeight: 15 },
  unallocRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#fef3c7', marginTop: 6,
  },
  unallocCode: { fontSize: 11, fontWeight: '800', color: AMBER, width: 52 },
  unallocBody: { flex: 1 },
  unallocName: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  unallocMeta: { fontSize: 10, color: SLATE, marginTop: 1 },

  dayBlock: { marginBottom: 10 },
  paperRow: {
    flexDirection: 'row', gap: 11, backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#f1f5f9', padding: 12, marginBottom: 7, marginLeft: 8,
  },
  paperTime: { width: 48 },
  paperStart: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  paperEnd: { fontSize: 10, color: MUTED },
  paperBody: { flex: 1 },
  paperCourse: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  paperMeta: { fontSize: 10, color: SLATE, marginTop: 1 },
  paperFlags: { flexDirection: 'row', gap: 6, marginTop: 7, flexWrap: 'wrap' },

  rangeText: { fontSize: 12, color: SLATE, textAlign: 'center' },

  pickBack: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  pickSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34, maxHeight: '80%',
  },
  pickTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  pickRowItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 10,
    borderRadius: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  pickRowOn: { backgroundColor: '#f5f8ff' },
  pickClose: {
    marginTop: 16, backgroundColor: '#f1f5f9', borderRadius: 11,
    paddingVertical: 12, alignItems: 'center',
  },
  pickCloseText: { fontSize: 13, fontWeight: '700', color: SLATE },
});