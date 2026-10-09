/**
 * Participation and satisfaction over a window.
 *
 * WHAT THE SERVER WORKS OUT, AND WHY
 * ----------------------------------
 * Every rate here arrives computed, because each one has a denominator that only the server knows:
 *
 *   · per-meal participation is `present / (residents × days)` - against the OPPORTUNITY to eat,
 *     not against "however many days happened to have data". Dividing by the days-with-rows would
 *     make a sparsely-marked fortnight look busier than a fully-marked one.
 *   · the average rating is a database aggregate over the window WITH its response count, so it
 *     cannot change because the screen paged a different number of rows.
 *   · `0/0` is reported as unknown (`—`), never 0%.
 *
 * THE WEEKDAY BREAKDOWN IS THE POINT OF THIS SCREEN
 * --------------------------------------------------
 * A mess is staffed and stocked by weekday. Knowing that Sunday lunch is at 40% while Tuesday is at
 * 92% is the difference between ordering for the day and ordering for the week.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { EmptyState } from '../../../../../components/ui';
import { SkeletonCard } from '../../../../../components/ui/SkeletonLoader';
import { hostelApi } from '../../../../../services/api';
import {
  DAY_SHORT,
  MEALS,
  mealLabel,
  fmtPct,
  fmtDayLabel,
  rateTone,
} from '../messMeta';

const WINDOWS = [
  { key: 7, label: '7 days' },
  { key: 30, label: '30 days' },
  { key: 90, label: '90 days' },
];

export default function AnalyticsSheet({ visible, onClose }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // `days`, NOT a date range. This sheet asks the server for "the last N days" and lets the
      // SERVER decide which days those are. Sending `from`/`to` would mean building "today minus 6"
      // on the client, which means getting local midnight and DST right on the client - and every
      // way of getting that wrong asks for a window one day short.
      const res = await hostelApi.messAnalytics({ days });
      setData(res.data);
    } catch (e) {
      setError(e.message || 'Could not load the insights');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const peak = Math.max(1, ...(data?.byWeekday ?? []).map((w) => w.present || 0));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Mess insights</Text>
            {data && (
              <Text style={styles.subtitle}>
                {fmtDayLabel(data.from)} – {fmtDayLabel(data.to)} · {data.days} days ·{' '}
                {data.residents} residents
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.windowTabs}>
          {WINDOWS.map((w) => (
            <TouchableOpacity
              key={w.key}
              style={[styles.windowTab, days === w.key && styles.windowTabActive]}
              onPress={() => setDays(w.key)}
            >
              <Text style={[styles.windowText, days === w.key && styles.windowTextActive]}>
                {w.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !data ? (
          <ScrollView contentContainerStyle={styles.pad}>
            <SkeletonCard />
            <SkeletonCard />
          </ScrollView>
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Could not load the insights"
            subtitle={error}
            actionLabel="Try again"
            onAction={load}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.pad}>
            <View style={styles.summary}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>
                  {data?.overall?.avgRating == null ? '—' : `${data.overall.avgRating}★`}
                </Text>
                <Text style={styles.summaryLabel}>average</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{data?.overall?.responses ?? 0}</Text>
                <Text style={styles.summaryLabel}>ratings</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{data?.opportunities ?? 0}</Text>
                <Text style={styles.summaryLabel}>meals served</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Participation by meal</Text>
            <View style={styles.card}>
              {(data?.byMeal ?? []).map((m) => {
                const t = rateTone(m.ratePct);
                return (
                  <View key={m.meal} style={styles.barRow}>
                    <Text style={styles.barLabel}>{mealLabel(m.meal)}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.min(100, Math.max(0, m.ratePct ?? 0))}%`,
                            backgroundColor: t.color,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.barMeta}>
                      <Text style={[styles.barPct, { color: t.color }]}>{fmtPct(m.ratePct)}</Text>
                      <Text style={styles.barSub}>
                        {m.avgRating == null ? 'no ratings' : `${m.avgRating}★ · ${m.ratingResponses}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Busiest and quietest days</Text>
            <View style={styles.card}>
              {(data?.byWeekday ?? []).map((w) => (
                <View key={w.dayOfWeek} style={styles.weekRow}>
                  <Text style={styles.weekDay}>{DAY_SHORT[w.dayOfWeek]}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.round(((w.present || 0) / peak) * 100)}%`,
                          backgroundColor: '#6366f1',
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.barMeta}>
                    <Text style={styles.barPct}>{fmtPct(w.ratePct)}</Text>
                    <Text style={styles.barSub}>
                      {w.avgRating == null ? '—' : `${w.avgRating}★`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.footnote}>
              Participation is counted against every resident on every day of the window, not against
              the days that happen to have a roll marked.
            </Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

/**
 * NO DATE CODE IN THIS FILE.
 *
 * There used to be a `daysAgo(n)` helper here that built a `YYYY-MM-DD` string from `new Date()`
 * and `setDate()`. It is gone because it did not need to exist: the endpoint accepts `days`, and the
 * day boundaries are derived server-side by the same helper that writes the roll. A client that
 * computes a date has to get local midnight and DST right on its own, and every way of getting that
 * wrong produces a window that is quietly one day short - which is exactly the class of bug this
 * feature shipped three of.
 */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: { padding: 6 },
  windowTabs: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingBottom: 8 },
  windowTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
  },
  windowTabActive: { backgroundColor: theme.colors.primary },
  windowText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  windowTextActive: { color: '#fff' },
  pad: { paddingHorizontal: 16, paddingBottom: 24 },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 6,
  },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 14,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 13,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  weekRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  barLabel: {
    width: 66,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  weekDay: {
    width: 66,
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginHorizontal: 9,
  },
  barFill: { height: 8, borderRadius: 4 },
  barMeta: { width: 62, alignItems: 'flex-end' },
  barPct: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  barSub: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  footnote: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 14,
    lineHeight: 15,
  },
});