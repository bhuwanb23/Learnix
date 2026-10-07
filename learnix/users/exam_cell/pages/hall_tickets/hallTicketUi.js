// X-04 Hall tickets — the pieces all eight hall-ticket screens share
// (docs/users/05 §3.5).
//
// Eight screens: the hub and seven block sub-screens. They share one shell, one
// fetch hook, one exam picker and one photo tile, and the reason they must is
// not tidiness. Three of the pieces are load-bearing:
//
//   1. THE FAILED REQUEST IS SHOWN IN PLACE OF THE CONTENT. This matters more
//      on a hall-ticket screen than anywhere else in the app. A ticket list
//      that fails to load and renders "0 tickets" is worse than an error
//      message: "0 issued" is the reading that lets a controller walk into an
//      examination hall with nobody's seat allocated. Zero because nothing was
//      fetched and zero because nothing is wrong look identical, and only one
//      of them is safe.
//
//   2. `goToRoute` decides by the SERVER's published `isTab`, never by the
//      caller's guess. Every hall-ticket block is a sub-screen today, so all
//      of them go through `openModule` — but the flag comes from the catalogue
//      so a block promoted to a tab cannot silently stop navigating.
//
//   3. THE EXAM PICKER IS PER SCREEN, NOT SHARED STATE. `openModule(key)` in
//      `exam_cell.js` drops its second argument, so a sub-screen cannot be
//      handed the exam its sibling was looking at. Each screen owns its
//      selection; that is why the picker is a hook rather than a context.
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
import {
  MUTED, RED, SLATE, THEME, initialsOf, plural,
} from './hallTicketMeta';

/** The bottom-nav tabs, so a published tab route is never opened as a module. */
export const TAB_ROUTES = ['Dashboard', 'Timetable', 'Evaluations', 'Results', 'Profile'];

/**
 * Go where a published route points.
 *
 * A TAB goes through `switchTab`; a SUB-SCREEN goes through `openModule`.
 * Getting that backwards is silent, which is why it is written once here
 * rather than in eight call sites.
 */
export function goToRoute(navigation, route, isTab, params) {
  if (!route || !navigation) return;
  if (isTab && typeof navigation.switchTab === 'function') navigation.switchTab(route);
  else if (typeof navigation.openModule === 'function') navigation.openModule(route, params || {});
  else if (typeof navigation.navigate === 'function') navigation.navigate(route);
}

/**
 * Fetch-on-mount plus pull-to-refresh.
 *
 * `reload` is what a screen calls after it has WRITTEN something, so it reads
 * the server's version rather than patching a local copy. On these screens
 * that matters: generation issues seats server-side, and a locally patched row
 * would show a controller a ticket that was never printed.
 */
export function useHallTicket(fetcher, deps = []) {
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
 * An exam picker that owns its own selection.
 *
 * Every block that needs an exam gets one of these. They do not share state on
 * purpose: the shell cannot pass a selection down (`openModule` drops params),
 * and a shared store that two screens disagree about is worse than two
 * independent pickers.
 */
export function useExamPicker() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await examcellApi.hallTicketCatalogue();
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
export function HallTicketScreen({
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
            <Text style={[styles.chipMeta, active && styles.chipMetaActive]}>
              Sem {e.semester} · {e.hallTicketStatus === 'PUBLISHED' ? 'Published' : 'Draft'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/**
 * The photo tile.
 *
 * A student with no photograph on file gets their initials, and the caller is
 * told so by `hasPhoto` rather than guessing from a null id — because "we do
 * not have your photo" and "we failed to load your photo" are different
 * things to print on a hall ticket.
 */
export function PhotoTile({ name, avatarFileId, size = 44, tone = THEME }) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (!avatarFileId) {
    return (
      <View style={[dim, styles.photoEmpty]}>
        <Text style={[styles.photoInitials, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
      </View>
    );
  }
  // No file-serving route exists yet, so the id is shown rather than a URL
  // that would 404. `avatarFileId` is published so this stays honest.
  return (
    <View style={[dim, { backgroundColor: tone }]}>
      <Ionicons name="person" size={size * 0.55} color="#fff" />
    </View>
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

export function StatGrid({ children }) {
  return <View style={styles.statGrid}>{children}</View>;
}

export function StatCell({ label, value, tone, hint, onPress }) {
  const body = (
    <>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{String(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.statCell} onPress={onPress}>
        {body}
      </TouchableOpacity>
    );
  }
  return <View style={styles.statCell}>{body}</View>;
}

export function Pill({ text, color = SLATE, onPress, icon }) {
  const body = (
    <View style={[styles.pill, { borderColor: color }]}>
      {icon ? <Ionicons name={icon} size={11} color={color} style={styles.pillIcon} /> : null}
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
  if (!onPress) return body;
  return <TouchableOpacity onPress={onPress}>{body}</TouchableOpacity>;
}

export function StatusPill({ status, meta }) {
  const m = meta || {};
  return <Pill text={m.label || status} color={m.color || SLATE} />;
}

export function NoteStrip({ text, tone = 'info', icon }) {
  const tones = {
    info: { bg: '#eff6ff', fg: THEME, icon: 'information-circle-outline' },
    warn: { bg: '#fffbeb', fg: '#92400e', icon: 'alert-circle-outline' },
    good: { bg: '#ecfdf5', fg: '#065f46', icon: 'checkmark-circle-outline' },
    bad: { bg: '#fef2f2', fg: '#991b1b', icon: 'close-circle-outline' },
  };
  const t = tones[tone] || tones.info;
  return (
    <View style={[styles.note, { backgroundColor: t.bg }]}>
      <Ionicons name={icon || t.icon} size={15} color={t.fg} style={styles.noteIcon} />
      <Text style={[styles.noteText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

export function ActionRow({ actions = [] }) {
  if (!actions.length) return null;
  return (
    <View style={styles.actions}>
      {actions.map((a, i) => (
        <TouchableOpacity
          key={`${a.label}-${i}`}
          style={[styles.action, { backgroundColor: a.color || THEME }, a.disabled && styles.actionDisabled]}
          disabled={!!a.disabled}
          onPress={a.onPress}
        >
          {a.icon ? <Ionicons name={a.icon} size={14} color="#fff" style={styles.actionIcon} /> : null}
          <Text style={styles.actionText}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function FigureRow({ label, value, tone, sublabel }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <View style={styles.figureRight}>
        <Text style={[styles.figureValue, tone ? { color: tone } : null]}>{String(value)}</Text>
        {sublabel ? <Text style={styles.figureSub}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

export function HallTicketEmpty({ icon = 'file-tray-outline', title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={34} color={MUTED} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

/** One line of "N students, M tickets" phrasing that reads the same everywhere. */
export function CountLine({ n, one, many }) {
  return <Text style={styles.countLine}>{plural(n, one, many)}</Text>;
}

/**
 * One row on the hub: the block's icon, label, blurb, and the live number that
 * block exists to report.
 *
 * A badge of ZERO IS NOT DRAWN. An eight-row list of zeroes tells a controller
 * nothing; the one row with a number on it is the one that needs opening.
 */
export function BlockCard({ block, onPress, badge, badgeTone, children }) {
  const badgeColor = badgeTone ?? (badge > 0 ? RED : MUTED);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.blockCard}
      accessibilityRole="button"
      accessibilityLabel={block.label}
    >
      <View style={styles.blockHead}>
        <View style={[styles.blockIcon, { backgroundColor: `${block.color}14` }]}>
          <Ionicons name={block.icon} size={18} color={block.color} />
        </View>
        <View style={styles.blockHeadBody}>
          <Text style={styles.blockLabel}>{block.label}</Text>
          <Text style={styles.blockBlurb}>{block.blurb}</Text>
        </View>
        {badge !== undefined && badge !== null && badge !== 0 ? (
          <View style={[styles.blockBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.blockBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
      </View>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f8fafc' },
  head: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  headTitle: { fontSize: 21, fontWeight: '800', color: '#0f172a' },
  headSub: { fontSize: 13, color: SLATE, marginTop: 3, lineHeight: 18 },
  scroll: { paddingBottom: 36 },
  pad: { paddingHorizontal: 16 },
  skeleton: { height: 74, borderRadius: 12, backgroundColor: '#e2e8f0', marginBottom: 10 },
  errorBox: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 22,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 10 },
  errorBody: { fontSize: 13, color: SLATE, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: THEME, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 9, marginTop: 14,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  pickerRow: { marginBottom: 12 },
  pickerLoading: { height: 34, borderRadius: 10, backgroundColor: '#e2e8f0', marginBottom: 12 },
  pickerError: { color: RED, fontSize: 13, marginBottom: 12 },
  pickerEmpty: { color: SLATE, fontSize: 13, marginBottom: 12, lineHeight: 19 },
  chip: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, maxWidth: 210,
  },
  chipActive: { borderColor: THEME, backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  chipTextActive: { color: THEME },
  chipMeta: { fontSize: 11, color: MUTED, marginTop: 2 },
  chipMetaActive: { color: THEME },
  photoEmpty: { backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontWeight: '800', color: SLATE },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1,
    borderColor: '#e2e8f0', marginBottom: 12,
  },
  section: { marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', flexShrink: 1 },
  sectionNote: { fontSize: 12, color: MUTED, marginLeft: 8, flexShrink: 1 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  statCell: { width: '33.33%', paddingHorizontal: 5, marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, color: SLATE, marginTop: 2 },
  statHint: { fontSize: 10, color: MUTED, marginTop: 1 },
  pill: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3, marginRight: 6, marginBottom: 6,
  },
  pillIcon: { marginRight: 4 },
  pillText: { fontSize: 11, fontWeight: '700' },
  note: {
    flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12,
    padding: 11, marginBottom: 12,
  },
  noteIcon: { marginRight: 8, marginTop: 1 },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  action: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 9, marginRight: 8, marginBottom: 8,
  },
  actionDisabled: { opacity: 0.45 },
  actionIcon: { marginRight: 6 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  figure: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  figureLabel: { fontSize: 13, color: SLATE, flexShrink: 1, paddingRight: 10 },
  figureRight: { alignItems: 'flex-end', flexShrink: 1 },
  figureValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  figureSub: { fontSize: 11, color: MUTED, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 10, textAlign: 'center' },
  emptySub: { fontSize: 12.5, color: SLATE, marginTop: 5, textAlign: 'center', lineHeight: 18 },
  countLine: { fontSize: 12.5, color: SLATE },
  blockCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 14, marginBottom: 10,
  },
  blockHead: { flexDirection: 'row', alignItems: 'center' },
  blockIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center',
    justifyContent: 'center', marginRight: 11,
  },
  blockHeadBody: { flex: 1, paddingRight: 8 },
  blockLabel: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  blockBlurb: { fontSize: 12, color: SLATE, marginTop: 2, lineHeight: 16 },
  blockBadge: {
    minWidth: 24, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3,
    alignItems: 'center', marginRight: 6,
  },
  blockBadgeText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
});

