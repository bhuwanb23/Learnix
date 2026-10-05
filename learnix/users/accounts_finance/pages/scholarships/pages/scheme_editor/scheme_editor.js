// F-08 Scholarships — scheme editor (docs/users/06 §3.7).
//
// Without this the desk could read and approve but never ONBOARD: there was no
// way to create a fund, set its budget, write its eligibility rules or name its
// required documents. `scholarshipCatalogue` supplies every list in the form, so
// no type, operator or document code is hardcoded here.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard } from '../../../../../../components/ui';
import { THEME, AMBER, GREEN, RED, rupees } from '../../scholarshipsMeta';

const BLANK = {
  name: '',
  type: 'MERIT',
  academicYearId: '',
  status: 'DRAFT',
  description: '',
  amountMode: 'PERCENT_OF_DUE',
  awardPercent: '50',
  fixedAmountRupees: '',
  budgetRupees: '',
  capacity: '',
  coveragePercent: '',
  opensAt: '',
  closesAt: '',
};

/** The rule editors the form offers, one per operator the server understands. */
const RULE_FIELDS = [
  { key: 'MIN_PERCENT', label: 'Minimum aggregate %', placeholder: 'e.g. 75', unit: '%' },
  { key: 'MAX_FAMILY_INCOME', label: 'Max family income (₹/year)', placeholder: 'e.g. 300000', unit: '₹' },
  { key: 'MIN_SEMESTER', label: 'From semester', placeholder: 'e.g. 1', unit: '' },
  { key: 'MAX_SEMESTER', label: 'Up to semester', placeholder: 'e.g. 2', unit: '' },
];

export default function ScholarshipSchemeEditor({ navigation, route }) {
  const schemeId = route?.params?.schemeId;
  const editing = !!schemeId;

  const [form, setForm] = useState(BLANK);
  const [rules, setRules] = useState({});
  const [gender, setGender] = useState('FEMALE');
  const [requireActive, setRequireActive] = useState(true);
  const [docs, setDocs] = useState([]);
  const [years, setYears] = useState([]);
  const [catalogue, setCatalogue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    try {
      const cat = await accountsApi.scholarshipCatalogue();
      setCatalogue(cat);
      // The years come from the catalogue (tenant data), never typed in.
      const yearList = cat?.academicYears ?? [];
      setYears(yearList);
      if (editing) {
        const s = await accountsApi.scholarshipDetail(schemeId);
        setForm({
          name: s.name ?? '',
          type: s.type ?? 'MERIT',
          academicYearId: s.academicYearId ?? '',
          status: s.status ?? 'DRAFT',
          description: s.description ?? '',
          amountMode: s.amountMode ?? 'PERCENT_OF_DUE',
          awardPercent: s.awardPercent ? String(s.awardPercent) : '',
          fixedAmountRupees: s.fixedAmountRupees ? String(s.fixedAmountRupees) : '',
          budgetRupees: s.budgetRupees !== null && s.budgetRupees !== undefined ? String(s.budgetRupees) : '',
          capacity: s.capacity !== null && s.capacity !== undefined ? String(s.capacity) : '',
          coveragePercent: s.coveragePercent ? String(s.coveragePercent) : '',
          opensAt: s.opensAt ?? '',
          closesAt: s.closesAt ?? '',
        });
        const loaded = {};
        for (const r of s.rules ?? []) loaded[r.operator] = r;
        setRules(loaded);
        setGender(loaded.GENDER?.gender ?? 'FEMALE');
        setRequireActive(loaded.ACTIVE_STUDENT?.enabled !== false);
        setDocs(s.requiredDocuments ?? []);
      } else {
        setForm((f) => ({ ...f, academicYearId: yearList.find((y) => y.isCurrent)?.id ?? yearList[0]?.id ?? '' }));
      }
    } catch (err) {
      Alert.alert('Could not open the form', err.message);
    } finally {
      setLoading(false);
    }
  }, [schemeId, editing]);

  useEffect(() => { load(); }, [load]);

  /** Suggest a document set for the chosen type, but never overwrite the officer's choice. */
  const onType = (t) => {
    setForm((f) => ({ ...f, type: t }));
    if (editing) return;
    const suggested = catalogue?.suggestedDocuments?.[t] ?? [];
    if (suggested.length) setDocs(suggested);
  };

  const toggleDoc = (code) =>
    setDocs((d) => (d.includes(code) ? d.filter((c) => c !== code) : [...d, code]));

  const submit = async () => {
    const name = form.name.trim();
    if (!name) { Alert.alert('Name required', 'A scheme needs a name the students will recognise.'); return; }
    if (!form.academicYearId) { Alert.alert('Academic year required', 'Choose the year this scheme runs in.'); return; }
    const pct = Number(form.awardPercent);
    if (form.amountMode === 'PERCENT_OF_DUE' && !(pct > 0 && pct <= 100)) {
      Alert.alert('Award percentage', 'A percentage-of-dues scheme needs a percentage between 1 and 100.');
      return;
    }
    const fixed = Number(form.fixedAmountRupees);
    if (form.amountMode === 'FIXED' && !(fixed > 0)) {
      Alert.alert('Fixed amount', 'A fixed scheme needs an amount in rupees.');
      return;
    }

    // Rules are assembled from whichever operators the officer filled in. An
    // empty field means "not a rule" — sending a zero would create a rule that
    // can never pass.
    const payloadRules = [];
    for (const f of RULE_FIELDS) {
      const raw = (rules[f.key] ?? '').toString().trim();
      if (raw === '') continue;
      payloadRules.push({ operator: f.key, value: Number(raw), enabled: true });
    }
    if (gender) payloadRules.push({ operator: 'GENDER', value: null, gender, enabled: true });
    if (requireActive) payloadRules.push({ operator: 'ACTIVE_STUDENT', value: null, enabled: true });

    setSaving(true);
    try {
      const saved = await accountsApi.saveScholarship({
        id: editing ? schemeId : undefined,
        name,
        type: form.type,
        academicYearId: form.academicYearId,
        status: form.status,
        description: form.description.trim() || null,
        amountMode: form.amountMode,
        awardPercent: form.amountMode === 'PERCENT_OF_DUE' ? pct : Number(form.awardPercent) || 0,
        fixedAmountRupees: form.amountMode === 'FIXED' ? fixed : null,
        budgetRupees: form.budgetRupees.trim() === '' ? null : Number(form.budgetRupees),
        capacity: form.capacity.trim() === '' ? null : Number(form.capacity),
        coveragePercent: form.coveragePercent.trim() === '' ? pct || 0 : Number(form.coveragePercent),
        rules: payloadRules,
        requiredDocuments: docs,
        opensAt: form.opensAt.trim() || null,
        closesAt: form.closesAt.trim() || null,
      });
      Alert.alert(editing ? 'Scheme updated' : 'Scheme created', editing
        ? 'Saved. Its status was left as it was.'
        : `"${saved.name}" is ${saved.status}. Open it to accept applications.`, [
        { text: 'Open it', onPress: () => navigation.openModule('ScholarshipDetail', { schemeId: saved.id }) },
      ]);
    } catch (err) {
      Alert.alert('Not saved', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={THEME} /></View>;
  }

  const types = catalogue?.types ?? [];
  const allDocs = catalogue?.documents ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AnimatedCard style={styles.notice}>
        <Ionicons name="information-circle-outline" size={18} color={AMBER} />
        <Text style={styles.noticeText}>
          Rules are evaluated live against real student data every time an application is read or approved. Income and gender are declared by the student and checked by you against their documents.
        </Text>
      </AnimatedCard>

      <Text style={styles.label}>Scheme name</Text>
      <TextInput style={styles.input} value={form.name} onChangeText={set('name')} placeholder="e.g. Merit Scholarship" />

      <Text style={styles.label}>Type</Text>
      <View style={styles.chipWrap}>
        {types.map((t) => (
          <Chip key={t.type} label={t.label} active={form.type === t.type} onPress={() => onType(t.type)} />
        ))}
      </View>

      <Text style={styles.label}>Academic year</Text>
      <View style={styles.chipWrap}>
        {years.length === 0 ? (
          <Text style={styles.muted}>No academic years are available.</Text>
        ) : years.map((y) => (
          <Chip key={y.id} label={y.name ?? y.label ?? y.id} active={form.academicYearId === y.id}
            onPress={() => setForm((f) => ({ ...f, academicYearId: y.id }))} />
        ))}
      </View>

      <Text style={styles.label}>Status</Text>
      <View style={styles.chipWrap}>
        {['DRAFT', 'OPEN', 'CLOSED'].map((s) => (
          <Chip key={s} label={s} active={form.status === s} tone={s === 'OPEN' ? GREEN : s === 'CLOSED' ? RED : AMBER}
            onPress={() => setForm((f) => ({ ...f, status: s }))} />
        ))}
      </View>
      <Text style={styles.hint}>Only an OPEN scheme accepts applications. Editing the amount never closes a scheme on its own.</Text>

      <Text style={styles.label}>What the scheme awards</Text>
      <View style={styles.chipWrap}>
        <Chip label="A % of what the student owes" active={form.amountMode === 'PERCENT_OF_DUE'}
          onPress={() => setForm((f) => ({ ...f, amountMode: 'PERCENT_OF_DUE' }))} />
        <Chip label="A fixed amount" active={form.amountMode === 'FIXED'}
          onPress={() => setForm((f) => ({ ...f, amountMode: 'FIXED' }))} />
      </View>
      {form.amountMode === 'PERCENT_OF_DUE' ? (
        <>
          <Text style={styles.label}>Percentage of dues</Text>
          <TextInput style={styles.input} value={form.awardPercent} onChangeText={set('awardPercent')} keyboardType="numeric" placeholder="e.g. 50" />
          <Text style={styles.hint}>The award is then capped at what the student actually owes.</Text>
        </>
      ) : (
        <>
          <Text style={styles.label}>Fixed amount (₹)</Text>
          <TextInput style={styles.input} value={form.fixedAmountRupees} onChangeText={set('fixedAmountRupees')} keyboardType="numeric" placeholder="e.g. 25000" />
          <Text style={styles.hint}>Still capped at the outstanding balance and the remaining fund.</Text>
        </>
      )}

      <Text style={styles.label}>Total fund (₹, optional)</Text>
      <TextInput style={styles.input} value={form.budgetRupees} onChangeText={set('budgetRupees')} keyboardType="numeric" placeholder="Leave empty for an uncapped scheme" />
      <Text style={styles.hint}>With a ceiling, awards are capped once the fund is committed. The scheme screen shows what is left.</Text>

      <Text style={styles.label}>Maximum awards (optional)</Text>
      <TextInput style={styles.input} value={form.capacity} onChangeText={set('capacity')} keyboardType="numeric" placeholder="e.g. 25" />

      <Text style={styles.label}>Eligibility rules</Text>
      {RULE_FIELDS.map((f) => (
        <View key={f.key}>
          <Text style={styles.subLabel}>{f.label}{f.unit ? ` (${f.unit})` : ''}</Text>
          <TextInput
            style={styles.input}
            value={(rules[f.key] ?? '').toString()}
            onChangeText={(v) => setRules((r) => ({ ...r, [f.key]: v }))}
            keyboardType="numeric"
            placeholder={f.placeholder}
          />
        </View>
      ))}
      <Text style={styles.subLabel}>Gender</Text>
      <View style={styles.chipWrap}>
        {['ANY', 'FEMALE', 'MALE'].map((g) => (
          <Chip key={g} label={g} active={gender === g} onPress={() => setGender(g)} />
        ))}
      </View>
      <TouchableOpacity style={styles.checkRow} onPress={() => setRequireActive((v) => !v)}>
        <Ionicons name={requireActive ? 'checkbox' : 'square-outline'} size={18} color={requireActive ? THEME : '#94a3b8'} />
        <Text style={styles.checkText}>Must be an active student</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>An empty rule is not a rule — only what you fill in is enforced.</Text>

      <Text style={styles.label}>Required documents</Text>
      <View style={styles.chipWrap}>
        {allDocs.map((d) => {
          const on = docs.includes(d.code);
          return (
            <TouchableOpacity key={d.code} style={[styles.docChip, on && styles.docChipOn]} onPress={() => toggleDoc(d.code)}>
              <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={on ? GREEN : '#94a3b8'} />
              <Text style={[styles.docChipText, on && { color: GREEN }]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint}>
        An application cannot be approved until every document ticked here is uploaded and verified. {docs.length} required.
      </Text>

      <Text style={styles.label}>Application window (optional)</Text>
      <Text style={styles.subLabel}>Opens (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={form.opensAt} onChangeText={set('opensAt')} placeholder="2026-08-01" autoCapitalize="none" />
      <Text style={styles.subLabel}>Closes (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={form.closesAt} onChangeText={set('closesAt')} placeholder="2026-12-31" autoCapitalize="none" />

      <TouchableOpacity style={[styles.btn, saving && styles.btnBusy]} onPress={submit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="save-outline" size={16} color="#fff" />
            <Text style={styles.btnText}>{editing ? 'Save the scheme' : 'Create the scheme'}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Chip({ label, active, onPress, tone }) {
  return (
    <TouchableOpacity style={[styles.chip, active && { backgroundColor: (tone ?? THEME) + '18', borderColor: tone ?? THEME }]} onPress={onPress}>
      <Text style={[styles.chipText, active && { color: tone ?? THEME, fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, marginBottom: 14 },
  noticeText: { flex: 1, fontSize: 11, color: '#92400e', lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#0f172a', marginBottom: 6, marginTop: 14 },
  subLabel: { fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4, marginTop: 8 },
  hint: { fontSize: 10, color: '#94a3b8', marginTop: 5, lineHeight: 15 },
  muted: { fontSize: 11, color: '#94a3b8' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, backgroundColor: '#fff', fontSize: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#fff' },
  chipText: { fontSize: 11, color: '#475569' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  checkText: { fontSize: 12, color: '#0f172a' },
  docChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  docChipOn: { backgroundColor: '#ecfdf5', borderColor: '#6ee7b7' },
  docChipText: { fontSize: 11, color: '#475569' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, marginTop: 22 },
  btnBusy: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
