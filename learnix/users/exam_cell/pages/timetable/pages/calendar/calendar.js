// X-02 Timetable — Examination calendar (docs/users/05 §3.9, block 1).
//
// A LIST OF PAPERS ANSWERS "what is on the 15th" only if you scroll to it. An
// exam controller's actual question is "what shape is this fortnight" — where
// the pile-ups are, whether anything lands on a Sunday, how many papers are in
// one day. That is a grid question, so this is a grid.
//
// Empty days are DRAWN, not omitted. A calendar that hides the gap between the
// 4th and the 12th cannot show the controller that they have left nine days
// unused in the middle of the season.
//
// The `inWindow` flag the server sends is honoured: the block covers a week of
// history and a span of future, and past days are drawn dimmed rather than
// dropped, because "what did we run last Tuesday" is a real question too.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import {
  THEME, RED, GREEN, AMBER, SLATE, MUTED,
  dayLabel, shortDayLabel, plural, seatPhrase,
} from '../../timetableMeta';
import {
  Card, ClashBadge, FigureRow, Pill, Section, StatGrid, StatCell,
  TimetableEmpty, TimetableScreen, useTimetable,
} from '../../timetableUi';

export default function TimetableCalendar({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useTimetable(
    () => examcellApi.timetableBlock('CALENDAR'),
  );
  const [showEmpty, setShowEmpty] = useState(false);

  const days = data?.days ?? [];
  const visible = useMemo(
    () => days.filter((d) => (showEmpty ? true : d.slotCount > 0 || d.inWindow)),
    [days, showEmpty],
  );

  const conflicts = data?.conflictCount ?? 0;

  return (
    <TimetableScreen
      title="Examination calendar"
      subtitle={`${data?.spanDays ?? 45} days of season, drawn as a grid rather than a list.`}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <Card>
        <StatGrid>
          <StatCell
            label="Exam days"
            value={data?.examDays ?? 0}
            hint={data?.firstExamDay ? `from ${shortDayLabel(data.firstExamDay)}` : 'nothing dated'}
          />
          <StatCell
            label="Papers"
            value={data?.slotCount ?? 0}
            tone={THEME}
            hint="excluding cancelled"
          />
          <StatCell
            label="Clashes"
            value={conflicts}
            tone={conflicts ? RED : GREEN}
            hint="across the whole season"
          />
          <StatCell
            label="Runs to"
            value={data?.lastExamDay ? shortDayLabel(data.lastExamDay) : '—'}
            tone={SLATE}
            hint={data?.lastExamDay ? dayLabel(data.lastExamDay) : 'no end date yet'}
          />
        </StatGrid>
      </Card>

      <Section
        title="By day"
        note={showEmpty ? 'quiet days included' : 'quiet days hidden'}
      >
        {/* The toggle is its own row rather than the Section's note, because
            that note is rendered inside a <Text> and a pill is a <View>. */}
        <View style={styles.toggleRow}>
          <Pill
            text={showEmpty ? 'Hide days with no papers' : 'Show days with no papers'}
            color={showEmpty ? AMBER : SLATE}
            icon={showEmpty ? 'eye-off-outline' : 'eye-outline'}
            onPress={() => setShowEmpty((v) => !v)}
          />
          <Text style={styles.toggleNote}>
            {plural(days.filter((d) => d.slotCount === 0).length, 'quiet day')}
          </Text>
        </View>

        {visible.length === 0 ? (
          <TimetableEmpty
            icon="calendar-outline"
            title="Nothing scheduled"
            subtitle="No paper has a date yet. Add slots from the Exam schedules screen and they will appear here."
          />
        ) : null}

        {visible.map((d) => (
          <View key={d.date} style={styles.dayBlock}>
            {/* A day with no papers is drawn as a thin quiet row, never
                omitted — the gap is information. */}
            {d.slotCount === 0 ? (
              <View style={[styles.quietDay, !d.inWindow && styles.quietDayPast]}>
                <Text style={[styles.quietDayText, !d.inWindow && styles.pastText]}>
                  {shortDayLabel(d.date)}
                  {d.isToday ? ' · today' : ''}
                </Text>
                <Text style={styles.quietDayNote}>no papers</Text>
              </View>
            ) : (
              <>
                <View style={styles.dayHead}>
                  <View style={styles.dayHeadBody}>
                    <Text style={[styles.dayLabel, !d.inWindow && styles.pastText]}>
                      {shortDayLabel(d.date)}
                      {d.isToday ? ' · today' : ''}
                    </Text>
                    <Text style={styles.dayCount}>
                      {plural(d.slotCount, 'paper')}
                    </Text>
                  </View>
                  <ClashBadge count={d.conflictCount} severity="MEDIUM" />
                </View>

                {d.slots.map((s) => (
                  <View key={s.slotId} style={styles.slotRow}>
                    <View style={styles.slotTime}>
                      <Text style={styles.slotStart}>{s.startTime}</Text>
                      <Text style={styles.slotEnd}>{s.endTime}</Text>
                    </View>
                    <View style={styles.slotBody}>
                      <Text style={styles.slotCourse} numberOfLines={1}>
                        {s.courseCode} · {s.courseName}
                      </Text>
                      <Text style={styles.slotMeta} numberOfLines={1}>
                        {s.examName} · {s.section}
                      </Text>
                      <Text style={styles.slotMeta} numberOfLines={1}>
                        {seatPhrase(s.enrolled, s.seats)}
                        {s.venues?.length ? ` · ${plural(s.venues.length, 'venue')}` : ' · no venue'}
                      </Text>
                    </View>
                    <View style={styles.slotRight}>
                      {s.conflictCount > 0 ? (
                        <View style={styles.slotFlags}>
                          {s.conflicts.slice(0, 3).map((c) => (
                            <Ionicons
                              key={c.kind}
                              name={c.severity === 'HIGH' ? 'alert-circle' : 'warning-outline'}
                              size={13}
                              color={c.severity === 'HIGH' ? RED : AMBER}
                            />
                          ))}
                        </View>
                      ) : (
                        <Ionicons
                          name={s.venues?.length ? 'checkmark-circle-outline' : 'help-circle-outline'}
                          size={15}
                          color={s.venues?.length ? GREEN : AMBER}
                        />
                      )}
                      <Text style={styles.slotDuration}>{s.durationLabel}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        ))}
      </Section>

      {conflicts > 0 ? (
        <Card>
          <FigureRow
            label="Clashes on this calendar"
            value={conflicts}
            tone={RED}
            sublabel="Every one is also listed on the Clashes & publishing screen, with the slots named."
          />
        </Card>
      ) : null}
    </TimetableScreen>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, marginBottom: 10,
  },
  toggleNote: { fontSize: 10, color: MUTED },
  dayBlock: { marginBottom: 12 },
  dayHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 12, marginBottom: 6,
  },
  dayHeadBody: { flex: 1 },
  dayLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  dayCount: { fontSize: 10, color: SLATE, marginTop: 1 },
  pastText: { color: MUTED },

  quietDay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#f1f5f9', borderStyle: 'dashed', marginBottom: 6,
  },
  quietDayPast: { opacity: 0.55 },
  quietDayText: { fontSize: 11, fontWeight: '600', color: SLATE },
  quietDayNote: { fontSize: 10, color: MUTED, fontStyle: 'italic' },

  slotRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#f1f5f9', padding: 11, marginBottom: 6, marginLeft: 12,
  },
  slotTime: { width: 46 },
  slotStart: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  slotEnd: { fontSize: 10, color: MUTED },
  slotBody: { flex: 1 },
  slotCourse: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  slotMeta: { fontSize: 10, color: SLATE, marginTop: 1 },
  slotRight: { alignItems: 'flex-end', gap: 3 },
  slotFlags: { flexDirection: 'row', gap: 3 },
  slotDuration: { fontSize: 9, color: MUTED },
});