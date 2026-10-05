// F-04 Fee Structure — scholarship & concession rules (docs/users/06 §3.5.4).
//
// `Scholarship` records WHO got money. This screen records the POLICY — "50% off
// tuition for the top 5% of each batch", "full waiver of the exam fee for staff
// ward" — so that applying a concession is arithmetic against a written rule
// rather than a judgement call made under pressure at the counter. An award that
// cannot name the rule it came from cannot be defended at audit.
//
// The calculator is the reason the screen is worth more than a list. Pick a
// semester, tick the rules a student actually holds, and it shows the bill before
// and after, per line and in total. Without that, "50% merit" is a phrase and
// "₹60,000 off" is a guess.
//
// Three rules the arithmetic obeys, all enforced server-side as well:
//   · each rule is computed against the FULL eligible base, not against what is
//     left after the previous rule — independent entitlements must not shrink
//     depending on the order the desk typed them
//   · the SUM is capped at the bill — a student pays nothing, never less
//   · a concession is SCOPED. Waiving 50% of "everything" would quietly waive the
//     hostel bill of a student who was never living in the hostel.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  rupees, toMinor, concessionKindMeta, semesterShort,
  CONCESSION_KINDS, CONCESSION_BASES, CONCESSION_SCOPES, semesterOptions,
} from '../../feeStructureMeta';

const EMPTY = { name: '', kind: 'MERIT', basis: 'PERCENT', percent: '', amount: '', appliesTo: 'TUITION', semester: 0, enabled: true, note: '' };

export default function FeeStructureConcessions({ route, navigation }) {
  const id = route?.params?.id;
  const [detail, setDetail] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState([]);

  // The calculator: a semester to price and the rules a student actually holds.
  const [calcSemester, setCalcSemester] = useState(0);
  const [picked, setPicked] = useState(null); // null = every live rule
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, list] = await Promise.all([
        accountsApi.feeStructureDetail(id),
        accountsApi.feeConcessions(id),
      ]);
      setDetail(d);
      setRules(list.items ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const runPreview = useCallback(async (semester, chosen) => {
    try {
      setPreviewing(true);
      setPreview(await accountsApi.previewFeeConcessions(id, {
        semester: semester || undefined,
        ...(chosen ? { concessionIds: chosen } : {}),
      }));
    } catch (err) {
      Alert.alert('Could not calculate', err.message);
    } finally {
      setPreviewing(false);
    }
  }, [id]);

  // Recalculate whenever the selection changes, so the number on screen is never
  // the number from a previous selection.
  useEffect(() => {
    if (!loading) runPreview(calcSemester, picked);
  }, [calcSemester, picked, loading, runPreview]);

  // ── Form ────────────────────────────────────────────────
  const setField = (patch) => { setForm((f) => ({ ...f, ...patch })); setFormErrors([]); };

  const validate = () => {
    const errs = [];
    if (form.name.trim().length < 2) errs.push('Give the rule a name the office will recognise');
    if (form.basis === 'PERCENT') {
      const p = Number(form.percent);
      if (!Number.isFinite(p) || p <= 0) errs.push('A percentage concession needs a rate above zero');
      else if (p > 100) errs.push('A concession cannot exceed 100% of the eligible charges');
    } else if (!(Number(form.amount) > 0)) {
      errs.push('A flat concession needs an amount above zero');
    }
    return errs;
  };

  const save = useCallback(async () => {
    const errs = validate();
    if (errs.length) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        id: editingId ?? undefined,
        name: form.name.trim(),
        kind: form.kind,
        basis: form.basis,
        valueBp: form.basis === 'PERCENT' ? Math.round(Number(form.percent) * 100) : 0,
        amountMinor: form.basis === 'FLAT' ? toMinor(Number(form.amount)) : 0,
        appliesTo: form.appliesTo,
        semester: Number(form.semester) || 0,
        enabled: Boolean(form.enabled),
        note: form.note.trim() || undefined,
      };
      if (editingId) await accountsApi.updateFeeConcession(id, editingId, payload);
      else await accountsApi.createFeeConcession(id, payload);
      setForm(EMPTY);
      setEditingId(null);
      setPicked(null); // force a recalculation with the new rule in play
      await load();
    } catch (err) {
      setFormErrors([err.message]);
      Alert.alert('Could not save the rule', err.message);
    } finally {
      setSaving(false);
    }
  }, [form, editingId, id, load]);

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      kind: rule.kind,
      basis: rule.basis,
      percent: rule.basis === 'PERCENT' ? String(rule.valueBp / 100) : '',
      amount: rule.basis === 'FLAT' ? String(rule.amountRupees) : '',
      appliesTo: rule.appliesTo,
      semester: rule.semester ?? 0,
      enabled: rule.enabled,
      note: rule.note ?? '',
    });
    setFormErrors([]);
  };

  const cancelEdit = () => { setEditingId(null); setForm(EMPTY); setFormErrors([]); };

  const toggleEnabled = async (rule) => {
    try {
      await accountsApi.updateFeeConcession(id, rule.id, {
        name: rule.name, kind: rule.kind, basis: rule.basis,
        valueBp: rule.valueBp, amountMinor: toMinor(rule.amountRupees),
        appliesTo: rule.appliesTo, semester: rule.semester, enabled: !rule.enabled,
      });
      setPicked(null);
      await load();
    } catch (err) {
      Alert.alert('Could not switch it', err.message);
    }
  };

  const remove = (rule) => {
    Alert.alert('Delete this rule?', `“${rule.name}” will no longer be available to the desk.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await accountsApi.deleteFeeConcession(id, rule.id);
            setPicked(null);
            await load();
          } catch (err) {
            Alert.alert('Could not delete', err.message);
          }
        },
      },
    ]);
  };

  const liveCount = rules.filter((r) => r.enabled).length;
  const semesters = useMemo(() => semesterOptions(detail?.totalSemesters ?? 8), [detail?.totalSemesters]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading concession rules…</Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error ?? 'Not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onClick={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{detail.program.name}</Text>
        <Text style={styles.headerSub}>
          {detail.academicYear.name} · {liveCount} live rule{liveCount === 1 ? '' : 's'} of {rules.length}
        </Text>
        <Text style={styles.headerNote}>
          The written policy. Who actually received money is recorded separately, as a scholarship award.
        </Text>
      </View>

      {/* ── Calculator ── */}
      <View style={styles.calcCard}>
        <View style={styles.calcHead}>
          <Ionicons name="calculator-outline" size={14} color="#7c3aed" />
          <Text style={styles.calcTitle}>What does this student actually pay?</Text>
        </View>

        <Text style={styles.fieldLabel}>Which semester's bill?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {[{ value: 0, label: 'Whole year' }, ...semesters.filter((s) => s.value > 0)].map((s) => {
            const on = calcSemester === s.value;
            return (
              <TouchableOpacity key={s.value} onPress={() => setCalcSemester(s.value)} activeOpacity={0.8} style={[styles.chip, on && styles.chipOnPurple]}>
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{s.value === 0 ? 'Whole year' : `S${s.value}`}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.fieldLabel}>Which rules do they hold? (default: every live rule)</Text>
        {rules.length === 0 ? (
          <Text style={styles.noRules}>No rules written yet — the bill is the published fee.</Text>
        ) : (
          <View style={styles.pickBox}>
            {rules.map((r) => {
              const on = picked ? picked.includes(r.id) : r.enabled;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pickRow, on && styles.pickRowOn]}
                  activeOpacity={0.85}
                  onPress={() => setPicked((prev) => {
                    const current = prev ?? rules.filter((x) => x.enabled).map((x) => x.id);
                    return current.includes(r.id) ? current.filter((x) => x !== r.id) : [...current, r.id];
                  })}
                >
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={17} color={on ? '#7c3aed' : '#94a3b8'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickName, !r.enabled && styles.off]} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.pickValue}>{r.valueLabel}{r.semester > 0 ? ` · ${semesterShort(r.semester)} only` : ''}</Text>
                  </View>
                  {r.waiverRupees > 0 && <Text style={styles.pickWaiver}>−{rupees(r.waiverRupees)}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {previewing && <ActivityIndicator size="small" color="#7c3aed" style={{ marginTop: 10 }} />}

        {preview && (
          <View style={styles.resultBox}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{preview.semester ? `${preview.semesterLabel}'s bill` : "The year's bill"}</Text>
              <Text style={styles.resultBefore}>{rupees(preview.billRupees)}</Text>
            </View>
            {preview.applied.filter((a) => a.waiverRupees > 0).map((a) => (
              <View key={a.name} style={styles.resultRow}>
                <Text style={styles.resultWaiverLabel} numberOfLines={1}>− {a.name}</Text>
                <Text style={styles.resultWaiver}>{rupees(a.waiverRupees)}</Text>
              </View>
            ))}
            {preview.waiverRupees === 0 && <Text style={styles.resultNone}>No concession applies to this selection.</Text>}
            <View style={[styles.resultRow, styles.resultRowBold]}>
              <Text style={styles.resultBoldLabel}>Pays</Text>
              <Text style={styles.resultBold}>{rupees(preview.netRupees)}</Text>
            </View>

            {preview.applied.some((a) => a.overCap) && (
              <View style={styles.capWarn}>
                <Ionicons name="alert-circle-outline" size={13} color="#b45309" />
                <Text style={styles.capWarnText}>
                  {preview.applied.filter((a) => a.overCap).length} rule(s) ask for more than the charges are
                  worth. They give back only what exists.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Written rules ── */}
      <Text style={styles.listHead}>The rules on this structure</Text>
      {rules.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="ribbon-outline" size={30} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No concession rules yet</Text>
          <Text style={styles.emptyText}>
            Without a written rule, every concession is a fresh negotiation at the counter. Write the policy once.
          </Text>
        </View>
      ) : (
        rules.map((r) => {
          const km = concessionKindMeta(r.kind);
          return (
            <View key={r.id} style={[styles.ruleCard, !r.enabled && styles.ruleCardOff]}>
              <View style={styles.ruleHead}>
                <View style={styles.ruleIcon}>
                  <Ionicons name={km.icon} size={15} color={r.enabled ? '#7c3aed' : '#94a3b8'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleName, !r.enabled && styles.off]} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.ruleKind}>{km.label} · {r.basis === 'PERCENT' ? `${r.valueBp / 100}%` : rupees(r.amountRupees)}</Text>
                </View>
                <Text style={[styles.ruleWaiver, !r.enabled && styles.off]}>
                  {r.enabled ? `−${rupees(r.waiverRupees)}` : 'off'}
                </Text>
              </View>

              <Text style={styles.ruleValue}>{r.valueLabel}{r.semester > 0 ? ` · ${semesterShort(r.semester)} only` : ''}</Text>
              {r.eligibleRupees > 0 && (
                <Text style={styles.ruleBase}>
                  On {rupees(r.eligibleRupees)} of eligible charges, that is {rupees(r.waiverRupees)} off.
                </Text>
              )}
              {r.note ? <Text style={styles.ruleNote} numberOfLines={2}>{r.note}</Text> : null}

              <View style={styles.ruleActions}>
                <TouchableOpacity onPress={() => toggleEnabled(r)} activeOpacity={0.85}>
                  <Text style={styles.ruleAction}>{r.enabled ? 'Switch off' : 'Switch on'}</Text>
                </TouchableOpacity>
                <Text style={styles.ruleDot}>·</Text>
                <TouchableOpacity onPress={() => startEdit(r)} activeOpacity={0.85}>
                  <Text style={styles.ruleAction}>Edit</Text>
                </TouchableOpacity>
                <Text style={styles.ruleDot}>·</Text>
                <TouchableOpacity onPress={() => remove(r)} activeOpacity={0.85}>
                  <Text style={[styles.ruleAction, { color: '#dc2626' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* ── Editor ── */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? 'Edit the rule' : 'Write a new rule'}</Text>

        <Text style={styles.fieldLabel}>What is it called?</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(t) => setField({ name: t })}
          placeholder="e.g. Merit scholarship — top 5% of batch"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.fieldLabel}>What kind of concession?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CONCESSION_KINDS.map((k) => {
            const on = form.kind === k.id;
            return (
              <TouchableOpacity key={k.id} onPress={() => setField({ kind: k.id })} activeOpacity={0.8} style={[styles.chip, on && styles.chipOnPurple]}>
                <Ionicons name={k.icon} size={12} color={on ? '#fff' : '#64748b'} />
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{k.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={styles.hint}>{concessionKindMeta(form.kind).hint}</Text>

        <Text style={styles.fieldLabel}>Percentage or a flat amount?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CONCESSION_BASES.map((b) => {
            const on = form.basis === b.id;
            return (
              <TouchableOpacity key={b.id} onPress={() => setField({ basis: b.id })} activeOpacity={0.8} style={[styles.chip, on && styles.chipOnPurple]}>
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{b.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {form.basis === 'PERCENT' ? (
          <>
            <Text style={styles.fieldLabel}>Percentage off (%)</Text>
            <TextInput
              style={styles.input}
              value={form.percent}
              onChangeText={(t) => setField({ percent: t.replace(/[^0-9.]/g, '') })}
              placeholder="50"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>{Math.round(Number(form.percent || 0) * 100)} basis points, sent as an integer.</Text>
          </>
        ) : (
          <>
            <Text style={styles.fieldLabel}>Amount off (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.amount}
              onChangeText={(t) => setField({ amount: t.replace(/[^0-9.]/g, '') })}
              placeholder="20000"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>{toMinor(Number(form.amount || 0))} paise. It cannot be more than the charges it applies to.</Text>
          </>
        )}

        <Text style={styles.fieldLabel}>What may it come off?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CONCESSION_SCOPES.map((s) => {
            const on = form.appliesTo === s.id;
            return (
              <TouchableOpacity key={s.id} onPress={() => setField({ appliesTo: s.id })} activeOpacity={0.8} style={[styles.chip, on && styles.chipOnPurple]}>
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={styles.hint}>
          Scoping is deliberate. “Everything” would quietly waive the hostel bill of a student who was never
          living in the hostel.
        </Text>

        <Text style={styles.fieldLabel}>Which semester? (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {semesters.map((s) => {
            const on = Number(form.semester) === s.value;
            return (
              <TouchableOpacity key={s.value} onPress={() => setField({ semester: s.value })} activeOpacity={0.8} style={[styles.chip, on && styles.chipOnPurple]}>
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.fieldLabel}>Note for whoever applies this</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={form.note}
          onChangeText={(t) => setField({ note: t })}
          placeholder="Who qualifies, and against what evidence?"
          placeholderTextColor="#94a3b8"
          multiline
        />

        {formErrors.length > 0 && (
          <View style={styles.errorBox}>
            {formErrors.map((e) => <Text key={e} style={styles.errorText}>· {e}</Text>)}
          </View>
        )}

        <View style={styles.formActions}>
          {editingId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} activeOpacity={0.85}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveBtnText}>{editingId ? 'Save the change' : 'Write the rule'}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={15} color="#7c3aed" />
        <Text style={[styles.backText, { color: '#7c3aed' }]}>Back to the structure</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },

  header: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  headerSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  headerNote: { fontSize: 11, color: '#7c3aed', fontFamily: 'Manrope-Regular', marginTop: 6, lineHeight: 16 },

  calcCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#ede9fe', marginBottom: 14 },
  calcHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calcTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-SemiBold', marginTop: 10, marginBottom: 5 },
  chipScroll: { marginBottom: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  chipOnPurple: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium' },
  hint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 14 },

  noRules: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 6 },
  pickBox: { marginTop: 4 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 5, backgroundColor: '#f8fafc' },
  pickRowOn: { borderColor: '#ddd6fe', backgroundColor: '#faf5ff' },
  pickName: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  pickValue: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  pickWaiver: { fontSize: 12, fontWeight: '700', color: '#7c3aed', fontFamily: 'Manrope-Bold' },
  off: { color: '#94a3b8', textDecorationLine: 'line-through' },

  resultBox: { marginTop: 10, backgroundColor: '#faf5ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ddd6fe' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  resultRowBold: { borderTopWidth: 1, borderTopColor: '#ddd6fe', marginTop: 6, paddingTop: 8 },
  resultLabel: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular' },
  resultBefore: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  resultWaiverLabel: { flex: 1, fontSize: 11, color: '#7c3aed', fontFamily: 'Manrope-Regular' },
  resultWaiver: { fontSize: 11, fontWeight: '700', color: '#7c3aed', fontFamily: 'Manrope-Bold' },
  resultNone: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', paddingVertical: 4 },
  resultBoldLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  resultBold: { fontSize: 17, fontWeight: '800', color: '#7c3aed', fontFamily: 'PlusJakartaSans-Bold' },
  capWarn: { flexDirection: 'row', gap: 6, marginTop: 8, backgroundColor: '#fffbeb', borderRadius: 8, padding: 8 },
  capWarnText: { flex: 1, fontSize: 10, color: '#b45309', fontFamily: 'Manrope-Regular', lineHeight: 15 },

  listHead: { fontSize: 12, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold', marginBottom: 8 },
  ruleCard: { backgroundColor: '#fff', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 9 },
  ruleCardOff: { backgroundColor: '#fafafa', borderColor: '#f1f5f9' },
  ruleHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  ruleIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  ruleName: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  ruleKind: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  ruleWaiver: { fontSize: 13, fontWeight: '800', color: '#7c3aed', fontFamily: 'PlusJakartaSans-Bold' },
  ruleValue: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 8 },
  ruleBase: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 3, lineHeight: 15 },
  ruleNote: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 4, fontStyle: 'italic', lineHeight: 15 },
  ruleActions: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  ruleAction: { fontSize: 11, fontWeight: '700', color: '#7c3aed', fontFamily: 'Manrope-SemiBold' },
  ruleDot: { fontSize: 11, color: '#cbd5e1' },

  empty: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 14 },
  emptyTitle: { marginTop: 8, fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  emptyText: { marginTop: 5, fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center', paddingHorizontal: 26, lineHeight: 17 },

  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7' },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  input: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  inputMulti: { minHeight: 60, textAlignVertical: 'top' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginTop: 10 },
  errorText: { fontSize: 11, color: '#b91c1c', fontFamily: 'Manrope-Regular', lineHeight: 16 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  saveBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  backText: { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});