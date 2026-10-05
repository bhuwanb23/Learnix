// X-02 Timetable — Invigilator duty (docs/users/05 §3.9, block 6).
//
// Requirement 6 is "invigilator assignment" and requirement 7 is "faculty duty
// schedule"; this screen answers both, and it is the reason the two were not
// built as one flat list of papers.
//
// A list of papers answers "who supervises Thursday". It does not answer "who is
// carrying this season", which is the question a head of department is actually
// asked — and it is the question the OLD screen could not answer at all, because
// it never loaded duty. The roster is sorted heaviest-first for that reason.
//
// THE HEAVY-LOAD FLAG IS A WARNING AND NOT A BLOCK. Past HEAVY_DUTY_COUNT (4)
// papers, a person is marked as carrying the season. Nothing is refused: a small
// college may legitimately have four staff and one invigilator, and the number
// exists so the controller can SEE the load rather than discovering it on the
// morning of the exam.
//
// An invigilator booked twice at the same time is the one clash here that is
// BLOCKING and refused at write time, because a room with nobody in it is a
// worse outcome than a timetable that will not save.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import {
  THEME, RED, GREEN, AMBER, SLATE, MUTED,
  HEAVY_DUTY_COUNT, dutyPhrase, formatDuration, plural, shortDayLabel,
} from '../../timetableMeta';
import {
  ActionRow, Card, NoteStrip, Pill, Section, StatGrid, StatCell,
  TimetableEmpty, TimetableScreen, goToRoute, useTimetable,
} from '../../timetableUi';

export default function TimetableDuty({ navigation }) {
  const examId = navigation?.getParam?.('examId') ?? navigation?.params?.examId ?? null;
  const { data, loading, refreshing, error, reload, onRefresh } = useTimetable(
    () => examcellApi.timetableBlock('DUTY', examId),
    [examId],
  );

  const roster = data?.roster ?? [];
  const unstaffed = data?.unstaffed ?? [];
  const totals = data?.totals ?? {};
  const threshold = data?.heavyThreshold ?? HEAVY_DUTY_COUNT;

  const onDuty = roster.filter((r) => r.dutyCount > 0);
  const free = roster.filter((r) => r.dutyCount === 0);

  return (
    <TimetableScreen
      title="Invigilator duty"
      subtitle="Who supervises what, and the load on each person."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <ActionRow
          actions={[{
            label: 'Assign from a slot',
            icon: 'person-add-outline',
            color: THEME,
            onPress: () => goToRoute(navigation, 'TimetableSlots', false, { examId }),
          }]}
        />
      }
    >
      <Card>
        <StatGrid>
          <StatCell label="Staff" value={totals.staff ?? 0} hint="can supervise" />
          <StatCell
            label="On duty"
            value={totals.onDuty ?? 0}
            tone={GREEN}
            hint={`${totals.available ?? 0} with nothing`}
          />
          <StatCell
            label="Unstaffed papers"
            value={totals.unstaffedSlots ?? 0}
            tone={totals.unstaffedSlots ? RED : GREEN}
            hint="seated but unsupervised"
          />
          <StatCell
            label="Carrying the season"
            value={totals.heavy ?? 0}
            tone={totals.heavy ? AMBER : MUTED}
            hint={`${threshold}+ papers each`}
          />
        </StatGrid>
      </Card>

      {/* A paper with nobody supervising is a HIGH clash and it blocks
          publishing, so it is stated here in plain words as well as being
          counted. */}
      {unstaffed.length > 0 ? (
        <NoteStrip
          tone="bad"
          text={`${plural(unstaffed.length, 'paper has', 'papers have')} a room but nobody supervising. This is a HIGH clash, so it will stop the exam being published until it is fixed.`}
        />
      ) : null}

      {unstaffed.length > 0 ? (
        <Section title="Nobody supervising" note={plural(unstaffed.length, 'paper')}>
          {unstaffed.map((u) => (
            <View key={u.slotId} style={styles.unstaffedRow}>
              <Ionicons name="person-remove" size={16} color={RED} />
              <View style={styles.unstaffedBody}>
                <Text style={styles.unstaffedCourse}>{u.courseCode} · {u.courseName}</Text>
                <Text style={styles.unstaffedMeta}>
                  {u.examName} · {shortDayLabel(u.date)} · {u.startTime}–{u.endTime}
                </Text>
              </View>
              <Pill text="unstaffed" color={RED} />
            </View>
          ))}
        </Section>
      ) : null}

      <Section title="Roster" note={`${onDuty.length} on duty · heaviest first`}>
        {roster.length === 0 ? (
          <TimetableEmpty
            icon="people-outline"
            title="No one can supervise"
            subtitle="This institution has no teacher, HOD or admin user to allocate. Until there is, every paper shows as unstaffed."
          />
        ) : null}

        {onDuty.map((r) => (
          <Card key={r.userId}>
            <View style={styles.rostHead}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>{(r.name || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.rostHeadBody}>
                <Text style={styles.rostName}>{r.name}</Text>
                <Text style={styles.rostMeta}>
                  {r.email} · {plural(r.dutyDays.length, 'day')}
                </Text>
              </View>
              {r.heavy ? (
                <Pill text="heavy load" color={AMBER} icon="warning-outline" />
              ) : (
                <Pill text={dutyPhrase(r.dutyCount)} color={GREEN} />
              )}
            </View>

            <View style={styles.rostStats}>
              <View style={styles.rostStat}>
                <Text style={styles.rostStatValue}>{r.dutyCount}</Text>
                <Text style={styles.rostStatLabel}>papers</Text>
              </View>
              <View style={styles.rostStat}>
                <Text style={styles.rostStatValue}>{formatDuration(r.dutyMinutes)}</Text>
                <Text style={styles.rostStatLabel}>supervising</Text>
              </View>
              <View style={styles.rostStat}>
                <Text style={styles.rostStatValue}>{r.dutyDays.length}</Text>
                <Text style={styles.rostStatLabel}>days</Text>
              </View>
            </View>

            {r.duty.map((d) => (
              <View key={d.slotId} style={styles.dutyRow}>
                <Text style={styles.dutyDate}>{shortDayLabel(d.date)}</Text>
                <View style={styles.dutyBody}>
                  <Text style={styles.dutyCourse} numberOfLines={1}>{d.courseCode} · {d.courseName}</Text>
                  <Text style={styles.dutyMeta}>
                    {d.examName} · {d.startTime}–{d.endTime}
                  </Text>
                </View>
              </View>
            ))}

            {r.heavy ? (
              <Text style={styles.heavyNote}>
                Carrying {r.dutyCount} papers against a threshold of {threshold}. Shown,
                not blocked — but somebody else may be available.
              </Text>
            ) : null}
          </Card>
        ))}

        {free.length > 0 ? (
          <View style={styles.freeBox}>
            <Text style={styles.freeTitle}>
              {plural(free.length, 'person', 'people')} with no duty
            </Text>
            <Text style={styles.freeNames}>
              {free.map((f) => f.name).join(', ')}
            </Text>
          </View>
        ) : null}
      </Section>
    </TimetableScreen>
  );
}

const styles = StyleSheet.create({
  unstaffedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1,
    borderColor: '#fecaca', padding: 12, marginBottom: 8,
  },
  unstaffedBody: { flex: 1 },
  unstaffedCourse: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  unstaffedMeta: { fontSize: 10, color: SLATE, marginTop: 1 },

  rostHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: '#ecfdf5',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 16, fontWeight: '800', color: GREEN },
  rostHeadBody: { flex: 1 },
  rostName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  rostMeta: { fontSize: 10, color: SLATE, marginTop: 1 },

  rostStats: {
    flexDirection: 'row', marginTop: 13, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  rostStat: { flex: 1 },
  rostStatValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  rostStatLabel: { fontSize: 9, color: MUTED, marginTop: 1 },

  dutyRow: {
    flexDirection: 'row', gap: 10, marginTop: 11,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc',
  },
  dutyDate: { fontSize: 11, fontWeight: '700', color: SLATE, width: 68 },
  dutyBody: { flex: 1 },
  dutyCourse: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  dutyMeta: { fontSize: 10, color: SLATE, marginTop: 1 },

  heavyNote: { fontSize: 10, color: AMBER, marginTop: 11, lineHeight: 15 },

  freeBox: {
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1,
    borderColor: '#bbf7d0', padding: 12, marginTop: 4,
  },
  freeTitle: { fontSize: 12, fontWeight: '800', color: GREEN },
  freeNames: { fontSize: 11, color: SLATE, marginTop: 3, lineHeight: 16 },
});