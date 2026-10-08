// X-05 Evaluations — the exam controller's hub (docs/users/05 §3.3).
//
// The screen this replaces was a single list fed by `GET /examcell/evaluations`
// — a flat row dump with counters straight off the table — plus a
// `constants/evaluationsData.js` fixture nobody had deleted. The endpoint is
// GONE (see api.js): its assign route took any TEACHER id with no institution
// check, and its complete route marked every paper graded without reading one.
//
// It is now eight blocks, each answering one question:
//
//   1. Evaluation progress  — how much of the season is marked
//   2. Answer scripts       — which papers arrived, which are missing
//   3. Evaluator allocation — who is marking what, and what nobody took
//   4. Subject-wise         — every subject with its counts and status
//   5. Marks entry          — internal + external, against the 40/60 bound
//   6. Deadlines            — when grading is due, what is past it
//   7. Missing marks        — the unmarked list that blocks publication
//   8. Moderation           — second look before results go out
//
// EVERYTHING COMES FROM TWO CALLS, and the block list is NOT hard-coded here.
// It arrives from `/evaluations/catalogue` with each block's id, label, icon,
// colour and route, so a block added on the server draws itself.
// `evaluationMeta.js` still mirrors the ids because the eight sub-screens are
// separate modules that must exist at build time, and `audit-evaluations-ui.ts`
// asserts the two agree.
//
// THE HERO ANSWERS THE ONE QUESTION THIS DESK EXISTS TO ANSWER: how much is
// marked, and is the deadline near. It says the percent rather than going
// grey for no stated reason, and the badge on each block card is the live
// number that block exists to report — so the controller can see WHICH of the
// eight is wrong without opening any of them.
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../services/api';
import { THEME, RED, GREEN, AMBER, SLATE, MUTED, BLOCKS, plural } from './evaluationMeta';
import { EvaluationScreen, StatGrid, BlockCard, goToRoute, useEvaluation } from './evaluationUi';

export default function EvaluationsModule({ navigation }) {
  const catalogue = useEvaluation(() => examcellApi.evaluationCatalogue());
  const overview = useEvaluation(() => examcellApi.evaluationOverview());

  const reload = useCallback(() => {
    catalogue.reload();
    overview.reload();
  }, [catalogue, overview]);

  // The block list comes from the server. The mirror in evaluationMeta.js is
  // the FALLBACK for the frame before the catalogue lands, and nothing more.
  const blocks = catalogue.data?.blocks?.length ? catalogue.data.blocks : BLOCKS;
  const s = overview.data?.stats;
  const hero = overview.data?.hero;

  // Every block card carries the live number that block exists to report.
  // A badge of 0 is NOT drawn — an eight-row list of zeroes is noise.
  //
  // Four blocks carry no single figure on purpose: allocation's problem is
  // spread across subjects (it has its own screen for that), the deadline's
  // is the countdown in the hero, progress is the hero itself, and marks
  // entry is per-paper on that screen.
  const badgeFor = (id) => {
    if (!s) return undefined;
    switch (id) {
      case 'SCRIPTS': return s.scriptsReceived > 0 ? s.scriptsReceived : undefined;
      case 'SUBJECTS': return s.evaluations;
      case 'MISSING': return s.missingMarks;
      case 'MODERATION': return (s.moderationPending ?? 0) + (s.moderationFlagged ?? 0);
      default: return undefined;
    }
  };

  const marked = hero?.marked ?? 0;
  const total = hero?.total ?? 0;
  const pct = hero?.percent ?? 0;
  const noData = total === 0;
  const overdue = hero?.dueAt ? new Date(hero.dueAt).getTime() < Date.now() : false;
  const heroColor = noData ? SLATE : overdue || (hero?.daysLeft !== null && hero?.daysLeft !== undefined && hero.daysLeft <= 2) ? RED : pct === 100 ? GREEN : AMBER;

  return (
    <EvaluationScreen
      title="Evaluations"
      subtitle="Track scripts, allocate evaluators, enter marks and clear them for publication."
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
            name={noData ? 'information-circle' : pct === 100 ? 'checkmark-circle' : 'stats-chart'}
            size={22}
            color="rgba(255,255,255,0.95)"
          />
          <Text style={styles.heroStamp}>
            {noData ? 'Nothing to mark' : pct === 100 ? 'All marked' : `${pct}% marked`}
          </Text>
        </View>
        <Text style={styles.heroValue}>
          {noData
            ? 'No papers in this institution yet'
            : `${marked} of ${total} papers have marks`}
        </Text>
        <View style={styles.heroRule} />
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellValue}>{hero?.dueAt ? new Date(hero.dueAt).toLocaleDateString() : '—'}</Text>
            <Text style={styles.heroCellLabel}>Grading due</Text>
          </View>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellValue}>
              {hero?.daysLeft === null || hero?.daysLeft === undefined ? '—' : hero.daysLeft}
            </Text>
            <Text style={styles.heroCellLabel}>Days left</Text>
          </View>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellValue}>{s?.missingMarks ?? 0}</Text>
            <Text style={styles.heroCellLabel}>Unmarked</Text>
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
          { id: 'total', label: 'Subjects', value: s?.evaluations ?? 0, icon: 'library-outline', color: THEME },
          { id: 'done', label: 'Completed', value: s?.COMPLETED ?? 0, icon: 'checkmark-done', color: GREEN },
          { id: 'prog', label: 'In progress', value: s?.IN_PROGRESS ?? 0, icon: 'time', color: AMBER },
          { id: 'miss', label: 'Missing marks', value: s?.missingMarks ?? 0, icon: 'alert-circle', color: RED },
        ]}
      />

      {/* ── The eight blocks ── */}
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
        {plural(blocks.length, 'block')} · completion is derived: a subject is complete exactly when every paper is marked.
      </Text>
    </EvaluationScreen>
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
