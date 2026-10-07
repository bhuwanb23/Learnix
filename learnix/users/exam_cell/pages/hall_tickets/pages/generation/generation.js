// X-04 Hall tickets — block 2: generation (docs/users/05 §3.5).
//
// This screen previews a run before it happens, and the preview is computed
// with THE SAME PREDICATE the run uses — per slot, over active enrolments,
// skipping students who already hold a ticket. If the preview and the run ever
// disagree the screen is lying about what the button does, which is why
// `wouldIssueTickets` is a server figure and never re-derived here.
//
// TWO ACTIONS, deliberately separate:
//
//   · BULK issues the whole exam. It reports what it did rather than doing it
//     silently, and the result stays on screen — a controller who has just
//     issued 200 tickets needs to see "200 issued, 3 skipped" without
//     refreshing to find out.
//   · SINGLE issues one student in one paper, from the `pendingSlots` the
//     server returns. Without those the only reachable action would be the
//     batch, which is the wrong tool for one student who was added late.
//
// NEITHER ACTION IS GATED ON ELIGIBILITY. The warnings are shown alongside,
// and the policy sentence saying so is printed above both buttons.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../../../services/api';
import {
  ELIGIBILITY_POLICY, GREEN, MUTED, SLATE, AMBER, THEME,
  eligibilityReasonMeta, shortDayLabel, plural,
} from '../../hallTicketMeta';
import {
  ActionRow, Card, ExamPicker, HallTicketEmpty, HallTicketScreen, NoteStrip,
  Pill, Section, StatCell, StatGrid, useExamPicker, useHallTicket,
} from '../../hallTicketUi';

export default function HallTicketsGeneration({ navigation }) {
  const picker = useExamPicker();
  const block = useHallTicket(
    () => examcellApi.hallTicketBlock('GENERATION', picker.examId),
    [picker.examId],
  );

  const [busy, setBusy] = useState(null); // 'bulk' | slotId
  const [result, setResult] = useState(null);
  const [actionError, setActionError] = useState(null);

  const data = block.data;
  const totals = data?.totals;
  const policy = data?.policy?.sentence || ELIGIBILITY_POLICY;

  const students = Array.isArray(data?.students) ? data.students : [];
  const pending = students.filter((r) => r.wouldIssue);

  const runBulk = async () => {
    if (!picker.examId || busy) return;
    setBusy('bulk');
    setActionError(null);
    setResult(null);
    try {
      const res = await examcellApi.generateHallTicketBulk(picker.examId);
      setResult({
        kind: 'bulk',
        issued: res?.issued ?? 0,
        skipped: res?.skipped ?? 0,
        warnings: res?.warnings ?? 0,
        slots: res?.slots ?? 0,
      });
      block.reload();
    } catch (err) {
      setActionError(err.message || 'Generation failed');
    } finally {
      setBusy(null);
    }
  };

  // One student's button issues their FIRST pending paper. Issuing every
  // pending paper of a student in one tap would be a bulk run under another
  // name, and the controller would not see how many seats were taken.
  const issueFirst = async (student) => {
    const next = student.pendingSlots?.[0];
    if (!next || busy) return;
    setBusy(`s:${student.studentProfileId}`);
    setActionError(null);
    setResult(null);
    try {
      const res = await examcellApi.generateHallTicket(next.slotId, student.studentProfileId);
      setResult({
        kind: 'single',
        name: student.name,
        courseCode: next.courseCode,
        seatNo: res?.seatNo ?? null,
      });
      block.reload();
    } catch (err) {
      setActionError(err.message || 'Could not issue that ticket');
    } finally {
      setBusy(null);
    }
  };

  const byReason = totals?.byReason ?? {};
  const wouldIssue = totals?.wouldIssueTickets ?? 0;

  return (
    <HallTicketScreen
      title="Generate tickets"
      subtitle="Issue one ticket, or every ticket for this exam in one pass."
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
          <NoteStrip text={policy} tone="info" />
          {actionError ? <NoteStrip text={actionError} tone="bad" /> : null}
          {result ? (
            <NoteStrip
              tone={result.kind === 'bulk' ? 'good' : 'good'}
              text={
                result.kind === 'bulk'
                  ? `${plural(result.issued, 'ticket')} issued across ${plural(result.slots, 'paper')}` +
                    `${result.skipped ? `, ${result.skipped} already had one` : ''}` +
                    `${result.warnings ? `, ${result.warnings} with warnings` : ''}.`
                  : `Issued${result.seatNo ? ` seat ${result.seatNo}` : ''}` +
                    `${result.name ? ` for ${result.name}` : ''}` +
                    `${result.courseCode ? ` · ${result.courseCode}` : ''}.`
              }
            />
          ) : null}
        </>
      }
    >
      {!data ? (
        <HallTicketEmpty
          icon="flash-outline"
          title="Nothing to generate"
          subtitle="An exam with enrolments and a timetable can issue tickets here."
        />
      ) : (
        <>
          <StatGrid>
            <StatCell label="Would issue" value={totals?.wouldIssueTickets ?? 0} tone={THEME} hint="tickets" />
            <StatCell label="Students affected" value={totals?.wouldIssue ?? 0} />
            <StatCell label="Already issued" value={totals?.alreadyIssued ?? 0} tone={GREEN} />
            <StatCell label="No scheduled paper" value={totals?.noScheduledPaper ?? 0} tone={AMBER} />
            <StatCell label="Papers in this exam" value={totals?.slots ?? 0} />
            <StatCell label="Warned" value={totals?.warned ?? 0} tone={(totals?.warned ?? 0) > 0 ? AMBER : GREEN} />
          </StatGrid>

          <Section title="Run">
            <Card>
              <Text style={styles.runTitle}>
                {wouldIssue === 0
                  ? 'Nothing left to issue'
                  : `${plural(wouldIssue, 'ticket')} ready to issue`}
              </Text>
              <Text style={styles.runBody}>
                {wouldIssue === 0
                  ? 'Every active enrolment with a scheduled paper already has a ticket for this exam.'
                  : `Across ${plural(totals?.wouldIssue ?? 0, 'student')} and ${plural(totals?.slots ?? 0, 'paper')}. Warnings are recorded, not enforced.`}
              </Text>
              <ActionRow
                actions={[
                  {
                    label: busy === 'bulk' ? 'Issuing…' : `Issue ${wouldIssue} ticket${wouldIssue === 1 ? '' : 's'}`,
                    icon: 'flash',
                    color: THEME,
                    disabled: !!busy || wouldIssue === 0,
                    onPress: runBulk,
                  },
                ]}
              />
            </Card>
          </Section>

          <Section
            title="Students"
            note={`${pending.length} with something to issue`}
          >
            {students.length === 0 ? (
              <HallTicketEmpty
                icon="people-outline"
                title="No students in this cohort"
                subtitle="Enrolments for this semester appear here."
              />
            ) : (
              students.map((r) => (
                <Card key={r.studentProfileId} style={styles.row}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {r.rollNo} · {plural(r.papers, 'paper')} · {plural(r.tickets, 'ticket')} issued
                      </Text>
                    </View>
                    <Pill
                      text={r.wouldIssue ? `${r.pendingSlots.length} to issue` : 'Done'}
                      color={r.wouldIssue ? THEME : GREEN}
                    />
                  </View>

                  {r.reasons.length > 0 ? (
                    <View style={styles.reasons}>
                      {r.reasons.map((id) => {
                        const m = eligibilityReasonMeta(id);
                        return (
                          <Pill key={id} text={m?.label ?? id} color={m?.color ?? SLATE} icon={m?.icon} />
                        );
                      })}
                    </View>
                  ) : null}

                  {r.pendingSlots.length > 0 ? (
                    <>
                      <View style={styles.pending}>
                        {r.pendingSlots.map((p) => (
                          <View key={p.slotId} style={styles.pendingRow}>
                            <Ionicons name="document-text-outline" size={13} color={MUTED} />
                            <Text style={styles.pendingText} numberOfLines={1}>
                              {p.courseCode} · {shortDayLabel(p.date)} {p.startTime}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <ActionRow
                        actions={[
                          {
                            label: busy === `s:${r.studentProfileId}` ? 'Issuing…' : 'Issue first paper',
                            icon: 'add',
                            color: THEME,
                            disabled: !!busy,
                            onPress: () => issueFirst(r),
                          },
                        ]}
                      />
                    </>
                  ) : null}
                </Card>
              ))
            )}
          </Section>

          {Object.keys(byReason).length > 0 ? (
            <Section title="Warnings recorded" note="never enforced">
              <Card>
                {Object.entries(byReason)
                  .filter(([, n]) => n > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, n]) => {
                    const m = eligibilityReasonMeta(id);
                    return (
                      <View key={id} style={styles.reasonRow}>
                        <Text style={styles.reasonLabel}>{m?.label ?? id}</Text>
                        <Text style={[styles.reasonValue, { color: m?.color ?? SLATE }]}>{n}</Text>
                      </View>
                    );
                  })}
              </Card>
            </Section>
          ) : null}
        </>
      )}
    </HallTicketScreen>
  );
}

const styles = StyleSheet.create({
  runTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  runBody: { fontSize: 12.5, color: SLATE, marginTop: 5, lineHeight: 18, marginBottom: 8 },
  row: { marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, paddingRight: 8 },
  rowName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  pending: {
    marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8,
  },
  pendingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pendingText: { fontSize: 12, color: SLATE, marginLeft: 6, flex: 1 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  reasonLabel: { fontSize: 13, color: SLATE, flexShrink: 1, paddingRight: 10 },
  reasonValue: { fontSize: 14, fontWeight: '700' },
});
