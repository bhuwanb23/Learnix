/**
 * The resident's mess screen: what's on today, and a rating for each meal.
 *
 * WHY A STUDENT CAN RATE BUT NOT MARK
 * -----------------------------------
 * The roll is called by mess staff. There is no student-side attendance write anywhere in this app,
 * and deliberately so: if residents tapped in themselves, the participation figure the kitchen
 * provisions against would be a claim rather than a count, and "I forgot to tap" would be
 * indistinguishable from "I did not eat". So this screen reads the menu and writes exactly one
 * thing - a rating.
 *
 * WHY IT SHOWS A DAY IN THE PAST
 * ------------------------------
 * The common case is a student complaining about last night's dinner. `GET /student/mess` takes an
 * optional date, so the screen can step back a day without inventing anything - and the server
 * refuses to rate a meal that is not on the menu for that day, so nobody can review a dish the
 * kitchen never served.
 *
 * A RATING IS AN UPSERT. Re-tapping a star replaces the earlier rating rather than filing a second
 * opinion, so `myRating` comes back on the response and the screen offers to edit instead of
 * presenting an empty form a student has to wonder about after a mis-tap.
 *
 * THE DAY OF THE WEEK COMES FROM THE SERVER
 * ------------------------------------------
 * `dayOfWeek` arrives on the response. The client never derives it from the date string, because
 * "which day is 8 October" is exactly the arithmetic that produced three silent zeros in the
 * warden half of this feature.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, EmptyState } from '../../../../components/ui';
import { SkeletonCard } from '../../../../components/ui/SkeletonLoader';
import { studentApi } from '../../../../services/api';
import { DAY_NAMES, MEALS, mealLabel, mealIcon, mealColor, fmtDayLabel } from './messMeta';

export default function MessPage({ navigation }) {
  const [offset, setOffset] = useState(0); // 0 = today, 1 = yesterday, …
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState({}); // meal -> { rating, comment }
  const [savingMeal, setSavingMeal] = useState(null);

  const load = useCallback(async (mode) => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      // `dayOffset` is an integer, so no date is built on the client - see `messMeta`.
      const res = await studentApi.myMess(offset);
      setData(res.data);
      // Seed the editors from what is stored, so a re-rating starts from the truth.
      const next = {};
      for (const m of res.data?.meals ?? []) {
        if (m.myRating != null) next[m.meal] = { rating: m.myRating, comment: m.myComment ?? '' };
      }
      setDrafts(next);
    } catch (e) {
      setError(e.message || 'Could not load the menu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [offset]);

  useEffect(() => {
    load();
  }, [load]);

  const rate = async (meal) => {
    const draft = drafts[meal];
    if (!draft?.rating) {
      Alert.alert('Pick a rating', 'Tap one to five stars first.');
      return;
    }
    try {
      setSavingMeal(meal);
      await studentApi.rateMeal({
        meal: data.date,
        rating: draft.rating,
        comment: draft.comment?.trim() || undefined,
      });
      await load('refresh');
      Alert.alert('Thanks', `Your ${mealLabel(meal).toLowerCase()} rating was recorded.`);
    } catch (e) {
      Alert.alert('Could not save your rating', e.message || 'Please try again.');
    } finally {
      setSavingMeal(null);
    }
  };

  const complain = (meal) => {
    // Takes the resident to the complaint form with the mess category pre-picked. Food complaints
    // reuse the hostel complaint workflow (OPEN → ASSIGNED → RESOLVED) rather than a second queue.
    //
    // The optional-call is the bug this replaced: `navigation?.navigate?.('Complaints', …)` silently did
    // NOTHING when `navigate` was missing, so the button looked live and swallowed the tap. `students.js`
    // now passes a real `navigate`, and this guard shouts instead of failing quietly — a report button
    // that cannot report is worse than one that says so.
    const label = meal?.label ? ` ${meal.label}` : '';
    if (!navigation?.navigate) {
      Alert.alert('Cannot report', 'Complaints are unavailable right now. Please tell the warden directly.');
      return;
    }
    navigation.navigate('Complaints', { category: 'FOOD', meal: meal?.label ?? null });
    // `meal` is carried only so the complaint form can open with the dish named; the label above is for
    // readability of the fallback path, and the form reads `route.params.meal` itself.
    void label;
  };

  if (loading && !data) {
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
          title="Could not load the menu"
          subtitle={error}
          actionLabel="Try again"
          onAction={() => load()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={theme.colors.primary} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setOffset((o) => Math.min(6, o + 1))}
          disabled={offset >= 6}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={offset >= 6 ? theme.colors.border : theme.colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {offset === 0 ? 'Today' : DAY_NAMES[data?.dayOfWeek ?? 0]}
          </Text>
          <Text style={styles.headerSub}>
            {fmtDayLabel(data?.date)}
            {offset > 0 ? ' · tap › for a later day' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={offset === 0 ? theme.colors.border : theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.pad}>
        {(data?.meals ?? []).map((meal) => {
          const draft = drafts[meal.meal] ?? {};
          const rated = meal.myRating != null;
          return (
            <AnimatedCard key={meal.meal} delay={0} style={styles.mealCard}>
              <View style={styles.mealHead}>
                <View style={[styles.mealIcon, { backgroundColor: `${mealColor(meal.meal)}1a` }]}>
                  <Ionicons name={mealIcon(meal.meal)} size={17} color={mealColor(meal.meal)} />
                </View>
                <View style={styles.mealHeadText}>
                  <Text style={styles.mealName}>{mealLabel(meal.meal)}</Text>
                  {rated && (
                    <Text style={styles.ratedNote}>you rated this {meal.myRating}★</Text>
                  )}
                </View>
                {meal.isVeg !== null && (
                  <View
                    style={[
                      styles.vegChip,
                      { backgroundColor: meal.isVeg ? '#dcfce7' : '#fee2e2' },
                    ]}
                  >
                    <Text
                      style={[styles.vegText, { color: meal.isVeg ? '#15803d' : '#b91c1c' }]}
                    >
                      {meal.isVeg ? 'Veg' : 'Non-veg'}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.dishes}>
                {meal.items && meal.items.length > 0
                  ? meal.items.join(', ')
                  : 'Not on the menu for this day'}
              </Text>

              {meal.items && meal.items.length > 0 && (
                <>
                  <Text style={styles.rateLabel}>{rated ? 'Change your rating' : 'Rate this meal'}</Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity
                        key={n}
                        onPress={() =>
                          setDrafts((d) => ({
                            ...d,
                            [meal.meal]: { ...(d[meal.meal] ?? {}), rating: n },
                          }))
                        }
                        hitSlop={6}
                      >
                        <Ionicons
                          name={draft.rating >= n ? 'star' : 'star-outline'}
                          size={30}
                          color={draft.rating >= n ? '#f59e0b' : theme.colors.border}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.comment}
                    placeholder="Anything the kitchen should know? (optional)"
                    placeholderTextColor={theme.colors.textMuted}
                    value={draft.comment ?? ''}
                    onChangeText={(t) =>
                      setDrafts((d) => ({
                        ...d,
                        [meal.meal]: { ...(d[meal.meal] ?? {}), comment: t },
                      }))
                    }
                    maxLength={400}
                    multiline
                  />

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.rateBtn}
                      onPress={() => rate(meal.meal)}
                      disabled={savingMeal === meal.meal}
                    >
                      {savingMeal === meal.meal ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="send" size={14} color="#fff" />
                          <Text style={styles.rateBtnText}>
                            {rated ? 'Update rating' : 'Send rating'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.complainBtn} onPress={() => complain(meal.meal)}>
                      <Ionicons name="warning-outline" size={14} color="#b45309" />
                      <Text style={styles.complainText}>Report a problem</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </AnimatedCard>
          );
        })}

        <Text style={styles.footnote}>
          Your rating is recorded against this meal and day. Reporting a problem opens a hostel
          complaint the warden tracks until it is fixed.
        </Text>
      </View>
    </ScrollView>
  );
}

/**
 */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { paddingHorizontal: 16, paddingBottom: 26 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  navBtn: { padding: 6 },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  mealCard: { marginTop: 10 },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealHeadText: { flex: 1 },
  mealName: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  ratedNote: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: '#059669',
    marginTop: 1,
  },
  vegChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  vegText: { fontSize: 9, fontFamily: 'Manrope-Bold' },
  dishes: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    marginTop: 10,
    lineHeight: 19,
  },
  rateLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
  },
  stars: { flexDirection: 'row', gap: 8, marginTop: 6 },
  comment: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginTop: 12,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  rateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 11,
    paddingVertical: 12,
  },
  rateBtnText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  complainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#fffbeb',
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  complainText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#b45309' },
  footnote: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 16,
    lineHeight: 15,
  },
});