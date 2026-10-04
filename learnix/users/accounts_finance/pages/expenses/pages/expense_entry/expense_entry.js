// Expense entry — the form that records what the money went on
// (docs/users/06 §3.6 §1).
//
// The screen this replaces had no way to raise a claim at all: the only expenses
// in the app were seeded, so "expense entry and categorization" was a heading on
// a screen that could not do it. This is that form.
//
// Three decisions shape it:
//
//  1. THE AMOUNT IS TYPED IN RUPEES AND SENT IN PAISE. The server stores integer
//     paise and will not accept a float, so the conversion happens here, at the
//     one place a human touches the number. `Math.round(x * 100)` is not
//     cosmetic: ₹1234.565 typed by a thumb must not become 123456 paise.
//  2. CATEGORIES CARRY THEIR OWN HINT. Picking "Miscellaneous" is allowed, but
//     it says so and asks for a note, because an uncategorised ₹4L invoice is
//     the thing that makes a trend chart useless a year later.
//  3. THE RECEIPT IS OPTIONAL BUT VISIBLE. A claim with no receipt is the most
//     common reason an approver says no, so rather than silently accepting one
//     the form lets the claim be raised and states plainly that it will be sent
//     back. Blocking entry instead would push people back to a paper register.
//
// The budget line is picked, not guessed: the form loads the fiscal year's
// lines and defaults to the matching category's line, so a claim lands against
// the right budget without anyone hunting for it.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { accountsApi } from '../../../../../../services/api';
import {
  EXPENSE_CATEGORIES, PAYMENT_METHODS, rupees, categoryMeta,
  ACCEPTED_UPLOAD_TYPES, ACCEPTED_UPLOAD_LABEL, humanFileSize,
} from '../../expensesMeta';

const ACCENT = '#2563eb';

/** Rupees the user typed → integer paise the server stores. */
const toMinor = (rupeesStr) => Math.round((parseFloat(rupeesStr) || 0) * 100);

const CATEGORY_ALL = '__all__';
const DEPT_NONE = '__none__';
const BUDGET_NONE = '__none__';

/**
 * Validate before sending, so the officer gets a specific complaint about the
 * field rather than a 400 whose message came from a zod schema.
 * Returns a field→message map; empty means the form is submittable.
 */
function validate({ amount, category, vendor, note, date, method, ref, tax }) {
  const errors = {};
  if (!amount || amount.trim() === '') errors.amount = 'Enter what was paid';
  else if (!isFinite(parseFloat(amount)) || parseFloat(amount) <= 0) errors.amount = 'Must be more than zero';
  else if (parseFloat(amount) > 100000000) errors.amount = 'That looks like a typo';

  if (!category) errors.category = 'Pick a category';
  if (category === 'MISC' && !note?.trim()) {
    // Not a server requirement — an honest one. Misc is the bucket that swallows
    // anything nobody could place, and that only works if someone says why.
    errors.category = 'Miscellaneous needs a note saying what this was';
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Use YYYY-MM-DD';
  if (tax && (!isFinite(parseFloat(tax)) || parseFloat(tax) < 0)) errors.tax = 'Tax cannot be negative';
  if (!vendor?.trim() && method && method !== 'CASH') {
    errors.vendor = 'A non-cash payment needs a vendor to pay';
  }
  if (!ref?.trim() && method && method !== 'CASH') {
    errors.ref = 'A non-cash payment needs the bank or UPI reference';
  }
  return errors;
}

export default function ExpenseEntry({ navigation }) {
  const [form, setForm] = useState({
    amount: '',
    category: '',
    title: '',
    vendor: '',
    subcategory: '',
    note: '',
    departmentId: DEPT_NONE,
    budgetId: BUDGET_NONE,
    method: '',
    ref: '',
    tax: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [departments, setDepartments] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [fiscalYear, setFiscalYear] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear the error for a field as soon as it is touched — an error that
    // outlives its fix is the most irritating thing a form can do.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Both lists come from the same fiscal year, so the budget pickers
        // cannot offer a line that belongs to last year's budget.
        const [claims, budgetData] = await Promise.all([
          accountsApi.expenses({ take: 1 }),
          accountsApi.expenseBudgets(),
        ]);
        if (cancelled) return;
        setDepartments(claims.departments ?? []);
        setBudgets(budgetData.budgets ?? []);
        setFiscalYear(budgetData.fiscalYear ?? null);
      } catch (err) {
        if (!cancelled) Alert.alert('Could not load the form', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /** Choosing a category pre-selects its budget line for this fiscal year. */
  const onCategory = (id) => {
    setForm((f) => {
      const match = budgets.find((b) => b.category === id);
      return {
        ...f,
        category: id,
        // Only auto-pick when the line exists; otherwise leave the choice alone
        // rather than silently claiming against a line that isn't there.
        budgetId: match ? match.id : f.budgetId,
      };
    });
    setErrors((e) => ({ ...e, category: undefined }));
  };

  const pickReceipt = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      // Copy to cache so the uri stays readable after the picker closes — on
      // Android the original content:// uri is revoked, and the upload then
      // fails with a bare "no such file" some seconds later.
      copyToCacheDirectory: true,
      multiple: false,
      type: ACCEPTED_UPLOAD_TYPES,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;

    // Refuse locally for the two things the server would refuse anyway, so the
    // desk finds out before spending 8 MB of their mobile data.
    const type = asset.mimeType ?? '';
    if (type && !ACCEPTED_UPLOAD_TYPES.includes(type)) {
      Alert.alert('That file type will not upload', `${ACCEPTED_UPLOAD_LABEL}.`);
      return;
    }
    if (asset.size && asset.size > 8 * 1024 * 1024) {
      Alert.alert('That file is too large', `${humanFileSize(asset.size)} — the limit is 8 MB.`);
      return;
    }
    setReceipt({ uri: asset.uri, name: asset.name ?? 'receipt', type: type || 'image/jpeg', size: asset.size ?? 0 });
  }, []);

  const amountMinor = toMinor(form.amount);
  const taxMinor = toMinor(form.tax);

  const canSubmit = useMemo(
    () => amountMinor > 0 && !!form.category && !saving,
    [amountMinor, form.category, saving],
  );

  const submit = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      Alert.alert('Check the form', Object.values(found)[0]);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: form.category,
        amountMinor,
        ...(form.title.trim() ? { title: form.title.trim() } : {}),
        ...(form.vendor.trim() ? { vendor: form.vendor.trim() } : {}),
        ...(form.subcategory.trim() ? { subcategory: form.subcategory.trim() } : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
        ...(form.departmentId !== DEPT_NONE ? { departmentId: form.departmentId } : {}),
        ...(form.budgetId !== BUDGET_NONE ? { budgetId: form.budgetId } : {}),
        ...(form.method ? { paymentMethod: form.method } : {}),
        ...(form.ref.trim() ? { paymentReference: form.ref.trim() } : {}),
        ...(taxMinor > 0 ? { taxMinor } : {}),
        ...(form.date ? { date: form.date } : {}),
      };

      const created = await accountsApi.addExpense(payload);

      // The claim exists now; the receipt is a separate upload. If it fails the
      // claim is still there and can have its receipt attached from its detail
      // screen — so this is reported as a warning, never as a failed entry.
      if (receipt) {
        try {
          await accountsApi.attachExpenseDocument(created.id, receipt, 'RECEIPT');
        } catch (err) {
          Alert.alert(
            'Claim saved, receipt did not upload',
            `${err.message}\n\nOpen the claim to try the receipt again.`,
          );
          navigation.goBack();
          return;
        }
      }

      Alert.alert(
        'Claim raised',
        `${rupees(created.amountRupees)} is now awaiting approval${
          created.hasReceipt ? ', with its receipt attached' : ' — no receipt attached'
        }.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert('Could not save the claim', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading budget lines…</Text>
      </View>
    );
  }

  const chosen = categoryMeta(form.category);
  const selectedBudget = budgets.find((b) => b.id === form.budgetId) ?? null;

  // The budget list carries utilisation for what has ALREADY been approved. What
  // THIS claim would do to it is arithmetic on top of that, so it is computed
  // here rather than asked for: it depends on a number that does not exist yet,
  // and a "what-if" endpoint that re-runs on every keystroke would be a round
  // trip per digit for arithmetic the client can already do.
  const impact = (() => {
    if (!selectedBudget || amountMinor <= 0) return null;
    const planned = Number(selectedBudget.plannedRupees ?? 0);
    const spent = Number(selectedBudget.spentRupees ?? 0);
    const amount = amountMinor / 100;
    const after = spent + amount;
    const percentAfter = planned > 0 ? Math.round((after / planned) * 100) : 100;
    return {
      percentAfter,
      overspends: planned > 0 ? after > planned : after > 0,
      remainingAfter: planned - after,
    };
  })();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Amount ─────────────────────────────────────────── */}
        <Text style={styles.label}>Amount paid</Text>
        <View style={[styles.amountBox, errors.amount && styles.boxError]}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={form.amount}
            onChangeText={set('amount')}
            placeholder="0"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            // The leading ₹ already states the unit; a decimals pad would let
            // someone type ₹1.2 and wonder why it saved as ₹1.
            returnKeyType="done"
          />
        </View>
        {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}
        <Text style={styles.help}>
          Excludes tax, which is entered separately below so the net and the
          invoice total can be told apart.
        </Text>

        {form.tax !== '' && (
          <View style={styles.taxRow}>
            <Text style={styles.taxLabel}>Tax / GST included above</Text>
            <TextInput
              style={styles.taxInput}
              value={form.tax}
              onChangeText={set('tax')}
              placeholder="0"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
            />
          </View>
        )}
        {errors.tax ? <Text style={styles.errorText}>{errors.tax}</Text> : null}
        {taxMinor > 0 && amountMinor > taxMinor && (
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Net of tax</Text>
            <Text style={styles.netValue}>{rupees((amountMinor - taxMinor) / 100)}</Text>
          </View>
        )}

        {/* ── Category ───────────────────────────────────────── */}
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {EXPENSE_CATEGORIES.map((c) => {
            const on = form.category === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => onCategory(c.id)}
                activeOpacity={0.8}
                style={[styles.catChip, on && { backgroundColor: `${c.color}14`, borderColor: c.color }]}
              >
                <Ionicons name={c.icon} size={15} color={on ? c.color : '#64748b'} />
                <Text style={[styles.catChipText, on && { color: c.color }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
        {form.category && <Text style={styles.hintText}>{chosen.hint}</Text>}

        {/* ── Description ────────────────────────────────────── */}
        <Text style={styles.label}>What was it for</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={set('title')}
          placeholder="e.g. Oscilloscope probes, Physics lab"
          placeholderTextColor="#94a3b8"
          maxLength={160}
        />

        <Text style={styles.label}>Vendor</Text>
        <TextInput
          style={[styles.input, errors.vendor && styles.boxError]}
          value={form.vendor}
          onChangeText={set('vendor')}
          placeholder="Who was paid"
          placeholderTextColor="#94a3b8"
          maxLength={120}
        />
        {errors.vendor ? <Text style={styles.errorText}>{errors.vendor}</Text> : null}

        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.multiline, errors.category && form.category === 'MISC' && styles.boxError]}
          value={form.note}
          onChangeText={set('note')}
          placeholder={form.category === 'MISC' ? 'Required here — say what this was' : 'Anything the approver should know'}
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          maxLength={1000}
        />

        {/* ── Payment ────────────────────────────────────────── */}
        <Text style={styles.label}>How was it paid</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {PAYMENT_METHODS.map((m) => {
            const on = form.method === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => set('method')(on ? '' : m.id)}
                activeOpacity={0.8}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Ionicons name={m.icon} size={14} color={on ? '#fff' : '#64748b'} />
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!!form.method && form.method !== 'CASH' && (
          <>
            <Text style={styles.label}>Payment reference</Text>
            <TextInput
              style={[styles.input, errors.ref && styles.boxError]}
              value={form.ref}
              onChangeText={set('ref')}
              placeholder="UTR / cheque number / UPI ref"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              maxLength={120}
            />
            {errors.ref ? <Text style={styles.errorText}>{errors.ref}</Text> : null}
          </>
        )}

        {/* ── Department & budget ────────────────────────────── */}
        <Text style={styles.label}>Department</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <TouchableOpacity
            onPress={() => set('departmentId')(DEPT_NONE)}
            activeOpacity={0.8}
            style={[styles.chip, form.departmentId === DEPT_NONE && styles.chipOn]}
          >
            <Text style={[styles.chipText, form.departmentId === DEPT_NONE && styles.chipTextOn]}>Unassigned</Text>
          </TouchableOpacity>
          {departments.map((d) => {
            const on = form.departmentId === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                onPress={() => set('departmentId')(d.id)}
                activeOpacity={0.8}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{d.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>
          Budget line{fiscalYear ? ` · FY ${fiscalYear}` : ''}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <TouchableOpacity
            onPress={() => set('budgetId')(BUDGET_NONE)}
            activeOpacity={0.8}
            style={[styles.chip, form.budgetId === BUDGET_NONE && styles.chipOn]}
          >
            <Text style={[styles.chipText, form.budgetId === BUDGET_NONE && styles.chipTextOn]}>No budget</Text>
          </TouchableOpacity>
          {budgets.map((b) => {
            const on = form.budgetId === b.id;
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => set('budgetId')(b.id)}
                activeOpacity={0.8}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {categoryMeta(b.category).label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Live budget impact, so "can we afford this?" is answered while typing
            the amount rather than after the approver has said no. */}
        {impact && (
          <View style={[styles.impact, impact.overspends && styles.impactWarn]}>
            <Ionicons
              name={impact.overspends ? 'warning' : 'information-circle'}
              size={15}
              color={impact.overspends ? '#dc2626' : '#2563eb'}
            />
            <Text style={[styles.impactText, impact.overspends && { color: '#b91c1c' }]}>
              {selectedBudget.categoryLabel}: {rupees(selectedBudget.plannedRupees)} planned,{' '}
              {rupees(selectedBudget.spentRupees)} spent.{' '}
              {impact.overspends
                ? `This claim takes it to ${impact.percentAfter}% — over by ${rupees(Math.abs(impact.remainingAfter))}.`
                : `This claim takes it to ${impact.percentAfter}%.`}
            </Text>
          </View>
        )}
        {!selectedBudget && amountMinor > 0 && (
          <View style={[styles.impact, styles.impactWarn]}>
            <Ionicons name="warning" size={15} color="#d97706" />
            <Text style={[styles.impactText, { color: '#92400e' }]}>
              No budget line selected. The claim will still be accepted, but it
              will not count towards any budget.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={[styles.input, errors.date && styles.boxError]}
          value={form.date}
          onChangeText={set('date')}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}

        {/* ── Receipt ────────────────────────────────────────── */}
        <Text style={styles.label}>Receipt</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={pickReceipt} activeOpacity={0.85}>
          <Ionicons
            name={receipt ? 'document-attach' : 'cloud-upload-outline'}
            size={22}
            color={receipt ? '#059669' : '#64748b'}
          />
          <View style={styles.uploadText}>
            <Text style={styles.uploadTitle}>
              {receipt ? receipt.name : 'Attach the receipt'}
            </Text>
            <Text style={styles.uploadHint}>
              {receipt
                ? `${humanFileSize(receipt.size)} · ${receipt.type.split('/')[1]?.toUpperCase() ?? ''} · tap to change`
                : ACCEPTED_UPLOAD_LABEL}
            </Text>
          </View>
        </TouchableOpacity>
        {!receipt && (
          <Text style={styles.warnText}>
            A claim with no receipt is the most common thing sent back. You can
            raise it now and attach the receipt later from the claim.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.submit, !canSubmit && styles.submitOff]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              Raise {amountMinor > 0 ? rupees(amountMinor / 100) : 'claim'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748b', fontFamily: 'Manrope-Medium' },

  label: {
    fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 20,
  },
  input: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a',
    fontFamily: 'Manrope-Regular',
  },
  multiline: { minHeight: 84, textAlignVertical: 'top', paddingTop: 12 },
  boxError: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },

  amountBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14,
  },
  rupee: { fontSize: 24, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  amountInput: {
    flex: 1, fontSize: 28, fontWeight: '800', color: '#0f172a', paddingVertical: 14,
    fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5,
  },

  taxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  taxLabel: { flex: 1, fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  taxInput: {
    width: 96, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14,
    color: '#0f172a', fontFamily: 'Manrope-Regular', textAlign: 'right',
  },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  netLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  netValue: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },

  chipScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 12,
    paddingVertical: 8, marginRight: 8,
  },
  chipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  chipTextOn: { color: '#ffffff' },

  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, marginRight: 8,
  },
  catChipText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },

  help: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 8, lineHeight: 16 },
  hintText: {
    fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 8,
    lineHeight: 16, fontStyle: 'italic',
  },
  errorText: { fontSize: 11, color: '#dc2626', fontFamily: 'Manrope-SemiBold', marginTop: 6 },
  warnText: {
    fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Regular', marginTop: 8,
    lineHeight: 16,
  },

  impact: {
    flexDirection: 'row', gap: 8, backgroundColor: '#eff6ff', borderRadius: 10,
    padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#bfdbfe',
  },
  impactWarn: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  impactText: { flex: 1, fontSize: 11, color: '#1e40af', fontFamily: 'Manrope-Regular', lineHeight: 17 },

  uploadBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 12,
    padding: 14,
  },
  uploadText: { flex: 1 },
  uploadTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  uploadHint: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },

  submit: {
    backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginTop: 28,
  },
  submitOff: { backgroundColor: '#94a3b8' },
  submitText: { color: '#ffffff', fontSize: 15, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
