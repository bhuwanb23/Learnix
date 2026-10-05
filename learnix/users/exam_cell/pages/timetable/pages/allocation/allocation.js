// X-02 Timetable — Course & subject allocation (docs/users/05 §3.9, block 3).
//
// Requirement 3 is "course & subject allocation", and the part of it that
// earns a screen is the MISSING half.
//
// An exam that quietly omits a course is the failure nobody notices until a
// student turns up on the day of a paper they were never told about. So this
// screen does not just list what is in the exam — it computes which offerings
// running in that exam's semester and year have NO slot, and shows them by
// name, with the enrolment count, so the controller can see the size of the
// gap before the timetable is published.
//
// "Eligible" is deliberately narrow: an offering in THIS semester of THIS
// academic year. An offering from last year or another semester is not this
// exam's business, and listing it as "missing" would train the controller to
// ignore the column — which is the same as not having it.
//
// The allocated count and the DISTINCT COURSE count sit side by side on
// purpose. Two sections of one course are two papers sat at different times,
// not two courses, and a controller reading "12 courses" when there are 9
// distinct ones has been told something false.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import {
  THEME, GREEN, AMBER, SLATE, MUTED,
  EXAM_STATUS_LABEL, EXAM_STATUS_COLOR, plural,
} from '../../timetableMeta';
import {
  ActionRow, Card, NoteStrip, Pill, Section, StatGrid, StatCell,
  TimetableEmpty, TimetableScreen, goToRoute, useTimetable,
} from '../../timetableUi';

export default function TimetableAllocation({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useTimetable(
    () => examcellApi.timetableBlock('ALLOCATION'),
  );

  const exams = data ?? [];
  const totalMissing = exams.reduce((t, e) => t + e.missingCount, 0);
  const totalAllocated = exams.reduce((t, e) => t + e.allocatedCount, 0);

  return (
    <TimetableScreen
      title="Course & subject allocation"
      subtitle="Which courses are in each exam — and which eligible ones are not."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <Card>
        <StatGrid>
          <StatCell label="Exams" value={exams.length} hint="being allocated" />
          <StatCell
            label="Offerings in"
            value={totalAllocated}
            tone={THEME}
            hint="slot rows created"
          />
          <StatCell
            label="Missing"
            value={totalMissing}
            tone={totalMissing ? AMBER : GREEN}
            hint="eligible, no slot"
          />
          <StatCell
            label="Covered"
            value={totalMissing === 0 && totalAllocated > 0 ? 'yes' : 'no'}
            tone={totalMissing === 0 ? GREEN : AMBER}
            hint={totalMissing === 0 ? 'nothing left out' : 'gap before publishing'}
          />
        </StatGrid>
      </Card>

      {totalMissing > 0 ? (
        <NoteStrip
          tone="warn"
          text={`${plural(totalMissing, 'course')} running in an exam's semester has no slot. A student enrolled in one is sitting nothing — add its slot from the Exam schedules screen.`}
        />
      ) : null}

      {exams.length === 0 ? (
        <TimetableEmpty
          icon="school-outline"
          title="No exams to allocate to"
          subtitle="Create an examination first. Allocation is computed per exam, against the courses running in its own semester and year."
        />
      ) : null}

      {exams.map((e) => (
        <Section
          key={e.examId}
          title={e.examName}
          note={`${e.typeLabel} · Sem ${e.semester}`}
        >
          <Card>
            <View style={styles.headRow}>
              <Pill
                text={EXAM_STATUS_LABEL[e.status] ?? e.status}
                color={EXAM_STATUS_COLOR[e.status] ?? SLATE}
              />
              <View style={styles.countRow}>
                <Text style={styles.countText}>
                  {plural(e.allocatedCount, 'offering')}
                </Text>
                <Text style={styles.countSep}>·</Text>
                <Text style={styles.countText}>{e.distinctCourses} courses</Text>
              </View>
            </View>

            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: e.missingCount === 0 ? GREEN : AMBER,
                      width: `${e.eligibleCount
                        ? Math.min(100, Math.round((e.allocatedCount / e.eligibleCount) * 100))
                        : 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {e.eligibleCount} eligible
              </Text>
            </View>

            <ActionRow
              actions={[
                {
                  label: 'Add slots',
                  icon: 'add-circle-outline',
                  color: THEME,
                  onPress: () =>
                    goToRoute(navigation, 'TimetableSlots', false, { examId: e.examId }),
                },
              ]}
            />
          </Card>

          {/* The missing half. Listed FIRST, because it is the thing the
              controller came to see. */}
          {e.missingCount > 0 ? (
            <View style={styles.missingBox}>
              <View style={styles.missingHead}>
                <Ionicons name="alert-circle" size={15} color={AMBER} />
                <Text style={styles.missingTitle}>
                  {plural(e.missingCount, 'course')} with no slot
                </Text>
              </View>
              {e.missing.map((m) => (
                <View key={m.offeringId} style={styles.missingRow}>
                  <Text style={styles.missingCode}>{m.courseCode}</Text>
                  <View style={styles.missingBody}>
                    <Text style={styles.missingName} numberOfLines={1}>{m.courseName}</Text>
                    <Text style={styles.missingMeta}>
                      Section {m.section} · {plural(m.enrolled, 'student')}
                    </Text>
                  </View>
                  <Pill text="no slot" color={AMBER} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.clearBox}>
              <Ionicons name="checkmark-circle" size={15} color={GREEN} />
              <Text style={styles.clearText}>
                Every eligible course in Sem {e.semester} has a slot.
              </Text>
            </View>
          )}

          {e.allocated.length > 0 ? (
            <>
              <Text style={styles.subHeading}>Allocated</Text>
              {e.allocated.map((a) => (
                <View key={a.offeringId} style={styles.allocRow}>
                  <Text style={styles.allocCode}>{a.courseCode}</Text>
                  <View style={styles.allocBody}>
                    <Text style={styles.allocName} numberOfLines={1}>{a.courseName}</Text>
                    <Text style={styles.allocMeta}>
                      Section {a.section} · {plural(a.enrolled, 'student')} ·{' '}
                      {plural(a.slotIds.length, 'slot')}
                    </Text>
                  </View>
                  {a.slotIds.length ? (
                    <Ionicons name="checkmark-circle" size={15} color={GREEN} />
                  ) : (
                    <Ionicons name="help-circle" size={15} color={AMBER} />
                  )}
                </View>
              ))}
            </>
          ) : null}

          <View style={styles.gateRow}>
            <Ionicons
              name={e.missingCount === 0 ? 'checkmark-circle' : 'information-circle'}
              size={13}
              color={e.missingCount === 0 ? GREEN : MUTED}
            />
            <Text style={styles.gateText}>
              {e.missingCount === 0
                ? 'Nothing left out of this exam.'
                : 'A missing course is not a blocking clash — it will not stop publishing, which is exactly why it has to be visible here.'}
            </Text>
          </View>
        </Section>
      ))}
    </TimetableScreen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  countText: { fontSize: 11, color: SLATE, fontWeight: '600' },
  countSep: { fontSize: 11, color: MUTED },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  progressTrack: {
    flex: 1, height: 7, borderRadius: 4,
    backgroundColor: '#eef2f7', overflow: 'hidden',
  },
  progressFill: { height: 7, borderRadius: 4 },
  progressText: { fontSize: 10, color: MUTED },

  missingBox: {
    backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1,
    borderColor: '#fde68a', padding: 12, marginTop: 10,
  },
  missingHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  missingTitle: { fontSize: 12, fontWeight: '800', color: AMBER, flex: 1 },
  missingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#fef3c7',
  },
  missingCode: { fontSize: 11, fontWeight: '800', color: AMBER, width: 52 },
  missingBody: { flex: 1 },
  missingName: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  missingMeta: { fontSize: 10, color: SLATE, marginTop: 1 },

  clearBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1,
    borderColor: '#bbf7d0', padding: 11, marginTop: 10,
  },
  clearText: { flex: 1, fontSize: 11, color: GREEN, fontWeight: '600' },

  subHeading: {
    fontSize: 11, fontWeight: '800', color: SLATE,
    marginTop: 16, marginBottom: 6, letterSpacing: 0.4,
  },
  allocRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#f1f5f9', padding: 11, marginBottom: 6,
  },
  allocCode: { fontSize: 11, fontWeight: '800', color: THEME, width: 52 },
  allocBody: { flex: 1 },
  allocName: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  allocMeta: { fontSize: 10, color: SLATE, marginTop: 1 },

  gateRow: { flexDirection: 'row', gap: 7, marginTop: 12, alignItems: 'flex-start' },
  gateText: { flex: 1, fontSize: 10, color: MUTED, lineHeight: 15 },
});