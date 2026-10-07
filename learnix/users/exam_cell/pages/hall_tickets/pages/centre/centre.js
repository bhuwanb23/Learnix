// X-04 Hall tickets — block 5: examination-centre information (docs/users/05 §3.5).
//
// THE THREE WAYS A PAPER CAN BE UNSEATED ARE KEPT APART, and this screen
// reports all three, because they need different fixes:
//
//   · UNSEATED — no room id at all. Allocate a venue.
//   · UNKNOWN — a room id that names no venue. `ExamRoomAllocation.roomId` is
//     a SCALAR WITH NO FOREIGN KEY (the venue master is a different domain),
//     and the seed writes rows like `ROOM-L201` that resolve to nothing. A
//     paper whose centre cannot be resolved is exactly what a controller needs
//     to see, so it is listed rather than silently dropped — dropping it would
//     make the venue list look complete when it is not.
//   · SEATED, with headroom — how many seats are left after everyone holding a
//     ticket is counted. Negative headroom means the venue is over-subscribed
//     and is shown as such rather than clamped to zero.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../../../services/api';
import {
  AMBER, CYAN, GREEN, MUTED, RED, SLATE, THEME,
  dayLabel, plural, seatPhrase,
} from '../../hallTicketMeta';
import {
  Card, HallTicketEmpty, HallTicketScreen, NoteStrip, Pill, Section,
  StatCell, StatGrid, useHallTicket,
} from '../../hallTicketUi';

export default function HallTicketsCentre() {
  // Institution-wide on purpose: the question this screen answers is "is
  // every paper seated somewhere real", and that has no answer per exam.
  const block = useHallTicket(() => examcellApi.hallTicketBlock('VENUE'));

  const data = block.data;
  const centres = Array.isArray(data?.centres) ? data.centres : [];
  const unseated = Array.isArray(data?.unseated) ? data.unseated : [];
  const unknownRooms = Array.isArray(data?.unknownRooms) ? data.unknownRooms : [];
  const t = data?.totals;

  const headroomOf = (c) => (c.headroom === null || c.headroom === undefined ? null : c.headroom);
  const overCapacity = centres.filter((c) => headroomOf(c) !== null && headroomOf(c) < 0).length;

  return (
    <HallTicketScreen
      title="Examination centre"
      subtitle="Where each paper is held, who invigilates, and how many seats are left."
      loading={block.loading}
      refreshing={block.refreshing}
      error={block.error}
      onRetry={block.reload}
      onRefresh={block.onRefresh}
    >
      {!data ? (
        <HallTicketEmpty
          icon="business-outline"
          title="No centre information"
          subtitle="Allocate a venue to a paper in the timetable and it appears here."
        />
      ) : (
        <>
          <StatGrid>
            <StatCell label="Centres" value={t?.centres ?? 0} tone={CYAN} />
            <StatCell label="Papers" value={t?.papers ?? 0} />
            <StatCell label="Tickets seated" value={t?.issued ?? 0} tone={GREEN} />
            <StatCell label="Total capacity" value={t?.capacity ?? 0} />
            <StatCell label="No room" value={t?.unseated ?? 0} tone={(t?.unseated ?? 0) > 0 ? RED : MUTED} />
            <StatCell label="Room unknown" value={t?.unknownRooms ?? 0} tone={(t?.unknownRooms ?? 0) > 0 ? AMBER : MUTED} />
          </StatGrid>

          {unknownRooms.length > 0 ? (
            <NoteStrip
              tone="bad"
              text={`${plural(unknownRooms.length, 'paper')} name${unknownRooms.length === 1 ? 's' : ''} a room id that resolves to no venue. The seat plan cannot be printed until a real centre is chosen.`}
            />
          ) : null}
          {unseated.length > 0 ? (
            <NoteStrip
              tone="warn"
              text={`${plural(unseated.length, 'paper has', 'papers have')} no room allocated at all. Their tickets will print with centre "Unallocated".`}
            />
          ) : null}

          {centres.length === 0 && unseated.length === 0 && unknownRooms.length === 0 ? (
            <HallTicketEmpty
              icon="map-outline"
              title="Nothing is seated yet"
              subtitle="Allocate venues to exam slots to see capacity here."
            />
          ) : (
            <>
              {centres.length > 0 ? (
                <Section title="Centres" note={`${centres.length} allocated`}>
                  {centres.map((c) => {
                    const headroom = headroomOf(c);
                    const tone =
                      headroom === null ? SLATE : headroom < 0 ? RED : headroom === 0 ? AMBER : GREEN;
                    return (
                      <Card key={c.venueId} style={styles.centreCard}>
                        <View style={styles.centreHead}>
                          <View style={styles.centreBody}>
                            <Text style={styles.centreName} numberOfLines={1}>{c.name}</Text>
                            <Text style={styles.centreMeta} numberOfLines={1}>
                              {c.location || 'Location not recorded'}
                              {c.status ? ` · ${c.status}` : ''}
                            </Text>
                          </View>
                          <Pill text={`${c.paperCount} ${c.paperCount === 1 ? 'paper' : 'papers'}`} color={CYAN} />
                        </View>

                        <View style={styles.figures}>
                          <View style={styles.figure}>
                            <Text style={styles.figureValue}>{c.capacity ?? '—'}</Text>
                            <Text style={styles.figureLabel}>capacity</Text>
                          </View>
                          <View style={styles.figure}>
                            <Text style={styles.figureValue}>{c.seated}</Text>
                            <Text style={styles.figureLabel}>seated</Text>
                          </View>
                          <View style={styles.figure}>
                            <Text style={[styles.figureValue, { color: tone }]}>
                              {headroom === null ? '?' : headroom > 0 ? `+${headroom}` : headroom}
                            </Text>
                            <Text style={styles.figureLabel}>{seatPhrase(headroom)}</Text>
                          </View>
                        </View>

                        {c.papers.map((p) => (
                          <View key={p.slotId} style={styles.paperRow}>
                            <View style={styles.paperBody}>
                              <Text style={styles.paperCode}>{p.courseCode}</Text>
                              <Text style={styles.paperMeta} numberOfLines={1}>
                                {dayLabel(p.date)} · {p.startTime}–{p.endTime} · {p.examName}
                              </Text>
                            </View>
                            <View style={styles.paperRight}>
                              <Text style={styles.paperCount}>{p.issued}/{p.enrolled}</Text>
                              <Text style={styles.paperCountLabel}>tickets</Text>
                            </View>
                          </View>
                        ))}

                        <View style={styles.invig}>
                          <Ionicons name="person-outline" size={12} color={MUTED} />
                          <Text style={styles.invigText}>
                            {c.papers.flatMap((p) => p.invigilators).filter(Boolean).length === 0
                              ? 'No invigilator assigned yet'
                              : [...new Set(c.papers.flatMap((p) => p.invigilators))].join(', ')}
                          </Text>
                        </View>
                      </Card>
                    );
                  })}
                </Section>
              ) : null}

              {unknownRooms.length > 0 ? (
                <Section title="Room id resolves to no venue" note={`${unknownRooms.length} paper`}>
                  <Card>
                    {unknownRooms.map((p) => (
                      <PaperLine key={`u-${p.slotId}`} paper={p} tone={RED} label="Unknown room" />
                    ))}
                  </Card>
                </Section>
              ) : null}

              {unseated.length > 0 ? (
                <Section title="No room allocated" note={`${unseated.length} paper`}>
                  <Card>
                    {unseated.map((p) => (
                      <PaperLine key={`n-${p.slotId}`} paper={p} tone={AMBER} label="Unallocated" />
                    ))}
                  </Card>
                </Section>
              ) : null}

              {overCapacity > 0 ? (
                <NoteStrip
                  tone="bad"
                  text={`${plural(overCapacity, 'centre is', 'centres are')} over capacity once every issued ticket is counted. Move a paper or add seating.`}
                />
              ) : null}
            </>
          )}
        </>
      )}
    </HallTicketScreen>
  );
}

function PaperLine({ paper, tone, label }) {
  return (
    <View style={styles.paperRow}>
      <View style={styles.paperBody}>
        <Text style={styles.paperCode}>{paper.courseCode}</Text>
        <Text style={styles.paperMeta} numberOfLines={1}>
          {dayLabel(paper.date)} · {paper.startTime}–{paper.endTime} · {paper.examName}
        </Text>
      </View>
      <View style={styles.paperRight}>
        <Text style={[styles.paperCount, { color: tone }]}>{label}</Text>
        <Text style={styles.paperCountLabel}>{paper.issued}/{paper.enrolled} tickets</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centreCard: { marginBottom: 12 },
  centreHead: { flexDirection: 'row', alignItems: 'center' },
  centreBody: { flex: 1, paddingRight: 8 },
  centreName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  centreMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
  figures: {
    flexDirection: 'row', marginTop: 12, borderTopWidth: 1,
    borderTopColor: '#f1f5f9', paddingTop: 10,
  },
  figure: { flex: 1 },
  figureValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  figureLabel: { fontSize: 10.5, color: MUTED, marginTop: 2 },
  paperRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#f8fafc',
  },
  paperBody: { flex: 1, paddingRight: 8 },
  paperCode: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  paperMeta: { fontSize: 11.5, color: MUTED, marginTop: 2 },
  paperRight: { alignItems: 'flex-end', minWidth: 74 },
  paperCount: { fontSize: 13, fontWeight: '800', color: THEME },
  paperCountLabel: { fontSize: 10, color: MUTED, marginTop: 1 },
  invig: {
    flexDirection: 'row', alignItems: 'center', marginTop: 9,
    borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 9,
  },
  invigText: { fontSize: 11.5, color: SLATE, marginLeft: 6, flex: 1 },
});
