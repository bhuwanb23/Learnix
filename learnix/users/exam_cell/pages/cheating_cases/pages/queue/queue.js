/**
 * X-08 — Cheating cases: the queue.
 * (docs/users/05 §3.6)
 *
 * The whole worklist, filtered and paged on the SERVER.
 *
 * WHY THE FILTERS ARE NOT DONE HERE
 * --------------------------------
 * The overdue filter is derived from the risk level and the age of a case, against thresholds the
 * server owns. A client-side copy of that rule would disagree with the API the first time somebody
 * edited the thresholds — and it would disagree in the direction that hides the cases nobody wants to
 * look at. So the filter is a query parameter, and the server does the arithmetic.
 *
 * The counts on the chips come from the same response, so a chip's number and the list under it
 * cannot come from two different questions.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../services/api';
import {
  AMBER,
  GREEN,
  MUTED,
  RED,
  SLATE,
  THEME,
  VIOLET,
  plural,
  riskMeta,
  statusMeta,
} from '../../cheating_casesMeta';
import {
  CaseRow,
  CheatingScreen,
  EmptyState,
  ErrorState,
  FilterChips,
  LoadingState,
  StatGrid,
  useCheating,
} from '../../cheating_casesUi';

const STATUS_FILTERS = [
  { value: 'OPEN', label: 'Open', color: THEME },
  { value: 'ALL', label: 'All', color: SLATE },
  { value: 'REPORTED', label: 'Reported', color: '#0891b2' },
  { value: 'UNDER_REVIEW', label: 'In review', color: AMBER },
  { value: 'COMMITTEE_REVIEW', label: 'Committee', color: VIOLET },
  { value: 'ESCALATED', label: 'Escalated', color: '#4f46e5' },
  { value: 'CONFIRMED', label: 'Confirmed', color: RED },
  { value: 'DISMISSED', label: 'Dismissed', color: GREEN },
];

const RISK_FILTERS = [
  { value: 'ALL', label: 'Any risk', color: SLATE },
  { value: 'HIGH', label: 'High', color: RED },
  { value: 'MEDIUM', label: 'Medium', color: AMBER },
  { value: 'LOW', label: 'Low', color: '#ca8a04' },
];

export default function CheatingCasesQueue({ navigation, route }) {
  const [status, setStatus] = useState(route?.params?.filter?.status ?? 'OPEN');
  const [risk, setRisk] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const params = {
    status,
    riskLevel: risk === 'ALL' ? undefined : risk,
    overdueOnly: overdueOnly ? 'true' : undefined,
    q: query.trim() || undefined,
    page,
    pageSize: 20,
  };

  const queue = useCheating(() => examcellApi.cheatingCases(params), [status, risk, overdueOnly, query, page]);
  const cases = queue.data?.cases ?? [];
  const stats = queue.data?.stats;

  const reload = useCallback(() => queue.reload(), [queue]);

  const applyFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const hasMore = Boolean(queue.data?.pagination?.hasMore);

  return (
    <CheatingScreen
      title="Case queue"
      blurb="Everything waiting on a decision, worst first."
      onBack={() => navigation?.goBack?.()}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={queue.refreshing} onRefresh={reload} tintColor={THEME} />
        }
      >
        <StatGrid
          stats={[
            { label: 'Shown', value: queue.data?.pagination?.total },
            { label: 'Open', value: stats?.open, tone: AMBER },
            { label: 'Overdue', value: stats?.overdue, tone: RED },
          ]}
        />

        <View style={styles.searchRow}>
          <Ionicons name="search" size={15} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(v) => applyFilter(setQuery, v)}
            placeholder="Search issue, roll number or name"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query ? (
            <TouchableOpacity onPress={() => applyFilter(setQuery, '')} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color={MUTED} />
            </TouchableOpacity>
          ) : null}
        </View>

        <FilterChips
          options={STATUS_FILTERS}
          value={status}
          onChange={(v) => applyFilter(setStatus, v)}
        />
        <FilterChips
          options={RISK_FILTERS}
          value={risk}
          onChange={(v) => applyFilter(setRisk, v)}
        />

        <TouchableOpacity
          style={[styles.overdueToggle, overdueOnly && styles.overdueToggleOn]}
          onPress={() => applyFilter(setOverdueOnly, !overdueOnly)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="time-outline"
            size={14}
            color={overdueOnly ? '#fff' : RED}
          />
          <Text style={[styles.overdueToggleText, overdueOnly && styles.overdueToggleTextOn]}>
            Overdue only — a high-risk case waiting too long is the desk's problem
          </Text>
        </TouchableOpacity>

        {queue.loading && !queue.data ? (
          <LoadingState label="Loading the queue" />
        ) : queue.error ? (
          <ErrorState message={queue.error} onRetry={reload} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="Nothing matches"
            message={
              query
                ? `No case matches "${query}".`
                : status === 'OPEN'
                  ? 'No case is waiting on a decision.'
                  : 'No case has this status.'
            }
            action={overdueOnly || risk !== 'ALL' || status !== 'OPEN' ? 'Clear the filters' : undefined}
            onAction={() => {
              applyFilter(setStatus, 'OPEN');
              applyFilter(setRisk, 'ALL');
              applyFilter(setOverdueOnly, false);
              applyFilter(setQuery, '');
            }}
          />
        ) : (
          cases.map((c) => (
            <CaseRow
              key={c.id}
              item={c}
              onPress={() => navigation?.navigate?.('CheatingCasesDetail', { caseId: c.id })}
            />
          ))
        )}

        {hasMore ? (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setPage((p) => p + 1)}
            activeOpacity={0.8}
          >
            {queue.loadingMore ? (
              <Text style={styles.moreText}>Loading…</Text>
            ) : (
              <>
                <Text style={styles.moreText}>Load more</Text>
                <Ionicons name="chevron-down" size={14} color={THEME} />
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {cases.length > 0 ? (
          <Text style={styles.footNote}>
            {plural(cases.length, 'case')} shown, worst first. The order is the server's — it puts the
            case that has waited longest and matters most at the top.
          </Text>
        ) : null}
      </ScrollView>
    </CheatingScreen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 40 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 12.5, color: '#0f172a', padding: 0 },

  overdueToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: RED,
    backgroundColor: '#fff',
  },
  overdueToggleOn: { backgroundColor: RED },
  overdueToggleText: { flex: 1, fontSize: 10.5, color: RED, lineHeight: 15 },
  overdueToggleTextOn: { color: '#fff' },

  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginHorizontal: 20,
    marginTop: 6,
    paddingVertical: 11,
  },
  moreText: { fontSize: 12, fontWeight: '600', color: THEME },

  footNote: {
    fontSize: 10.5,
    color: MUTED,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 34,
    lineHeight: 16,
  },
});
