// F-09 Reports — the pieces every report screen shares (docs/users/06 §3.8).
//
// One period selector, one export row, one loading/error/refresh shell, drawn
// once. They are not abstractions for their own sake: all seven reports sit
// behind the SAME `period` filter, and a report screen that built its own
// period chips would be free to disagree with the hub about which window is
// showing — the failure mode where a user believes they are looking at October
// while the query silently said something else.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert, Linking, Platform, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../components/ui';
import { accountsApi, mediaUrl } from '../../../../services/api';
import {
  THEME, RED, SLATE, PERIODS, periodMeta, EXPORT_FORMATS, formatMeta,
  humanFileSize, rupees, barWidth,
} from './reportsMeta';

/**
 * Fetch-on-mount plus pull-to-refresh, with the error kept where the screen can
 * show it. Returns `reload` so a screen can re-fetch after an action.
 */
export function useReport(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await fetcher());
    } catch (err) {
      setError(err.message);
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

/** The retry panel, shown in place of a report that would not load. */
export function ReportError({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={RED} />
      <Text style={styles.errorText}>{message || 'This report could not be loaded.'}</Text>
      <TouchableOpacity style={styles.retry} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * The period selector.
 *
 * Rendered as chips rather than a picker because there are only five and the
 * hint under the selected chip is the point — `meta.hint` says in words what the
 * window is, which matters most for SEMESTER (it depends on the institution
 * having an academic year) and ALL (there is no window at all).
 */
export function PeriodBar({ value, onChange, periods = PERIODS }) {
  const meta = periodMeta(value);
  return (
    <View style={styles.periodWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
        {periods.map((p) => {
          const active = p === value;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => onChange(p)}
              activeOpacity={0.8}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{periodMeta(p).short}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={styles.periodHint}>{meta.hint}</Text>
    </View>
  );
}

/**
 * The export row.
 *
 * Every format really writes a file on the server and records it, so the button
 * is not a placeholder that fires an alert. After the file lands the row shows
 * what was produced — name, size, sheet row counts — because a report you cannot
 * open is worse than no report, and "8 KB, 3 sheets" is the difference between
 * trusting the download and re-tapping it.
 */
export function ExportBar({ reportId, period, anchor, granularity, label = 'Export' }) {
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);

  const run = async (format) => {
    setBusy(format);
    try {
      const res = await accountsApi.exportReport(reportId, { period, anchor, format, granularity });
      setDone(res);
      Alert.alert(
        `${formatMeta(format).label} ready`,
        `${res.name} — ${humanFileSize(res.sizeBytes)}.\n\n${res.note ?? ''}`,
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Open', onPress: () => openExport(res) },
        ],
      );
    } catch (err) {
      Alert.alert(`Could not export as ${formatMeta(format).label}`, err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.exportWrap}>
      <View style={styles.exportRow}>
        <Ionicons name="download-outline" size={15} color={SLATE} />
        <Text style={styles.exportLabel}>{label}</Text>
        <View style={{ flex: 1 }} />
        {EXPORT_FORMATS.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => run(f.id)}
            disabled={busy !== null}
            activeOpacity={0.8}
            style={[styles.formatBtn, busy === f.id && styles.formatBtnBusy]}
            accessibilityRole="button"
            accessibilityLabel={`Export as ${f.label}`}
          >
            {busy === f.id
              ? <ActivityIndicator size="small" color={THEME} />
              : <Text style={styles.formatText}>{f.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>
      {done ? (
        <TouchableOpacity style={styles.exportDone} onPress={() => openExport(done)} activeOpacity={0.85}>
          <Ionicons name="document-text-outline" size={14} color={THEME} />
          <Text style={styles.exportDoneText} numberOfLines={1}>
            {done.name} · {humanFileSize(done.sizeBytes)} · {(done.sheetNames ?? []).join(', ')}
          </Text>
          <Ionicons name="open-outline" size={14} color={THEME} />
        </TouchableOpacity>
      ) : (
        <Text style={styles.exportHint}>{EXPORT_FORMATS[0].hint}</Text>
      )}
    </View>
  );
}

/**
 * Open a produced file.
 *
 * A served URL is offered first and the text is offered as the fallback: a
 * device that cannot open an .xlsx in a browser can still send the path to
 * someone who can. Silently failing would leave the user with a "success"
 * alert and nothing to show for it.
 */
async function openExport(exported) {
  if (!exported?.url) return;
  const url = mediaUrl(exported.url);
  try {
    await Linking.openURL(url);
  } catch {
    try {
      await Share.share({
        message: `${exported.name}\n${url}`,
        ...(Platform.OS === 'android' ? { url } : null),
      });
    } catch {
      Alert.alert('Could not open the file', `${exported.name}\n${url}`);
    }
  }
}

/**
 * The shell: loading, failure, pull-to-refresh, and the window the report
 * actually covers. The label is printed on every screen because "ALL" and
 * "October 2026" are the difference between a number a user can act on and one
 * they cannot.
 */
export function ReportScreen({
  title, loading, refreshing, error, onRetry, onRefresh, period, children, exportProps,
}) {
  if (loading) {
    return (
      <View style={styles.wrap}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }
  if (error) return <ReportError message={error} onRetry={onRetry} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {title ? <Text style={styles.screenTitle}>{title}</Text> : null}
      {period?.label ? (
        <View style={styles.periodTag}>
          <Ionicons name="calendar-outline" size={12} color={SLATE} />
          <Text style={styles.periodTagText}>{period.label}</Text>
        </View>
      ) : null}
      {children}
      {exportProps ? <ExportBar {...exportProps} /> : null}
    </ScrollView>
  );
}

/** A card of headline figures. `tone` colours the value, never the card. */
export function StatGrid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

export function StatCell({ label, value, tone, hint }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel} numberOfLines={2}>{label}</Text>
      <Text style={[styles.cellValue, tone ? { color: tone } : null]} numberOfLines={1}>{value}</Text>
      {hint ? <Text style={styles.cellHint} numberOfLines={2}>{hint}</Text> : null}
    </View>
  );
}

/** A labelled section with an optional trailing note. */
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

/**
 * A labelled bar row. `max` is the largest magnitude in the set the caller
 * measured, so every bar in one list is drawn to the same scale.
 */
export function BarRow({ label, value, display, max, color = THEME, right, sublabel }) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
        <Text style={[styles.barValue, color ? { color } : null]}>{display ?? rupees(value)}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: barWidth(value, max), backgroundColor: color }]} />
      </View>
      {right ?? sublabel ? <Text style={styles.barSub}>{right ?? sublabel}</Text> : null}
    </View>
  );
}

/** An empty state phrased for a report — never a bare "no data". */
export function ReportEmpty({ icon, title, subtitle }) {
  return <EmptyState icon={icon} title={title} subtitle={subtitle} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  wrap: { flex: 1, backgroundColor: '#f5f7f9', padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f7f9' },
  errorText: { marginTop: 12, color: RED, textAlign: 'center', fontSize: 13 },
  retry: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },

  screenTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  periodTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  periodTagText: { fontSize: 11, color: SLATE, fontWeight: '600' },

  periodWrap: { marginBottom: 12 },
  periodRow: { gap: 8, paddingRight: 16 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6ebf2',
  },
  chipActive: { backgroundColor: THEME, borderColor: THEME },
  chipText: { fontSize: 12, fontWeight: '600', color: SLATE },
  chipTextActive: { color: '#fff' },
  periodHint: { fontSize: 11, color: SLATE, marginTop: 6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', paddingVertical: 8, paddingRight: 10 },
  cellLabel: { fontSize: 10, color: SLATE },
  cellValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  cellHint: { fontSize: 10, color: SLATE, marginTop: 1 },

  section: { marginTop: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sectionNote: { fontSize: 10, color: SLATE, flex: 1, textAlign: 'right' },

  barRow: { marginBottom: 10 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a', flex: 1, marginRight: 8 },
  barValue: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  barTrack: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', overflow: 'hidden', marginTop: 5 },
  barFill: { height: 7, borderRadius: 4 },
  barSub: { fontSize: 10, color: SLATE, marginTop: 4 },

  exportWrap: { marginTop: 20 },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportLabel: { fontSize: 12, fontWeight: '700', color: SLATE },
  formatBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 54,
    alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6ebf2',
  },
  formatBtnBusy: { backgroundColor: '#eff6ff', borderColor: THEME },
  formatText: { fontSize: 11, fontWeight: '700', color: THEME },
  exportHint: { fontSize: 10, color: SLATE, marginTop: 8 },
  exportDone: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  exportDoneText: { flex: 1, fontSize: 10, color: THEME, fontWeight: '600' },
});

export { AnimatedCard };