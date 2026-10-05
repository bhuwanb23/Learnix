import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { SkeletonCard, EmptyState, SearchBar } from '../../../../../../components/ui';
import { DonationRow } from '../../components/DonationRow';
import { inr, lookup, FUNDS, donationStatusMeta } from '../../donationsMeta';

/**
 * Donation history — the ledger, with the filters that make it usable.
 *
 * Two views: the whole programme's giving, and your own. "My giving" is a `mine`
 * flag, not a userId, so the server resolves the donor from the session and a
 * client cannot read somebody else's history.
 */
export default function HistoryScreen({ navigation, onRecord, recordingId, onChanged, onShowReceipt }) {
  const [scope, setScope] = useState('all');
  const [status, setStatus] = useState('');
  const [fund, setFund] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (targetPage = 1, spinner = true) => {
      try {
        if (spinner) setLoading(true);
        setError(null);
        const res = await alumniApi.donations({
          page: targetPage,
          pageSize: 15,
          mine: scope === 'mine' ? 'true' : undefined,
          status: status || undefined,
          fund: fund || undefined,
        });
        setData(res);
        setPage(targetPage);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [scope, status, fund],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const rows = (data?.donations ?? []).filter((d) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (d.donor ?? '').toLowerCase().includes(q) ||
      (d.campaign?.name ?? '').toLowerCase().includes(q) ||
      (d.fundLabel ?? '').toLowerCase().includes(q)
    );
  });

  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
          <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Donation history</Text>
          <Text style={styles.sub}>{pagination.total} gift(s) on record</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, scope === 'all' && styles.tabActive]} onPress={() => setScope('all')}>
          <Text style={[styles.tabText, scope === 'all' && styles.tabTextActive]}>Programme</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, scope === 'mine' && styles.tabActive]} onPress={() => setScope('mine')}>
          <Text style={[styles.tabText, scope === 'mine' && styles.tabTextActive]}>My giving</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search donor or cause…" onSearch={setQuery} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterWrap} contentContainerStyle={styles.filterRow}>
        <FilterChip label="All statuses" active={status === ''} onPress={() => setStatus('')} />
        {['RECEIVED', 'PLEDGED'].map((s) => (
          <FilterChip
            key={s}
            label={donationStatusMeta(s).short}
            active={status === s}
            onPress={() => setStatus(status === s ? '' : s)}
            color={donationStatusMeta(s).color}
          />
        ))}
        <View style={styles.divider} />
        {FUNDS.map((f) => (
          <FilterChip key={f.id} label={f.label} active={fund === f.id} onPress={() => setFund(fund === f.id ? '' : f.id)} color={f.color} />
        ))}
      </ScrollView>

      {loading && !data ? (
        <View style={{ paddingHorizontal: 16 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load(1)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(page, false); }} />}
        >
          {/* Totals are aggregated over every matching gift, not summed from the
              15 rows on screen — the page and the header would otherwise disagree. */}
          <View style={styles.totals}>
            <TotalCell value={inr(data?.fy?.collectedRupees ?? 0)} label="received" />
            <TotalCell value={inr(data?.fy?.pledgedRupees ?? 0)} label="pledged" />
            <TotalCell value={String(data?.fy?.donors ?? 0)} label="donors" />
          </View>

          {rows.map((d) => (
            <DonationRow
              key={d.id}
              donation={d}
              busy={recordingId === d.id}
              onRecord={onRecord ? () => onRecord(d) : undefined}
              onShowReceipt={onShowReceipt ? () => onShowReceipt(d) : undefined}
            />
          ))}

          {rows.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title={scope === 'mine' ? 'You have not given yet' : 'No gifts match'}
              subtitle={
                scope === 'mine'
                  ? 'Your gifts will appear here with a receipt once the office confirms the money.'
                  : 'Try clearing the status and fund filters.'
              }
              color="#d97706"
            />
          ) : null}

          {/* Pagination is real. The old screen fetched page 1 forever, so a donor
              with 40 gifts could only ever see the newest 20. */}
          {pagination.totalPages > 1 ? (
            <View style={styles.pager}>
              <PagerBtn label="Previous" disabled={page <= 1} onPress={() => load(page - 1)} />
              <Text style={styles.pagerText}>
                Page {page} of {pagination.totalPages}
              </Text>
              <PagerBtn label="Next" disabled={page >= pagination.totalPages} onPress={() => load(page + 1)} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function TotalCell({ value, label }) {
  return (
    <View style={styles.totalCell}>
      <Text style={styles.totalValue}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress, color }) {
  const c = color ?? '#0891b2';
  return (
    <TouchableOpacity style={[styles.chip, active && { backgroundColor: c, borderColor: c }]} onPress={onPress}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PagerBtn({ label, disabled, onPress }) {
  return (
    <TouchableOpacity style={[styles.pagerBtn, disabled && styles.pagerDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.pagerBtnText, disabled && { color: theme.colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { marginTop: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#0891b2', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10, alignSelf: 'center' },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  sub: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },

  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 12 },
  tab: { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 9 },
  tabActive: { backgroundColor: '#0891b2', borderColor: '#0891b2' },
  tabText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  tabTextActive: { color: '#fff' },

  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  filterWrap: { flexGrow: 0, marginTop: 10 },
  filterRow: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  divider: { width: 1, height: 18, backgroundColor: theme.colors.border, marginHorizontal: 3 },

  list: { padding: 16, paddingBottom: 28 },
  totals: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 11 },
  totalCell: { flex: 1, alignItems: 'center' },
  totalValue: { fontSize: 14, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  totalLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pagerBtn: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  pagerDisabled: { backgroundColor: theme.colors.surfaceMuted },
  pagerBtnText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#2563eb' },
  pagerText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
});
