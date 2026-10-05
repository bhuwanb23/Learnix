// F-04 Fee Structure — the structure detail (docs/users/06 §3.5.1, §3.5.3).
//
// One program × one academic year, in full: the charge lines that make up the
// fee, what each semester actually costs, the concession rules that apply, the
// instalment plan on offer, the late-payment penalty that governs it, and the
// versions it has been through.
//
// The one genuinely useful idea on this screen is the DATE SWITCHER. A fee
// structure is not a price, it is a price *with a validity window* — and after a
// November revision a bill raised in July must still read the July rate. Rather
// than assert that, the screen lets you point it at any date and shows which
// version priced it. When the date falls outside every window it says so rather
// than quietly substituting today's rate, because a wrong price on an
// already-issued bill is worse than no answer.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  rupees, compactRupees, formatDay, formatDateTime, kindMeta, semesterShort,
  versionStatusMeta, windowPhrase, changePhrase, changeColor, deltaPhrase,
  firstYearHint, optionalLineHint, todayIso, THEME,
} from '../../feeStructureMeta';

// ── One charge line ────────────────────────────────────────
function ComponentRow({ component }) {
  const meta = kindMeta(component.kind);
  const note = optionalLineHint(component) || firstYearHint(component);
  const netted = component.concessionRupees > 0;

  return (
    <View style={styles.line}>
      <View style={[styles.lineIcon, { backgroundColor: `${meta.color}14` }]}>
        <Ionicons name={meta.icon} size={15} color={meta.color} />
      </View>

      <View style={styles.lineBody}>
        <View style={styles.lineTitleRow}>
          <Text style={styles.lineTitle} numberOfLines={1}>{component.label}</Text>
          {component.semester > 0 && (
            <View style={styles.semChip}>
              <Text style={styles.semChipText}>{semesterShort(component.semester)}</Text>
            </View>
          )}
          {component.optional && (
            <View style={[styles.semChip, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <Text style={[styles.semChipText, { color: '#b45309' }]}>Optional</Text>
            </View>
          )}
          {component.firstYearOnly && (
            <View style={[styles.semChip, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
              <Text style={[styles.semChipText, { color: '#0369a1' }]}>Year 1</Text>
            </View>
          )}
        </View>
        {note ? <Text style={styles.lineNote} numberOfLines={2}>{note}</Text> : null}
        {netted && (
          <Text style={styles.lineWaiver}>
            {rupees(component.concessionRupees)} off by concession → {rupees(component.netRupees)}
          </Text>
        )}
      </View>

      <View style={styles.lineAmountBox}>
        <Text style={[styles.lineAmount, netted && styles.lineAmountNetted]}>{rupees(component.amountRupees)}</Text>
        {netted && <Text style={styles.lineNet}>{rupees(component.netRupees)}</Text>}
      </View>
    </View>
  );
}

// ── Section wrapper ────────────────────────────────────────
function Section({ title, icon, color = '#64748b', right, children, note }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={{ flex: 1 }} />
        {right}
      </View>
      {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
      {children}
    </View>
  );
}

function ActionPill({ icon, label, onPress, color = THEME, filled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.pill, filled && { backgroundColor: color, borderColor: color }]}
    >
      <Ionicons name={icon} size={13} color={filled ? '#fff' : color} />
      <Text style={[styles.pillText, filled && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FeeStructureDetail({ route, navigation }) {
  const id = route?.params?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [onDate, setOnDate] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setData(await accountsApi.feeStructureDetail(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const runResolve = useCallback(async () => {
    if (!dateInput) return;
    try {
      setResolving(true);
      const out = await accountsApi.resolveFeeOnDate(id, dateInput);
      setResolved(out);
      setOnDate(dateInput);
      // Point the whole screen at that date too, so the charge lines below are
      // the ones that applied THEN, not merely the ones that apply now.
      const detail = await accountsApi.feeStructureDetail(id, dateInput);
      setData(detail);
    } catch (err) {
      Alert.alert('Could not check that date', err.message);
    } finally {
      setResolving(false);
    }
  }, [dateInput, id]);

  const clearDate = useCallback(async () => {
    setOnDate('');
    setResolved(null);
    setDateInput('');
    const detail = await accountsApi.feeStructureDetail(id);
    setData(detail);
  }, [id]);

  const askRevision = useCallback(() => {
    Alert.alert(
      'Request a revision',
      'This flags the structure for review. It does NOT change any rate — to change rates, cut a new version.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              await accountsApi.requestRevision(id);
              await fetchData();
              Alert.alert('Requested', 'The structure is now flagged for review.');
            } catch (err) {
              Alert.alert('Could not request', err.message);
            }
          },
        },
      ],
    );
  }, [id, fetchData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME} />
        <Text style={styles.loadingText}>Loading structure…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error ?? 'Structure not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const history = data.history ?? {};
  const totals = {
    tuition: data.tuitionRupees,
    other: data.otherRupees,
    total: data.totalRupees,
    mandatory: data.mandatoryRupees,
    optional: data.optionalRupees,
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{data.program.name}</Text>
            <Text style={styles.headerSub}>
              {data.program.code} · {data.academicYear.name}
              {data.academicYear.isCurrent ? ' · current year' : ''}
            </Text>
          </View>
          {data.status === 'REVISION_REQUESTED' && (
            <View style={styles.flagChip}>
              <Ionicons name="help-circle-outline" size={11} color="#d97706" />
              <Text style={styles.flagChipText}>Revision requested</Text>
            </View>
          )}
        </View>

        <Text style={styles.headerTotal}>{rupees(totals.total)}</Text>
        <Text style={styles.headerTotalLabel}>
          the full published fee for the year
          {totals.optional > 0 ? `, of which ${rupees(totals.optional)} is optional` : ''}
        </Text>

        <View style={styles.headerSplit}>
          <View style={styles.headerCell}>
            <Text style={[styles.headerCellValue, { color: kindMeta('TUITION').color }]}>{rupees(totals.tuition)}</Text>
            <Text style={styles.headerCellLabel}>Tuition</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerCell}>
            <Text style={styles.headerCellValue}>{rupees(totals.other)}</Text>
            <Text style={styles.headerCellLabel}>Other charges</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerCell}>
            <Text style={[styles.headerCellValue, { color: '#059669' }]}>
              {rupees(data.concessionSummary?.netAfterConcessionRupees ?? totals.total)}
            </Text>
            <Text style={styles.headerCellLabel}>After concessions</Text>
          </View>
        </View>

        {history.totalChangePercent !== null && history.totalChangePercent !== undefined ? (
          <View style={styles.changeRow}>
            <Ionicons name="trending-up-outline" size={13} color={changeColor(history.totalChangePercent)} />
            <Text style={[styles.changeText, { color: changeColor(history.totalChangePercent) }]}>
              {changePhrase(history.totalChangePercent)} · {deltaPhrase(history.totalChangeRupees)}
            </Text>
          </View>
        ) : (
          <View style={styles.changeRow}>
            <Ionicons name="remove-outline" size={13} color="#94a3b8" />
            <Text style={styles.changeMuted}>{changePhrase(null)}</Text>
          </View>
        )}
      </View>

      {/* ── Effective-date switcher ── */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Ionicons name="calendar-outline" size={14} color={THEME} />
          <Text style={styles.cardTitle}>What was the fee on a given day?</Text>
        </View>
        <Text style={styles.cardNote}>
          A bill is priced by the version in force on the day it was raised. Point this screen at any date
          to see the rates that applied then.
        </Text>

        <View style={styles.dateRow}>
          <TextInput
            style={styles.dateInput}
            value={dateInput}
            onChangeText={setDateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
          />
          <TouchableOpacity style={styles.dateBtn} onPress={runResolve} disabled={resolving}>
            {resolving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.dateBtnText}>Check</Text>}
          </TouchableOpacity>
          {onDate ? (
            <TouchableOpacity style={styles.dateClear} onPress={clearDate}>
              <Ionicons name="close" size={16} color="#64748b" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.dateClear} onPress={() => setDateInput(todayIso())}>
              <Ionicons name="calendar-number-outline" size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {resolved && (
          <View style={[styles.resolveBox, { backgroundColor: resolved.resolved ? '#f0fdf4' : '#fef2f2', borderColor: resolved.resolved ? '#bbf7d0' : '#fecaca' }]}>
            <Ionicons
              name={resolved.resolved ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={resolved.resolved ? '#059669' : '#dc2626'}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.resolveText, { color: resolved.resolved ? '#065f46' : '#991b1b' }]}>
                {resolved.message}
              </Text>
              {resolved.resolved && (
                <Text style={styles.resolveSub}>
                  Tuition {rupees(resolved.tuitionRupees)} · other {rupees(resolved.otherRupees)} · total{' '}
                  {rupees(resolved.totalRupees)}
                </Text>
              )}
            </View>
          </View>
        )}

        {onDate && (
          <View style={styles.resolvedBanner}>
            <Ionicons name="eye-outline" size={13} color="#d97706" />
            <Text style={styles.resolvedBannerText}>
              The charge lines below are the ones in force on {formatDay(onDate)}.
            </Text>
          </View>
        )}
      </View>

      {/* ── Charge lines ── */}
      <Section
        title="Charge lines"
        icon="list-outline"
        color={THEME}
        note="The breakdown the total above is computed from. Optional and joining-year-only charges are flagged, never silently added."
        right={
          <ActionPill icon="create-outline" label="Edit lines" onPress={() => navigation.navigate('FeeStructureEditor', { id })} />
        }
      >
        <View style={styles.linesBox}>
          {data.components.map((c) => <ComponentRow key={c.id} component={c} />)}
        </View>

        <View style={styles.totalBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tuition</Text>
            <Text style={styles.totalValue}>{rupees(totals.tuition)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>All other charges</Text>
            <Text style={styles.totalValue}>{rupees(totals.other)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowBold]}>
            <Text style={styles.totalLabelBold}>Published total</Text>
            <Text style={styles.totalValueBold}>{rupees(totals.total)}</Text>
          </View>
          {totals.optional > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelMuted}>of which optional</Text>
              <Text style={styles.totalValueMuted}>{rupees(totals.optional)}</Text>
            </View>
          )}
        </View>
      </Section>

      {/* ── Semester split ── */}
      <Section
        title="Semester-wise"
        icon="grid-outline"
        color="#0891b2"
        note="What each semester's bill comes to, including a share of the year-wide charges. These add back up to the annual total exactly."
      >
        <View style={styles.semGrid}>
          {data.semesterSchedule.map((s) => (
            <View key={s.semester} style={styles.semCell}>
              <Text style={styles.semLabel}>{semesterShort(s.semester)}</Text>
              <Text style={styles.semValue}>{compactRupees(s.amountRupees)}</Text>
            </View>
          ))}
        </View>

        {data.tuitionBySemester?.some((s) => s.amountRupees > 0) && (
          <>
            <Text style={styles.semSubhead}>Tuition only</Text>
            <View style={styles.semGrid}>
              {data.tuitionBySemester.map((s) => (
                <View key={s.semester} style={[styles.semCell, styles.semCellPlain]}>
                  <Text style={styles.semLabel}>{semesterShort(s.semester)}</Text>
                  <Text style={styles.semValue}>{compactRupees(s.amountRupees)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Section>

      {/* ── Concessions ── */}
      <Section
        title="Concession rules"
        icon="ribbon-outline"
        color="#7c3aed"
        note="The written policy. Applying one is arithmetic against these rules, not a judgement call at the counter."
        right={
          <ActionPill icon="options-outline" label="Manage" onPress={() => navigation.navigate('FeeStructureConcessions', { id })} />
        }
      >
        {data.concessions.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <Text style={styles.inlineEmptyText}>No concession rules written for this structure yet.</Text>
          </View>
        ) : (
          <>
            {data.concessions.map((c) => (
              <View key={c.id} style={styles.concessionRow}>
                <View style={[styles.concessionDot, { backgroundColor: c.enabled ? '#7c3aed' : '#cbd5e1' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.concessionName, !c.enabled && styles.concessionOff]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.concessionValue}>
                    {c.valueLabel}
                    {c.semester > 0 ? ` · ${semesterShort(c.semester)} only` : ''}
                  </Text>
                </View>
                <Text style={[styles.concessionAmount, !c.enabled && styles.concessionOff]}>
                  {c.enabled ? `−${rupees(c.waiverRupees)}` : 'off'}
                </Text>
              </View>
            ))}
            <View style={styles.concessionTotal}>
              <Text style={styles.concessionTotalLabel}>
                All live rules together ({data.concessionSummary?.applied?.length ?? 0})
              </Text>
              <Text style={styles.concessionTotalValue}>
                {rupees(data.totalRupees)} → {rupees(data.concessionSummary?.netAfterConcessionRupees ?? data.totalRupees)}
              </Text>
            </View>
            {(data.concessionSummary?.overCapCount ?? 0) > 0 && (
              <View style={styles.warnBox}>
                <Ionicons name="alert-circle-outline" size={13} color="#b45309" />
                <Text style={styles.warnText}>
                  {data.concessionSummary.overCapCount} rule(s) ask for more than the charges are worth. They give
                  back only what exists — the rest is ignored.
                </Text>
              </View>
            )}
          </>
        )}
      </Section>

      {/* ── Instalments ── */}
      <Section
        title="Instalment plan on offer"
        icon="calendar-outline"
        color="#059669"
        note="The default every bill raised against this structure is offered. A student can still be given a different plan on the dues desk."
        right={<ActionPill icon="options-outline" label="Change" onPress={() => navigation.navigate('FeeStructureInstallments', { id })} />}
      >
        <View style={styles.planHead}>
          <Text style={styles.planSummary}>{data.installments.summary}</Text>
          <Text style={styles.planDue}>
            First bill {data.installments.schedule[0]?.dueDay ? formatDay(data.installments.schedule[0].dueDay) : '—'}
          </Text>
        </View>
        <View style={styles.planRows}>
          {data.installments.schedule.map((s) => (
            <View key={s.sequence} style={styles.planRow}>
              <Text style={styles.planSeq}>#{s.sequence}</Text>
              <Text style={styles.planDate}>{s.dueDay ? formatDay(s.dueDay) : '—'}</Text>
              <Text style={styles.planAmount}>{rupees(s.amountRupees)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.planFoot}>
          The {data.installments.schedule.length} bill{data.installments.schedule.length === 1 ? '' : 's'} add up to{' '}
          {rupees(data.installments.schedule.reduce((s, x) => s + x.amountRupees, 0))} — the whole fee.
        </Text>
      </Section>

      {/* ── Late penalty ── */}
      <Section
        title="Late-payment penalty"
        icon="shield-checkmark-outline"
        color={data.penalty?.enabled ? '#d97706' : '#64748b'}
        note="Set on the dues desk's Late Fee Policy screen. The fine assessed on a bill is the one computed there, not one derived from this figure."
        right={<ActionPill icon="open-outline" label="Open policy" onPress={() => navigation.navigate('LateFeePolicy')} />}
      >
        <View style={[styles.penaltyBox, !data.penalty?.enabled && styles.penaltyBoxOff]}>
          <View style={styles.penaltyHead}>
            <Ionicons
              name={data.penalty?.enabled ? 'alert-circle-outline' : 'shield-checkmark-outline'}
              size={15}
              color={data.penalty?.enabled ? '#d97706' : '#059669'}
            />
            <Text style={styles.penaltyName}>{data.penalty?.ruleName ?? 'No rule'}</Text>
            <View style={styles.penaltyScope}>
              <Text style={styles.penaltyScopeText}>
                {data.penalty?.scope === 'STRUCTURE'
                  ? 'This program'
                  : data.penalty?.scope === 'INSTITUTION'
                    ? 'Institution-wide'
                    : 'None'}
              </Text>
            </View>
          </View>
          <Text style={styles.penaltySummary}>{data.penalty?.summary}</Text>

          {data.penalty?.enabled && (
            <View style={styles.penaltyFigures}>
              <View style={styles.penaltyFig}>
                <Text style={styles.penaltyFigValue}>{rupees(data.penalty.monthlyRupees)}</Text>
                <Text style={styles.penaltyFigLabel}>A month late</Text>
              </View>
              <View style={styles.penaltyFig}>
                <Text style={styles.penaltyFigValue}>{rupees(data.penalty.cappedRupees)}</Text>
                <Text style={styles.penaltyFigLabel}>Long overdue</Text>
              </View>
              <View style={styles.penaltyFig}>
                <Text style={styles.penaltyFigValue}>{rupees(data.penalty.capRupees)}</Text>
                <Text style={styles.penaltyFigLabel}>Fine ceiling</Text>
              </View>
            </View>
          )}
        </View>
      </Section>

      {/* ── Version history ── */}
      <Section
        title="Version history"
        icon="layers-outline"
        color="#7c3aed"
        note="Publishing a version supersedes the last one rather than overwriting it, so what a student was charged last year is still answerable."
        right={<ActionPill icon="git-branch-outline" label="Timeline" onPress={() => navigation.navigate('FeeStructureVersions', { id })} />}
      >
        {data.versions.map((v) => {
          const meta = versionStatusMeta(v.status);
          return (
            <View key={v.id} style={styles.versionRow}>
              <View style={[styles.versionBadge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                <Text style={[styles.versionNo, { color: meta.color }]}>v{v.versionNo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.versionLabel}>{meta.label}{v.isCurrent ? ' · priced today' : ''}</Text>
                <Text style={styles.versionWindow}>{windowPhrase(v)}</Text>
                {v.changeNote ? <Text style={styles.versionNote} numberOfLines={2}>{v.changeNote}</Text> : null}
              </View>
              <Text style={styles.versionTotal}>{compactRupees(v.totalRupees)}</Text>
            </View>
          );
        })}
        {data.draftCount > 0 && (
          <View style={styles.draftWarn}>
            <Ionicons name="create-outline" size={13} color="#d97706" />
            <Text style={styles.draftWarnText}>
              {data.draftCount} unpublished draft{data.draftCount === 1 ? '' : 's'}. The rates above are NOT the rates
              a draft would publish.
            </Text>
          </View>
        )}
      </Section>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionPrimary} onPress={() => navigation.navigate('FeeStructureEditor', { id })}>
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.actionPrimaryText}>Edit charge lines</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionGhost} onPress={askRevision}>
          <Ionicons name="help-circle-outline" size={16} color={THEME} />
          <Text style={styles.actionGhostText}>Request a review</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.updated}>Last changed {formatDateTime(data.updatedAt)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },

  header: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  headerSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  flagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  flagChipText: { fontSize: 10, color: '#d97706', fontFamily: 'Manrope-SemiBold' },
  headerTotal: { fontSize: 30, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold', marginTop: 10 },
  headerTotalLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  headerSplit: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  headerCell: { flex: 1, alignItems: 'center' },
  headerCellValue: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  headerCellLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  headerDivider: { width: 1, height: 24, backgroundColor: '#e2e8f0' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  changeText: { fontSize: 11, fontFamily: 'Manrope-Medium' },
  changeMuted: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  cardNote: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 16 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  dateInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  dateBtn: { backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  dateBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  dateClear: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  resolveBox: { flexDirection: 'row', gap: 8, marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  resolveText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', lineHeight: 17 },
  resolveSub: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Regular', marginTop: 3 },
  resolvedBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: '#fffbeb', borderRadius: 8, padding: 8 },
  resolvedBannerText: { flex: 1, fontSize: 11, color: '#b45309', fontFamily: 'Manrope-Medium' },

  section: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  sectionNote: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 16 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 11, color: THEME, fontFamily: 'Manrope-SemiBold' },

  linesBox: { marginTop: 10, backgroundColor: '#f8fafc', borderRadius: 12, padding: 4 },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  lineIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  lineBody: { flex: 1 },
  lineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  lineTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold', flexShrink: 1 },
  semChip: { backgroundColor: '#f1f5f9', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#e2e8f0' },
  semChipText: { fontSize: 9, color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  lineNote: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 14 },
  lineWaiver: { fontSize: 10, color: '#7c3aed', fontFamily: 'Manrope-Medium', marginTop: 2 },
  lineAmountBox: { alignItems: 'flex-end', marginLeft: 8 },
  lineAmount: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  lineAmountNetted: { color: '#94a3b8', textDecorationLine: 'line-through' },
  lineNet: { fontSize: 11, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold' },

  totalBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  totalRowBold: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 4, paddingTop: 8 },
  totalLabel: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular' },
  totalLabelBold: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  totalLabelMuted: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  totalValue: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  totalValueBold: { fontSize: 15, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  totalValueMuted: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  semGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  semCell: { width: '23%', backgroundColor: `${THEME}0d`, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  semCellPlain: { backgroundColor: '#f8fafc' },
  semLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  semValue: { fontSize: 12, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 1 },
  semSubhead: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-SemiBold', marginTop: 12 },

  inlineEmpty: { marginTop: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12 },
  inlineEmptyText: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  concessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  concessionDot: { width: 8, height: 8, borderRadius: 4 },
  concessionName: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  concessionOff: { color: '#94a3b8', textDecorationLine: 'line-through' },
  concessionValue: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  concessionAmount: { fontSize: 12, fontWeight: '700', color: '#7c3aed', fontFamily: 'Manrope-Bold' },
  concessionTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  concessionTotalLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium' },
  concessionTotalValue: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  warnBox: { flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: '#fffbeb', borderRadius: 8, padding: 9 },
  warnText: { flex: 1, fontSize: 10, color: '#b45309', fontFamily: 'Manrope-Regular', lineHeight: 15 },

  planHead: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planSummary: { fontSize: 13, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold' },
  planDue: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },
  planRows: { marginTop: 8, backgroundColor: '#f8fafc', borderRadius: 10, padding: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 6 },
  planSeq: { width: 26, fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold' },
  planDate: { flex: 1, fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular' },
  planAmount: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  planFoot: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 8, lineHeight: 15 },

  penaltyBox: { marginTop: 10, backgroundColor: '#fffbeb', borderRadius: 12, padding: 12 },
  penaltyBoxOff: { backgroundColor: '#f0fdf4' },
  penaltyHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  penaltyName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  penaltyScope: { backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  penaltyScopeText: { fontSize: 9, color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  penaltySummary: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular', marginTop: 5, lineHeight: 17 },
  penaltyFigures: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#fde68a' },
  penaltyFig: { flex: 1, alignItems: 'center' },
  penaltyFigValue: { fontSize: 14, fontWeight: '800', color: '#b45309', fontFamily: 'PlusJakartaSans-Bold' },
  penaltyFigLabel: { fontSize: 9, color: '#92400e', fontFamily: 'Manrope-Regular', marginTop: 1 },

  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  versionBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  versionNo: { fontSize: 12, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  versionLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  versionWindow: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  versionNote: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 14 },
  versionTotal: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  draftWarn: { flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: '#fffbeb', borderRadius: 8, padding: 9 },
  draftWarnText: { flex: 1, fontSize: 11, color: '#b45309', fontFamily: 'Manrope-Medium', lineHeight: 16 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: THEME, borderRadius: 12, paddingVertical: 13 },
  actionPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  actionGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14 },
  actionGhostText: { color: THEME, fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  updated: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 14 },
});