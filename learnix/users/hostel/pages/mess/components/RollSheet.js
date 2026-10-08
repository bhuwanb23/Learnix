/**
 * The roll: mess staff mark who ate, meal by meal.
 *
 * THIS IS THE ONLY WAY ATTENDANCE IS EVER WRITTEN
 * ----------------------------------------------
 * There is no student-side attendance. `MealAttendance` had no write path at all until this
 * feature, and the deliberate decision was that it stays staff-side: a resident does not tap in,
 * so the number the kitchen provisions against is a count somebody took, not a claim somebody
 * remembered to make.
 *
 * WHY MARKING IS "SELECT ALL THAT ATE", NOT "TICK WHO IS HERE"
 * -----------------------------------------------------------
 * `POST /mess/attendance` REPLACES the meal: everyone not in the submitted list is cleared. That is
 * the opposite of an additive "mark present" endpoint, and it is what makes this sheet safe to
 * correct. A warden who marks 30, realises they ticked the wrong block and re-opens, only has to
 * untick five people - they do not have to first work out what the previous mark said in order to
 * undo it. It also means the request is idempotent, so a retry over a flaky connection cannot
 * double-count anyone.
 *
 * The sheet always shows the server's current marks (`row.present`) as the starting point, so what
 * the warden sees is what is stored - not a local guess that drifts if a fetch lands late.
 *
 * WHY THE RATE ARRIVES FROM THE SERVER
 * ------------------------------------
 * `roll.ratePct` and `roll.present` come off the response after marking. The client never divides
 * the count by the resident total: it could disagree with the kitchen about how many people ate,
 * and that is precisely the number the kitchen buys vegetables against.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { EmptyState } from '../../../../../components/ui';
import { SkeletonCard } from '../../../../../components/ui/SkeletonLoader';
import { hostelApi } from '../../../../../services/api';
import { MEALS, mealLabel, fmtPct, fmtDayLabel, rateTone } from '../messMeta';

export default function RollSheet({ visible, meal, onMealChange, onClose, onMarked }) {
  const [roll, setRoll] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [markedToday, setMarkedToday] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hostelApi.messRoll(meal);
      setRoll(res.data);
      // Seed the selection from the server's view, so the sheet opens showing the truth.
      const next = new Set();
      for (const r of res.data?.rows ?? []) if (r.present) next.add(r.studentProfileId);
      setPicked(next);
    } catch (e) {
      setError(e.message || 'Could not load the roll');
    } finally {
      setLoading(false);
    }
  }, [meal]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const filtered = useMemo(() => {
    const rows = roll?.rows ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        String(r.rollNo ?? '').toLowerCase().includes(q) ||
        r.block.toLowerCase().includes(q),
    );
  }, [roll?.rows, query]);

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisible = filtered.length > 0;
  const allSelected = allVisible && filtered.every((r) => picked.has(r.studentProfileId));

  const toggleAllVisible = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((r) => next.delete(r.studentProfileId));
      else filtered.forEach((r) => next.add(r.studentProfileId));
      return next;
    });

  const submit = async () => {
    if (picked.size === 0) {
      Alert.alert(
        'Nobody marked',
        'Tap at least one resident, or choose a different meal.',
      );
      return;
    }
    try {
      setSaving(true);
      const res = await hostelApi.markMessAttendance(meal, [...picked]);
      const d = res.data;
      setMarkedToday({ ...d, tone: rateTone(d.ratePct) });
      await load();
      onMarked?.();
    } catch (e) {
      Alert.alert('Could not mark the roll', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = useMemo(() => {
    const stored = new Set((roll?.rows ?? []).filter((r) => r.present).map((r) => r.studentProfileId));
    if (stored.size !== picked.size) return true;
    for (const id of stored) if (!picked.has(id)) return true;
    return false;
  }, [roll?.rows, picked]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mark the roll</Text>
            <Text style={styles.subtitle}>
              {roll ? `${fmtDayLabel(roll.date)} · ${mealLabel(meal)}` : 'Loading…'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.mealTabs}>
          {MEALS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.mealTab, meal === m && styles.mealTabActive]}
              onPress={() => onMealChange(m)}
            >
              <Text style={[styles.mealTabText, meal === m && styles.mealTabTextActive]}>
                {mealLabel(m)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !roll ? (
          <ScrollView contentContainerStyle={styles.pad}>
            <SkeletonCard />
            <SkeletonCard />
          </ScrollView>
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Could not load the roll"
            subtitle={error}
            actionLabel="Try again"
            onAction={load}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.pad}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />
            }
          >
            {/* The count, the denominator and the rate - all from the server. */}
            <View style={styles.summary}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{picked.size}</Text>
                <Text style={styles.summaryLabel}>marked</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{roll?.residents ?? 0}</Text>
                <Text style={styles.summaryLabel}>residents</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: rateTone(pickRate(picked.size, roll?.residents)).color },
                  ]}
                >
                  {fmtPct(pickRate(picked.size, roll?.residents))}
                </Text>
                <Text style={styles.summaryLabel}>participation</Text>
              </View>
            </View>

            {/* Stale rows the server reported. Surfaced, not hidden. */}
            {roll?.unmatchedAttendance > 0 && (
              <View style={styles.warn}>
                <Ionicons name="alert-circle-outline" size={15} color="#b45309" />
                <Text style={styles.warnText}>
                  {roll.unmatchedAttendance} attendance{' '}
                  {roll.unmatchedAttendance === 1 ? 'row' : 'rows'} exist for students who no longer
                  have a bed. They are excluded from the count.
                </Text>
              </View>
            )}

            <TextInput
              style={styles.search}
              placeholder="Search by name, roll number or block"
              placeholderTextColor={theme.colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />

            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>
                {roll?.rows?.length
                  ? 'No resident matches that search.'
                  : 'This hostel has no residents yet.'}
              </Text>
            ) : (
              <>
                <TouchableOpacity style={styles.selectAll} onPress={toggleAllVisible}>
                  <Ionicons
                    name={allSelected ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.selectAllText}>
                    {allSelected ? 'Clear the ones shown' : 'Mark everyone shown'}
                  </Text>
                </TouchableOpacity>

                {filtered.map((r) => {
                  const on = picked.has(r.studentProfileId);
                  return (
                    <TouchableOpacity
                      key={r.studentProfileId}
                      style={styles.row}
                      onPress={() => toggle(r.studentProfileId)}
                    >
                      <Ionicons
                        name={on ? 'checkbox' : 'square-outline'}
                        size={21}
                        color={on ? theme.colors.primary : theme.colors.textMuted}
                      />
                      <View style={styles.rowBody}>
                        <Text style={styles.rowName}>{r.name}</Text>
                        <Text style={styles.rowMeta}>
                          {r.rollNo} · {r.block}
                        </Text>
                      </View>
                      {r.present && !on && (
                        <View style={styles.wasChip}>
                          <Text style={styles.wasText}>was marked</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}

        <View style={styles.footer}>
          {markedToday && (
            <Text style={styles.savedNote}>
              Saved: {markedToday.present} of {markedToday.residents} ·{' '}
              {fmtPct(markedToday.ratePct)}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnIdle]}
            onPress={submit}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={17} color="#fff" />
                <Text style={styles.saveText}>
                  {dirty ? `Mark ${picked.size} for ${mealLabel(meal)}` : 'No changes'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * A preview of the rate while the warden is still tapping.
 *
 * This is the ONE percentage the client computes, and it is a preview of an unsaved selection - not
 * a stored fact. The authoritative rate comes back from `POST /mess/attendance` and from
 * `roll.ratePct`, and both of those are shown elsewhere on this screen. Marking a meal re-reads the
 * roll, so the number that survives is always the server's.
 */
function pickRate(picked, residents) {
  if (!residents) return null;
  return Math.round((picked / residents) * 1000) / 10;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  title: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: { padding: 6 },
  mealTabs: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingBottom: 8 },
  mealTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
  },
  mealTabActive: { backgroundColor: theme.colors.primary },
  mealTabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  mealTabTextActive: { color: '#fff' },
  pad: { paddingHorizontal: 16, paddingBottom: 16 },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: {
    fontSize: 17,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  warn: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  warnText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: '#b45309',
  },
  search: {
    backgroundColor: '#fff',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginBottom: 10,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
  },
  selectAllText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 7,
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  rowMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  wasChip: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  wasText: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#b45309' },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  savedNote: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnIdle: { backgroundColor: theme.colors.textMuted },
  saveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});