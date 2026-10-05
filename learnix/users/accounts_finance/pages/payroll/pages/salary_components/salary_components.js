// Allowance & deduction EDITOR for one salary version.
//
// The screen this replaces had no equivalent at all: the structure was a
// hard-coded 50/40/12 formula, so a principal's HRA and a peon's HRA were the
// same number because there was nothing to edit.
//
// Two rules this screen exists to enforce, both of them enforced by the SERVER
// rather than here:
//
//  1. A component is a RULE. "40% of basic", never a number someone multiplied by
//     hand — otherwise the next raise silently leaves every allowance at last
//     year's figure.
//  2. The structure must FOOT. The preview below is the server's own computation
//     for the current gross, and Save is refused server-side if the columns
//     would not add up. This screen shows that preview honestly, including the
//     warnings, rather than hiding the residue.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, StatusChip } from '../../../../../components/ui';
import {
  THEME, rupees, componentMeta, componentFormula, isPercentComponent,
  COMPONENT_CATALOG, COMPONENT_BASES, currentMonth,
} from '../../payrollSalaryMeta';

const Row = ({ label, value, tone, sub }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={[styles.rowValue, tone ? { color: tone } : null]}>{value}</Text>
      {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
    </View>
  </View>
);

/** One editable component row. Percent and flat are mutually exclusive. */
function ComponentRow({ comp, index, onChange, onRemove, removable }) {
  const meta = componentMeta(comp.code);
  const percent = isPercentComponent(comp);
  const earnings = meta.kind === 'EARNING';
  const tint = earnings ? '#059669' : '#dc2626';

  const setPercentOf = (base) =>
    onChange({ ...comp, percentOf: base, percent: comp.percent ?? meta.percent ?? 0, amountRupees: 0 });
  const setFlat = () =>
    onChange({ ...comp, percentOf: null, percent: null, amountRupees: comp.amountRupees ?? 0 });

  return (
    <View style={styles.compCard}>
      <View style={styles.compHead}>
        <Ionicons name={meta.icon} size={17} color={tint} />
        <View style={{ flex: 1 }}>
          <Text style={styles.compTitle}>{comp.label || meta.label}</Text>
          <Text style={styles.compHint}>{meta.hint}</Text>
        </View>
        {removable ? (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle-outline" size={19} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, percent && styles.modeBtnOn]}
          onPress={() => !percent && setPercentOf('BASIC')}
        >
          <Text style={[styles.modeText, percent && styles.modeTextOn]}>% of a base</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, !percent && styles.modeBtnOn]}
          onPress={() => (percent ? setFlat() : null)}
        >
          <Text style={[styles.modeText, !percent && styles.modeTextOn]}>Flat amount</Text>
        </TouchableOpacity>
      </View>

      {percent ? (
        <View style={styles.percentRow}>
          <View style={styles.basePicker}>
            {COMPONENT_BASES.map((base) => (
              <TouchableOpacity
                key={base}
                style={[styles.baseBtn, comp.percentOf === base && styles.baseBtnOn]}
                onPress={() => setPercentOf(base)}
              >
                <Text style={[styles.baseText, comp.percentOf === base && styles.baseTextOn]}>
                  {base === 'BASIC' ? 'of basic' : 'of gross'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.pctInput}>
            <TextInput
              style={styles.pctField}
              value={String(comp.percent ?? 0)}
              onChangeText={(v) => onChange({ ...comp, percent: Math.max(0, Math.min(500, Number(v.replace(/[^0-9]/g, '')) || 0)) })}
              keyboardType="numeric"
            />
            <Text style={styles.pctSign}>%</Text>
          </View>
        </View>
      ) : (
        <View style={styles.flatRow}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={styles.flatField}
            value={String(comp.amountRupees ?? 0)}
            onChangeText={(v) => onChange({ ...comp, amountRupees: Math.max(0, Number(v.replace(/[^0-9]/g, '')) || 0) })}
            keyboardType="numeric"
            placeholder="0"
          />
          <Text style={styles.perMonth}>per month</Text>
        </View>
      )}

      {comp.code !== 'TDS' && comp.code !== 'LOAN' ? (
        <TouchableOpacity
          style={styles.taxRow}
          onPress={() => onChange({ ...comp, isTaxable: !comp.isTaxable })}
        >
          <Ionicons name={comp.isTaxable ? 'checkbox' : 'square-outline'} size={17} color={comp.isTaxable ? THEME : '#94a3b8'} />
          <Text style={[styles.taxText, comp.isTaxable && { color: THEME, fontWeight: '700' }]}>
            Counted as taxable income (drives TDS)
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.computedNote}>
          <Ionicons name="lock-closed-outline" size={11} color="#94a3b8" />{' '}
          Computed from year-to-date income — this is never typed in.
        </Text>
      )}
    </View>
  );
}

export default function SalaryComponents({ navigation, route }) {
  const staffUserId = route?.params?.staffUserId;
  const salaryRecordId = route?.params?.salaryRecordId;
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await accountsApi.staffSalary(staffUserId, route?.params?.month ?? currentMonth());
      setData(res);
      const source = res?.inForce?.components ?? [];
      setDraft(source.map((c) => ({
        code: c.code,
        label: c.label,
        percentOf: c.percentOf,
        percent: c.percent,
        amountRupees: c.amountRupees,
        isTaxable: c.isTaxable,
        sequence: c.sequence,
      })));
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staffUserId, route?.params?.month]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const update = (index, next) => {
    setDraft(draft.map((c, i) => (i === index ? next : c)));
    setDirty(true);
  };
  const remove = (index) => {
    setDraft(draft.filter((_, i) => i !== index));
    setDirty(true);
  };
  const add = (code) => {
    const meta = componentMeta(code);
    setDraft([
      ...draft,
      {
        code,
        label: meta.label,
        percentOf: meta.base,
        percent: meta.percent ?? 0,
        amountRupees: 0,
        isTaxable: meta.taxable,
        sequence: draft.length,
      },
    ]);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = draft.map((c, i) => ({
        code: c.code,
        label: c.label,
        percentOf: c.percentOf,
        percent: c.percentOf ? c.percent : null,
        amountRupees: c.percentOf ? 0 : c.amountRupees,
        isTaxable: !!c.isTaxable,
        sequence: i,
      }));
      await accountsApi.saveSalaryComponents(salaryRecordId, payload);
      setDirty(false);
      await load();
      Alert.alert('Structure saved', 'Payslips raised from now on will use these rules.');
    } catch (err) {
      Alert.alert('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <SkeletonCard />
      </ScrollView>
    );
  }

  const preview = data?.preview;
  const warnings = data?.previewWarnings ?? [];
  const available = Object.keys(COMPONENT_CATALOG).filter((code) => !draft?.some((c) => c.code === code));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME} />}
      >
        {error ? (
          <AnimatedCard style={{ marginBottom: 12 }}>
            <Text style={{ color: '#dc2626' }}>{error}</Text>
          </AnimatedCard>
        ) : null}

        <AnimatedCard>
          <Text style={styles.cardTitle}>{data?.staff?.staffName}</Text>
          <Text style={styles.cardSub}>
            {data?.inForce
              ? `${rupees(data.inForce.monthlyGrossRupees)} gross · structure in force`
              : 'No salary version in force'}
          </Text>
        </AnimatedCard>

        {/* THE POINT: does the structure still foot? */}
        {preview ? (
          <AnimatedCard style={{ marginTop: 14 }}>
            <Text style={styles.previewTitle}>What this structure pays</Text>
            <Row label="Gross" value={rupees(preview.grossRupees)} />
            <Row label="Basic" value={rupees(preview.basicRupees)} sub={`Taxable ${rupees(preview.taxableRupees)}`} />
            <Row label="Deductions" value={rupees(preview.deductionsRupees)} tone="#dc2626" />
            <View style={styles.divider} />
            <Row label="Net pay" value={rupees(preview.netRupees)} tone="#059669" />
            <View style={styles.linesBox}>
              {preview.earnings.map((e) => (
                <View key={`e-${e.code}`} style={styles.lineRow}>
                  <Text style={styles.lineLabel}>+ {e.label}</Text>
                  <Text style={styles.lineAmt}>{rupees(e.amountRupees)}</Text>
                </View>
              ))}
              <View style={styles.thinLine} />
              {preview.deductions.map((d) => (
                <View key={`d-${d.code}`} style={styles.lineRow}>
                  <Text style={styles.lineLabel}>− {d.label}</Text>
                  <Text style={[styles.lineAmt, { color: '#dc2626' }]}>−{rupees(d.amountRupees)}</Text>
                </View>
              ))}
            </View>
            {warnings.length ? (
              <View style={styles.warnBox}>
                <Ionicons name="information-circle-outline" size={15} color="#d97706" />
                <Text style={styles.warnText}>{warnings.join(' ')}</Text>
              </View>
            ) : (
              <View style={styles.okBox}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
                <Text style={styles.okText}>The columns foot to the gross.</Text>
              </View>
            )}
          </AnimatedCard>
        ) : null}

        <Text style={styles.listTitle}>Components</Text>
        {!draft?.length ? (
          <EmptyState icon="options-outline" title="No components" message="Add at least one earning to build a payslip." />
        ) : (
          draft.map((c, i) => (
            <ComponentRow
              key={c.code}
              comp={c}
              index={i}
              onChange={(next) => update(i, next)}
              onRemove={() => remove(i)}
              removable={draft.length > 1}
            />
          ))
        )}

        {available.length ? (
          <AnimatedCard style={{ marginTop: 14 }}>
            <Text style={styles.addTitle}>Add a component</Text>
            <View style={styles.addWrap}>
              {available.map((code) => (
                <TouchableOpacity key={code} style={styles.addChip} onPress={() => add(code)}>
                  <Ionicons name={componentMeta(code).icon} size={13} color={THEME} />
                  <Text style={styles.addChipText}>{componentMeta(code).label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </AnimatedCard>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (!dirty || saving) && { opacity: 0.5 }]}
          onPress={save}
          disabled={!dirty || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{dirty ? 'Save structure' : 'No changes'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation.canGoBack?.() ? navigation.goBack() : navigation.goBack())}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 100 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: '#475569' },
  rowValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rowSub: { fontSize: 11, color: '#94a3b8' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  linesBox: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  lineLabel: { fontSize: 12, color: '#475569' },
  lineAmt: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  thinLine: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 },
  warnBox: { flexDirection: 'row', gap: 6, marginTop: 12, backgroundColor: '#fffbeb', padding: 10, borderRadius: 8 },
  warnText: { flex: 1, fontSize: 12, color: '#b45309' },
  okBox: { flexDirection: 'row', gap: 6, marginTop: 12, backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8 },
  okText: { flex: 1, fontSize: 12, color: '#047857' },
  listTitle: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 18, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  compCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  compHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  compHint: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  modeBtnOn: { backgroundColor: '#dbeafe' },
  modeText: { fontSize: 12, color: '#475569' },
  modeTextOn: { color: THEME, fontWeight: '700' },
  percentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  basePicker: { flex: 1, flexDirection: 'row', gap: 6 },
  baseBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  baseBtnOn: { backgroundColor: '#dbeafe', borderColor: THEME },
  baseText: { fontSize: 11, color: '#64748b' },
  baseTextOn: { color: THEME, fontWeight: '700' },
  pctInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10 },
  pctField: { width: 46, paddingVertical: 7, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pctSign: { fontSize: 13, color: '#94a3b8' },
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12 },
  rupee: { fontSize: 14, color: '#94a3b8' },
  flatField: { flex: 1, paddingVertical: 7, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  perMonth: { fontSize: 11, color: '#94a3b8' },
  taxRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  taxText: { fontSize: 12, color: '#475569' },
  computedNote: { fontSize: 11, color: '#94a3b8', marginTop: 12 },
  addTitle: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8 },
  addWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, backgroundColor: '#eff6ff' },
  addChipText: { fontSize: 12, color: THEME, fontWeight: '600' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: THEME, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  backBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  backText: { color: '#475569', fontWeight: '700' },
});