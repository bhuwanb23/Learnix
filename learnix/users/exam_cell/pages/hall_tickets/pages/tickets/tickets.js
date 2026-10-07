// X-04 Hall tickets — block 3: tickets and printing (docs/users/05 §3.5).
//
// THE TICKETS ARE RETURNED TWICE ON PURPOSE, and this screen uses both. A
// student with three papers gets ONE sheet with three lines on it, not three
// sheets — so the screen groups by student for the printout and keeps the flat
// list for the counts. Printing is grouped; counting is not.
//
// WHAT A PRINTOUT NEEDS IS ALL HERE: photo (or honest initials), name, roll
// number, seat, every paper with its date and time, and the centre it is held
// in. The centre is the one field that can be MISSING — `ExamRoomAllocation
// .roomId` is a scalar with no foreign key, and the seed writes rows that name
// no venue at all — so a missing centre is printed as missing rather than left
// blank. A blank looks like "no centre required"; this is "we do not know".
//
// DOWNLOADING IS IDEMPOTENT. Printing twice is normal, and turning the second
// print into an error would be a screen that punishes the controller for using
// it. The server returns `alreadyDownloaded` and this screen does not argue.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { examcellApi } from '../../../../../../services/api';
import {
  GREEN, MUTED, RED, SLATE, AMBER, THEME, VIOLET,
  dayLabel, formatDuration, plural, ticketStatusMeta,
} from '../../hallTicketMeta';
import {
  ActionRow, Card, ExamPicker, HallTicketEmpty, HallTicketScreen, NoteStrip, PhotoTile,
  Pill, Section, StatCell, StatGrid, StatusPill, useExamPicker, useHallTicket,
} from '../../hallTicketUi';

export default function HallTicketsList({ navigation }) {
  const picker = useExamPicker();
  const block = useHallTicket(
    () => examcellApi.hallTicketBlock('TICKETS', picker.examId),
    [picker.examId],
  );

  const [busy, setBusy] = useState(null); // 'all' | ticketId
  const [actionError, setActionError] = useState(null);
  const [printed, setPrinted] = useState(null);

  const data = block.data;
  const stats = data?.stats;
  const students = Array.isArray(data?.students) ? data.students : [];
  const tickets = Array.isArray(data?.tickets) ? data.tickets : [];

  const markOne = async (ticket) => {
    if (busy) return;
    setBusy(ticket.id);
    setActionError(null);
    try {
      await examcellApi.markHallTicketDownloaded(ticket.id);
      setPrinted(ticket.id);
      block.reload();
    } catch (err) {
      setActionError(err.message || 'Could not mark that ticket as printed');
    } finally {
      setBusy(null);
    }
  };

  // Print the whole set. Each ticket is marked individually rather than in one
  // invented endpoint, so one failure does not hide the successes — and so the
  // count reported is the count that actually changed.
  const markAll = async () => {
    if (busy || tickets.length === 0) return;
    setBusy('all');
    setActionError(null);
    let done = 0;
    try {
      for (const t of tickets) {
        try {
          await examcellApi.markHallTicketDownloaded(t.id);
          done += 1;
        } catch {
          // Already downloaded, or gone — the reload below shows the truth.
        }
      }
      setPrinted(`all:${done}`);
      block.reload();
    } catch (err) {
      setActionError(err.message || 'Printing failed part way through');
    } finally {
      setBusy(null);
    }
  };

  const undownloaded = (stats?.total ?? 0) - (stats?.downloaded ?? 0);

  return (
    <HallTicketScreen
      title="Tickets & printing"
      subtitle="Every issued ticket — photo, seat, papers and centre — ready to print."
      loading={block.loading && picker.loading}
      refreshing={block.refreshing}
      error={block.error}
      onRetry={() => { picker.reload(); block.reload(); }}
      onRefresh={block.onRefresh}
      header={
        <>
          <ExamPicker
            exams={picker.exams}
            examId={picker.examId}
            onChange={picker.setExamId}
            loading={picker.loading}
            error={picker.error}
          />
          {actionError ? <NoteStrip text={actionError} tone="bad" /> : null}
          {typeof printed === 'string' && printed.startsWith('all:') ? (
            <NoteStrip tone="good" text={`${printed.slice(4)} marked as printed.`} />
          ) : null}
          {stats?.missingCentre ? (
            <NoteStrip
              tone="bad"
              text={`${plural(stats.missingCentre, 'ticket')} reference a centre that cannot be resolved. The paper has a room id that names no venue — allocate a real centre before printing.`}
            />
          ) : null}
          {stats?.noPhoto ? (
            <NoteStrip
              tone="warn"
              text={`${plural(stats.noPhoto, 'student')} has no photograph on file. Their ticket prints with initials — add a photo if your centre requires one.`}
            />
          ) : null}
        </>
      }
    >
      {!data ? (
        <HallTicketEmpty
          icon="print-outline"
          title="No tickets yet"
          subtitle="Generate them from the Generate screen first."
        />
      ) : (
        <>
          <StatGrid>
            <StatCell label="Tickets" value={stats?.total ?? 0} tone={THEME} />
            <StatCell label="Students" value={stats?.students ?? 0} />
            <StatCell label="Printed" value={stats?.downloaded ?? 0} tone={GREEN} />
            <StatCell label="Awaiting print" value={undownloaded} tone={undownloaded > 0 ? AMBER : GREEN} />
            <StatCell label="Centre unknown" value={stats?.missingCentre ?? 0} tone={(stats?.missingCentre ?? 0) > 0 ? RED : MUTED} />
            <StatCell label="No photo" value={stats?.noPhoto ?? 0} tone={(stats?.noPhoto ?? 0) > 0 ? AMBER : MUTED} />
          </StatGrid>

          <Section title="Print run" note={`${plural(tickets.length, 'ticket')} in this exam`}>
            <Card>
              <Text style={styles.runTitle}>
                {undownloaded === 0
                  ? 'Everything in this exam has been printed'
                  : `${plural(undownloaded, 'ticket')} still to print`}
              </Text>
              <Text style={styles.runBody}>
                Marking a ticket as printed is idempotent — printing the same
                sheet twice is normal and will not error.
              </Text>
              <ActionRow
                actions={[
                  {
                    label: busy === 'all' ? 'Printing…' : `Mark all ${tickets.length} printed`,
                    icon: 'print',
                    color: VIOLET,
                    disabled: !!busy || tickets.length === 0,
                    onPress: markAll,
                  },
                ]}
              />
            </Card>
          </Section>

          <Section title="Students" note={`${students.length} sheet${students.length === 1 ? '' : 's'}`}>
            {students.length === 0 ? (
              <HallTicketEmpty
                icon="file-tray-outline"
                title="Nothing to print"
                subtitle="No ticket has been issued for this exam yet."
              />
            ) : (
              students.map((s) => (
                <Card key={s.studentProfileId} style={styles.sheet}>
                  {/* ── The header of the printed sheet ── */}
                  <View style={styles.sheetHead}>
                    <PhotoTile name={s.name} avatarFileId={s.avatarFileId} size={54} />
                    <View style={styles.sheetBody}>
                      <Text style={styles.sheetName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.sheetMeta}>{s.rollNo}</Text>
                      <Text style={styles.sheetMeta} numberOfLines={1}>{s.email}</Text>
                      <View style={styles.sheetPills}>
                        <Pill text={`${s.papers.length} ${s.papers.length === 1 ? 'paper' : 'papers'}`} color={THEME} />
                        {!s.hasPhoto ? <Pill text="No photo" color={AMBER} icon="image-outline" /> : null}
                      </View>
                    </View>
                  </View>

                  {/* ── The lines of the printed sheet ── */}
                  <View style={styles.tableHead}>
                    <Text style={[styles.thCode, styles.th]}>Paper</Text>
                    <Text style={[styles.thDate, styles.th]}>Date & time</Text>
                    <Text style={[styles.thSeat, styles.th]}>Seat</Text>
                    <Text style={[styles.thCentre, styles.th]}>Centre</Text>
                  </View>

                  {s.papers.map((p) => {
                    const status = ticketStatusMeta(p.status);
                    return (
                      <View key={p.id} style={styles.tr}>
                        <View style={styles.tdCode}>
                          <Text style={styles.code} numberOfLines={1}>{p.courseCode}</Text>
                          <Text style={styles.sub} numberOfLines={1}>{p.section}</Text>
                          <StatusPill status={p.status} meta={status} />
                        </View>
                        <View style={styles.tdDate}>
                          <Text style={styles.dateText}>{dayLabel(p.date)}</Text>
                          <Text style={styles.sub}>
                            {p.startTime}–{p.endTime} · {formatDuration(p.durationMinutes)}
                          </Text>
                        </View>
                        <View style={styles.tdSeat}>
                          <Text style={styles.seat}>{p.seatNo}</Text>
                        </View>
                        <View style={styles.tdCentre}>
                          {p.centreMissing ? (
                            <Text style={styles.centreMissing}>Unknown</Text>
                          ) : (
                            <>
                              <Text style={styles.centre} numberOfLines={1}>{p.centre ?? 'Unallocated'}</Text>
                              <Text style={styles.sub} numberOfLines={1}>{p.centreLocation ?? ''}</Text>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  <ActionRow
                    actions={s.papers.map((p) => ({
                      label:
                        busy === p.id
                          ? 'Marking…'
                          : p.status === 'DOWNLOADED'
                            ? `Printed ${p.courseCode}`
                            : `Mark ${p.courseCode} printed`,
                      icon: p.status === 'DOWNLOADED' ? 'checkmark' : 'print',
                      color: p.status === 'DOWNLOADED' ? GREEN : THEME,
                      disabled: !!busy,
                      onPress: () => markOne(p),
                    }))}
                  />
                </Card>
              ))
            )}
          </Section>
        </>
      )}
    </HallTicketScreen>
  );
}

const styles = StyleSheet.create({
  runTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  runBody: { fontSize: 12.5, color: SLATE, marginTop: 5, lineHeight: 18, marginBottom: 8 },
  sheet: { marginBottom: 14 },
  sheetHead: { flexDirection: 'row', marginBottom: 12 },
  sheetBody: { flex: 1, paddingHorizontal: 11 },
  sheetName: { fontSize: 15.5, fontWeight: '800', color: '#0f172a' },
  sheetMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
  sheetPills: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 7 },
  tableHead: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    paddingTop: 7, paddingBottom: 4,
  },
  th: { fontSize: 10, fontWeight: '800', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 },
  thCode: { flex: 2.1 },
  thDate: { flex: 2.3 },
  thSeat: { flex: 0.9 },
  thCentre: { flex: 1.9 },
  tr: {
    flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9', alignItems: 'flex-start',
  },
  tdCode: { flex: 2.1, paddingRight: 6 },
  tdDate: { flex: 2.3, paddingRight: 6 },
  tdSeat: { flex: 0.9 },
  tdCentre: { flex: 1.9 },
  code: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 11, color: MUTED, marginTop: 2 },
  dateText: { fontSize: 12.5, fontWeight: '700', color: '#0f172a' },
  seat: { fontSize: 14, fontWeight: '800', color: THEME },
  centre: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  centreMissing: { fontSize: 12, fontWeight: '700', color: RED },
});
