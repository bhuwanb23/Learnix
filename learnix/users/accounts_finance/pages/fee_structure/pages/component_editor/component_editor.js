// F-04 Fee Structure — the charge-line editor (docs/users/06 §3.5.1).
//
// Editing is a REPLACEMENT, not a patch, and the screen says so before the
// officer presses Save: the version history records what the structure was on a
// given day, and a patch list could not tell "removed" from "never existed".
// `expectedVersionId` goes with it, so an edit made while someone else published
// fails loudly instead of silently discarding their changes.
//
// The running total is computed HERE as well as on the server, which is
// deliberate: the officer must see the total move as they type, and the server
// recomputes and owns the stored figure. The Save response reports the real
// delta, so if the two ever disagree the officer sees which lines moved rather
// than discovering it on a printed bill.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  rupees, toMinor, kindMeta, semesterLabel, semesterOptions, THEME, KIND_IDS,
} from '../../feeStructureMeta';

const EMPTY = { kind: 'TUITION', label: '', amount: '', semester: 0, optional: false, firstYearOnly: false };

export default function FeeStructureEditor({ route, navigation }) {
  const id = route?.params?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState([]);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const detail = await accountsApi.feeStructureDetail(id);
      setData(detail);
      setLines(
        (detail.components ?? []).map((c) => ({
          kind: c.kind,
          label: c.label,
          amount: String(c.amountRupees),
          semester: c.semester ?? 0,
          optional: Boolean(c.optional),
          firstYearOnly: Boolean(c.firstYearOnly),
        })),
      );
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Local validation, mirroring validateComponents() on the server ──
  // Duplicated rather than asked for so the officer sees every problem while
  // typing instead of discovering them one Save at a time.
  const problems = useMemo(() => {
    const out = [];
    if (!lines.length) return ['A fee structure needs at least one charge line'];
    const seen = new Set();
    lines.forEach((l, i) => {
      const label = l.label.trim() || l.kind;
      if (!KIND_IDS.includes(l.kind)) out.push(`Line ${i + 1}: "${label}" is not a recognised charge type`);
      if (!l.label.trim()) out.push(`Line ${i + 1}: a ${l.kind} charge needs a name the student will recognise`);
      const amt = Number(l.amount);
      if (!Number.isFinite(amt) || amt < 0) out.push(`Line ${i + 1}: ${label} cannot be negative`);
      else if (amt === 0) out.push(`Line ${i + 1}: ${label} is zero — remove the line or price it`);
      const max = data?.totalSemesters ?? 0;
      if (max > 0 && Number(l.semester) > max) {
        out.push(`Line ${i + 1}: ${label} is booked to semester ${l.semester}, which this program does not have`);
      }
      const key = `${l.kind}|${l.semester}|${l.label.trim().toLowerCase()}`;
      if (seen.has(key)) out.push(`Line ${i + 1}: ${label} is listed twice for ${semesterLabel(Number(l.semester))}`);
      seen.add(key);
    });
    if (!lines.some((l) => l.kind === 'TUITION')) out.push('There is no tuition line — the headline tuition figure would be zero');
    return out;
  }, [lines, data?.totalSemesters]);

  // A live preview of what the officer is about to save. Mirrors the server's
  // roll-up so the number under their finger is the number that gets stored.
  const preview = useMemo(() => {
    let tuition = 0;
    let other = 0;
    let optional = 0;
    for (const l of lines) {
      const minor = toMinor(Number(l.amount) || 0);
      if (l.kind === 'TUITION') tuition += minor;
      else other += minor;
      if (l.optional) optional += minor;
    }
    return {
      tuition: Math.round(tuition / 100),
      other: Math.round(other / 100),
      total: Math.round((tuition + other) / 100),
      optional: Math.round(optional / 100),
    };
  }, [lines]);

  const originalTotal = data?.totalRupees ?? 0;
  const delta = preview.total - originalTotal;

  const update = (index, patch) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    setDirty(true);
  };

  const move = (index, dir) => {
    setLines((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const addLine = () => {
    setLines((prev) => [...prev, { ...EMPTY }]);
    setDirty(true);
  };

  const removeLine = (index) => {
    Alert.alert('Remove this charge line?', 'It will be gone from the structure the next time you save.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { setLines((prev) => prev.filter((_, i) => i !== index)); setDirty(true); } },
    ]);
  };

  const save = useCallback(async () => {
    if (problems.length) {
      Alert.alert('Not ready to save', problems.slice(0, 3).join('\n'));
      return;
    }
    const changed = lines.filter((l, i) => {
      const was = data?.components?.[i];
      if (!was) return true;
      return was.label !== l.label.trim()
        || was.kind !== l.kind
        || was.amountRupees !== Number(l.amount)
        || was.semester !== Number(l.semester)
        || Boolean(was.optional) !== Boolean(l.optional)
        || Boolean(was.firstYearOnly) !== Boolean(l.firstYearOnly);
    }).length;

    if (!changed) {
      Alert.alert('Nothing has changed', 'No new version would be created.');
      return;
    }

    setSaving(true);
    try {
      const result = await accountsApi.replaceFeeComponents(id, {
        components: lines.map((l) => ({
          kind: l.kind,
          label: l.label.trim(),
          amountMinor: toMinor(Number(l.amount)),
          semester: Number(l.semester) || 0,
          optional: Boolean(l.optional),
          firstYearOnly: Boolean(l.firstYearOnly),
        })),
        expectedVersionId: data?.versions?.find((v) => v.isCurrent)?.id ?? null,
      });
      Alert.alert(
        'Structure saved',
        `${result.changed} line${result.changed === 1 ? '' : 's'} changed. ${rupees(result.totalBeforeRupees)} → ${rupees(result.totalAfterRupees)}.`,
        [
          { text: 'Stay here', style: 'cancel' },
          { text: 'Version history', onPress: () => navigation.navigate('FeeStructureVersions', { id }) },
        ],
      );
      await load();
    } catch (err) {
      Alert.alert('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  }, [lines, problems, id, data, load, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME} />
        <Text style={styles.loadingText}>Loading charge lines…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error ?? 'Structure not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const semesters = semesterOptions(data.totalSemesters);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} colors={[THEME]} />}
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>{data.program.name} · {data.academicYear.name}</Text>
          <Text style={styles.introText}>
            Saving replaces the whole set of charge lines and records the change as a new version. That is what
            makes "what did this cost last year" answerable — a line-by-line patch would not.
          </Text>
        </View>

        {lines.map((line, index) => {
          const meta = kindMeta(line.kind);
          const bad = problems.filter((p) => p.startsWith(`Line ${index + 1}:`));
          return (
            <View key={index} style={[styles.lineCard, bad.length > 0 && styles.lineCardBad]}>
              <View style={styles.lineHead}>
                <View style={[styles.lineIcon, { backgroundColor: `${meta.color}14` }]}>
                  <Ionicons name={meta.icon} size={15} color={meta.color} />
                </View>
                <Text style={styles.lineNo}>Line {index + 1}</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => move(index, -1)} disabled={index === 0} style={styles.moveBtn}>
                  <Ionicons name="arrow-up" size={14} color={index === 0 ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => move(index, 1)} disabled={index === lines.length - 1} style={styles.moveBtn}>
                  <Ionicons name="arrow-down" size={14} color={index === lines.length - 1 ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeLine(index)} style={styles.moveBtn}>
                  <Ionicons name="trash-outline" size={14} color="#dc2626" />
                </TouchableOpacity>
              </View>

              {/* Charge type */}
              <Text style={styles.fieldLabel}>Charge type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kindScroll}>
                {KIND_IDS.map((k) => {
                  const km = kindMeta(k);
                  const on = line.kind === k;
                  return (
                    <TouchableOpacity
                      key={k}
                      onPress={() => update(index, { kind: k })}
                      activeOpacity={0.8}
                      style={[styles.kindChip, on && { backgroundColor: km.color, borderColor: km.color }]}
                    >
                      <Ionicons name={km.icon} size={12} color={on ? '#fff' : '#64748b'} />
                      <Text style={[styles.kindChipText, on && { color: '#fff' }]}>{km.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.hint}>{meta.hint}</Text>

              {/* Name */}
              <Text style={styles.fieldLabel}>What the student sees</Text>
              <TextInput
                style={styles.input}
                value={line.label}
                onChangeText={(t) => update(index, { label: t })}
                placeholder="e.g. Semester 3 tuition"
                placeholderTextColor="#94a3b8"
              />

              {/* Amount — rupees in, paise on the wire */}
              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={line.amount}
                onChangeText={(t) => update(index, { amount: t.replace(/[^0-9.]/g, '') })}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
              {Number(line.amount) > 0 && (
                <Text style={styles.hint}>{toMinor(Number(line.amount))} paise · sent as an integer, never a float</Text>
              )}

              {/* Semester */}
              <Text style={styles.fieldLabel}>Applies to</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kindScroll}>
                {semesters.map((s) => {
                  const on = Number(line.semester) === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      onPress={() => update(index, { semester: s.value })}
                      activeOpacity={0.8}
                      style={[styles.kindChip, on && styles.kindChipOn]}
                    >
                      <Text style={[styles.kindChipText, on && { color: '#fff' }]}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Flags */}
              <TouchableOpacity style={styles.checkRow} onPress={() => update(index, { optional: !line.optional })} activeOpacity={0.85}>
                <Ionicons name={line.optional ? 'checkbox' : 'square-outline'} size={17} color={line.optional ? '#b45309' : '#94a3b8'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkLabel}>Optional charge</Text>
                  <Text style={styles.checkHint}>Only students who take it pay it. Excluded from the headline.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.checkRow} onPress={() => update(index, { firstYearOnly: !line.firstYearOnly })} activeOpacity={0.85}>
                <Ionicons name={line.firstYearOnly ? 'checkbox' : 'square-outline'} size={17} color={line.firstYearOnly ? '#0369a1' : '#94a3b8'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkLabel}>Joining year only</Text>
                  <Text style={styles.checkHint}>Charged in the admission year only, not every year of the degree.</Text>
                </View>
              </TouchableOpacity>

              {bad.length > 0 && (
                <View style={styles.lineProblems}>
                  {bad.map((p) => (
                    <Text key={p} style={styles.lineProblemText}>· {p.replace(`Line ${index + 1}: `, '')}</Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.addBtn} onPress={addLine} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={17} color={THEME} />
          <Text style={styles.addBtnText}>Add a charge line</Text>
        </TouchableOpacity>

        {/* Live total */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>What this will save</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Tuition</Text>
            <Text style={styles.previewValue}>{rupees(preview.tuition)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>All other charges</Text>
            <Text style={styles.previewValue}>{rupees(preview.other)}</Text>
          </View>
          <View style={[styles.previewRow, styles.previewRowBold]}>
            <Text style={styles.previewLabelBold}>New total</Text>
            <Text style={styles.previewValueBold}>{rupees(preview.total)}</Text>
          </View>
          {delta !== 0 && (
            <Text style={[styles.previewDelta, delta > 0 ? styles.deltaUp : styles.deltaDown]}>
              {delta > 0 ? '+' : '−'}{rupees(Math.abs(delta))} against the published {rupees(originalTotal)}
            </Text>
          )}
          {preview.optional > 0 && (
            <Text style={styles.previewNote}>
              {rupees(preview.optional)} of that is optional and will not be in the headline total.
            </Text>
          )}
        </View>

        {problems.length > 0 && (
          <View style={styles.problemBox}>
            <View style={styles.problemHead}>
              <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
              <Text style={styles.problemTitle}>{problems.length} thing{problems.length === 1 ? '' : 's'} to fix</Text>
            </View>
            {problems.map((p) => <Text key={p} style={styles.problemText}>· {p}</Text>)}
          </View>
        )}

        {dirty && problems.length === 0 && (
          <View style={styles.okBox}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
            <Text style={styles.okText}>Ready to save. A new version will record the change.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={load} disabled={saving}>
          <Text style={styles.cancelText}>{dirty ? 'Discard changes' : 'Reload'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || problems.length > 0) && styles.saveBtnOff]}
          onPress={save}
          disabled={saving || problems.length > 0}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save as new version</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },

  intro: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  introTitle: { fontSize: 13, fontWeight: '700', color: '#1e3a8a', fontFamily: 'Manrope-SemiBold' },
  introText: { fontSize: 11, color: '#1e40af', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 16 },

  lineCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eef2f7' },
  lineCardBad: { borderColor: '#fecaca', backgroundColor: '#fffbfb' },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  lineIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  lineNo: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  moveBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-SemiBold', marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  hint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 14 },

  kindScroll: { marginBottom: 2 },
  kindChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  kindChipOn: { backgroundColor: THEME, borderColor: THEME },
  kindChipText: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium' },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  checkLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  checkHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1, lineHeight: 14 },

  lineProblems: { marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 8, padding: 9 },
  lineProblemText: { fontSize: 10, color: '#b91c1c', fontFamily: 'Manrope-Medium', lineHeight: 15 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 13 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  previewCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 4, borderWidth: 1, borderColor: '#eef2f7' },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold', marginBottom: 8 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  previewRowBold: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 4, paddingTop: 8 },
  previewLabel: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular' },
  previewLabelBold: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  previewValue: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  previewValueBold: { fontSize: 15, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  previewDelta: { fontSize: 11, fontFamily: 'Manrope-Medium', marginTop: 6 },
  deltaUp: { color: '#dc2626' },
  deltaDown: { color: '#059669' },
  previewNote: { fontSize: 10, color: '#b45309', fontFamily: 'Manrope-Regular', marginTop: 4 },

  problemBox: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#fecaca' },
  problemHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  problemTitle: { fontSize: 12, fontWeight: '700', color: '#b91c1c', fontFamily: 'Manrope-SemiBold' },
  problemText: { fontSize: 11, color: '#b91c1c', fontFamily: 'Manrope-Regular', lineHeight: 16 },
  okBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginTop: 12 },
  okText: { flex: 1, fontSize: 11, color: '#065f46', fontFamily: 'Manrope-Medium' },

  footer: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center' },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  saveBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME, borderRadius: 12, paddingVertical: 13 },
  saveBtnOff: { backgroundColor: '#93b4f5' },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});