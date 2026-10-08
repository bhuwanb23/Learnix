/**
 * Mess money, and the honest states that screen can be in.
 *
 * THIS IS NOT A SECOND LEDGER
 * ---------------------------
 * Every rupee here comes from the institution's single `Expense` table via Accounts' own
 * `listExpenses` / `vendorSpend` / `monthlyTrend`, filtered to the `MESS` category. A hostel-local
 * "mess expenses" table was rejected on purpose: two sources of financial truth can disagree with
 * each other, and then nobody can say which one the budget was measured against.
 *
 * A claim raised from here lands as `PENDING` and is approved by the accounts desk, not by its own
 * author. The pending total is shown SEPARATELY from the approved one, because "money we have spent"
 * and "money we have asked for" are different numbers and merging them is how a mess budget looks
 * healthy while it is actually unapproved.
 *
 * THE 403 IS ITS OWN STATE, NOT ₹0
 * ---------------------------------
 * This screen is behind the `hostel.mess.expenses` permission. A warden without it gets a 403, and
 * the failure mode to avoid is rendering that as a total of zero - a warden would conclude the
 * kitchen has spent nothing this year. So a 403 renders as an explanation with a pointer to the
 * permission, not as an amount.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { EmptyState } from '../../../../../components/ui';
import { SkeletonCard } from '../../../../../components/ui/SkeletonLoader';
import { hostelApi } from '../../../../../services/api';
import { fmtRupees, fmtRupeesCompact, fmtDayLabel, STATUS_TONE } from '../messMeta';

export default function ExpensesSheet({ visible, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [denied, setDenied] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const res = await hostelApi.messExpenses();
      setData(res.data);
    } catch (e) {
      // Distinguishing "you may not see this" from "it broke" is the whole point of this screen
      // existing honestly. A 403 must not look like an empty ledger.
      const status = e?.status ?? e?.response?.status;
      if (status === 403 || /permission/i.test(e?.message ?? '')) setDenied(true);
      else setError(e.message || 'Could not load mess spend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const afterRaise = () => {
    setFormOpen(false);
    load();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Mess spend</Text>
            {data && (
              <Text style={styles.subtitle}>
                Fiscal year {data.fiscalYear} · from the Accounts ledger
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {loading && !data ? (
          <ScrollView contentContainerStyle={styles.pad}>
            <SkeletonCard />
            <SkeletonCard />
          </ScrollView>
        ) : denied ? (
          <View style={styles.centered}>
            <EmptyState
              icon="lock-closed-outline"
              color="#b45309"
              title="Not allowed to see mess spend"
              subtitle="Mess money lives in the Accounts ledger. A hostel role needs the 'hostel.mess.expenses' permission — a platform admin can grant it from Roles & permissions, and it can be given separately from the rest of the hostel."
              actionLabel="Try again"
              onAction={load}
            />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <EmptyState
              icon="cloud-offline-outline"
              title="Could not load mess spend"
              subtitle={error}
              actionLabel="Try again"
              onAction={load}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.pad}>
            <View style={styles.summary}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{fmtRupeesCompact(data?.approvedRupees)}</Text>
                <Text style={styles.summaryLabel}>approved</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: '#d97706' }]}>
                  {fmtRupeesCompact(data?.pendingRupees)}
                </Text>
                <Text style={styles.summaryLabel}>awaiting approval</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{data?.claimCount ?? 0}</Text>
                <Text style={styles.summaryLabel}>claims</Text>
              </View>
            </View>

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={15} color="#0369a1" />
              <Text style={styles.noteText}>
                Anything raised here is a request. The accounts desk approves it — the hostel cannot
                approve its own spend.
              </Text>
            </View>

            {data?.vendors?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Vendors</Text>
                <View style={styles.card}>
                  {data.vendors.map((v) => {
                    const total = (v.approvedMinor ?? 0) + (v.pendingMinor ?? 0);
                    const pending = v.pendingMinor > 0;
                    return (
                      <View key={v.vendor} style={styles.vendorRow}>
                        <View style={styles.vendorBody}>
                          <Text style={styles.vendorName}>{v.vendor}</Text>
                          <Text style={styles.vendorMeta}>
                            {v.claimCount} claim{v.claimCount === 1 ? '' : 's'}
                            {pending ? ` · ${fmtRupeesCompact(v.pendingRupees ?? pending / 100)} pending` : ''}
                          </Text>
                        </View>
                        <Text style={styles.vendorAmount}>{fmtRupeesCompact(total / 100)}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.footnote}>
                  Vendors are grouped case-insensitively, so one supplier written two ways is one row
                  with one total.
                </Text>
              </>
            )}

            {data?.trend?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>By month</Text>
                <View style={styles.card}>
                  {data.trend.map((m) => (
                    <View key={m.month ?? m.key ?? m.label} style={styles.trendRow}>
                      <Text style={styles.trendMonth}>{m.label ?? m.month}</Text>
                      <Text style={styles.trendAmount}>{fmtRupees(m.approvedRupees ?? 0)}</Text>
                      <Text style={styles.trendCount}>{m.count ?? 0}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Claims</Text>
            {(data?.rows ?? []).length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>
                  No mess claims have been raised yet.
                </Text>
              </View>
            ) : (
              (data?.rows ?? []).map((r) => {
                const tone = STATUS_TONE[r.status] ?? { color: '#64748b', bg: '#f8fafc' };
                return (
                  <View key={r.id} style={styles.card}>
                    <View style={styles.claimTop}>
                      <View style={styles.claimBody}>
                        <Text style={styles.claimTitle}>{r.title}</Text>
                        <Text style={styles.claimMeta}>
                          {r.vendor ?? 'No vendor'} · {fmtDayLabel(String(r.date).slice(0, 10))}
                          {r.requestedBy ? ` · ${r.requestedBy}` : ''}
                        </Text>
                      </View>
                      <View style={styles.claimRight}>
                        <Text style={styles.claimAmount}>{fmtRupees(r.amountRupees)}</Text>
                        <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.statusText, { color: tone.color }]}>
                            {r.statusLabel ?? r.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {!denied && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setFormOpen(true)}>
              <Ionicons name="add" size={17} color="#fff" />
              <Text style={styles.addText}>Raise a mess expense</Text>
            </TouchableOpacity>
          </View>
        )}

        <RaiseForm visible={formOpen} onClose={() => setFormOpen(false)} onRaised={afterRaise} />
      </View>
    </Modal>
  );
}

/**
 * Raise a claim. The category is not a field here and is not accepted by the server either — it is
 * pinned to `MESS` in `raiseMessExpense`, so this form cannot be talked into filing a claim against
 * payroll or labs.
 */
function RaiseForm({ visible, onClose, onRaised }) {
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [method, setMethod] = useState('UPI');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setTitle('');
      setVendor('');
      setMethod('UPI');
    }
  }, [visible]);

  const rupees = Number(String(amount).replace(/[^0-9.]/g, ''));

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('What is it for?', 'Give the claim a short description.');
      return;
    }
    if (!rupees || rupees <= 0) {
      Alert.alert('Enter an amount', 'A claim must be for more than zero.');
      return;
    }
    try {
      setSaving(true);
      // Paise, because every amount in this system crosses the API as an integer (ADR-04).
      await hostelApi.raiseMessExpense({
        amountMinor: Math.round(rupees * 100),
        title: title.trim(),
        vendor: vendor.trim() || undefined,
        paymentMethod: method,
      });
      onRaised();
    } catch (e) {
      Alert.alert('Could not raise the claim', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const METHODS = ['UPI', 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD'];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.formBackdrop}>
        <View style={styles.formSheet}>
          <View style={styles.formHeader}>
            <Text style={styles.title}>Raise a mess expense</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="What did you buy?"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={160}
            />
            <TextInput
              style={styles.input}
              placeholder="Vendor (optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={vendor}
              onChangeText={setVendor}
              maxLength={120}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount in rupees"
              placeholderTextColor={theme.colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text style={styles.formLabel}>Paid by</Text>
            <View style={styles.methodRow}>
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, method === m && styles.methodChipActive]}
                  onPress={() => setMethod(m)}
                >
                  <Text
                    style={[styles.methodText, method === m && styles.methodTextActive]}
                  >
                    {m.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.footnote}>
              This files a request against the Mess &amp; kitchen budget. The accounts desk approves it,
              so it will show as “awaiting approval” until they do.
            </Text>

            <TouchableOpacity
              style={[styles.addBtn, saving && styles.addBtnIdle]}
              onPress={submit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addText}>Submit for approval</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
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
  pad: { paddingHorizontal: 16, paddingBottom: 24 },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },
  note: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  noteText: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Medium', color: '#0369a1' },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  vendorBody: { flex: 1 },
  vendorName: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  vendorMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  vendorAmount: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  trendMonth: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  trendAmount: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  trendCount: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    width: 40,
    textAlign: 'right',
  },
  claimTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  claimBody: { flex: 1 },
  claimTitle: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  claimMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  claimRight: { alignItems: 'flex-end' },
  claimAmount: {
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statusChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 9, fontFamily: 'Manrope-Bold' },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  footnote: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 10,
    lineHeight: 15,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  addBtnIdle: { backgroundColor: theme.colors.textMuted },
  addText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  formBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  formSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginBottom: 9,
  },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  methodChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
  },
  methodChipActive: { backgroundColor: theme.colors.primary },
  methodText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  methodTextActive: { color: '#fff' },
});