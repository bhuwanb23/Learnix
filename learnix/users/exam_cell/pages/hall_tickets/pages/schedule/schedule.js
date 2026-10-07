// X-04 Hall tickets — block 4: subjects and schedule (docs/users/05 §3.5).
//
// This is the answer to "what is this student actually sitting, and when" —
// the timetable of the exam itself, reduced to what a hall ticket prints.
//
// IT IS INSTITUTION-WIDE WHEN NO EXAM IS CHOSEN, and the picker narrows rather
// than gates. That matters because `openModule(key)` drops its second argument:
// a screen that refused to render until an exam was selected would be a screen
// the controller can never reach a selection for on the way in.
//
// `enrolled` and `issued` sit side by side on every row because their GAP is
// the question. A paper with 60 enrolled and 0 issued has not been generated
// for; a paper with 60 and 60 is done. Two numbers, one glance, no arithmetic
// on the reader's part.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { examcellApi } from '../../../../../../services/api';
import {
  AMBER, GREEN, MUTED, RED, SLATE, THEME, dayLabel, plural,
} from '../../hallTicketMeta';
import {
  Card, ExamPicker, HallTicketEmpty, HallTicketScreen, NoteStrip, Pill,
  Section, StatCell, StatGrid, useExamPicker, useHallTicket,
} from '../../hallTicketUi';

export default function HallTicketsSchedule() {
  const picker = useExamPicker();
  const block = useHallTicket(
    () => examcellApi.hallTicketBlock('SCHEDULE', picker.examId),
    [picker.examId],
  );

  const exams = Array.isArray(block.data?.exams) ? block.data.exams : [];

  const papers = exams.reduce((t, e) => t + (e.papers?.length ?? 0), 0);
  const enrolled = exams.reduce((t, e) => t + (e.totals?.enrolled ?? 0), 0);
  const issued = exams.reduce((t, e) => t + (e.totals?.issued ?? 0), 0);
  const unallocated = exams.reduce(
    (t, e) => t + (e.papers ?? []).filter((p) => !p.centre).length,
    0,
  );

  return (
    <HallTicketScreen
      title="Subjects & schedule"
      subtitle="What each paper is, when it sits, and who is taking it."
      loading={block.loading}
      refreshing={block.refreshing}
      error={block.error}
      onRetry={block.reload}
      onRefresh={block.onRefresh}
      header={
        <ExamPicker
          exams={picker.exams}
          examId={picker.examId}
          onChange={picker.setExamId}
          loading={picker.loading}
          error={picker.error}
        />
      }
    >
      {!block.data ? (
        <HallTicketEmpty
          icon="time-outline"
          title="No schedule yet"
          subtitle="Add a slot to an exam in the timetable and it appears here."
        />
      ) : (
        <>
          <StatGrid>
            <StatCell label="Exams" value={exams.length} />
            <StatCell label="Papers" value={papers} tone={THEME} />
            <StatCell label="Enrolments" value={enrolled} />
            <StatCell label="Tickets issued" value={issued} tone={issued > 0 ? GREEN : MUTED} />
            <StatCell label="Centre missing" value={unallocated} tone={unallocated > 0 ? RED : MUTED} />
            <StatCell
              label="Coverage"
              value={enrolled > 0 ? `${Math.round((issued / enrolled) * 100)}%` : '—'}
              tone={enrolled > 0 && issued === enrolled ? GREEN : AMBER}
            />
          </StatGrid>

          {unallocated > 0 ? (
            <NoteStrip
              tone="warn"
              text={`${plural(unallocated, 'paper has', 'papers have')} no centre allocated. They will print as "Unallocated" — see the Examination centre screen.`}
            />
          ) : null}

          {exams.length === 0 ? (
            <HallTicketEmpty
              icon="calendar-outline"
              title="Nothing scheduled"
              subtitle="No exam has a slot yet."
            />
          ) : (
            exams.map((e) => (
              <Section
                key={e.id}
                title={e.name}
                note={`${plural(e.totals?.papers ?? 0, 'paper')} · ${e.totals?.enrolled ?? 0} enrolled · ${e.totals?.issued ?? 0} issued`}
              >
                <Card>
                  <View style={styles.headPills}>
                    <Pill text={`Sem ${e.semester}`} color={SLATE} />
                    <Pill text={e.type} color={THEME} />
                    <Pill
                      text={e.hallTicketStatus === 'PUBLISHED' ? 'Tickets published' : 'Not published'}
                      color={e.hallTicketStatus === 'PUBLISHED' ? GREEN : AMBER}
                    />
                  </View>

                  {(!e.papers || e.papers.length === 0) ? (
                    <Text style={styles.none}>No slot for this exam yet.</Text>
                  ) : (
                    e.papers.map((p) => (
                      <View key={p.slotId} style={styles.row}>
                        <View style={styles.rowLeft}>
                          <Text style={styles.code}>{p.courseCode}</Text>
                          <Text style={styles.name} numberOfLines={1}>{p.courseName}</Text>
                          <Text style={styles.sub}>
                            {p.section} · {dayLabel(p.date)} · {p.startTime}–{p.endTime} · {p.durationLabel}
                          </Text>
                        </View>
                        <View style={styles.rowRight}>
                          <Text style={styles.counts}>
                            {p.issued}/{p.enrolled}
                          </Text>
                          <Text style={styles.countsLabel}>tickets</Text>
                          {p.centre ? (
                            <Text style={styles.centre} numberOfLines={1}>{p.centre}</Text>
                          ) : (
                            <Text style={styles.noCentre}>No centre</Text>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </Card>
              </Section>
            ))
          )}
        </>
      )}
    </HallTicketScreen>
  );
}

const styles = StyleSheet.create({
  headPills: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  none: { fontSize: 12.5, color: SLATE, paddingVertical: 8 },
  row: {
    flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rowLeft: { flex: 1, paddingRight: 10 },
  code: { fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  name: { fontSize: 12.5, color: SLATE, marginTop: 2 },
  sub: { fontSize: 11.5, color: MUTED, marginTop: 3 },
  rowRight: { alignItems: 'flex-end', minWidth: 78 },
  counts: { fontSize: 15, fontWeight: '800', color: THEME },
  countsLabel: { fontSize: 10, color: MUTED, marginTop: 1 },
  centre: { fontSize: 11, color: SLATE, marginTop: 5, maxWidth: 110 },
  noCentre: { fontSize: 11, fontWeight: '700', color: RED, marginTop: 5 },
});
