// F-04 Fee Structure — the pricing desk (docs/users/06 §3.5).
//
// The screen this replaces was one expandable card per program showing two
// numbers — tuition and "other" — with a **Request Revision** button that set a
// status and told the officer a revision had been "submitted for admin
// approval". Nothing else was possible. It could not answer:
//
//   · what the hostel charge actually is, or that it is optional
//   · what semester 3 costs versus semester 1
//   · what a 50% merit concession comes to in rupees
//   · what the fee was LAST year, or why it changed
//   · which version priced a bill raised in July, after a November revision
//   · how the fee is meant to be split into instalments
//   · what the late-payment penalty on this program is
//
// So it is now a hub with six sub-screens, one per sub-feature, and every number
// is derived by the server. What this file decides is what to SAY about the
// numbers, which is where the value is:
//
//   · the headline is the MANDATORY bill, with optional charges called out —
//     a "total fee" that silently includes a hostel bed nobody is taking is a
//     number the office cannot defend to a day-scholar's family
//   · a year-on-year figure is shown as "+8% since 2025-26" or, when there is
//     nothing to compare against, as that fact rather than as a fabricated 0%
//   · a structure with an open draft is badged, because the rates on screen are
//     then NOT the rates someone is about to publish
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { rupees, compactRupees, kindMeta, THEME } from './feeStructureMeta';

const SORTS = [
  { id: 'PROGRAM', label: 'By program' },
  { id: 'TOTAL_DESC', label: 'Highest fee first' },
  { id: 'YEAR', label: 'Newest year first' },
];

// ── Row ────────────────────────────────────────────────────
function StructureRow({ item, onPress }) {
  const draft = item.hasDraft;
  const mandatory = item.mandatoryRupees;

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.rowTop}>
        <View style={styles.rowIcon}>
          <Ionicons name="school-outline" size={17} color={THEME} />
        </View>

        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.program}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.programCode} · {item.academicYear}
            {item.isCurrentYear ? ' · current year' : ''}
          </Text>
        </View>

        <View style={styles.rowAmountBox}>
          <Text style={styles.rowAmount}>{compactRupees(item.totalRupees)}</Text>
          <Text style={styles.rowAmountLabel}>per year</Text>
        </View>
      </View>

      {/* The mandatory bill is the number a family is actually told to pay. */}
      <View style={styles.rowStats}>
        <Stat label="Tuition" value={compactRupees(item.tuitionRupees)} color={kindMeta('TUITION').color} />
        <Stat label="Other" value={compactRupees(item.otherRupees)} color="#64748b" />
        <Stat label="After concessions" value={compactRupees(item.netAfterConcessionRupees)} color="#059669" />
      </View>

      {item.optionalRupees > 0 && (
        <View style={styles.optionalRow}>
          <Ionicons name="information-circle-outline" size={13} color="#b45309" />
          <Text style={styles.optionalText} numberOfLines={1}>
            {rupees(item.optionalRupees)} of optional charges not included in the {rupees(mandatory)} headline
          </Text>
        </View>
      )}

      <View style={styles.rowFooter}>
        <Badge icon="layers-outline" text={`v${item.publishedVersionNo ?? '—'} · ${item.versionCount} version${item.versionCount === 1 ? '' : 's'}`} />
        {item.concessionCount > 0 && (
          <Badge icon="ribbon-outline" text={`${item.concessionCount} concession${item.concessionCount === 1 ? '' : 's'}`} color="#7c3aed" />
        )}
        {draft && <Badge icon="create-outline" text="Draft open" color="#d97706" />}
        {item.status === 'REVISION_REQUESTED' && <Badge icon="help-circle-outline" text="Revision requested" color="#d97706" />}
        {item.installmentCount > 1 && (
          <Badge icon="calendar-outline" text={item.installmentSummary} color="#0891b2" />
        )}
      </View>

      {!item.penalty?.enabled && (
        <View style={styles.penaltyRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color="#64748b" />
          <Text style={styles.penaltyText}>{item.penalty?.summary ?? 'No late-payment penalty applies'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Badge({ icon, text, color = '#64748b' }) {
  return (
    <View style={styles.badge}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[styles.badgeText, { color }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// ── Hub ────────────────────────────────────────────────────
export default function FeeStructureModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [programId, setProgramId] = useState('');
  const [sort, setSort] = useState('PROGRAM');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.feeStructures({ q: q || undefined, programId: programId || undefined, sort });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q, programId, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const items = data?.items ?? [];
  const stats = data?.stats ?? {};
  const programs = data?.filters?.programs ?? [];

  const yearGroups = useMemo(() => {
    const map = new Map();
    for (const i of items) {
      const arr = map.get(i.academicYear) ?? [];
      arr.push(i);
      map.set(i.academicYear, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME} />
        <Text style={styles.loadingText}>Loading fee structures…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* ── Hero: what the fee desk is accountable for this year ── */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>
          {stats.currentYearName ? `Published fees · ${stats.currentYearName}` : 'Published fee structures'}
        </Text>
        <Text style={styles.heroValue}>{rupees(stats.annualTotalRupees ?? 0)}</Text>
        <Text style={styles.heroSub}>
          across {stats.structureCount ?? 0} structure{stats.structureCount === 1 ? '' : 's'} ·{' '}
          {stats.programCount ?? 0} program{stats.programCount === 1 ? '' : 's'}
        </Text>

        <View style={styles.heroSplit}>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellValue}>{compactRupees(stats.tuitionRupees ?? 0)}</Text>
            <Text style={styles.heroCellLabel}>Tuition</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroCell}>
            <Text style={styles.heroCellValue}>{compactRupees(stats.otherRupees ?? 0)}</Text>
            <Text style={styles.heroCellLabel}>All other charges</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroCell}>
            <Text style={styles.heroCellValue}>{compactRupees(stats.averageRupees ?? 0)}</Text>
            <Text style={styles.heroCellLabel}>Average fee</Text>
          </View>
        </View>

        {(stats.draftCount > 0 || stats.concessionCount > 0) && (
          <View style={styles.heroNotes}>
            {stats.draftCount > 0 && (
              <Text style={styles.heroNote}>
                <Ionicons name="create-outline" size={11} color="#d97706" />{'  '}
                {stats.draftCount} structure{stats.draftCount === 1 ? ' has' : 's have'} an unpublished draft
              </Text>
            )}
            {stats.concessionCount > 0 && (
              <Text style={styles.heroNote}>
                <Ionicons name="ribbon-outline" size={11} color="#7c3aed" />{'  '}
                {stats.concessionCount} live concession rule{stats.concessionCount === 1 ? '' : 's'}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ── Filters ── */}
      <TextInput
        style={styles.search}
        placeholder="Search a program or a year…"
        placeholderTextColor="#94a3b8"
        value={q}
        onChangeText={setQ}
        autoCorrect={false}
      />

      {programs.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <TouchableOpacity onPress={() => setProgramId('')} activeOpacity={0.8} style={[styles.chip, !programId && styles.chipOn]}>
            <Text style={[styles.chipText, !programId && styles.chipTextOn]}>All programs</Text>
          </TouchableOpacity>
          {programs.map((p) => {
            // The filter is applied by programId, so the picker must hold the
            // id — matching on the code would silently return nothing.
            const active = programId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setProgramId(active ? '' : p.id)}
                activeOpacity={0.8}
                style={[styles.chip, active && styles.chipOn]}
              >
                <Text style={[styles.chipText, active && styles.chipTextOn]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {SORTS.map((s) => {
          const on = sort === s.id;
          return (
            <TouchableOpacity key={s.id} onPress={() => setSort(s.id)} activeOpacity={0.8} style={[styles.chip, on && styles.chipOn]}>
              <Ionicons name={on ? 'checkmark' : 'swap-vertical-outline'} size={12} color={on ? '#fff' : '#64748b'} />
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Rows, grouped by year ── */}
      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="pricetag-outline" size={34} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No fee structures match</Text>
          <Text style={styles.emptyText}>
            {programId || q
              ? 'Clear the filters to see every program.'
              : 'No program has a published fee structure yet. Open a program’s page in the admin module to price one.'}
          </Text>
          {(programId || q) && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setQ(''); setProgramId(''); }}>
              <Text style={styles.retryText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        yearGroups.map(([year, group]) => (
          <View key={year} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{year}</Text>
              <Text style={styles.groupCount}>
                {group.length} program{group.length === 1 ? '' : 's'} ·{' '}
                {compactRupees(group.reduce((s, i) => s + i.totalRupees, 0))}
              </Text>
            </View>
            {group.map((item) => (
              <StructureRow
                key={item.id}
                item={item}
                onPress={() => navigation.navigate('FeeStructureDetail', { id: item.id })}
              />
            ))}
          </View>
        ))
      )}

      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={13} color="#94a3b8" />
        <Text style={styles.footerText}>
          A bill is priced by the version in force on the day it was raised — not by today's rate.
          Tap a program to see its charge lines, version history and concession rules.
        </Text>
      </View>
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

  hero: { backgroundColor: '#ffffff', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#eef2f7' },
  heroLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  heroValue: { fontSize: 28, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },
  heroSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  heroSplit: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  heroCell: { flex: 1, alignItems: 'center' },
  heroCellValue: { fontSize: 15, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  heroCellLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1, textAlign: 'center' },
  heroDivider: { width: 1, height: 26, backgroundColor: '#e2e8f0' },
  heroNotes: { marginTop: 12, gap: 4 },
  heroNote: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },

  search: {
    backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#0f172a',
    fontFamily: 'Manrope-Regular', marginBottom: 10,
  },
  chipScroll: { marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, paddingHorizontal: 12,
    paddingVertical: 7, marginRight: 8,
  },
  chipOn: { backgroundColor: THEME, borderColor: THEME },
  chipText: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium' },
  chipTextOn: { color: '#fff', fontFamily: 'Manrope-Bold' },

  group: { marginBottom: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 6 },
  groupTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  groupCount: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  row: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: `${THEME}14`, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  rowAmountBox: { alignItems: 'flex-end' },
  rowAmount: { fontSize: 16, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  rowAmountLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  rowStats: { flexDirection: 'row', marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 10, paddingVertical: 8 },
  miniStat: { flex: 1, alignItems: 'center' },
  miniStatValue: { fontSize: 13, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  miniStatLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },

  optionalRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  optionalText: { flex: 1, fontSize: 11, color: '#b45309', fontFamily: 'Manrope-Regular' },

  rowFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontFamily: 'Manrope-Medium' },

  penaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  penaltyText: { flex: 1, fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  emptyCard: { alignItems: 'center', paddingVertical: 44, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7' },
  emptyTitle: { marginTop: 12, fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  emptyText: { marginTop: 6, fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },

  footer: { flexDirection: 'row', gap: 6, marginTop: 12, paddingHorizontal: 4 },
  footerText: { flex: 1, fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', lineHeight: 16 },
});
