// F-07 Expenses — the spend desk (docs/users/06 §3.6).
//
// The screen this replaces had two tabs (Pending / All), approved a claim by
// tapping a row and picking from an Alert that showed a category name and no
// amount, and rendered budgets as a handful of percentage bars under the list
// with no way to change them. There was no way to raise a claim, no receipt, no
// department view, no vendor view and no trends.
//
// It is now five views over one desk, because the expenses desk is asked five
// different questions and a flat claim list answers none of them well:
//
//   · CLAIMS      — what needs approving, and what can I raise?
//   · DEPARTMENTS — which department is over, and what did they buy?
//   · VENDORS     — who do we pay, how, and how concentrated is it?
//   · BUDGETS     — are we within plan, and can I change the plan?
//   · TRENDS      — is spend climbing, and against what pace?
//
// Every number is derived by the server. The one thing this screen decides is
// what to SAY about it, which is where the value is: a claim with no receipt is
// flagged before it is opened, because that is the most common reason a claim
// gets sent back and the approver can see it from the list.
//
// Approving is deliberately NOT a one-tap row action. The old screen put Approve
// and Reject in an Alert next to each other, so a mis-tap on a ₹4L claim was one
// stray finger away and there was no context to check it against. Now the row
// opens the claim, and the decision lives there with the money, the vendor, the
// receipt and the budget impact all visible at once.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import {
  rupees, compactRupees, formatDate, categoryMeta, statusMeta, paymentMethodMeta,
  fiscalYearLabel, receiptHint, utilisationColor, utilisationWidth,
  THEME, VIEWS, STATUS_FILTERS,
} from './expensesMeta';

const PAGE_SIZE = 50;

function ClaimRow({ expense, onPress }) {
  const meta = statusMeta(expense.status);
  const cat = categoryMeta(expense.category);
  const hint = receiptHint(expense);

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: `${cat.color}14` }]}>
        <Ionicons name={cat.icon} size={17} color={cat.color} />
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{expense.title}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {expense.vendor ?? cat.label}
          {expense.departmentName ? ` · ${expense.departmentName}` : ''}
        </Text>

        <View style={styles.rowTags}>
          <View style={[styles.tag, { backgroundColor: meta.bg }]}>
            <Text style={[styles.tagText, { color: meta.color }]}>{meta.short}</Text>
          </View>
          <Text style={styles.rowDate}>{expense.month}</Text>
          {expense.paymentMethod && (
            <View style={styles.methodTag}>
              <Ionicons name={paymentMethodMeta(expense.paymentMethod).icon} size={10} color="#94a3b8" />
              <Text style={styles.methodText}>
                {paymentMethodMeta(expense.paymentMethod).label}
              </Text>
            </View>
          )}
        </View>

        {hint && (
          <View style={styles.receiptWarn}>
            <Ionicons name="alert-circle" size={11} color="#d97706" />
            <Text style={styles.receiptWarnText}>{hint}</Text>
          </View>
        )}
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{compactRupees(expense.amountRupees)}</Text>
        <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
}

function StatCell({ label, value, color, icon }) {
  return (
    <View style={styles.statCell}>
      <View style={styles.statCellHead}>
        {icon ? <Ionicons name={icon} size={12} color={color ?? '#94a3b8'} /> : null}
        <Text style={styles.statCellLabel}>{label}</Text>
      </View>
      <Text style={[styles.statCellValue, color && { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function ExpensesModule({ navigation }) {
  const [view, setView] = useState('CLAIMS');

  const [data, setData] = useState(null);
  const [deptData, setDeptData] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [trendData, setTrendData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('PENDING');
  const [category, setCategory] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [missingOnly, setMissingOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [take, setTake] = useState(PAGE_SIZE);

  /**
   * Only the view on screen is fetched.
   *
   * The five views are five different endpoints over five different shapes.
   * Loading all five on mount would make the claims queue — the one screen an
   * approver opens under time pressure — wait on trend and vendor roll-ups it
   * will never look at.
   */
  const load = useCallback(async () => {
    try {
      setError(null);
      if (view === 'CLAIMS') {
        setData(await accountsApi.expenses({
          ...(status !== 'ALL' ? { status } : {}),
          ...(category ? { category } : {}),
          ...(departmentId ? { departmentId } : {}),
          ...(missingOnly ? { missingReceipt: 'true' } : {}),
          ...(query.trim() ? { q: query.trim() } : {}),
          take,
        }));
      } else if (view === 'DEPARTMENTS') {
        setDeptData(await accountsApi.departmentSpend());
      } else if (view === 'VENDORS') {
        setVendorData(await accountsApi.vendorSpend());
      } else if (view === 'BUDGETS') {
        setBudgetData(await accountsApi.expenseBudgets());
      } else {
        setTrendData(await accountsApi.expenseTrends({ months: 12 }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [view, status, category, departmentId, missingOnly, query, take]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  // Paging back to the first page is what makes a filter change feel like a
  // filter change rather than a jump to an arbitrary offset in a new list.
  useEffect(() => { setTake(PAGE_SIZE); }, [status, category, departmentId, missingOnly, query]);

  const open = (id) => navigation.navigate('ExpenseDetail', { id });

  const stats = data?.stats;
  const expenses = data?.expenses ?? [];
  const hasMore = expenses.length >= take;
  const departments = data?.departments ?? [];

  const summary = useMemo(() => {
    if (!stats) return null;
    return {
      pending: stats.pendingCount,
      pendingRupees: stats.pendingRupees,
      approvedRupees: stats.approvedRupees,
      missing: stats.missingReceiptCount,
    };
  }, [stats]);

  const renderClaims = () => {
    if (!data) return null;
    return (
      <>
        {summary && (
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <StatCell
                label="Awaiting approval"
                value={`${summary.pending} · ${compactRupees(summary.pendingRupees)}`}
                color={summary.pending > 0 ? '#d97706' : '#059669'}
                icon="time-outline"
              />
              <View style={styles.statDivider} />
              <StatCell
                label="Approved here"
                value={compactRupees(summary.approvedRupees)}
                color="#059669"
                icon="checkmark-circle-outline"
              />
            </View>
            <View style={[styles.statRow, styles.statRowBorder]}>
              <StatCell
                label="No receipt"
                value={`${summary.missing} claim${summary.missing === 1 ? '' : 's'}`}
                color={summary.missing > 0 ? '#d97706' : '#64748b'}
                icon="document-outline"
              />
              <View style={styles.statDivider} />
              <StatCell
                label="Matching"
                value={`${data.total} of all claims`}
                color="#64748b"
                icon="filter-outline"
              />
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Vendor, description or reference"
            placeholderTextColor="#94a3b8"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setStatus(f.id)}
              activeOpacity={0.8}
              style={[styles.chip, status === f.id && styles.chipOn]}
            >
              <Text style={[styles.chipText, status === f.id && styles.chipTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category + department */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <TouchableOpacity
            onPress={() => setCategory(null)}
            activeOpacity={0.8}
            style={[styles.chip, !category && styles.chipOn]}
          >
            <Text style={[styles.chipText, !category && styles.chipTextOn]}>All categories</Text>
          </TouchableOpacity>
          {(data.categories ?? []).map((c) => {
            const on = category === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategory(on ? null : c.id)}
                activeOpacity={0.8}
                style={[styles.chip, on && { backgroundColor: c.color, borderColor: c.color }]}
              >
                <Ionicons name={c.icon} size={13} color={on ? '#fff' : '#64748b'} />
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {departments.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              onPress={() => setDepartmentId(null)}
              activeOpacity={0.8}
              style={[styles.chip, !departmentId && styles.chipOn]}
            >
              <Text style={[styles.chipText, !departmentId && styles.chipTextOn]}>Any department</Text>
            </TouchableOpacity>
            {departments.map((d) => {
              const on = departmentId === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => setDepartmentId(on ? null : d.id)}
                  activeOpacity={0.8}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{d.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Missing receipts — the filter an auditor would run first */}
        <TouchableOpacity
          onPress={() => setMissingOnly(!missingOnly)}
          activeOpacity={0.85}
          style={[styles.missingToggle, missingOnly && styles.missingToggleOn]}
        >
          <Ionicons
            name={missingOnly ? 'checkbox' : 'square-outline'}
            size={17}
            color={missingOnly ? '#fff' : '#d97706'}
          />
          <Text style={[styles.missingText, missingOnly && { color: '#fff' }]}>
            Only claims with no receipt
          </Text>
        </TouchableOpacity>

        {expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={34} color="#059669" />
            <Text style={styles.emptyTitle}>
              {status === 'PENDING' ? 'Nothing awaiting approval' : 'No claims match'}
            </Text>
            <Text style={styles.emptyText}>
              {status === 'PENDING'
                ? 'The queue is clear. Raise a new claim to keep recording spend.'
                : 'Loosen the filters, or raise a claim.'}
            </Text>
          </View>
        ) : (
          <>
            {expenses.map((e) => (
              <ClaimRow key={e.id} expense={e} onPress={() => open(e.id)} />
            ))}
            {hasMore && (
              <TouchableOpacity style={styles.loadMore} onPress={() => setTake(take + PAGE_SIZE)} activeOpacity={0.8}>
                <Text style={styles.loadMoreText}>
                  Load {Math.min(PAGE_SIZE, Math.max(0, data.total - take))} more · {data.total} total
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </>
    );
  };

  const renderDepartments = () => {
    if (!deptData) return null;
    const unbudgeted = deptData.groups.filter((g) => deptData.unbudgetedDepartments.includes(g.departmentId));
    return (
      <>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <StatCell
              label="Approved"
              value={compactRupees(deptData.totals.approvedRupees)}
              color="#059669"
              icon="checkmark-circle-outline"
            />
            <View style={styles.statDivider} />
            <StatCell
              label="Planned"
              value={compactRupees(deptData.totals.plannedRupees)}
              color={THEME}
              icon="flag-outline"
            />
          </View>
          <Text style={styles.scopeNote}>FY {fiscalYearLabel(deptData.fiscalYear)}</Text>
        </View>

        {unbudgeted.length > 0 && (
          <View style={styles.alertCard}>
            <Ionicons name="warning" size={17} color="#d97706" />
            <Text style={styles.alertText}>
              {unbudgeted.map((g) => g.departmentName).join(', ')} —{' '}
              {compactRupees(unbudgeted.reduce((s, g) => s + g.approvedRupees, 0))} approved against
              no budget line at all.
            </Text>
          </View>
        )}

        {deptData.groups.map((g) => {
          const noBudget = g.plannedRupees <= 0 && g.approvedRupees > 0;
          return (
            <TouchableOpacity
              key={g.key}
              style={styles.deptRow}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('DepartmentSpend')}
            >
              <View style={styles.deptHead}>
                <View style={styles.deptInfo}>
                  <Text style={styles.deptName}>{g.departmentName}</Text>
                  <Text style={styles.deptMeta}>
                    {g.approvedCount} approved · {g.vendorCount} vendor{g.vendorCount === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={styles.deptAmount}>{compactRupees(g.approvedRupees)}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[styles.fill, {
                    width: `${utilisationWidth(g)}%`,
                    backgroundColor: noBudget ? '#fbbf24' : utilisationColor(g),
                  }]}
                />
              </View>
              <Text style={[styles.deptPhrase, { color: noBudget ? '#d97706' : utilisationColor(g) }]}>
                {noBudget ? 'No budget line' : `${g.percent}% of plan used`}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.drillBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('DepartmentSpend')}
        >
          <Ionicons name="arrow-forward" size={15} color={THEME} />
          <Text style={styles.drillText}>Open the department breakdown</Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderVendors = () => {
    if (!vendorData) return null;
    const t = vendorData.totals;
    return (
      <>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <StatCell
              label="Approved to vendors"
              value={compactRupees(t.approvedRupees)}
              color="#059669"
              icon="storefront-outline"
            />
            <View style={styles.statDivider} />
            <StatCell label="Vendors" value={String(t.vendorCount)} color={THEME} icon="people-outline" />
          </View>
          {t.topVendor && (
            <Text style={[styles.concentration, t.topVendorSharePercent >= 25 && styles.concentrationWarn]}>
              {t.topVendor} holds {t.topVendorSharePercent}% of all spend
              {t.topVendorSharePercent >= 25 ? ' — worth knowing before the next tender.' : '.'}
            </Text>
          )}
        </View>

        {vendorData.vendors.slice(0, 20).map((v) => (
          <TouchableOpacity
            key={v.vendor}
            style={styles.vendorRow}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Vendors')}
          >
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName} numberOfLines={1}>{v.vendor}</Text>
              <Text style={styles.vendorMeta}>
                {v.approvedCount} approved
                {v.lastPaidAt ? ` · last paid ${formatDate(v.lastPaidAt)}` : ''}
              </Text>
              {v.missingReferenceCount > 0 && (
                <Text style={styles.vendorWarn}>
                  {v.missingReferenceCount} with no payment reference
                </Text>
              )}
            </View>
            <Text style={styles.vendorAmount}>{compactRupees(v.approvedRupees)}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.drillBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Vendors')}
        >
          <Ionicons name="arrow-forward" size={15} color={THEME} />
          <Text style={styles.drillText}>Open the vendor payment records</Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderBudgets = () => {
    if (!budgetData) return null;
    const t = budgetData.totals;
    return (
      <>
        <View style={styles.statsCard}>
          <View style={styles.budgetHeadline}>
            <View>
              <Text style={styles.headlineLabel}>
                Planned · FY {fiscalYearLabel(budgetData.fiscalYear)}
              </Text>
              <Text style={styles.headlineValue}>{compactRupees(t.plannedRupees)}</Text>
            </View>
            <Text style={[styles.headlinePct, { color: t.remainingRupees < 0 ? '#dc2626' : '#059669' }]}>
              {t.percent}%
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[styles.fill, {
                width: `${Math.min(100, t.percent)}%`,
                backgroundColor: t.remainingRupees < 0 ? '#dc2626' : t.percent >= 90 ? '#d97706' : '#059669',
              }]}
            />
          </View>
          <Text style={styles.scopeNote}>
            {compactRupees(t.spentRupees)} spent ·{' '}
            {t.remainingRupees < 0
              ? `${compactRupees(Math.abs(t.remainingRupees))} over`
              : `${compactRupees(t.remainingRupees)} left`}
            {t.overBudgetCount > 0 ? ` · ${t.overBudgetCount} line${t.overBudgetCount === 1 ? '' : 's'} over` : ''}
          </Text>
        </View>

        {t.unbudgetedRupees > 0 && (
          <View style={styles.alertCard}>
            <Ionicons name="alert-circle" size={17} color="#d97706" />
            <Text style={styles.alertText}>
              {compactRupees(t.unbudgetedRupees)} of approved spend sits on no
              budget line — it is counted in none of these percentages.
            </Text>
          </View>
        )}

        {budgetData.budgets.map((b) => (
          <View key={b.id} style={styles.budgetRow}>
            <View style={styles.deptHead}>
              <View style={styles.deptInfo}>
                <Text style={styles.deptName}>{b.categoryLabel}</Text>
                <Text style={styles.deptMeta}>{b.departmentName}</Text>
              </View>
              <Text style={styles.deptAmount}>{compactRupees(b.plannedRupees)}</Text>
            </View>
            <View style={styles.track}>
              <View
                style={[styles.fill, {
                  width: `${utilisationWidth(b)}%`,
                  backgroundColor: utilisationColor(b),
                }]}
              />
            </View>
            <View style={styles.budgetFoot}>
              <Text style={[styles.deptPhrase, { color: utilisationColor(b) }]}>
                {compactRupees(b.spentRupees)} spent
              </Text>
              <Text style={[styles.budgetPct, { color: utilisationColor(b) }]}>{b.percent}%</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.drillBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Budgets')}
        >
          <Ionicons name="arrow-forward" size={15} color={THEME} />
          <Text style={styles.drillText}>Change the allocation</Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderTrends = () => {
    if (!trendData) return null;
    const t = trendData.totals;
    const rows = trendData.months;
    const peak = Math.max(...rows.map((r) => r.approvedRupees), t.monthlyBudgetPaceRupees, 1);
    return (
      <>
        <View style={styles.statsCard}>
          <Text style={styles.headlineLabel}>Approved, last 12 months</Text>
          <Text style={styles.headlineValue}>{compactRupees(t.approvedRupees)}</Text>
          <Text style={styles.scopeNote}>
            {t.averageRupees > 0 ? `${compactRupees(t.averageRupees)} a month on average` : 'No spend in this window'}
            {t.monthlyBudgetPaceRupees > 0 ? ` · budget pace ${compactRupees(t.monthlyBudgetPaceRupees)}` : ''}
          </Text>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.bars}>
            {rows.map((r, i) => {
              const isLast = i === rows.length - 1;
              return (
                <View key={r.key} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[styles.barFill, {
                        height: `${Math.max(2, Math.round((r.approvedRupees / peak) * 100))}%`,
                        backgroundColor: isLast ? THEME : '#93c5fd',
                      }]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.drillBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ExpenseTrends')}
        >
          <Ionicons name="arrow-forward" size={15} color={THEME} />
          <Text style={styles.drillText}>Open the full trend breakdown</Text>
        </TouchableOpacity>
      </>
    );
  };

  const body =
    view === 'CLAIMS' ? renderClaims()
      : view === 'DEPARTMENTS' ? renderDepartments()
        : view === 'VENDORS' ? renderVendors()
          : view === 'BUDGETS' ? renderBudgets()
            : renderTrends();

  return (
    <View style={styles.container}>
      {/* ── View switcher + raise a claim ─────────────────────── */}
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.viewScroll}>
          {VIEWS.map((v) => {
            const on = view === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => setView(v.id)}
                activeOpacity={0.8}
                style={[styles.viewChip, on && styles.viewChipOn]}
              >
                <Ionicons name={v.icon} size={14} color={on ? '#fff' : '#64748b'} />
                <Text style={[styles.viewText, on && styles.viewTextOn]}>{v.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          style={styles.raiseBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ExpenseEntry')}
          accessibilityLabel="Raise a new expense claim"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME} />
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cloud-offline-outline" size={36} color="#dc2626" />
            <Text style={styles.emptyTitle}>Could not load</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          body
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: 10, gap: 10,
  },
  viewScroll: { flex: 1 },
  viewChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 12,
    paddingVertical: 8, marginRight: 8,
  },
  viewChipOn: { backgroundColor: THEME, borderColor: THEME },
  viewText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  viewTextOn: { color: '#fff' },
  raiseBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: THEME, justifyContent: 'center',
    alignItems: 'center',
  },

  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  statsCard: {
    backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f7',
    padding: 16, marginBottom: 12,
  },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statRowBorder: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statDivider: { width: 1, height: 30, backgroundColor: '#f1f5f9', marginHorizontal: 12 },
  statCell: { flex: 1 },
  statCellHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statCellLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  statCellValue: {
    fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 3,
  },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular' },

  chipScroll: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 12,
    paddingVertical: 7, marginRight: 8,
  },
  chipOn: { backgroundColor: THEME, borderColor: THEME },
  chipText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  chipTextOn: { color: '#fff' },

  missingToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 11, marginBottom: 12,
  },
  missingToggleOn: { backgroundColor: '#d97706', borderColor: '#d97706' },
  missingText: { fontSize: 12, fontWeight: '600', color: '#92400e', fontFamily: 'Manrope-SemiBold' },

  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#eef2f7', padding: 12, marginBottom: 8,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowBody: { flex: 1, marginLeft: 12 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  rowTags: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 9, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  rowDate: { fontSize: 9, color: '#cbd5e1', fontFamily: 'Manrope-Medium' },
  methodTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  methodText: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  receiptWarn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  receiptWarnText: { fontSize: 10, color: '#d97706', fontFamily: 'Manrope-SemiBold' },
  rowRight: { alignItems: 'flex-end', marginLeft: 8 },
  rowAmount: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },

  loadMore: { paddingVertical: 14, alignItems: 'center' },
  loadMoreText: { fontSize: 12, fontWeight: '600', color: THEME, fontFamily: 'Manrope-SemiBold' },

  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f7',
    padding: 32, alignItems: 'center', marginTop: 12, borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold', marginTop: 12,
  },
  emptyText: {
    fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 6,
    textAlign: 'center', lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },

  alertCard: {
    flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#fde68a',
  },
  alertText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Regular', lineHeight: 17 },

  headlineLabel: {
    fontSize: 10, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  headlineValue: {
    fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 4,
    fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.8,
  },
  headlinePct: { fontSize: 22, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  budgetHeadline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  scopeNote: {
    fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 10,
  },
  concentration: {
    fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 12, lineHeight: 17,
  },
  concentrationWarn: { color: '#92400e', fontFamily: 'Manrope-SemiBold' },

  track: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },

  deptRow: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 14, marginBottom: 8,
  },
  vendorRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 8,
  },
  budgetRow: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 14, marginBottom: 8,
  },
  deptHead: { flexDirection: 'row', alignItems: 'flex-start' },
  deptInfo: { flex: 1, marginRight: 8 },
  deptName: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  deptMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  deptAmount: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  deptPhrase: { fontSize: 11, fontWeight: '600', fontFamily: 'Manrope-SemiBold', marginTop: 8 },
  budgetFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  budgetPct: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  vendorInfo: { flex: 1, marginRight: 10 },
  vendorName: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  vendorMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  vendorWarn: { fontSize: 10, color: '#d97706', fontFamily: 'Manrope-SemiBold', marginTop: 3 },
  vendorAmount: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },

  chartCard: {
    backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7',
    padding: 14, marginBottom: 12,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 120 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '66%', height: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 3 },

  drillBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12,
    paddingVertical: 12, marginTop: 8,
  },
  drillText: { fontSize: 12, fontWeight: '600', color: THEME, fontFamily: 'Manrope-SemiBold' },
});
