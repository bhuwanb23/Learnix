// X-04 Hall tickets — blocks 6: corrections and reissues (docs/users/05 §3.5).
//
// ONE TABLE, TWO KINDS. That was a decision rather than a convenience: a
// correction and a reissue go through the same desk, are decided by the same
// person, and the controller's queue is "what needs my attention", not "which
// of two tables has a row in it". The kind is carried on every row and drawn
// with its own colour so the two are never confused.
//
// THREE STEPS, AND THE MIDDLE ONE IS DELIBERATELY ITS OWN BUTTON.
//
//   REQUESTED → APPROVED/REJECTED   "yes, that looks right"
//   APPROVED  → COMPLETED           the record actually changes
//
// Approval and effect are separate calls because a controller who approves a
// correction should not, in the same breath, rewrite a student's roll number.
// The screen makes that visible: until a request is APPROVED the only action
// offered is a decision, and only afterwards does "Apply" appear.
//
// APPLYING A CORRECTION IS DESTRUCTIVE to the printed detail it names, so the
// row shows the CURRENT value next to the REQUESTED one. "Seat A-12 → A-42" is
// a decision a controller can make; "A-42" alone is not.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { examcellApi } from '../../../../../../services/api';
import {
  AMBER, BROWN, GREEN, MUTED, RED, SLATE, THEME, VIOLET,
  correctableFieldMeta, dayLabel, plural,
  requestKindMeta, requestStatusMeta,
} from '../../hallTicketMeta';
import {
  ActionRow, Card, HallTicketEmpty, HallTicketScreen, NoteStrip, Pill,
  Section, StatCell, StatGrid, StatusPill, useHallTicket,
} from '../../hallTicketUi';

const FILTERS = ['ALL', 'REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'];

export default function HallTicketsRequests() {
  const block = useHallTicket(() => examcellApi.hallTicketBlock('REQUESTS'));
  const [filter, setFilter] = useState('REQUESTED');
  const [busy, setBusy] = useState(null); // requestId
  const [actionError, setActionError] = useState(null);
  const [flash, setFlash] = useState(null);

  const data = block.data;
  const totals = data?.totals ?? {};
  const all = Array.isArray(data?.requests) ? data.requests : [];
  const shown = filter === 'ALL' ? all : all.filter((r) => r.status === filter);

  const act = async (id, label, fn) => {
    if (busy) return;
    setBusy(id);
    setActionError(null);
    setFlash(null);
    try {
      await fn();
      setFlash(`${label} — done.`);
      block.reload();
    } catch (err) {
      setActionError(err.message || `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  const decide = (id, decision) =>
    act(id, decision === 'APPROVED' ? 'Approved' : 'Rejected', () =>
      examcellApi.decideHallTicketRequest(id, { decision }),
    );

  const complete = (id) =>
    act(id, 'Applied', () => examcellApi.completeHallTicketRequest(id));

  const valueOf = (r) => {
    const meta = r.field ? correctableFieldMeta(r.field) : null;
    const current =
      r.field === 'seatNo' ? r.currentSeatNo
      : r.field === 'rollNo' ? r.currentRollNo
      : r.field === 'fullName' ? r.currentName
      : null;
    if (!r.field) return { current: null, requested: null, label: null };
    return { current, requested: r.requestedValue, label: meta?.label ?? r.field };
  };

  return (
    <HallTicketScreen
      title="Corrections & reissues"
      subtitle="What students have asked to fix, what was decided, and what has been applied."
      loading={block.loading}
      refreshing={block.refreshing}
      error={block.error}
      onRetry={block.reload}
      onRefresh={block.onRefresh}
      header={
        <>
          {actionError ? <NoteStrip text={actionError} tone="bad" /> : null}
          {flash ? <NoteStrip text={flash} tone="good" /> : null}
          {data?.open > 0 ? (
            <NoteStrip
              tone="warn"
              text={`${plural(data.open, 'request is', 'requests are')} still open. Nothing is applied until a request is approved AND completed.`}
            />
          ) : null}
        </>
      }
    >
      {!data ? (
        <HallTicketEmpty
          icon="swap-horizontal-outline"
          title="No requests"
          subtitle="Raise one against a ticket from the tickets screen."
        />
      ) : (
        <>
          <StatGrid>
            <StatCell label="Open" value={data.open ?? 0} tone={(data.open ?? 0) > 0 ? AMBER : GREEN} />
            <StatCell label="Requested" value={totals.REQUESTED ?? 0} tone={THEME} />
            <StatCell label="Approved" value={totals.APPROVED ?? 0} tone={GREEN} />
            <StatCell label="Rejected" value={totals.REJECTED ?? 0} tone={RED} />
            <StatCell label="Completed" value={totals.COMPLETED ?? 0} tone={VIOLET} />
            <StatCell label="All time" value={all.length} />
          </StatGrid>

          <View style={styles.filters}>
            {FILTERS.map((f) => {
              const n = f === 'ALL' ? all.length : (totals[f] ?? 0);
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filter, filter === f && styles.filterActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === 'ALL' ? 'All' : requestStatusMeta(f)?.label ?? f} {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Section title="Requests" note={`${shown.length} shown`}>
            {shown.length === 0 ? (
              <HallTicketEmpty
                icon="checkmark-done-outline"
                title={filter === 'REQUESTED' ? 'Nothing awaiting a decision' : 'Nothing here'}
                subtitle={
                  filter === 'REQUESTED'
                    ? 'New corrections and reissues land in this queue.'
                    : 'Try another filter.'
                }
              />
            ) : (
              shown.map((r) => {
                const kind = requestKindMeta(r.kind);
                const status = requestStatusMeta(r.status);
                const v = valueOf(r);
                return (
                  <Card key={r.id} style={styles.row}>
                    <View style={styles.rowHead}>
                      <Pill text={kind?.label ?? r.kind} color={kind?.color ?? SLATE} icon={kind?.icon} />
                      <StatusPill status={r.status} meta={status} />
                    </View>

                    <Text style={styles.who} numberOfLines={1}>
                      {r.studentName} · {r.rollNo}
                    </Text>
                    <Text style={styles.what} numberOfLines={2}>
                      {r.courseCode} · {dayLabel(r.date)} · seat {r.currentSeatNo}
                    </Text>
                    <Text style={styles.exam} numberOfLines={1}>{r.examName}</Text>

                    {v.label ? (
                      <View style={styles.change}>
                        <Text style={styles.changeLabel}>{v.label}</Text>
                        <Text style={styles.changeValues}>
                          <Text style={styles.changeOld}>{v.current ?? '—'}</Text>
                          <Text style={styles.changeArrow}>  →  </Text>
                          <Text style={styles.changeNew}>{v.requested}</Text>
                        </Text>
                      </View>
                    ) : null}

                    <Text style={styles.reason} numberOfLines={3}>
                      “{r.reason}”
                    </Text>

                    {r.note ? (
                      <Text style={styles.note} numberOfLines={3}>Decision note: {r.note}</Text>
                    ) : null}
                    {r.decidedBy ? (
                      <Text style={styles.meta}>
                        {r.status === 'REJECTED' ? 'Rejected' : 'Approved'} by {r.decidedBy}
                      </Text>
                    ) : null}

                    <ActionRow
                      actions={[
                        ...(r.status === 'REQUESTED'
                          ? [
                              {
                                label: busy === r.id ? 'Working…' : 'Approve',
                                icon: 'checkmark',
                                color: GREEN,
                                disabled: !!busy,
                                onPress: () => decide(r.id, 'APPROVED'),
                              },
                              {
                                label: 'Reject',
                                icon: 'close',
                                color: RED,
                                disabled: !!busy,
                                onPress: () => decide(r.id, 'REJECTED'),
                              },
                            ]
                          : []),
                        ...(r.status === 'APPROVED'
                          ? [
                              {
                                label: busy === r.id ? 'Applying…' : 'Apply change',
                                icon: 'hammer',
                                color: VIOLET,
                                disabled: !!busy,
                                onPress: () => complete(r.id),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </Card>
                );
              })
            )}
          </Section>
        </>
      )}
    </HallTicketScreen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  filter: {
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
    marginRight: 7, marginBottom: 7,
  },
  filterActive: { borderColor: THEME, backgroundColor: '#eff6ff' },
  filterText: { fontSize: 12, fontWeight: '700', color: SLATE },
  filterTextActive: { color: THEME },
  row: { marginBottom: 11 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  who: { fontSize: 14.5, fontWeight: '800', color: '#0f172a', marginTop: 6 },
  what: { fontSize: 12.5, color: SLATE, marginTop: 3 },
  exam: { fontSize: 11.5, color: MUTED, marginTop: 2 },
  change: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  changeLabel: { fontSize: 10.5, fontWeight: '800', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 },
  changeValues: { fontSize: 13.5, marginTop: 4 },
  changeOld: { color: MUTED, textDecorationLine: 'line-through' },
  changeArrow: { color: MUTED, fontWeight: '700' },
  changeNew: { color: BROWN, fontWeight: '800' },
  reason: { fontSize: 12.5, color: SLATE, marginTop: 9, fontStyle: 'italic', lineHeight: 17 },
  note: { fontSize: 12, color: SLATE, marginTop: 6 },
  meta: { fontSize: 11.5, color: MUTED, marginTop: 5 },
});
