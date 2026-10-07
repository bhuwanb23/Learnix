// X-04 Hall tickets — block 1: student eligibility (docs/users/05 §3.5).
//
// THE POLICY IS THE POINT OF THIS SCREEN. Every warning on it — dropped
// enrolment, unpaid fees, missing photograph — is shown, and none of them
// stops a generation. That is a decision, not an omission, and it is printed
// at the top of this screen rather than left to be inferred from a red row,
// because the natural reading of a red row is "this student is refused" and
// that reading would be wrong. The server returns the same sentence with the
// block for exactly this reason.
//
// The screen never says a student is ineligible. It says they are WARNED, and
// names the reasons. "Ineligible" is a verdict; these are observations a
// controller is entitled to weigh and then decide.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { examcellApi } from '../../../../../../services/api';
import {
  ELIGIBILITY_POLICY, GREEN, MUTED, SLATE, AMBER, THEME,
  eligibilityReasonMeta, plural,
} from '../../hallTicketMeta';
import {
  Card, CountLine, ExamPicker, FigureRow, HallTicketEmpty, HallTicketScreen, PhotoTile,
  Pill, Section, StatCell, StatGrid, NoteStrip, useExamPicker, useHallTicket,
} from '../../hallTicketUi';

export default function HallTicketsEligibility({ navigation }) {
  const picker = useExamPicker();
  const [filter, setFilter] = useState('ALL');

  const block = useHallTicket(
    () => examcellApi.hallTicketBlock('ELIGIBILITY', picker.examId),
    [picker.examId],
  );

  const data = block.data;
  const totals = data?.totals;
  const policy = data?.policy?.sentence || ELIGIBILITY_POLICY;

  const students = Array.isArray(data?.students) ? data.students : [];
  const shown = students.filter((r) => {
    if (filter === 'CLEAR') return r.eligible;
    if (filter === 'WARNED') return !r.eligible;
    return true;
  });

  // Only reasons that actually occur are listed. An eight-row list of zeroes
  // is noise, and a reason nobody has is not information.
  const byReason = totals?.byReason ?? {};
  const presentReasons = (data?.reasons ?? [])
    .map((r) => ({ ...r, count: byReason[r.id] ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <HallTicketScreen
      title="Student eligibility"
      subtitle="Who is sitting this exam, and what is worth a second look."
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
        </>
      }
    >
      {!data ? (
        <HallTicketEmpty
          icon="school-outline"
          title="Nothing to check yet"
          subtitle="Once a course has enrolments, everyone in it appears here."
        />
      ) : (
        <>
          <StatGrid>
            <StatCell label="Students" value={totals?.students ?? 0} />
            <StatCell label="Clear" value={totals?.clear ?? 0} tone={GREEN} />
            <StatCell label="Warned" value={totals?.warned ?? 0} tone={(totals?.warned ?? 0) > 0 ? AMBER : GREEN} />
            <StatCell label="With a scheduled paper" value={totals?.scheduled ?? 0} />
            <StatCell label="Already issued" value={totals?.issued ?? 0} tone={THEME} />
            <StatCell label="Exam" value={data.exam?.semester ?? '—'} hint={data.exam?.type} />
          </StatGrid>

          {presentReasons.length > 0 ? (
            <Section title="Warnings in this exam" note="counts, not refusals">
              <Card>
                {presentReasons.map((r) => (
                  <FigureRow
                    key={r.id}
                    label={r.label}
                    value={r.count}
                    tone={r.color}
                    sublabel={r.blurb}
                  />
                ))}
              </Card>
            </Section>
          ) : (
            <NoteStrip
              text="No warnings in this exam — every enrolled student is clear."
              tone="good"
            />
          )}

          <Section
            title="Students"
            note={`${shown.length} of ${students.length}`}
          >
            <View style={styles.filters}>
              {[
                { id: 'ALL', label: `All ${students.length}` },
                { id: 'WARNED', label: `Warned ${totals?.warned ?? 0}` },
                { id: 'CLEAR', label: `Clear ${totals?.clear ?? 0}` },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filter, filter === f.id && styles.filterActive]}
                  onPress={() => setFilter(f.id)}
                >
                  <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {shown.length === 0 ? (
              <HallTicketEmpty
                icon="checkmark-done-outline"
                title={filter === 'WARNED' ? 'No warnings' : 'No students match'}
                subtitle={
                  filter === 'WARNED'
                    ? 'Nothing here needs a second look.'
                    : 'Try another filter.'
                }
              />
            ) : (
              shown.map((r) => (
                <Card key={r.studentProfileId} style={styles.row}>
                  <View style={styles.rowTop}>
                    <PhotoTile name={r.name} avatarFileId={r.avatarFileId} size={40} />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {r.rollNo} · {plural(r.papers, 'paper')} · {plural(r.tickets, 'ticket')}
                      </Text>
                    </View>
                    <Pill
                      text={r.eligible ? 'Clear' : plural(r.reasons.length, 'warning')}
                      color={r.eligible ? GREEN : AMBER}
                    />
                  </View>

                  {r.reasons.length > 0 ? (
                    <View style={styles.reasons}>
                      {r.reasons.map((id) => {
                        const m = eligibilityReasonMeta(id);
                        return (
                          <Pill
                            key={id}
                            text={m?.label ?? id}
                            color={m?.color ?? SLATE}
                            icon={m?.icon}
                          />
                        );
                      })}
                    </View>
                  ) : null}

                  {!r.eligible ? (
                    <Text style={styles.policyLine}>
                      Warnings never stop generation.
                    </Text>
                  ) : null}
                </Card>
              ))
            )}
          </Section>

          <CountLine n={students.length} one="student" />
        </>
      )}
    </HallTicketScreen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  filter: {
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8,
  },
  filterActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  filterText: { fontSize: 12.5, fontWeight: '700', color: SLATE },
  filterTextActive: { color: '#2563eb' },
  row: { marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, paddingHorizontal: 10 },
  rowName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  policyLine: { fontSize: 11.5, color: SLATE, marginTop: 4, fontStyle: 'italic' },
});
