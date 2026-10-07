// X-04 Hall tickets — block 7: publication status (docs/users/05 §3.5).
//
// THE PER-EXAM PUBLISH GATE. An exam goes out or comes back on its own; there
// is no institution-wide switch, because publishing the November exams to make
// the December ones visible would publish both.
//
// PUBLISHING IS REFUSED WHEN THERE IS NOTHING TO PUBLISH, and this screen shows
// that before the button is pressed: `publishable` is false for an exam with
// zero tickets, and the button says why instead of failing on tap. The server
// enforces the same rule — this is the screen not being rude about it first.
//
// RECALLING IS NOT A DELETION. It takes the tickets away from students and
// leaves every ticket exactly as it was, so re-publishing restores the same
// seats and the same QR codes. That is why the two actions are the same button
// in two states rather than one button with a warning.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../../../services/api';
import {
  AMBER, GREEN, INDIGO, MUTED, RED, SLATE, PUBLISH_POLICY,
  plural, publicationStatusMeta,
} from '../../hallTicketMeta';
import {
  Card, HallTicketEmpty, HallTicketScreen, NoteStrip, Pill, Section,
  StatCell, StatGrid, useHallTicket,
} from '../../hallTicketUi';

const FILTERS = ['ALL', 'PUBLISHED', 'DRAFT', 'RECALLED'];

export default function HallTicketsPublication() {
  const block = useHallTicket(() => examcellApi.hallTicketBlock('PUBLICATION'));
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState(null); // examId
  const [actionError, setActionError] = useState(null);
  const [flash, setFlash] = useState(null);

  const data = block.data;
  const t = data?.totals;
  const policy = data?.policy?.sentence || PUBLISH_POLICY;
  const exams = Array.isArray(data?.exams) ? data.exams : [];
  const shown = filter === 'ALL' ? exams : exams.filter((e) => e.hallTicketStatus === filter);

  const act = async (exam, action) => {
    if (busy) return;
    setBusy(exam.id);
    setActionError(null);
    setFlash(null);
    try {
      const res = await examcellApi.setHallTicketPublication(exam.id, action);
      setFlash(
        `${exam.name} — ${action === 'publish' ? 'published' : 'recalled'}` +
          `${res?.alreadyInState ? ' (already in that state)' : ''}.`,
      );
      block.reload();
    } catch (err) {
      setActionError(err.message || 'That did not work');
    } finally {
      setBusy(null);
    }
  };

  return (
    <HallTicketScreen
      title="Publication status"
      subtitle="Whether students can see their tickets yet — and taking them back down."
      loading={block.loading}
      refreshing={block.refreshing}
      error={block.error}
      onRetry={block.reload}
      onRefresh={block.onRefresh}
      header={
        <>
          <NoteStrip text={policy} tone="info" />
          {actionError ? <NoteStrip text={actionError} tone="bad" /> : null}
          {flash ? <NoteStrip text={flash} tone="good" /> : null}
          {data?.openRequests ? (
            <NoteStrip
              tone="warn"
              text={`${plural(data.openRequests, 'correction or reissue request is', 'correction and reissue requests are')} still open. Publishing does not resolve them.`}
            />
          ) : null}
        </>
      }
    >
      {!data ? (
        <HallTicketEmpty
          icon="megaphone-outline"
          title="No examinations"
          subtitle="Publication is decided per exam once tickets exist."
        />
      ) : (
        <>
          <StatGrid>
            <StatCell label="Exams" value={t?.exams ?? 0} />
            <StatCell label="Published" value={t?.PUBLISHED ?? 0} tone={GREEN} />
            <StatCell label="Not published" value={t?.DRAFT ?? 0} tone={AMBER} />
            <StatCell label="Recalled" value={t?.RECALLED ?? 0} tone={(t?.RECALLED ?? 0) > 0 ? RED : MUTED} />
            <StatCell label="Tickets" value={t?.tickets ?? 0} tone={INDIGO} />
            <StatCell label="Can publish" value={t?.publishable ?? 0} />
          </StatGrid>

          <View style={styles.filters}>
            {FILTERS.map((f) => {
              const n = f === 'ALL' ? exams.length : (t?.[f] ?? 0);
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filter, filter === f && styles.filterActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === 'ALL' ? 'All' : publicationStatusMeta(f)?.label ?? f} {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Section title="Examinations" note={`${shown.length} shown`}>
            {shown.length === 0 ? (
              <HallTicketEmpty
                icon="eye-outline"
                title="Nothing in this state"
                subtitle="Try another filter."
              />
            ) : (
              shown.map((e) => {
                const meta = publicationStatusMeta(e.hallTicketStatus);
                const published = e.hallTicketStatus === 'PUBLISHED';
                return (
                  <Card key={e.id} style={styles.row}>
                    <View style={styles.rowHead}>
                      <View style={styles.rowBody}>
                        <Text style={styles.name} numberOfLines={1}>{e.name}</Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          Sem {e.semester} · {e.type} · {plural(e.slots, 'paper')}
                        </Text>
                      </View>
                      <Pill text={meta?.label ?? e.hallTicketStatus} color={meta?.color ?? SLATE} />
                    </View>

                    <View style={styles.figures}>
                      <View style={styles.figure}>
                        <Text style={styles.figureValue}>{e.tickets}</Text>
                        <Text style={styles.figureLabel}>tickets</Text>
                      </View>
                      <View style={styles.figure}>
                        <Text style={styles.figureValue}>{e.downloaded}</Text>
                        <Text style={styles.figureLabel}>printed</Text>
                      </View>
                      <View style={styles.figure}>
                        <Text style={[styles.figureValue, { color: e.publishable ? GREEN : AMBER }]}>
                          {e.publishable ? 'Yes' : 'No'}
                        </Text>
                        <Text style={styles.figureLabel}>can publish</Text>
                      </View>
                    </View>

                    {!e.publishable ? (
                      <Text style={styles.blocked}>
                        This exam has no generated ticket, so there is nothing to publish.
                      </Text>
                    ) : null}
                    {e.publishedAt ? (
                      <Text style={styles.publishedAt}>
                        Last published {new Date(e.publishedAt).toLocaleString()}
                      </Text>
                    ) : null}

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.action, { backgroundColor: published ? RED : GREEN }, (!e.publishable && !published) || !!busy ? styles.disabled : null]}
                        disabled={(!e.publishable && !published) || !!busy}
                        onPress={() => act(e, published ? 'recall' : 'publish')}
                      >
                        <Ionicons
                          name={published ? 'eye-off' : 'megaphone'}
                          size={14}
                          color="#fff"
                          style={styles.actionIcon}
                        />
                        <Text style={styles.actionText}>
                          {busy === e.id
                            ? 'Working…'
                            : published
                              ? 'Recall from students'
                              : `Publish ${e.tickets} ticket${e.tickets === 1 ? '' : 's'}`}
                        </Text>
                      </TouchableOpacity>
                    </View>
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
  filterActive: { borderColor: INDIGO, backgroundColor: '#eef2ff' },
  filterText: { fontSize: 12, fontWeight: '700', color: SLATE },
  filterTextActive: { color: INDIGO },
  row: { marginBottom: 11 },
  rowHead: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, paddingRight: 8 },
  name: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  meta: { fontSize: 12, color: MUTED, marginTop: 2 },
  figures: {
    flexDirection: 'row', marginTop: 11, borderTopWidth: 1,
    borderTopColor: '#f1f5f9', paddingTop: 10,
  },
  figure: { flex: 1 },
  figureValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  figureLabel: { fontSize: 10.5, color: MUTED, marginTop: 2 },
  blocked: { fontSize: 12, color: AMBER, marginTop: 9, lineHeight: 17 },
  publishedAt: { fontSize: 11.5, color: MUTED, marginTop: 7 },
  actions: { flexDirection: 'row', marginTop: 11 },
  action: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  disabled: { opacity: 0.45 },
  actionIcon: { marginRight: 7 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
