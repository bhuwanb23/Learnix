import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';

const THEME = '#b45309';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };

/** Numeric rules, their bounds, and what each one actually governs. */
const RULES = [
  { key: 'loanPeriodDays', label: 'Loan period', unit: 'days', min: 1, max: 90, step: 1, color: '#2563eb', effect: 'Default length when the desk issues without picking one' },
  { key: 'maxActiveLoans', label: 'Books per student', unit: 'books', min: 1, max: 20, step: 1, color: '#7c3aed', effect: 'Blocks issuing beyond this many held books' },
  { key: 'maxRenewalsPerLoan', label: 'Renewals per loan', unit: 'renewals', min: 0, max: 50, step: 1, color: '#0891b2', effect: 'Renewals available before a loan becomes final' },
  { key: 'finePerDayRupees', label: 'Fine rate', unit: '₹ / day', min: 0, max: 500, step: 1, color: '#dc2626', effect: 'Charged automatically for each day overdue' },
  { key: 'maxOutstandingFineRupees', label: 'Fine ceiling', unit: '₹', min: 0, max: 100000, step: 10, color: '#d97706', effect: 'Unpaid fines above this stop new issues' },
];

const toRupees = (paise) => Math.round(paise / 100);
export default function LibrarySettings({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const toDraft = (s) => ({
    loanPeriodDays: s.loanPeriodDays,
    maxActiveLoans: s.maxActiveLoans,
    maxRenewalsPerLoan: s.maxRenewalsPerLoan,
    finePerDayRupees: s.finePerDayRupees,
    maxOutstandingFineRupees: s.maxOutstandingFineRupees,
    openTime: s.openTime,
    closeTime: s.closeTime,
    closedDays: s.closedDays || [],
  });

  const fetchData = useCallback(async () => {
    try {
      const result = await libraryApi.librarySettings();
      setSettings(result);
      setDraft(toDraft(result));
    } catch (err) {
      Alert.alert('Cannot Load Settings', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dirty = useMemo(() => {
    if (!settings) return false;
    return RULES.some((r) => draft[r.key] !== settings[r.key]) ||
      draft.openTime !== settings.openTime ||
      draft.closeTime !== settings.closeTime ||
      JSON.stringify([...(draft.closedDays || [])].sort()) !==
        JSON.stringify([...(settings.closedDays || [])].sort());
  }, [draft, settings]);

  const dirtyPrefs = useMemo(() => {
    if (!settings) return false;
    return ['dueRemindersEnabled', 'autoFineEnabled', 'announceNewArrivals']
      .some((k) => draft[k] !== settings[k]);
  }, [draft, settings]);

  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setNumber = (key, raw) => {
    const text = String(raw).replace(/[^0-9]/g, '');
    set(key, text === '' ? '' : Number(text));
  };

  const toggleDay = (day) => {
    const days = draft.closedDays || [];
    set('closedDays', days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  };

  const validate = () => {
    const next = {};
    for (const r of RULES) {
      const value = draft[r.key];
      if (value === '' || value === undefined || Number.isNaN(Number(value))) {
        next[r.key] = `${r.label} is required`;
      } else if (Number(value) < r.min || Number(value) > r.max) {
        next[r.key] = `Between ${r.min} and ${r.max}`;
      }
    }
    const openM = toMinutes(draft.openTime);
    const closeM = toMinutes(draft.closeTime);
    if (openM === null) next.openTime = 'Use HH:MM (24-hour)';
    if (closeM === null) next.closeTime = 'Use HH:MM (24-hour)';
    if (openM !== null && closeM !== null && openM >= closeM) {
      next.openTime = 'Opening time must be earlier than closing time';
    }
    if ((draft.closedDays || []).length >= 7) {
      next.closedDays = 'Closing the library every day is not allowed';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {};
      for (const r of RULES) payload[r.key] = Number(draft[r.key]);
      payload.openTime = draft.openTime;
      payload.closeTime = draft.closeTime;
      payload.closedDays = draft.closedDays || [];
      if (dirtyPrefs) {
        payload.dueRemindersEnabled = draft.dueRemindersEnabled;
        payload.autoFineEnabled = draft.autoFineEnabled;
        payload.announceNewArrivals = draft.announceNewArrivals;
      }
      const saved = await libraryApi.saveLibrarySettings(payload);
      setSettings(saved);
      setDraft(toDraft(saved));
      Alert.alert('Settings saved', 'The circulation desk will use these rules from now on.');
    } catch (err) {
      Alert.alert('Could Not Save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  const prefs = [
    {
      key: 'dueRemindersEnabled',
      icon: 'alarm-outline',
      color: '#0891b2',
      label: 'Due reminders',
      sub: 'Count how many students sit in each reminder stage',
    },
    {
      key: 'autoFineEnabled',
      icon: 'cash-outline',
      color: '#dc2626',
      label: 'Auto fines on return',
      sub: 'Create the fine row when an overdue book comes back. Off means you raise it by hand.',
    },
    {
      key: 'announceNewArrivals',
      icon: 'megaphone-outline',
      color: THEME,
      label: 'Announce new arrivals',
      sub: 'Send every student a broadcast each time a title is added to the catalog',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Circulation rules */}
        <Text style={styles.sectionLabel}>Circulation rules</Text>
        <AnimatedCard delay={0} style={styles.block}>
          {RULES.map((r, idx) => (
            <View key={r.key}>
              <View style={styles.ruleRow}>
                <View style={[styles.ruleIcon, { backgroundColor: r.color + '14' }]}>
                  <Ionicons name="options-outline" size={17} color={r.color} />
                </View>
                <View style={styles.ruleBody}>
                  <Text style={styles.ruleLabel}>{r.label}</Text>
                  <Text style={styles.ruleEffect}>{r.effect}</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setNumber(r.key, Math.max(r.min, Number(draft[r.key] || 0) - r.step))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={15} color="#475569" />
                  </TouchableOpacity>
                  <View style={styles.stepValueWrap}>
                    <Text style={styles.stepValue}>{draft[r.key]}</Text>
                    <Text style={styles.stepUnit}>{r.unit}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setNumber(r.key, Math.min(r.max, Number(draft[r.key] || 0) + r.step))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={15} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>
              {errors[r.key] ? <Text style={styles.error}>{errors[r.key]}</Text> : null}
              {idx < RULES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </AnimatedCard>

        {/* Timings */}
        <Text style={styles.sectionLabel}>Timings</Text>
        <AnimatedCard delay={60} style={styles.block}>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Opens</Text>
              <TextInput
                style={[styles.timeInput, errors.openTime && styles.inputError]}
                value={draft.openTime ?? ''}
                onChangeText={(v) => set('openTime', v)}
                placeholder="08:00"
                maxLength={5}
              />
            </View>
            <View style={styles.timeDash}>
              <Text style={styles.timeDashText}>to</Text>
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Closes</Text>
              <TextInput
                style={[styles.timeInput, errors.closeTime && styles.inputError]}
                value={draft.closeTime ?? ''}
                onChangeText={(v) => set('closeTime', v)}
                placeholder="19:00"
                maxLength={5}
              />
            </View>
          </View>
          {errors.openTime ? <Text style={styles.error}>{errors.openTime}</Text> : null}
          {errors.closeTime ? <Text style={styles.error}>{errors.closeTime}</Text> : null}

          <Text style={styles.daysLabel}>Closed days</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d) => {
              const on = (draft.closedDays || []).includes(d);
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayChip, on && styles.dayChipOn]}
                  onPress={() => toggleDay(d)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{DAY_SHORT[d]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.closedDays ? <Text style={styles.error}>{errors.closedDays}</Text> : null}
          <Text style={styles.daysHint}>
            {(draft.closedDays || []).length === 0
              ? 'Open every day of the week.'
              : `Closed on ${(draft.closedDays || []).map((d) => DAY_SHORT[d]).join(', ')}.`}
          </Text>
        </AnimatedCard>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Automation</Text>
        <AnimatedCard delay={120} style={styles.block}>
          {prefs.map((p, idx) => (
            <View key={p.key}>
              <View style={styles.ruleRow}>
                <View style={[styles.ruleIcon, { backgroundColor: p.color + '14' }]}>
                  <Ionicons name={p.icon} size={17} color={p.color} />
                </View>
                <View style={styles.ruleBody}>
                  <Text style={styles.ruleLabel}>{p.label}</Text>
                  <Text style={styles.ruleEffect}>{p.sub}</Text>
                </View>
                <Switch
                  value={!!draft[p.key]}
                  onValueChange={(v) => togglePref(p.key, v)}
                  trackColor={{ false: '#e5e7eb', true: '#fcd34d' }}
                  thumbColor={draft[p.key] ? THEME : '#f4f4f5'}
                />
              </View>
              {idx < prefs.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
          <View style={styles.honestRow}>
            <Ionicons name="information-circle-outline" size={15} color="#2563eb" />
            <Text style={styles.honestText}>
              These switches are enforced by the API. Auto fines off means a returned overdue book records its lateness
              but no fine is created until a librarian raises one.
            </Text>
          </View>
        </AnimatedCard>

        {/* Save bar */}
        {dirty || dirtyPrefs ? (
          <AnimatedCard delay={180} style={[styles.block, styles.saveBar]}>
            <Text style={styles.saveHint}>Unsaved changes</Text>
            <View style={styles.saveActions}>
              <TouchableOpacity style={styles.discardBtn} onPress={fetchData} activeOpacity={0.85}>
                <Text style={styles.discardText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnBusy]}
                onPress={save}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save settings'}</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        ) : (
          <AnimatedCard delay={180} style={styles.block}>
            <View style={styles.savedRow}>
              <Ionicons name="checkmark-done-outline" size={16} color="#059669" />
              <Text style={styles.savedText}>
                All settings saved
                {settings?.updatedByName ? ` · last changed by ${settings.updatedByName}` : ''}.
              </Text>
            </View>
          </AnimatedCard>
        )}

        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={() => navigation.openModule('ReminderSchedule')}
          activeOpacity={0.85}
        >
          <Ionicons name="alarm-outline" size={15} color={THEME} />
          <Text style={styles.secondaryLinkText}>See which students the reminders would reach</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const toMinutes = (hhmm) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm ?? ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  block: { marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 10 },

  ruleRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  ruleIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  ruleBody: { flex: 1, marginRight: 8 },
  ruleLabel: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#0f172a' },
  ruleEffect: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2, lineHeight: 14 },
  divider: { height: 1, backgroundColor: '#eef2f7' },
  error: { fontSize: 10, color: '#dc2626', fontFamily: 'Manrope-SemiBold', marginHorizontal: 14, marginBottom: 8 },

  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 11, padding: 3 },
  stepBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepValueWrap: { minWidth: 52, alignItems: 'center' },
  stepValue: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#0f172a' },
  stepUnit: { fontSize: 8, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  timeRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 14, paddingBottom: 6 },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  timeInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: '#0f172a', backgroundColor: '#f8fafc' },
  inputError: { borderColor: '#dc2626' },
  timeDash: { paddingHorizontal: 12, paddingBottom: 13 },
  timeDashText: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Medium' },

  daysLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 14, marginTop: 10 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingTop: 8 },
  dayChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  dayChipOn: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  dayChipText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: '#64748b' },
  dayChipTextOn: { color: '#dc2626' },
  daysHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginHorizontal: 14, marginTop: 8, marginBottom: 12 },

  honestRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  honestText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16, marginLeft: 9 },

  saveBar: { padding: 14, backgroundColor: '#fffdf7', borderColor: '#fde68a' },
  saveHint: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#0f172a', marginBottom: 11 },
  saveActions: { flexDirection: 'row', gap: 10 },
  discardBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  discardText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#64748b' },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: 11, backgroundColor: THEME },
  saveBtnBusy: { opacity: 0.7 },
  saveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },

  savedRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  savedText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginLeft: 9 },

  secondaryLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4, paddingVertical: 12, borderRadius: 11, backgroundColor: THEME + '12', borderWidth: 1, borderColor: THEME + '33' },
  secondaryLinkText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: THEME },
});
