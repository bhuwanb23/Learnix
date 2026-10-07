// X-04 Hall tickets — the exam controller's hub (docs/users/05 §3.5).
//
// The screen this replaces was a single list with a hard-coded fixture and an
// exam picker that called `examcellApi.exams()` — a method that has never
// existed on that API object. It lives on the STUDENT api, so the picker threw
// before the first render and the screen never showed anything at all. It also
// called two endpoints this build REMOVED: `GET /examcell/hall-tickets?examId=`
// and `POST /examcell/hall-tickets/generate`, both of which 404'd.
//
// It is now seven blocks, each answering one question:
//
//   1. Student eligibility     — who can sit, and what deserves a second look
//   2. Generate tickets        — one student or the whole exam in one pass
//   3. Tickets & printing      — every issued ticket, photo, seat, ready to print
//   4. Subjects & schedule     — what each student is sitting, and when
//   5. Examination centre      — where each paper is held, and the seats left
//   6. Corrections & reissues  — what students asked to fix, and what was decided
//   7. Publication status      — whether students can see their tickets yet
//
// EVERYTHING COMES FROM TWO CALLS, and the block list is NOT hard-coded here.
// It arrives from `/hall-tickets/catalogue` with each block's id, label, icon,
// colour and route, so a block added on the server draws itself.
// `hallTicketMeta.js` still mirrors the ids because the seven sub-screens are
// separate modules that must exist at build time, and `audit-hallticket-ui.ts`
// asserts the two agree.
//
// THE HERO ANSWERS THE ONE QUESTION THIS DESK EXISTS TO ANSWER: can students
// see their hall tickets yet? It says how many exams are published rather than
// going grey for no stated reason, and the badge on each block card is the live
// number that block exists to report — so the controller can see WHICH of the
// seven is wrong without opening any of them.
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../services/api';
import {
  THEME, RED, GREEN, AMBER, SLATE, MUTED, BLOCKS, PUBLISH_POLICY, plural,
} from './hallTicketMeta';
import {
  BlockCard, HallTicketScreen, NoteStrip, StatCell, StatGrid, goToRoute, useHallTicket,
} from './hallTicketUi';

export default function HallTicketsModule({ navigation }) {
  const catalogue = useHallTicket(() => examcellApi.hallTicketCatalogue());
  const overview = useHallTicket(() => examcellApi.hallTicketOverview());

  const reload = useCallback(() => {
    catalogue.reload();
    overview.reload();
  }, [catalogue, overview]);

  // The block list comes from the server. The mirror in hallTicketMeta.js is
  // the FALLBACK for the frame before the catalogue lands, and nothing more —
  // a fallback that also acted as the source would be a second list to keep
  // true.
  const blocks = catalogue.data?.blocks?.length ? catalogue.data.blocks : BLOCKS;
  const s = overview.data?.stats;

  // Every block card carries the live number that block exists to report.
  // A badge of 0 is NOT drawn — an eight-row list of zeroes is noise.
  //
  // Four blocks carry no single figure on purpose: eligibility's problem is
  // spread across six reasons (it has its own screen for that), generation's
  // is the preview the GENERATION screen computes from the same predicate the
  // run uses, and schedule's and centre's are per-paper, already shown on
  // those screens against each row.
  const badgeFor = (id) => {
    if (!s) return undefined;
    switch (id) {
      case 'TICKETS': return s.tickets;
      case 'REQUESTS': return s.openRequests;
      // "how many exams cannot be seen yet" — the number that makes the
      // publication screen worth opening.
      case 'PUBLICATION': return Math.max(0, (s.exams ?? 0) - (s.published ?? 0));
      case 'ELIGIBILITY':
      case 'GENERATION':
      case 'SCHEDULE':
      case 'VENUE':
      default:
        return undefined;
    }
  };

  const published = s?.published ?? 0;
  const exams = s?.exams ?? 0;
  const allPublished = exams > 0 && published === exams;
  const heroColor = exams === 0 ? SLATE : allPublished ? GREEN : AMBER;

  return (
    <HallTicketScreen
      title="Hall Tickets"
      subtitle="Issue, print, correct and publish the tickets students sit an exam with."
      loading={catalogue.loading && overview.loading}
      refreshing={catalogue.refreshing || overview.refreshing}
      error={catalogue.error ?? overview.error}
      onRetry={reload}
      onRefresh={reload}
    >
      {/* ── The one question this desk exists to answer ── */}
      <View style={[styles.hero, { backgroundColor: heroColor }]}>
        <View style={styles.heroTop}>
          <Ionicons
            name={exams === 0 ? 'information-circle' : allPublished ? 'checkmark-circle' : 'eye-off'}
            size={22}
            color="rgba(255,255,255,0.95)"
          />
          <Text style={styles.heroStamp}>
            {exams === 0 ? 'No examinations' : allPublished ? 'Published' : 'Partly published'}
          </Text>
        </View>
        <Text style={styles.heroValue}>
          {exams === 0
            ? 'No exams in this institution yet'
            : allPublished
              ? 'Every exam is visible to students'
              : `${plural(exams - published, 'exam', 'exams')} students cannot see yet`}
        </Text>
        <View style={styles.heroRule} />
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Exams</Text>
            <Text style={styles.heroCellValue}>{exams}</Text>
            <Text style={styles.heroCellNote}>{published} published</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Tickets</Text>
            <Text style={styles.heroCellValue}>{s?.tickets ?? '—'}</Text>
            <Text style={styles.heroCellNote}>{s?.downloaded ?? 0} downloaded</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Open requests</Text>
            <Text style={styles.heroCellValue}>{s?.openRequests ?? '—'}</Text>
            <Text style={styles.heroCellNote}>{s?.requests ?? 0} all time</Text>
          </View>
        </View>
      </View>

      <NoteStrip text={PUBLISH_POLICY} tone="info" />

      <StatGrid>
        <StatCell label="Examinations" value={exams} />
        <StatCell label="Tickets issued" value={s?.tickets ?? '—'} tone={THEME} />
        <StatCell label="Printed" value={s?.downloaded ?? '—'} tone={GREEN} />
        <StatCell label="Published" value={`${published}/${exams}`} tone={published === exams && exams > 0 ? GREEN : AMBER} />
        <StatCell label="Open requests" value={s?.openRequests ?? '—'} tone={s?.openRequests > 0 ? RED : MUTED} />
        <StatCell label="Downloadable" value={allPublished ? 'Yes' : 'No'} tone={allPublished ? GREEN : SLATE} />
      </StatGrid>

      <View style={styles.blocks}>
        {blocks.map((b) => (
          <BlockCard
            key={b.id}
            block={b}
            badge={badgeFor(b.id)}
            onPress={() => goToRoute(navigation, b.route, b.isTab)}
          />
        ))}
      </View>
    </HallTicketScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 16, padding: 16, marginBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroStamp: {
    color: 'rgba(255,255,255,0.95)', fontSize: 12.5, fontWeight: '800',
    marginLeft: 7, letterSpacing: 0.3, textTransform: 'uppercase',
  },
  heroValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 8, lineHeight: 24 },
  heroRule: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 13,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroCell: { flex: 1 },
  heroDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 10 },
  heroCellLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  heroCellValue: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 2 },
  heroCellNote: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, marginTop: 1 },
  blocks: { marginTop: 4 },
});
