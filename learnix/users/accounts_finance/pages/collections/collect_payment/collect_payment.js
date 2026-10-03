// Collect Payment — the desk where money becomes a balance (docs/users/06 §3.2).
//
// This screen exists because the old collections form could not answer the only
// question that matters at a fee counter: "what does this student still owe, and
// is the cash they are handing me settling it?" So it does three things in one
// place — find the student, show their live dues with balances, and let the
// officer say exactly which bills this money pays.
//
// Allocation is explicit by default (each due gets a tick), because a family
// paying at the counter often wants part of it against a specific bill. Turning
// every allocation off hands the whole amount to the server, which applies it
// oldest-first — the same rule a ledger would use.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../services/api';
import { AnimatedCard, SearchBar, SkeletonCard } from '../../../../../components/ui';
import {
  THEME, CATEGORIES, METHODS, rupees, formatDate, dueStatusMeta, compactRupees,
} from '../collectionMeta';

const AMOUNT_PRESETS = [5000, 10000, 25000, 50000];

export default function CollectPayment({ navigation, route }) {
  // Arriving with a student pre-selected (from the Dues screen) skips search.
  const presetRollNo = route?.params?.rollNo;

  const [term, setTerm] = useState(presetRollNo || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);

  const [statement, setStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const [category, setCategory] = useState('TUITION');
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  // dueId -> rupees the officer has pointed at that bill.
  const [split, setSplit] = useState({});
  const [autoAllocate, setAutoAllocate] = useState(true);
  const [busy, setBusy] = useState(false);

  // ── Search ────────────────────────────────────────────────
  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await accountsApi.searchPayableStudents(term.trim(), 12);
        if (!cancelled) {
          setResults(found);
          setSearched(true);
        }
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setSearched(true);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  const pickStudent = useCallback(async (picker) => {
    setSelected(picker);
    setLoadingStatement(true);
    setSplit({});
    setAutoAllocate(true);
    try {
      const st = await accountsApi.studentStatement({ studentProfileId: picker.id });
      setStatement(st);
      // Default the amount to exactly what is owed — the overwhelmingly
      // common case at a fee counter.
      setAmount(st.position.outstandingRupees > 0 ? String(st.position.outstandingRupees) : '');
    } catch (err) {
      Alert.alert('Cannot Load Statement', err.message);
      setStatement(null);
    } finally {
      setLoadingStatement(false);
    }
  }, []);

  // A preset roll number from elsewhere: resolve it straight away.
  useEffect(() => {
    if (!presetRollNo) return;
    accountsApi
      .studentStatement({ rollNo: presetRollNo })
      .then((st) => pickStudent({ id: st.student.id, rollNo: st.student.rollNo, name: st.student.name }))
      .catch((err) => Alert.alert('Student Not Found', err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetRollNo]);

  // ── Derived figures ───────────────────────────────────────
  const openDues = useMemo(
    () => (statement?.dues ?? []).filter((d) => d.status === 'UNPAID' || d.status === 'PARTIAL'),
    [statement],
  );

  const amountRupees = Number(amount) || 0;

  const splitTotal = useMemo(
    () => Object.values(split).reduce((s, v) => s + (Number(v) || 0), 0),
    [split],
  );

  // What the money will do, spelled out before the officer commits to it.
  const plan = useMemo(() => {
    if (autoAllocate || !selected) return null;
    const applied = openDues
      .filter((d) => (Number(split[d.id]) || 0) > 0)
      .map((d) => ({
        due: d,
        take: Math.min(Number(split[d.id]) || 0, d.balanceRupees),
      }))
      .filter((a) => a.take > 0);
    const settled = applied.filter((a) => a.take >= a.due.balanceRupees).map((a) => a.due.title);
    return {
      applied,
      settled,
      appliedTotal: applied.reduce((s, a) => s + a.take, 0),
      // Money beyond the dues is held as an advance — it is the family's money,
      // not a shortfall, and the statement has to say so.
      advance: Math.max(0, amountRupees - applied.reduce((s, a) => s + a.take, 0)),
      overAllocated: splitTotal > amountRupees,
    };
  }, [autoAllocate, selected, openDues, split, splitTotal, amountRupees]);

  const outstanding = statement?.position?.outstandingRupees ?? 0;
  const afterThis = Math.max(0, outstanding - (autoAllocate ? amountRupees : (plan?.appliedTotal ?? 0)));
  const fullySettles = afterThis === 0 && amountRupees > 0;

  // ── Submit ────────────────────────────────────────────────
  const canSubmit =
    amountRupees > 0 &&
    !!selected &&
    !busy &&
    !plan?.overAllocated;

  const submit = () => {
    if (!selected) {
      Alert.alert('No Student', 'Find the student first so the money can be allocated to their account.');
      return;
    }
    if (amountRupees <= 0) {
      Alert.alert('Amount Required', 'Enter the amount received, in rupees.');
      return;
    }
    if (plan?.overAllocated) {
      Alert.alert('Over-Allocated', 'You have pointed at more dues than the amount you are collecting.');
      return;
    }

    const allocations = autoAllocate
      ? undefined
      : Object.entries(split)
        .filter(([, v]) => (Number(v) || 0) > 0)
        .map(([dueId, v]) => ({ dueId, amountMinor: Math.round(Number(v)) * 100 }));

    Alert.alert(
      'Confirm Collection',
      `${rupees(amountRupees)} via ${METHODS.find((m) => m.id === method)?.label} from ${selected.name}.\n\n` +
      (autoAllocate
        ? outstanding > 0
          ? `Applied to their oldest open dues first. ${outstanding === amountRupees ? 'This settles everything outstanding.' : `₹${outstanding - amountRupees} will still be outstanding.`}`
          : 'This student has nothing outstanding — the money is held as an advance.'
        : plan?.settled.length
          ? `Clears: ${plan.settled.join(', ')}.`
          : 'Nothing is allocated to a due — the money is held as an advance.'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: async () => {
            setBusy(true);
            try {
              const res = await accountsApi.collectPayment({
                studentProfileId: selected.id,
                category,
                amountMinor: Math.round(amountRupees) * 100,
                method,
                allocations,
              });
              Alert.alert(
                'Payment Recorded',
                `${rupees(res.amountRupees)} received.\n\nReference ${res.referenceNo}\nReceipt ${res.receiptNo}\n\n` +
                (res.clearedTitles.length
                  ? `Cleared: ${res.clearedTitles.join(', ')}.`
                  : res.unallocatedRupees > 0
                    ? `${rupees(res.unallocatedRupees)} held as an advance.`
                    : 'Recorded against the student account.'),
                [{
                  text: 'View Receipt',
                  onPress: () => navigation.openModule('CollectionDetail', { paymentId: res.id }),
                }, {
                  text: 'Done',
                  style: 'cancel',
                  onPress: () => navigation.goBack(),
                }],
              );
            } catch (err) {
              Alert.alert('Cannot Record', err.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  // ── Render ────────────────────────────────────────────────
  if (loadingStatement) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Student ─────────────────────────────────────── */}
      {!selected ? (
        <>
          <AnimatedCard delay={0} style={styles.block}>
            <Text style={styles.label}>Find the Student</Text>
            <Text style={styles.hint}>
              Search by name, roll number or email. Each result shows what they currently owe.
            </Text>
            <View style={styles.searchWrap}>
              <SearchBar placeholder="e.g. CSE-23-004 or Arjun" onSearch={setTerm} />
            </View>

            {searching && (
              <Text style={styles.searchingText}>Searching…</Text>
            )}

            {searched && !searching && results.length === 0 && (
              <View style={styles.noResults}>
                <Ionicons name="person-outline" size={22} color="#94a3b8" />
                <Text style={styles.noResultsText}>
                  No student matches “{term.trim()}”. Type at least two characters.
                </Text>
              </View>
            )}

            {results.map((r, i) => (
              <TouchableOpacity
                key={r.id}
                style={styles.resultRow}
                onPress={() => pickStudent(r)}
                activeOpacity={0.8}
              >
                <View style={[styles.resultAvatar, r.openDues > 0 ? styles.resultAvatarDue : null]}>
                  <Text style={styles.resultInitial}>{r.name.charAt(0)}</Text>
                </View>
                <View style={styles.resultBody}>
                  <Text style={styles.resultName}>{r.name}</Text>
                  <Text style={styles.resultMeta}>
                    {r.rollNo}
                    {r.openDues > 0
                      ? ` · ${r.openDues} open due${r.openDues === 1 ? '' : 's'}`
                      : ' · nothing outstanding'}
                  </Text>
                </View>
                <View style={styles.resultRight}>
                  <Text style={[styles.resultAmount, r.outstandingRupees > 0 ? styles.resultAmountDue : null]}>
                    {r.outstandingRupees > 0 ? rupees(r.outstandingRupees) : '—'}
                  </Text>
                  {r.oldestOverdueDays > 0 && (
                    <Text style={styles.resultOverdue}>{r.oldestOverdueDays}d overdue</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </AnimatedCard>
        </>
      ) : (
        <>
          {/* Chosen student */}
          <AnimatedCard delay={0} style={styles.block}>
            <View style={styles.chosenRow}>
              <View style={styles.chosenAvatar}>
                <Text style={styles.chosenInitial}>{selected.name.charAt(0)}</Text>
              </View>
              <View style={styles.chosenBody}>
                <Text style={styles.chosenName}>{selected.name}</Text>
                <Text style={styles.chosenMeta}>{selected.rollNo}</Text>
              </View>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => { setSelected(null); setStatement(null); setTerm(''); }}
                activeOpacity={0.8}
              >
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.positionRow}>
              <View style={styles.positionCell}>
                <Text style={styles.positionLabel}>Outstanding</Text>
                <Text style={[styles.positionValue, outstanding > 0 && { color: '#dc2626' }]}>
                  {rupees(outstanding)}
                </Text>
              </View>
              <View style={styles.positionDivider} />
              <View style={styles.positionCell}>
                <Text style={styles.positionLabel}>Advance held</Text>
                <Text style={styles.positionValueAlt}>{rupees(statement?.position?.unallocatedRupees ?? 0)}</Text>
              </View>
              <View style={styles.positionDivider} />
              <View style={styles.positionCell}>
                <Text style={styles.positionLabel}>Open dues</Text>
                <Text style={styles.positionValueAlt}>{openDues.length}</Text>
              </View>
            </View>
          </AnimatedCard>

          {/* ── The money ───────────────────────────────── */}
          <AnimatedCard delay={60} style={styles.block}>
            <Text style={styles.label}>Amount Received (₹)</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.rupeeMark}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor="#cbd5e1"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.presetRow}>
              {AMOUNT_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.preset, Number(amount) === p && styles.presetActive]}
                  onPress={() => setAmount(String(p))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetText, Number(amount) === p && styles.presetTextActive]}>
                    {compactRupees(p)}
                  </Text>
                </TouchableOpacity>
              ))}
              {outstanding > 0 && (
                <TouchableOpacity
                  style={[styles.preset, styles.presetFull, Number(amount) === outstanding && styles.presetActive]}
                  onPress={() => setAmount(String(outstanding))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetText, Number(amount) === outstanding && styles.presetTextActive]}>
                    All owed
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {outstanding > 0 && (
              <View style={styles.afterRow}>
                <Ionicons
                  name={fullySettles ? 'checkmark-circle' : 'information-circle-outline'}
                  size={14}
                  color={fullySettles ? '#059669' : '#d97706'}
                />
                <Text style={[styles.afterText, { color: fullySettles ? '#166534' : '#92400e' }]}>
                  {amountRupees === 0
                    ? `${selected.name} owes ${rupees(outstanding)} across ${openDues.length} due(s).`
                    : fullySettles
                      ? 'This clears everything outstanding.'
                      : `${rupees(afterThis)} will still be outstanding after this.`}
                </Text>
              </View>
            )}
            {outstanding === 0 && (
              <View style={styles.afterRow}>
                <Ionicons name="information-circle-outline" size={14} color="#d97706" />
                <Text style={[styles.afterText, { color: '#92400e' }]}>
                  Nothing outstanding on this account — the amount will be held as an advance.
                </Text>
              </View>
            )}
          </AnimatedCard>

          {/* ── Allocation ───────────────────────────────── */}
          {openDues.length > 0 && (
            <AnimatedCard delay={120} style={styles.block}>
              <View style={styles.allocHeader}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Apply This Money To</Text>
              </View>

              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, autoAllocate && styles.modeBtnActive]}
                  onPress={() => setAutoAllocate(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="git-commit-outline" size={15} color={autoAllocate ? THEME : '#94a3b8'} />
                  <View style={styles.modeBody}>
                    <Text style={[styles.modeTitle, autoAllocate && styles.modeTitleActive]}>Oldest first</Text>
                    <Text style={styles.modeSub}>Server applies it automatically</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, !autoAllocate && styles.modeBtnActive]}
                  onPress={() => setAutoAllocate(false)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="options-outline" size={15} color={!autoAllocate ? THEME : '#94a3b8'} />
                  <View style={styles.modeBody}>
                    <Text style={[styles.modeTitle, !autoAllocate && styles.modeTitleActive]}>Choose bills</Text>
                    <Text style={styles.modeSub}>Point at specific dues</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {autoAllocate ? (
                <View style={styles.autoPreview}>
                  <Text style={styles.autoPreviewLabel}>Will be applied to, in order:</Text>
                  {openDues.slice(0, 4).map((d, i) => (
                    <View key={d.id} style={styles.autoRow}>
                      <Text style={styles.autoIndex}>{i + 1}</Text>
                      <View style={styles.autoBody}>
                        <Text style={styles.autoTitle} numberOfLines={1}>{d.title}</Text>
                        <Text style={styles.autoMeta}>
                          {rupees(d.balanceRupees)} due
                          {d.daysOverdue > 0 ? ` · ${d.daysOverdue}d overdue` : ''}
                        </Text>
                      </View>
                      {d.status === 'PARTIAL' && (
                        <View style={styles.partialPill}><Text style={styles.partialPillText}>Part-paid</Text></View>
                      )}
                    </View>
                  ))}
                  {openDues.length > 4 && (
                    <Text style={styles.autoMore}>and {openDues.length - 4} more…</Text>
                  )}
                </View>
              ) : (
                <View style={styles.manualList}>
                  {openDues.map((d) => {
                    const meta = dueStatusMeta(d.status);
                    const val = Number(split[d.id]) || 0;
                    return (
                      <View key={d.id} style={styles.dueRow}>
                        <View style={styles.dueTop}>
                          <View style={[styles.dueStatusDot, { backgroundColor: meta.color }]} />
                          <View style={styles.dueBody}>
                            <Text style={styles.dueTitle} numberOfLines={1}>{d.title}</Text>
                            <Text style={styles.dueMeta} numberOfLines={1}>
                              {meta.label} · {rupees(d.balanceRupees)} due
                              {d.amountRupees !== d.balanceRupees ? ` of ${rupees(d.amountRupees)}` : ''}
                              {d.daysOverdue > 0 ? ` · ${d.daysOverdue}d overdue` : ''}
                            </Text>
                          </View>
                          <View style={styles.dueInputWrap}>
                            <Text style={styles.dueInputMark}>₹</Text>
                            <TextInput
                              style={styles.dueInput}
                              value={val > 0 ? String(val) : ''}
                              onChangeText={(v) => {
                                const clean = v.replace(/[^0-9]/g, '');
                                setSplit((p) => {
                                  const next = { ...p };
                                  if (!clean || Number(clean) === 0) delete next[d.id];
                                  else next[d.id] = Math.min(Number(clean), d.balanceRupees);
                                  return next;
                                });
                              }}
                              placeholder={String(d.balanceRupees)}
                              placeholderTextColor="#cbd5e1"
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                        <View style={styles.dueActions}>
                          <TouchableOpacity
                            style={styles.dueChip}
                            onPress={() => setSplit((p) => ({ ...p, [d.id]: d.balanceRupees }))}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.dueChipText}>Full {compactRupees(d.balanceRupees)}</Text>
                          </TouchableOpacity>
                          {val > 0 && (
                            <>
                              <TouchableOpacity
                                style={styles.dueChip}
                                onPress={() => setSplit((p) => ({ ...p, [d.id]: Math.floor(val / 2) }))}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.dueChipText}>Half</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.dueChip, styles.dueChipClear]}
                                onPress={() => setSplit((p) => {
                                  const next = { ...p };
                                  delete next[d.id];
                                  return next;
                                })}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.dueChipText, { color: '#dc2626' }]}>Clear</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* What pressing Record will actually do. */}
              <View style={[styles.plan, plan?.overAllocated && styles.planError]}>
                <View style={styles.planRow}>
                  <Text style={styles.planLabel}>Amount</Text>
                  <Text style={styles.planValue}>{rupees(amountRupees)}</Text>
                </View>
                {!autoAllocate && (
                  <>
                    <View style={styles.planRow}>
                      <Text style={styles.planLabel}>Pointed at {plan?.applied.length ?? 0} due(s)</Text>
                      <Text style={styles.planValue}>{rupees(plan?.appliedTotal ?? 0)}</Text>
                    </View>
                    {(plan?.advance ?? 0) > 0 && (
                      <View style={styles.planRow}>
                        <Text style={styles.planLabel}>Held as advance</Text>
                        <Text style={[styles.planValue, { color: '#d97706' }]}>{rupees(plan.advance)}</Text>
                      </View>
                    )}
                    {plan?.overAllocated && (
                      <Text style={styles.planErrorText}>
                        You have pointed at {rupees(splitTotal)} but only collected {rupees(amountRupees)}.
                      </Text>
                    )}
                  </>
                )}
                {autoAllocate && amountRupees > outstanding && outstanding > 0 && (
                  <View style={styles.planRow}>
                    <Text style={styles.planLabel}>Beyond dues → advance</Text>
                    <Text style={[styles.planValue, { color: '#d97706' }]}>
                      {rupees(amountRupees - outstanding)}
                    </Text>
                  </View>
                )}
                {plan?.settled.length > 0 && (
                  <Text style={styles.planClears}>Clears: {plan.settled.join(', ')}</Text>
                )}
              </View>
            </AnimatedCard>
          )}

          {/* ── Method + category ───────────────────────── */}
          <AnimatedCard delay={180} style={styles.block}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodGrid}>
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.methodCard, method === m.id && styles.methodCardActive]}
                  onPress={() => setMethod(m.id)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={m.icon} size={17} color={method === m.id ? THEME : '#94a3b8'} />
                  <Text style={[styles.methodText, method === m.id && styles.methodTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 18 }]}>Heads This Payment To</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catChip, category === c.id && styles.catChipActive]}
                  onPress={() => setCategory(c.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={c.icon} size={12} color={category === c.id ? '#fff' : '#64748b'} />
                  <Text style={[styles.catText, category === c.id && styles.catTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>
              This is a label on the receipt. Which bills it clears is set above.
            </Text>
          </AnimatedCard>

          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit) && styles.btnDisabled]}
            onPress={submit}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            {busy
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
            <Text style={styles.submitText}>
              {amountRupees > 0 ? `Record ${rupees(amountRupees)}` : 'Enter an amount'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statementBtn}
            onPress={() => navigation.openModule('StudentStatement', { studentProfileId: selected.id, rollNo: selected.rollNo })}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={15} color={THEME} />
            <Text style={styles.statementBtnText}>Open full statement</Text>
            <Ionicons name="chevron-forward" size={14} color={THEME} />
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  block: { marginBottom: 10 },
  btnDisabled: { opacity: 0.45 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  hint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 8, lineHeight: 15 },

  // Search
  searchWrap: { marginBottom: 4 },
  searchingText: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium', paddingVertical: 12, textAlign: 'center' },
  noResults: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noResultsText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  resultAvatar: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  resultAvatarDue: { backgroundColor: '#fef2f2' },
  resultInitial: { fontSize: 14, fontWeight: '800', color: '#475569', fontFamily: 'PlusJakartaSans-Bold' },
  resultBody: { flex: 1 },
  resultName: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  resultMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  resultRight: { alignItems: 'flex-end' },
  resultAmount: { fontSize: 12, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold' },
  resultAmountDue: { color: '#dc2626' },
  resultOverdue: { fontSize: 9, color: '#dc2626', fontFamily: 'Manrope-Medium', marginTop: 1 },

  // Chosen student
  chosenRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  chosenAvatar: { width: 42, height: 42, borderRadius: 13, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center' },
  chosenInitial: { fontSize: 17, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  chosenBody: { flex: 1 },
  chosenName: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  chosenMeta: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: '#f1f5f9' },
  changeText: { fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
  positionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 12 },
  positionCell: { flex: 1, alignItems: 'center' },
  positionDivider: { width: 1, backgroundColor: '#f1f5f9' },
  positionLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  positionValue: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 3 },
  positionValueAlt: { fontSize: 15, fontWeight: '800', color: '#475569', fontFamily: 'PlusJakartaSans-Bold', marginTop: 3 },

  // Amount
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 13, borderWidth: 1.5, borderColor: THEME + '55', paddingHorizontal: 14 },
  rupeeMark: { fontSize: 22, fontWeight: '700', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', paddingVertical: 12, paddingHorizontal: 6 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  preset: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  presetActive: { backgroundColor: THEME, borderColor: THEME },
  presetText: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  presetTextActive: { color: '#fff', fontWeight: '700' },
  presetFull: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  afterRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, backgroundColor: '#fffbeb', borderRadius: 11, padding: 11 },
  afterText: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Medium', lineHeight: 16 },

  // Allocation
  allocHeader: { flexDirection: 'row', alignItems: 'center' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  modeBtnActive: { backgroundColor: THEME + '0d', borderColor: THEME },
  modeBody: { flex: 1 },
  modeTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },
  modeTitleActive: { color: THEME },
  modeSub: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },

  autoPreview: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  autoPreviewLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 },
  autoIndex: { width: 18, height: 18, borderRadius: 9, backgroundColor: THEME + '18', color: THEME, fontSize: 10, fontWeight: '800', fontFamily: 'Manrope-Bold', textAlign: 'center', lineHeight: 18 },
  autoBody: { flex: 1 },
  autoTitle: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  autoMeta: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  autoMore: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 6, fontStyle: 'italic' },
  partialPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#fffbeb' },
  partialPillText: { fontSize: 9, fontWeight: '700', color: '#d97706', fontFamily: 'Manrope-Bold' },

  manualList: { marginTop: 12 },
  dueRow: { paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  dueTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dueStatusDot: { width: 7, height: 7, borderRadius: 4 },
  dueBody: { flex: 1 },
  dueTitle: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  dueMeta: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  dueInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 8, width: 92 },
  dueInputMark: { fontSize: 12, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold' },
  dueInput: { flex: 1, fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold', paddingVertical: 7, paddingHorizontal: 3, textAlign: 'right' },
  dueActions: { flexDirection: 'row', gap: 6, marginTop: 8, marginLeft: 16 },
  dueChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: '#f1f5f9' },
  dueChipClear: { backgroundColor: '#fef2f2' },
  dueChipText: { fontSize: 10, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },

  plan: { marginTop: 14, backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', padding: 12 },
  planError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  planLabel: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium' },
  planValue: { fontSize: 12, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  planErrorText: { fontSize: 11, color: '#991b1b', fontFamily: 'Manrope-Medium', marginTop: 6, lineHeight: 16 },
  planClears: { fontSize: 10, color: '#166534', fontFamily: 'Manrope-Medium', marginTop: 7, lineHeight: 15 },

  // Method / category
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  methodCardActive: { backgroundColor: THEME + '0d', borderColor: THEME },
  methodText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  methodTextActive: { color: THEME, fontWeight: '700' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  catChipActive: { backgroundColor: THEME, borderColor: THEME },
  catText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  catTextActive: { color: '#fff', fontWeight: '700' },

  // Buttons
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME, borderRadius: 13, paddingVertical: 15, marginTop: 4 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  statementBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, paddingVertical: 12, borderRadius: 12, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  statementBtnText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
});