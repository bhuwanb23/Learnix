// Department-wise expenditure (docs/users/06 §3.6 §2).
//
// The question this screen exists for is the HOD conversation: "your department
// spent X, here is what it was spent on, and here is the line you were given".
// So each department is a row with its own budget comparison and its own category
// split, not just a number in a table.
//
// THE HEADLINE IS NOT THE TOTAL. Total spend across all departments tells you
// nothing actionable — you cannot go and have a conversation with "the
// institute". So the ranking is by department, and the thing that gets
// highlighted is the one you should act on: a department spending against no
// budget at all.
//
// Spend is shown as APPROVED, with pending called out separately. A claim
// awaiting approval is not spend, and folding it in would mean the screen
// disagreed with the budgets screen — which both read the same expenses.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  rupees, compactRupees, categoryMeta, utilisationPhrase, utilisationColor,
  utilisationWidth, fiscalYearLabel, THEME,
} from '../../expensesMeta';

export default function DepartmentSpend() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.departmentSpend(year ? { fiscalYear: year } : {});
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
  // The finding this screen is built to surface, promoted above the ranking:
  // departments spending real money against no line at all.
  const unbudgeted = data.groups.filter((g) => data.unbudgetedDepartments.includes(g.departmentId));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <Text style={styles.scope}>FY {fiscalYearLabel(data.fiscalYear)}</Text>

      <View style={styles.totalsCard}>
        <Text style={styles.totalsLabel}>Approved across {t.departmentCount} departments</Text>
        <Text style={styles.totalsValue}>{compactRupees(t.approvedRupees)}</Text>
        <Text style={styles.totalsSub}>
          against {compactRupees(t.plannedRupees)} planned
          {t.pendingRupees > 0 ? ` · ${compactRupees(t.pendingRupees)} still awaiting approval` : ''}
        </Text>
      </View>

      {/* ── The finding ──────────────────────────────────────── */}
      {unbudgeted.length > 0 && (
        <View style={styles.alertCard}>
          <Ionicons name="warning" size={18} color="#d97706" />
          <View style={styles.alertInfo}>
            <Text style={styles.alertTitle}>
              {unbudgeted.length} department{unbudgeted.length === 1 ? '' : 's'} spending with no budget
            </Text>
            <Text style={styles.alertText}>
              {unbudgeted.map((g) => g.departmentName).join(', ')} —{' '}
              {compactRupees(unbudgeted.reduce((s, g) => s + g.approvedRupees, 0))} approved against
              nothing. A budget they were never given is not a budget.
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.section}>By department</Text>
      {data.groups.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No spend recorded this year.</Text>
        </View>
      )}

      {data.groups.map((g) => {
        const color = utilisationColor(g);
        const noBudget = g.plannedRupees <= 0 && g.approvedRupees > 0;
        return (
          <TouchableOpacity
            key={g.key}
            style={styles.deptCard}
            activeOpacity={0.8}
            onPress={() => setOpen(g)}
          >
            <View style={styles.deptHeader}>
              <View style={styles.deptInfo}>
                <Text style={styles.deptName}>{g.departmentName}</Text>
                <Text style={styles.deptMeta}>
                  {g.departmentCode} · {g.approvedCount} approved
                  {g.vendorCount > 0 ? ` · ${g.vendorCount} vendor${g.vendorCount === 1 ? '' : 's'}` : ''}
                </Text>
              </View>
              <Text style={styles.deptAmount}>{compactRupees(g.approvedRupees)}</Text>
            </View>

            <View style={styles.track}>
              <View
                style={[styles.fill, {
                  width: `${utilisationWidth(g)}%`,
                  backgroundColor: noBudget ? '#fbbf24' : color,
                }]}
              />
            </View>

            <View style={styles.deptFooter}>
              <Text style={[styles.deptPhrase, { color: noBudget ? '#d97706' : color }]}>
                {noBudget ? 'No budget line' : utilisationPhrase(g)}
              </Text>
              {g.pendingRupees > 0 && (
                <Text style={styles.deptPending}>
                  {compactRupees(g.pendingRupees)} pending
                </Text>
              )}
            </View>

            {g.categories.length > 0 && (
              <View style={styles.catRow}>
                {g.categories.slice(0, 4).map((c) => (
                  <View key={c.id} style={styles.catChip}>
                    <View style={[styles.catDot, { backgroundColor: c.color }]} />
                    <Text style={styles.catText} numberOfLines={1}>{c.label}</Text>
                  </View>
                ))}
                {g.categories.length > 4 && (
                  <Text style={styles.catMore}>+{g.categories.length - 4}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* ── Year switcher ─────────────────────────────────────── */}
      {data.currentFiscalYear !== data.fiscalYear && (
        <TouchableOpacity style={styles.backToCurrent} onPress={() => setYear(data.currentFiscalYear)} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={14} color={THEME} />
          <Text style={styles.backText}>Back to FY {fiscalYearLabel(data.currentFiscalYear)}</Text>
        </TouchableOpacity>
      )}

      {/* ── Detail sheet ──────────────────────────────────────── */}
      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            {open && (
              <>
                <Text style={styles.sheetTitle}>{open.departmentName}</Text>
                <Text style={styles.sheetSub}>
                  FY {fiscalYearLabel(data.fiscalYear)} · {open.approvedCount} approved ·{' '}
                  {open.claimCount} raised
                </Text>

                <View style={styles.sheetStats}>
                  <View style={styles.sheetStat}>
                    <Text style={styles.sheetStatLabel}>Approved</Text>
                    <Text style={styles.sheetStatValue}>{compactRupees(open.approvedRupees)}</Text>
                  </View>
                  <View style={styles.sheetStat}>
                    <Text style={styles.sheetStatLabel}>Planned</Text>
                    <Text style={styles.sheetStatValue}>{compactRupees(open.plannedRupees)}</Text>
                  </View>
                  <View style={styles.sheetStat}>
                    <Text style={styles.sheetStatLabel}>Pending</Text>
                    <Text style={[styles.sheetStatValue, open.pendingRupees > 0 && { color: '#d97706' }]}>
                      {compactRupees(open.pendingRupees)}
                    </Text>
                  </View>
                </View>

                {open.plannedRupees <= 0 ? (
                  <View style={styles.sheetWarn}>
                    <Ionicons name="alert-circle" size={15} color="#d97706" />
                    <Text style={styles.sheetWarnText}>
                      This department has no budget line. Set one before approving
                      more — otherwise the allocation is a suggestion, not a limit.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.sheetUtil}>
                    <View style={styles.sheetUtilHeader}>
                      <Text style={styles.sheetUtilLabel}>Budget utilisation</Text>
                      <Text style={[styles.sheetUtilPct, { color: utilisationColor(open) }]}>
                        {open.percent}%
                      </Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[styles.fill, {
                          width: `${utilisationWidth(open)}%`,
                          backgroundColor: utilisationColor(open),
                        }]}
                      />
                    </View>
                    <Text style={styles.sheetUtilHint}>{utilisationPhrase(open)}</Text>
                  </View>
                )}

                <Text style={styles.sheetSection}>Where it went</Text>
                {open.categories.map((c) => {
                  const share = open.approvedRupees > 0
                    ? Math.round((c.rupees / open.approvedRupees) * 100)
                    : 0;
                  return (
                    <View key={c.id} style={styles.sheetCatRow}>
                      <View style={styles.sheetCatHead}>
                        <View style={[styles.catDot, { backgroundColor: c.color }]} />
                        <Text style={styles.sheetCatLabel}>{c.label}</Text>
                        <Text style={styles.sheetCatValue}>
                          {compactRupees(c.rupees)} · {share}%
                        </Text>
                      </View>
                      <View style={styles.shareTrack}>
                        <View
                          style={[styles.shareFill, { width: `${share}%`, backgroundColor: c.color }]}
                        />
                      </View>
                    </View>
                  );
                })}

                {open.topVendor && (
                  <Text style={styles.sheetFootnote}>
                    Largest supplier: {open.topVendor}.
                  </Text>
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
  totalsSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4 },

  alertCard: {
    flexDirection: 'row', gap: 10, backgroundColor: '#fffbeb', borderRadius: 14, padding: 14,
    marginTop: 12, borderWidth: 1, borderColor: '#fde68a',
  },
  alertInfo: { flex: 1 },
  alertTitle: {
    fontSize: 12, fontWeight: '700', color: '#92400e', fontFamily: 'Manrope-Bold',
  },
  alertText: {
    fontSize: 11, color: '#a16207', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 17,
  },

  section: {
    fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 20, borderStyle: 'dashed',
  },
  emptyText: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center' },

  deptCard: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 14, marginBottom: 10,
  },
  deptHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  deptInfo: { flex: 1, marginRight: 8 },
  deptName: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  deptMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  deptAmount: {
    fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold',
  },
  track: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  deptFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
  },
  deptPhrase: { fontSize: 11, fontWeight: '600', fontFamily: 'Manrope-SemiBold' },
  deptPending: { fontSize: 10, color: '#d97706', fontFamily: 'Manrope-SemiBold' },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 130 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catText: {
    fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', flexShrink: 1,
  },
  catMore: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Bold' },

  backToCurrent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, marginTop: 8,
  },
  backText: { fontSize: 12, fontWeight: '600', color: THEME, fontFamily: 'Manrope-SemiBold' },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32, maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sheetSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4 },
  sheetStats: { flexDirection: 'row', gap: 12, marginTop: 16 },
  sheetStat: { flex: 1 },
  sheetStatLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sheetStatValue: {
    fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold', marginTop: 2,
  },
  sheetWarn: {
    flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderRadius: 10, padding: 12,
    marginTop: 16, borderWidth: 1, borderColor: '#fde68a',
  },
  sheetWarnText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Regular', lineHeight: 17 },
  sheetUtil: { marginTop: 16 },
  sheetUtilHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetUtilLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium' },
  sheetUtilPct: { fontSize: 14, fontWeight: '800', fontFamily: 'Manrope-Bold' },
  sheetUtilHint: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 6 },
  sheetSection: {
    fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8,
  },
  sheetCatRow: { marginBottom: 12 },
  sheetCatHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetCatLabel: { flex: 1, fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium' },
  sheetCatValue: { fontSize: 11, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  shareTrack: {
    height: 5, borderRadius: 3, backgroundColor: '#eef2f7', marginTop: 6, overflow: 'hidden',
  },
  shareFill: { height: '100%', borderRadius: 3 },
  sheetFootnote: {
    fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 8, fontStyle: 'italic',
  },
  closeBtn: {
    backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  closeText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
