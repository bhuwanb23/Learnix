// Vendors — payment records (docs/users/06 §3.6 §4).
//
// "Vendor/payment records" is really two questions wearing one name, and the
// old screen answered neither: WHO do we pay, and HOW did each one get paid.
// This screen answers both from the same roll-up, because the second question is
// the interesting one — a vendor paid entirely in cash, or with no bank
// reference on any approved claim, is a conversation the finance head should be
// having before the next tender, not at audit.
//
// CONCENTRATION IS THE HEADLINE. One vendor holding 40% of spend is the finding
// that changes a purchase decision, so it is stated in words rather than left
// for someone to divide two numbers they can see.
//
// Vendor names are normalised on the way IN (whitespace collapsed) so that
// "Syslab  Instruments" and "Syslab Instruments" are one vendor and not two —
// without that, this roll-up is a lie dressed as a report.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  rupees, compactRupees, formatDate, categoryMeta, paymentMethodMeta,
  fiscalYearLabel, missingReferenceHint, THEME,
} from '../expensesMeta';

export default function Vendors() {
  const [data, setData] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [claimsLoading, setClaimsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.vendorSpend(year ? { fiscalYear: year } : {});
      setData(result);
      if (!year) setYear(result.fiscalYear);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  /**
   * Open one vendor's actual claims.
   *
   * The roll-up tells you a vendor cost ₹8.4L this year; it cannot tell you
   * whether one invoice was ₹7L or forty were ₹21K. Those are different vendors
   * of risk wearing the same total, so the claims behind a row are one tap away.
   */
  const openVendor = async (vendor) => {
    setOpen(vendor);
    setClaims(null);
    setClaimsLoading(true);
    try {
      const result = await accountsApi.expenses({
        vendor: vendor.vendor, fiscalYear: data.fiscalYear, take: 50,
      });
      setClaims(result.expenses ?? []);
    } catch (err) {
      Alert.alert('Could not load the claims', err.message);
      setClaims([]);
    } finally {
      setClaimsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const list = data?.vendors ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (v) => v.vendor.toLowerCase().includes(q)
        || v.categories.some((c) => c.label.toLowerCase().includes(q)),
    );
  }, [data, query]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const t = data.totals;
  // A vendor holding this share of all spend is worth knowing before the next
  // tender, not after. Two vendors, or more, on a share this high is the finding.
  const concentrated = t.topVendorSharePercent >= 25;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <Text style={styles.scope}>FY {fiscalYearLabel(data.fiscalYear)}</Text>

      {/* ── Concentration ─────────────────────────────────────── */}
      <View style={styles.totalsCard}>
        <Text style={styles.totalsLabel}>Approved to vendors</Text>
        <Text style={styles.totalsValue}>{compactRupees(t.approvedRupees)}</Text>
        <Text style={styles.totalsSub}>
          {t.vendorCount} vendor{t.vendorCount === 1 ? '' : 's'}
          {t.pendingRupees > 0 ? ` · ${compactRupees(t.pendingRupees)} still awaiting approval` : ''}
        </Text>

        {t.topVendor && (
          <View style={[styles.topBox, concentrated && styles.topBoxWarn]}>
            <Ionicons
              name={concentrated ? 'warning' : 'trophy'}
              size={16}
              color={concentrated ? '#d97706' : THEME}
            />
            <View style={styles.topInfo}>
              <Text style={styles.topLabel}>
                Largest supplier · {t.topVendorSharePercent}% of all spend
              </Text>
              <Text style={styles.topName}>
                {t.topVendor} — {compactRupees(t.topVendorRupees)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Search ────────────────────────────────────────────── */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Find a vendor or category"
          placeholderTextColor="#94a3b8"
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {query ? `No vendor matches “${query}”.` : 'No vendor spend recorded this year.'}
          </Text>
        </View>
      )}

      {filtered.map((v) => {
        const hint = missingReferenceHint(v);
        return (
          <TouchableOpacity
            key={v.vendor}
            style={styles.vendorCard}
            activeOpacity={0.8}
            onPress={() => openVendor(v)}
          >
            <View style={styles.vendorHeader}>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName} numberOfLines={1}>{v.vendor}</Text>
                <Text style={styles.vendorMeta}>
                  {v.approvedCount} approved
                  {v.claimCount > v.approvedCount ? ` · ${v.claimCount - v.approvedCount} pending` : ''}
                  {v.lastPaidAt ? ` · last ${formatDate(v.lastPaidAt)}` : ''}
                </Text>
              </View>
              <Text style={styles.vendorAmount}>{compactRupees(v.approvedRupees)}</Text>
            </View>

            {/* How they were paid — the second half of "payment records". */}
            {v.paymentMethods.length > 0 && (
              <View style={styles.methodsRow}>
                {v.paymentMethods.map((m) => (
                  <View key={m.id} style={styles.methodChip}>
                    <Ionicons name={paymentMethodMeta(m.id).icon} size={11} color="#64748b" />
                    <Text style={styles.methodText}>{m.label}</Text>
                    <Text style={styles.methodCount}>{m.count}</Text>
                  </View>
                ))}
              </View>
            )}

            {v.categories.length > 0 && (
              <View style={styles.catRow}>
                {v.categories.slice(0, 3).map((c) => (
                  <View key={c.id} style={styles.catChip}>
                    <View style={[styles.catDot, { backgroundColor: c.color }]} />
                    <Text style={styles.catText}>{c.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {hint && (
              <View style={styles.refWarn}>
                <Ionicons name="alert-circle" size={12} color="#d97706" />
                <Text style={styles.refWarnText}>{hint}</Text>
              </View>
            )}

            <Text style={styles.drillHint}>Tap to see the claims behind this total</Text>
          </TouchableOpacity>
        );
      })}

      {/* ── Vendor detail ─────────────────────────────────────── */}
      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            {open && (
              <>
                <Text style={styles.sheetTitle} numberOfLines={2}>{open.vendor}</Text>
                <Text style={styles.sheetSub}>
                  {compactRupees(open.approvedRupees)} approved · {open.approvedCount} claims ·
                  average {rupees(open.averageClaimRupees)}
                </Text>

                {open.categories.length > 0 && (
                  <View style={styles.sheetCats}>
                    {open.categories.map((c) => (
                      <View key={c.id} style={styles.sheetCatRow}>
                        <View style={[styles.catDot, { backgroundColor: c.color }]} />
                        <Text style={styles.sheetCatLabel}>{c.label}</Text>
                        <Text style={styles.sheetCatValue}>{compactRupees(c.rupees)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.sheetSection}>Claims</Text>
                {claimsLoading ? (
                  <ActivityIndicator color={THEME} style={{ marginVertical: 20 }} />
                ) : (claims?.length ?? 0) === 0 ? (
                  <Text style={styles.emptyText}>No claims found for this vendor.</Text>
                ) : (
                  claims.map((c) => {
                    const cm = categoryMeta(c.category);
                    return (
                      <View key={c.id} style={styles.claimRow}>
                        <View style={[styles.claimDot, { backgroundColor: cm.color }]} />
                        <View style={styles.claimInfo}>
                          <Text style={styles.claimTitle} numberOfLines={1}>{c.title}</Text>
                          <Text style={styles.claimMeta}>
                            {formatDate(c.date)} · {cm.label}
                            {c.paymentReference ? ` · ${c.paymentReference}` : ''}
                          </Text>
                        </View>
                        <View style={styles.claimRight}>
                          <Text style={styles.claimAmount}>{compactRupees(c.amountRupees)}</Text>
                          <Text style={[styles.claimStatus, { color: statusColor(c.status) }]}>
                            {c.status}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(null)} activeOpacity={0.85}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function statusColor(status) {
  if (status === 'APPROVED') return '#059669';
  if (status === 'REJECTED') return '#dc2626';
  return '#d97706';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  scope: {
    fontSize: 11, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },

  totalsCard: {
    backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f7', padding: 18,
  },
  totalsLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  totalsValue: {
    fontSize: 28, fontWeight: '800', color: '#0f172a', marginTop: 6,
    fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1,
  },
  totalsSub: {
    fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4,
  },
  topBox: {
    flexDirection: 'row', gap: 8, backgroundColor: '#eff6ff', borderRadius: 10, padding: 12,
    marginTop: 14, borderWidth: 1, borderColor: '#bfdbfe',
  },
  topBoxWarn: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  topInfo: { flex: 1 },
  topLabel: {
    fontSize: 10, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  topName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold', marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, marginTop: 14,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular' },

  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 20, borderStyle: 'dashed',
  },
  emptyText: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center' },

  vendorCard: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 14, marginTop: 10,
  },
  vendorHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  vendorInfo: { flex: 1, marginRight: 8 },
  vendorName: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  vendorMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  vendorAmount: {
    fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold',
  },

  methodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  methodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  methodText: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium' },
  methodCount: { fontSize: 10, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catText: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular' },

  refWarn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fffbeb',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginTop: 8,
  },
  refWarnText: { fontSize: 10, color: '#92400e', fontFamily: 'Manrope-SemiBold', flex: 1 },
  drillHint: {
    fontSize: 10, color: '#cbd5e1', fontFamily: 'Manrope-Regular', marginTop: 8, fontStyle: 'italic',
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32, maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sheetSub: {
    fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4,
  },
  sheetCats: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 14, gap: 8,
  },
  sheetCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetCatLabel: { flex: 1, fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium' },
  sheetCatValue: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  sheetSection: {
    fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8,
  },
  claimRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  claimDot: { width: 8, height: 8, borderRadius: 4 },
  claimInfo: { flex: 1 },
  claimTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  claimMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  claimRight: { alignItems: 'flex-end' },
  claimAmount: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  claimStatus: { fontSize: 9, fontWeight: '700', fontFamily: 'Manrope-Bold', marginTop: 1 },

  closeBtn: {
    backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  closeText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
