// X-06 Results — the exam controller's hub (docs/users/05 §3.4).
//
// The screen this replaces was a three-tab view fed by `GET /examcell/results`
// — pending/published lists with a hand-rolled "graded" counter — plus a
// `constants/resultsData.js` fixture that has since been DELETED along with
// the endpoint. The endpoints are GONE (see api.js): `enterResult` accepted a
// CLIENT-SUPPLIED grade and isPass, so the screen decided who passed, and
// `publishResults` stamped every row published without a verification or an
// approval anywhere.
//
// It is now eleven blocks, each answering one question, in the order the
// pipeline runs:
//
//   1. Consolidation  — pull marked papers into rows, grade derived
//   2. Grades         — the published scale against every result
//   3. SGPA / CGPA    — credit-weighted per exam, running per student
//   4. Pass / fail    — who cleared, who is on the backlog list
//   5. Verify         — DRAFT → VERIFIED, rows re-checked against papers
//   6. Approval       — VERIFIED → APPROVED, a signature per slot
//   7. Publish        — APPROVED → PUBLISHED, gated on every paper marked
//   8. Marksheet      — one student, one exam, totals + SGPA + CGPA
//   9. Revaluation    — decide requests, apply revised marks
//   10. Analytics     — pass rate, bands, toppers, subject spread
//   11. Export        — CSV of any exam's results
//
// EVERYTHING COMES FROM TWO CALLS, and the block list is NOT hard-coded here.
// It arrives from `/results/catalogue` with each block's id, label, icon,
// colour and route, so a block added on the server draws itself.
// `resultsMeta.js` still mirrors the ids because the eleven sub-screens are
// separate modules that must exist at build time, and `audit-results-ui.ts`
// asserts the two agree.
//
// THE HERO ANSWERS THE ONE QUESTION THIS DESK EXISTS TO ANSWER: how much of
// the work is out the door, and what still stands between the rows and the
// students. It says the publish percent rather than going grey for no stated
// reason, and the badge on each block card is the live number that block
// exists to report — so the controller can see WHICH of the eleven is wrong
// without opening any of them.
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../services/api';
import { THEME, RED, GREEN, AMBER, SLATE, MUTED, BLOCKS, plural } from './resultsMeta';
import { ResultScreen, StatGrid, BlockCard, goToRoute, useResult } from './resultsUi';

export default function ResultsModule({ navigation }) {
  const catalogue = useResult(() => examcellApi.resultCatalogue());
  const overview = useResult(() => examcellApi.resultOverview());

  const reload = useCallback(() => {
    catalogue.reload();
    overview.reload();
  }, [catalogue, overview]);

  // The block list comes from the server. The mirror in resultsMeta.js is
  // the FALLBACK for the frame before the catalogue lands, and nothing more.
  const blocks = catalogue.data?.blocks?.length ? catalogue.data.blocks : BLOCKS;
  const s = overview.data?.stats;
  const hero = overview.data?.hero;

  // Every block card carries the live number that block exists to report.
  // A badge of 0 is NOT drawn — an eleven-row list of zeroes is noise.
  //
  // Three blocks carry no single figure on purpose: consolidation's work is
  // per-slot (it has its own screen for that), the marksheet is per-student,
  // and analytics/export are queries rather than queues.
  const badgeFor = (id) => {
    if (!s) return undefined;
    switch (id) {
      case 'GRADES': return hero?.total || undefined;
      case 'PASSFAIL': return s.failed || undefined;
      case 'VERIFY': return s.DRAFT || undefined;
      case 'APPROVAL': return s.VERIFIED || undefined;
      case 'PUBLISH': return s.APPROVED || undefined;
      case 'REVALUATION': return s.reevalOpen || undefined;
      default: return undefined;
    }
  };

  const total = hero?.total ?? 0;
  const published = hero?.published ?? 0;
  const pct = hero?.publishPercent ?? 0;
  const noData = total === 0;
  const hasApprovals = (s?.APPROVED ?? 0) > 0;
  const heroColor = noData ? SLATE : published === total ? GREEN : hasApprovals ? AMBER : THEME;

  return (
    <ResultScreen
      title="Results"
      subtitle="Consolidate, verify, approve and publish — grade and pass/fail are derived, never typed."
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
            name={noData ? 'information-circle' : published === total ? 'checkmark-circle' : 'time'}
            size={22}
            color="rgba(255,255,255,0.95)"
          />
          <Text style={styles.heroStamp}>
            {noData ? 'Nothing to publish' : published === total ? 'All published' : `${pct}% published`}
          </Text>
        </View>
        <Text style={styles.heroValue}>
          {noData ? 'No results in this institution yet' : `${published} of ${total} results are live for students`}
        </Text>
        <View style={styles.heroRule} />
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellValue}>{hero?.passPercent ?? 0}%</Text>
            <Text style={styles.heroCellLabel}>Pass rate</Text>
          </View>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellValue}>{s?.DRAFT ?? 0}</Text>
            <Text style={styles.heroCellLabel}>Awaiting verify</Text>
          </View>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellValue}>{s?.APPROVED ?? 0}</Text>
            <Text style={styles.heroCellLabel}>Ready to publish</Text>
          </View>
        </View>
      </View>

      {/* ── Alerts — what needs the controller today ── */}
      {(overview.data?.alerts ?? []).map((a) => (
        <View key={a} style={styles.alert}>
          <Ionicons name="warning-outline" size={14} color={AMBER} />
          <Text style={styles.alertText}>{a}</Text>
        </View>
      ))}

      {/* ── Season stats ── */}
      <StatGrid
        items={[
          { id: 'results', label: 'Results', value: total, icon: 'document-text-outline', color: THEME },
          { id: 'verified', label: 'Verified', value: s?.VERIFIED ?? 0, icon: 'checkmark-done', color: '#0891b2' },
          { id: 'approved', label: 'Approved', value: s?.APPROVED ?? 0, icon: 'checkbox', color: '#4f46e5' },
          { id: 'published', label: 'Published', value: published, icon: 'megaphone', color: GREEN },
        ]}
      />

      {/* ── The eleven blocks ── */}
      <Text style={styles.blockLabel}>Work through the desk</Text>
      {blocks.map((b) => (
        <BlockCard
          key={b.id}
          block={b}
          badge={badgeFor(b.id)}
          onPress={() => goToRoute(navigation, b.route, b.isTab)}
        />
      ))}

      <Text style={styles.footNote}>
        {plural(blocks.length, 'block')} · the chain is one-way: DRAFT → VERIFIED → APPROVED → PUBLISHED, and a
        correction afterwards goes through re-evaluation, which bumps the revision.
      </Text>
    </ResultScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 16, padding: 18, marginBottom: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroStamp: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '700', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { color: '#fff', fontSize: 17, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', marginTop: 8, letterSpacing: -0.3 },
  heroRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 12 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroCell: { alignItems: 'flex-start' },
  heroCellValue: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  heroCellLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontFamily: 'Manrope-Regular', marginTop: 2 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${AMBER}12`, borderWidth: 1, borderColor: `${AMBER}44`, borderRadius: 10, padding: 10, marginBottom: 8 },
  alertText: { flex: 1, fontSize: 12, color: '#92400e', fontFamily: 'Manrope-SemiBold' },
  blockLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10, marginTop: 4 },
  footNote: { fontSize: 11, color: MUTED, fontFamily: 'Manrope-Regular', marginTop: 8, textAlign: 'center' },
});
