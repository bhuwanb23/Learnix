// X-05 Evaluations — the pieces all nine evaluation screens share
// (docs/users/05 §3.3).
//
// Nine screens: the hub and eight block sub-screens. They share one shell,
// one fetch hook and one exam picker, and the reason they must is
// load-bearing:
//
//   1. THE FAILED REQUEST IS SHOWN IN PLACE OF THE CONTENT. A missing-marks
//      list that fails to load and renders "0 missing" lets a controller
//      publish results believing nothing is outstanding. Zero because nothing
//      was fetched and zero because nothing is wrong look identical, and only
//      one of them is safe.
//
//   2. `goToRoute` decides by the SERVER's published `isTab`, never by the
//      caller's guess — same as the hall-ticket kit.
//
//   3. THE EXAM PICKER IS PER SCREEN. `openModule(key)` drops its second
//      argument, so a sub-screen cannot be handed the exam its sibling was
//      looking at. Each screen owns its selection; that is why the picker is
//      a hook rather than a context.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../services/api';
import { MUTED, RED, SLATE, THEME, initialsOf, plural } from './evaluationMeta';

/** The bottom-nav tabs, so a published tab route is never opened as a module. */
export const TAB_ROUTES = ['Dashboard', 'Timetable', 'Evaluations', 'Results', 'Profile'];

/**
 * Go where a published route points.
 * A TAB goes through `switchTab`; a SUB-SCREEN goes through `openModule`.
 */
export function goToRoute(navigation, route, isTab, params) {
  if (!route || !navigation) return;
  if (isTab && typeof navigation.switchTab === 'function') navigation.switchTab(route);
  else if (typeof navigation.openModule === 'function') navigation.openModule(route, params || {});
  else if (typeof navigation.navigate === 'function') navigation.navigate(route);
}

/** Fetch-on-mount plus pull-to-refresh. `reload` is for after a WRITE. */
export function useEvaluation(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await fetcher());
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { data, loading, refreshing, error, reload: load, onRefresh };
}

/**
 * An exam picker that owns its own selection (per-screen, never shared).
 * The exam list comes from the evaluation catalogue.
 */
export function useExamPicker() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await examcellApi.evaluationCatalogue();
      const list = Array.isArray(res?.exams) ? res.exams : [];
      setExams(list);
      setExamId((current) => current ?? (list[0] ? list[0].id : null));
    } catch (err) {
      setError(err.message || 'Could not load exams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { exams, examId, setExamId, loading, error, reload: load };
}

/** The shell: skeleton, error panel, or the scroll view. */
export function EvaluationScreen({
  title,
  subtitle,
  loading,
  refreshing,
  error,
  onRetry,
  onRefresh,
  children,
  header,
}) {
  if (loading) {
    return (
      <View style={styles.wrap}>
        <ScreenHead title={title} subtitle={subtitle} />
        <View style={styles.pad}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.wrap}>
        <ScreenHead title={title} subtitle={subtitle} />
        <View style={styles.pad}>
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={28} color={SLATE} />
            <Text style={styles.errorTitle}>Could not load this screen</Text>
            <Text style={styles.errorBody}>{error}</Text>
            {onRetry ? (
              <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScreenHead title={title} subtitle={subtitle} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh || (() => {})} />}
      >
        {header ? <View style={styles.pad}>{header}</View> : null}
        <View style={styles.pad}>{children}</View>
      </ScrollView>
    </View>
  );
}

function ScreenHead({ title, subtitle }) {
  return (
    <View style={styles.head}>
      <Text style={styles.headTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headSub}>{subtitle}</Text> : null}
    </View>
  );
}

export function ExamPicker({ exams, examId, onChange, loading, error }) {
  if (loading) return <View style={styles.pickerLoading} />;
  if (error) return <Text style={styles.pickerError}>{error}</Text>;
  if (!exams.length) {
    return <Text style={styles.pickerEmpty}>No examinations yet — create one in the timetable first.</Text>;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
      {exams.map((e) => {
        const active = e.id === examId;
        return (
          <TouchableOpacity
            key={e.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(e.id)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
              {e.name}
            </Text>
            <Text style={[styles.chipMeta, active && styles.chipMetaActive]}>Sem {e.semester}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/**
 * The hub's block card: icon, label, blurb, and the live badge for the thing
 * the block exists to report. A badge of 0 is not drawn.
 */
export function BlockCard({ block, badge, onPress }) {
  return (
    <TouchableOpacity style={styles.blockCard} activeOpacity={0.75} onPress={onPress}>
      <View style={[styles.blockIcon, { backgroundColor: `${block.color}14` }]}>
        <Ionicons name={block.icon} size={19} color={block.color} />
      </View>
      <View style={styles.blockBody}>
        <View style={styles.blockTopRow}>
          <Text style={styles.blockTitle}>{block.label}</Text>
          {badge ? (
            <View style={[styles.blockBadge, { backgroundColor: `${block.color}1A` }]}>
              <Text style={[styles.blockBadgeText, { color: block.color }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.blockBlurb}>{block.blurb}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </TouchableOpacity>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({ title, note, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** A status chip from a meta map — unknown statuses still render their raw value. */
export function Chip({ label, color }) {
  const c = color || MUTED;
  return (
    <View style={[styles.chip2, { backgroundColor: `${c}1A` }]}>
      <Text style={[styles.chip2Text, { color: c }]}>{label}</Text>
    </View>
  );
}

/** Progress bar — `percent` is already rounded. */
export function Progress({ percent, color }) {
  const c = color || THEME;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: c }]} />
    </View>
  );
}

export function StatGrid({ items }) {
  return (
    <View style={styles.statRow}>
      {items.map((s) => (
        <View key={s.id} style={styles.statCell}>
          <View style={[styles.statIcon, { backgroundColor: `${s.color}14` }]}>
            <Ionicons name={s.icon} size={16} color={s.color} />
          </View>
          <Text style={styles.statValue}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The action button every screen uses after a WRITE: it calls the mutation,
 * then `reload()` — never patches a local copy, because the server's version
 * is the one the next screen will read.
 */
export function useAction(onDone) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const run = useCallback(
    async (fn) => {
      setBusy(true);
      setProblem(null);
      try {
        await fn();
        if (onDone) onDone();
        return true;
      } catch (err) {
        setProblem(err.message || 'That did not work');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone],
  );

  return { busy, problem, run, clearProblem: () => setProblem(null) };
}

export function ProblemStrip({ problem }) {
  if (!problem) return null;
  return (
    <View style={styles.problem}>
      <Ionicons name="alert-circle" size={15} color={RED} />
      <Text style={styles.problemText}>{problem}</Text>
    </View>
  );
}

export function EmptyNote({ children }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="checkmark-circle-outline" size={22} color={GREEN} />
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}

/** The avatar tile — initials, never a URL that would 404. */
export function Avatar({ name, size = 36 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

export { plural };

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f5f7f9' },
  head: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  headTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  headSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 3 },
  pad: { paddingHorizontal: 24 },
  scroll: { paddingBottom: 40 },
  skeleton: { height: 76, borderRadius: 12, backgroundColor: '#e9eef5', marginBottom: 10 },
  errorBox: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#eef2f7' },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 8 },
  errorBody: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 4 },
  retryBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 12, backgroundColor: THEME, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: 'Manrope-Bold' },
  pickerRow: { marginBottom: 14 },
  pickerLoading: { height: 54, borderRadius: 10, backgroundColor: '#e9eef5', marginBottom: 14 },
  pickerError: { fontSize: 12, color: RED, fontFamily: 'Manrope-Regular', marginBottom: 12 },
  pickerEmpty: { fontSize: 12, color: MUTED, fontFamily: 'Manrope-Regular', marginBottom: 12 },
  chip: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, maxWidth: 200 },
  chipActive: { borderColor: THEME, backgroundColor: `${THEME}0D` },
  chipText: { fontSize: 12, fontWeight: '600', color: '#334155', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: THEME },
  chipMeta: { fontSize: 10, color: MUTED, fontFamily: 'Manrope-Regular', marginTop: 1 },
  chipMetaActive: { color: THEME },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  blockCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  blockIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  blockBody: { flex: 1 },
  blockTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  blockBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  blockBadgeText: { fontSize: 10, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  blockBlurb: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  section: { marginBottom: 18 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sectionNote: { fontSize: 11, color: MUTED, fontFamily: 'Manrope-Regular' },
  chip2: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  chip2Text: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#eef2f7', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCell: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eef2f7', padding: 12 },
  statIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.4 },
  statLabel: { fontSize: 9, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  problem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${RED}0D`, borderWidth: 1, borderColor: `${RED}33`, borderRadius: 10, padding: 10, marginBottom: 12 },
  problemText: { flex: 1, fontSize: 12, color: RED, fontFamily: 'Manrope-SemiBold' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  emptyText: { fontSize: 12, color: SLATE, fontFamily: 'Manrope-Regular' },
  avatar: { backgroundColor: `${THEME}22`, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
});
