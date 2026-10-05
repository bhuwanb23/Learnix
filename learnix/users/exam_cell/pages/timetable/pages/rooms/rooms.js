// X-02 Timetable — Centres & rooms (docs/users/05 §3.9, block 5).
//
// Requirement 5 is "examination-center/room allocation", and the substantive
// part of it is CAPACITY.
//
// The field this screen writes is `venueId`, NOT `roomId`, and that rename is
// the single most important thing on it. `Room` in the schema is a HOSTEL room —
// capacity 2, hanging off a block, belonging to a resident — and `Venue` is the
// institution-wide room master with real capacity. The old endpoint took a
// `roomId` string and wrote it straight into a scalar column with nothing to
// check it against, so it would happily have seated a hundred students in a
// hostel bunk. `ExamRoomAllocation.roomId` still carries that name in the
// database and always will — migrating a column to rename a concept is not
// worth breaking every historical row for — so the DASHBOARD of the schema and
// the API disagree, and the API is right.
//
// A capacity shortfall is a MEDIUM clash, NOT a refusal. That is the agreed
// policy and it is what makes a split stageable: a controller can put 40 of 61
// students in Hall A today, see the exact shortfall named, and book Hall B
// tomorrow. Refusing the first half would make the second half impossible.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { examcellApi } from '../../../../../../services/api';
import {
  THEME, GREEN, AMBER, SLATE, MUTED, plural, shortDayLabel,
} from '../../timetableMeta';
import {
  ActionRow, Card, ClashBadge, FigureRow, NoteStrip, Pill, Section, StatGrid, StatCell,
  TimetableEmpty, TimetableScreen, goToRoute, useTimetable,
} from '../../timetableUi';

export default function TimetableRooms({ navigation }) {
  const examId = navigation?.getParam?.('examId') ?? navigation?.params?.examId ?? null;
  const { data, loading, refreshing, error, reload, onRefresh } = useTimetable(
    () => examcellApi.timetableBlock('ROOMS', examId),
    [examId],
  );

  const venues = data?.venues ?? [];
  const totals = data?.totals ?? {};
  const used = venues.filter((v) => v.inUse);

  return (
    <TimetableScreen
      title="Centres & rooms"
      subtitle="Institution venues against real capacity — not hostel rooms."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <ActionRow
          actions={[{
            label: 'Allocate a room',
            icon: 'business-outline',
            color: THEME,
            onPress: () => goToRoute(navigation, 'TimetableSlots', false, { examId }),
          }]}
        />
      }
    >
      <Card>
        <StatGrid>
          <StatCell label="Venues" value={totals.venues ?? 0} hint="in this institution" />
          <StatCell
            label="Total capacity"
            value={totals.capacity ?? 0}
            tone={THEME}
            hint="seats across all venues"
          />
          <StatCell
            label="In use"
            value={totals.inUse ?? 0}
            tone={totals.inUse ? GREEN : MUTED}
            hint={`${totals.free ?? 0} unused`}
          />
          <StatCell
            label="Allocations"
            value={totals.allocations ?? 0}
            tone={SLATE}
            hint="slot-to-venue links"
          />
        </StatGrid>
      </Card>

      <NoteStrip
        tone="info"
        icon="information-circle"
        text="A room shortage is recorded as a clash, not refused — so a large paper can be split across two venues and staged. Only a double-booked student or invigilator blocks a write."
      />

      <Section title="Venues" note={plural(venues.length, 'room')}>
        {venues.length === 0 ? (
          <TimetableEmpty
            icon="business-outline"
            title="No venues configured"
            subtitle="An institution needs venues with a real capacity before any paper can be seated. Until then every paper shows as unallocated."
          />
        ) : null}

        {venues.map((v) => {
          const util = totals.capacity ? Math.round((v.capacity / totals.capacity) * 100) : 0;
          return (
            <Card key={v.venueId}>
              <View style={styles.venueHead}>
                <View style={styles.venueHeadBody}>
                  <Text style={styles.venueName}>{v.name}</Text>
                  <Text style={styles.venueMeta}>
                    {v.location ? `${v.location} · ` : ''}Capacity {v.capacity}
                    {v.status ? ` · ${String(v.status).toLowerCase()}` : ''}
                  </Text>
                </View>
                {v.inUse ? (
                  <Pill text={plural(v.allocatedSlots, 'booking', 'bookings')} color={GREEN} />
                ) : (
                  <Pill text="free" color={SLATE} />
                )}
              </View>

              <View style={styles.utilRow}>
                <View style={styles.utilTrack}>
                  <View
                    style={[
                      styles.utilFill,
                      {
                        backgroundColor: v.conflictCount > 0 ? AMBER : v.inUse ? GREEN : '#e2e8f0',
                        // A share of TOTAL capacity, not of the paper's needs —
                        // which is the only thing knowable from this block.
                        width: `${util}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.utilText}>{util}% of all seats</Text>
              </View>

              <View style={styles.flags}>
                <Pill
                  text={plural(v.bookedDays.length, 'exam day')}
                  color={v.bookedDays.length ? THEME : SLATE}
                  icon="calendar-outline"
                />
                {v.conflictCount > 0
                  ? <ClashBadge count={v.conflictCount} severity="MEDIUM" />
                  : <ClashBadge count={0} />}
              </View>

              {v.bookedDays.length > 0 ? (
                <View style={styles.days}>
                  {v.bookedDays.slice(0, 12).map((d) => (
                    <View key={d} style={styles.dayChip}>
                      <Text style={styles.dayChipText}>{shortDayLabel(d)}</Text>
                    </View>
                  ))}
                  {v.bookedDays.length > 12 ? (
                    <Text style={styles.dayMore}>+{v.bookedDays.length - 12} more</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.noDays}>
                  No paper is seated here yet — this room is available on every day.
                </Text>
              )}
            </Card>
          );
        })}
      </Section>

      {used.length > 0 ? (
        <Section title="By utilisation" note="biggest rooms first">
          <Card>
            {[...used]
              .sort((a, b) => b.capacity - a.capacity)
              .map((v) => (
                <FigureRow
                  key={v.venueId}
                  label={v.name}
                  value={`${v.capacity}`}
                  tone={v.conflictCount ? AMBER : GREEN}
                  sublabel={`${plural(v.allocatedSlots, 'booking')} on ${plural(v.bookedDays.length, 'day')}${v.conflictCount ? ` · ${plural(v.conflictCount, 'clash')}` : ''}`}
                />
              ))}
          </Card>
        </Section>
      ) : null}
    </TimetableScreen>
  );
}

const styles = StyleSheet.create({
  venueHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  venueHeadBody: { flex: 1 },
  venueName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  venueMeta: { fontSize: 11, color: SLATE, marginTop: 2 },

  utilRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  utilTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#eef2f7', overflow: 'hidden' },
  utilFill: { height: 7, borderRadius: 4 },
  utilText: { fontSize: 10, color: MUTED, width: 92, textAlign: 'right' },

  flags: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11, flexWrap: 'wrap' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 11 },
  dayChip: {
    backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  dayChipText: { fontSize: 9, fontWeight: '700', color: SLATE },
  dayMore: { fontSize: 10, color: MUTED, alignSelf: 'center' },
  noDays: { fontSize: 10, color: MUTED, marginTop: 11, fontStyle: 'italic' },
});