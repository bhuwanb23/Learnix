/**
 * The warden's mess desk: menu, the roll, the log, analytics, feedback and spend.
 *
 * WAS ENTIRELY A MOCK
 * --------------------
 * This file used to be 386 lines of module-level constants. The menu was a literal `menu` object,
 * `plans` claimed "Veg Plan 892 residents / ₹3,200 a month", attendance read "1,182 / 1,248 served",
 * the "Weekly Rating" was a literal `4.1`, and the budget a literal `₹3.4L`. Every one of those was
 * a number nobody counted, and `hostelApi.mess` existed in `api.js` but was never called by any
 * screen in the app. The three endpoints the backend had served were read-only decoration.
 *
 * It also showed things that do not exist: `MealAttendance` and `MessFeedback` had no write path
 * anywhere in the backend, so "participation" and "student feedback" were two tables holding only
 * seed data. That is why there is no meal-plan card here any more - there is no plan concept in
 * the data model, and a card that invents one is worse than an absent card.
 *
 * WHAT IS TRUE ON THIS SCREEN NOW
 * ------------------------------
 *   · residents, from live bed inventory - not "if attendance exists, count the beds"
 *   · participation, as present/residents with the denominator on screen, and `—` when unknown
 *   · the rating, as an average over a declared window WITH its sample size
 *   · the roll, which the warden actually marks and which is the only way attendance is written
 *   · spend, delegated to the Accounts ledger rather than a second set of numbers
 *
 * WHY THERE IS NO CLIENT-SIDE RATE ARITHMETIC
 * --------------------------------------------
 * Every percentage arrives computed, from `attendanceToday[].ratePct` or `roll.ratePct`. The server
 * owns the denominator because it owns the resident list. A client that divided too would be able
 * to disagree with the kitchen about how many people showed up, which is the one number that has
 * to be right.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, EmptyState } from '../../../../components/ui';
import { SkeletonCard } from '../../../../components/ui/SkeletonLoader';
import { hostelApi } from '../../../../services/api';
import {
  DAY_NAMES,
  DAY_SHORT,
  MEALS,
  mealLabel,
  mealIcon,
  mealColor,
  fmtPct,
  fmtRating,
  fmtDayLabel,
  rateTone,
} from './messMeta';
import RollSheet from './components/RollSheet';
import MenuEditor from './components/MenuEditor';
import AnalyticsSheet from './components/AnalyticsSheet';
import ExpensesSheet from './components/ExpensesSheet';

const TABS = [
  { key: 'today', label: 'Today', icon: 'today-outline' },
  { key: 'roll', label: 'Roll', icon: 'checkbox-outline' },
  { key: 'insights', label: 'Insights', icon: 'stats-chart-outline' },
  { key: 'money', label: 'Spend', icon: 'wallet-outline' },
];

export default function MessModule() {
  const [tab, setTab] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedDay, setSelectedDay] = useState(0);
  const [editing, setEditing] = useState(null); // { dayOfWeek, meal }
  const [rollOpen, setRollOpen] = useState(false);
  const [rollMeal, setRollMeal] = useState('LUNCH');
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [surveying, setSurveying] = useState(false);

  const load = useCallback(async (mode) => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await hostelApi.mess();
      setData(res.data);
      // The server tells us which day it considers today; the client never decides.
      if (typeof res.data?.todayDayOfWeek === 'number') setSelectedDay(res.data.todayDayOfWeek);
    } catch (e) {
      setError(e.message || 'Could not load the mess');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Re-read after a write, so the screen never shows its own optimistic guess. */
  const reload = useCallback(() => load('refresh'), [load]);

  // Menu for the selected weekday, grouped by meal. `dayOfWeek` comes straight from the server row.
  const menuByMeal = useMemo(() => {
    const out = {};
    for (const m of MEALS) out[m] = [];
    for (const row of data?.menu ?? []) {
      if (row.dayOfWeek !== selectedDay) continue;
      if (!out[row.meal]) out[row.meal] = [];
      out[row.meal].push(row);
    }
    return out;
  }, [data?.menu, selectedDay]);

  const onSaveMenu = useCallback(
    async (dayOfWeek, meal, items, isVeg) => {
      try {
        await hostelApi.updateMenu(dayOfWeek, meal, items, isVeg);
        setEditing(null);
        await reload();
      } catch (e) {
        Alert.alert('Could not save the menu', e.message || 'Please try again.');
      }
    },
    [reload],
  );

  const onSurvey = useCallback(async () => {
    try {
      setSurveying(true);
      const res = await hostelApi.sendMessSurvey();
      Alert.alert(
        'Survey sent',
        `${res.data?.recipients ?? 0} residents were asked to rate their meal.`,
      );
    } catch (e) {
      Alert.alert('Could not send the survey', e.message || 'Please try again.');
    } finally {
      setSurveying(false);
    }
  }, []);

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load the mess"
          subtitle={error}
          actionLabel="Try again"
          onAction={() => load()}
        />
      </View>
    );
  }

  const residents = data?.residents ?? 0;
  const tone = rateTone(data?.attendanceToday?.find((a) => a.meal === 'LUNCH')?.ratePct);

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={reload}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => {
                  setTab(t.key);
                  if (t.key === 'roll') setRollOpen(true);
                  if (t.key === 'insights') setInsightsOpen(true);
                  if (t.key === 'money') setMoneyOpen(true);
                }}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={active ? '#fff' : theme.colors.textMuted}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats — every figure labelled with what it is a fraction OF. */}
        <AnimatedCard delay={0}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{residents}</Text>
              <Text style={styles.statLabel}>Residents</Text>
              <Text style={styles.statHint}>in beds today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {data?.avgRating === null || data?.avgRating === undefined
                  ? '—'
                  : `${data.avgRating}★`}
              </Text>
              <Text style={styles.statLabel}>Today's rating</Text>
              <Text style={styles.statHint}>
                {data?.ratingResponses ?? 0} rated
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: tone.color }]}>
                {fmtPct(data?.attendanceToday?.find((a) => a.meal === 'LUNCH')?.ratePct)}
              </Text>
              <Text style={styles.statLabel}>Lunch today</Text>
              <Text style={styles.statHint}>{tone.label}</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Weekly menu */}
        <AnimatedCard delay={60} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly menu</Text>
            <Text style={styles.sectionHint}>{DAY_NAMES[selectedDay]}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DAY_SHORT.map((d, idx) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, selectedDay === idx && styles.dayChipActive]}
                onPress={() => setSelectedDay(idx)}
              >
                <Text style={[styles.dayText, selectedDay === idx && styles.dayTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {MEALS.map((meal) => {
            const rows = menuByMeal[meal] ?? [];
            const row = rows[0];
            return (
              <View key={meal} style={styles.menuCard}>
                <View style={styles.mealRow}>
                  <View
                    style={[styles.mealIcon, { backgroundColor: `${mealColor(meal)}1a` }]}
                  >
                    <Ionicons name={mealIcon(meal)} size={16} color={mealColor(meal)} />
                  </View>
                  <View style={styles.mealBody}>
                    <View style={styles.mealLabelRow}>
                      <Text style={styles.mealLabel}>{mealLabel(meal)}</Text>
                      {row && (
                        <View
                          style={[
                            styles.vegChip,
                            { backgroundColor: row.isVeg ? '#dcfce7' : '#fee2e2' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.vegText,
                              { color: row.isVeg ? '#15803d' : '#b91c1c' },
                            ]}
                          >
                            {row.isVeg ? 'Veg' : 'Non-veg'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.mealValue}>
                      {row && row.items.length > 0
                        ? row.items.join(', ')
                        : 'Not on the menu for this day'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() =>
                      setEditing({
                        dayOfWeek: selectedDay,
                        meal,
                        items: row?.items ?? [],
                        isVeg: row?.isVeg ?? true,
                      })
                    }
                  >
                    <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </AnimatedCard>

        {/* Today's participation */}
        <AnimatedCard delay={120} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's participation</Text>
            <Text style={styles.sectionHint}>{fmtDayLabel(data?.today)}</Text>
          </View>
          <View style={styles.attendanceCard}>
            {(data?.attendanceToday ?? []).map((a) => {
              const t = rateTone(a.ratePct);
              return (
                <View key={a.meal} style={styles.attendanceRow}>
                  <Text style={styles.attendanceLabel}>{mealLabel(a.meal)}</Text>
                  <View style={styles.attendanceTrack}>
                    {a.ratePct === null ? (
                      <View style={[styles.attendanceFill, { width: '0%' }]} />
                    ) : (
                      <View
                        style={[
                          styles.attendanceFill,
                          { width: `${Math.min(100, Math.max(0, a.ratePct))}%`, backgroundColor: t.color },
                        ]}
                      />
                    )}
                  </View>
                  <Text style={styles.attendanceValue}>
                    {a.present}/{a.residents}
                  </Text>
                  <Text style={[styles.attendancePct, { color: t.color }]}>
                    {fmtPct(a.ratePct)}
                  </Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setRollOpen(true)}>
            <Ionicons name="checkbox-outline" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Mark the roll</Text>
          </TouchableOpacity>
        </AnimatedCard>

        {/* Feedback */}
        <AnimatedCard delay={180} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's feedback</Text>
            <Text style={styles.sectionHint}>
              {fmtRating(data?.avgRating, data?.ratingResponses)}
            </Text>
          </View>
          {(data?.feedback ?? []).length === 0 ? (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyInlineText}>
                Nobody has rated a meal yet today.
              </Text>
            </View>
          ) : (
            (data?.feedback ?? []).map((f) => (
              <View key={f.id} style={styles.feedbackCard}>
                <View style={styles.feedbackTop}>
                  <View style={styles.feedbackBody}>
                    <Text style={styles.feedbackMeal}>
                      {mealLabel(f.meal)} · {fmtDayLabel(String(f.mealDate).slice(0, 10))}
                    </Text>
                    {f.comment ? (
                      <Text style={styles.feedbackNote}>{f.comment}</Text>
                    ) : (
                      <Text style={styles.feedbackNoteMuted}>No comment left</Text>
                    )}
                  </View>
                  <View style={styles.ratingChip}>
                    <Ionicons name="star" size={12} color="#d97706" />
                    <Text style={styles.ratingText}>{f.rating}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onSurvey}
            disabled={surveying}
          >
            {surveying ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="pulse-outline" size={16} color={theme.colors.primary} />
            )}
            <Text style={styles.secondaryBtnText}>Ask residents to rate</Text>
          </TouchableOpacity>
        </AnimatedCard>
      </ScrollView>

      <MenuEditor
        visible={!!editing}
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={onSaveMenu}
      />

      <RollSheet
        visible={rollOpen}
        meal={rollMeal}
        onMealChange={setRollMeal}
        onClose={() => setRollOpen(false)}
        onMarked={reload}
      />

      <AnalyticsSheet visible={insightsOpen} onClose={() => setInsightsOpen(false)} />

      <ExpensesSheet visible={moneyOpen} onClose={() => setMoneyOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: 16 },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  // The denominator. A participation figure without one is decoration, so it is on the tile.
  statHint: {
    fontSize: 9,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  section: { marginTop: 16, marginHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  sectionHint: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  dayChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 7,
  },
  dayChipActive: { backgroundColor: theme.colors.primary },
  dayText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  dayTextActive: { color: '#fff' },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mealBody: { flex: 1 },
  mealLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vegChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  vegText: { fontSize: 9, fontFamily: 'Manrope-Bold' },
  mealValue: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    marginTop: 3,
  },
  editBtn: { padding: 6 },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 13,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  attendanceLabel: {
    width: 66,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  attendanceTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginHorizontal: 9,
  },
  attendanceFill: { height: 7, borderRadius: 4 },
  attendanceValue: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    width: 46,
    textAlign: 'right',
  },
  attendancePct: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    width: 44,
    textAlign: 'right',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 11,
  },
  primaryBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 11,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginTop: 8,
  },
  feedbackTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  feedbackBody: { flex: 1 },
  feedbackMeal: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  feedbackNote: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  feedbackNoteMuted: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 3,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 24,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
    marginLeft: 4,
  },
  emptyInline: { padding: 16, alignItems: 'center' },
  emptyInlineText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
});