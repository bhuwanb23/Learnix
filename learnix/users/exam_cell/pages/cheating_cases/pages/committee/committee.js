/**
 * X-08 — Cheating cases: the committee review queue.
 * (docs/users/05 §3.6)
 *
 * THE CASES A COMMITTEE HAS TO LOOK AT, AND WHAT IT FOUND.
 *
 * This is not the whole queue again with a different title. It is the cases that have been REFERRED
 * for a second opinion, plus the cases the committee has already seen — because the question a
 * controller asks here is "what is waiting on the committee, and what did the last committee
 * conclude", and the second half is the one the general queue cannot answer.
 *
 * THE RECOMMENDATION IS NOT A DECISION
 * -----------------------------------
 * A committee recommends; the exam cell decides. The screen says which is which, because a
 * recommendation that reads like a verdict is how a case gets closed by the people who were only
 * supposed to advise on it.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../services/api';
import {
  GREEN,
  MUTED,
  RED,
  SLATE,
  THEME,
  VIOLET,
  fmtDate,
  fmtDateTime,
  plural,
  riskMeta,
  statusMeta,
  timeAgo,
} from '../../cheating_casesMeta';
import {
  CaseRow,
  CheatingScreen,
  EmptyState,
  ErrorState,
  FilterChips,
  LoadingState,
  NoteStrip,
  StatGrid,
  useCheating,
} from '../../cheating_casesUi';

const FILTERS = [
  { value: 'COMMITTEE_REVIEW', label: 'Waiting on the committee', color: VIOLET },
  { value: 'ESCALATED', label: 'Escalated', color: '#4f46e5' },
  { value: 'UNDER_REVIEW', label: 'In review', color: THEME },
  { value: 'ALL', label: 'All open', color: SLATE },
];

export default function CheatingCasesCommittee({ navigation }) {
  const [status, setStatus] = useState('COMMITTEE_REVIEW');
  const [page, setPage] = useState(1);

  const queue = useCheating(
    () => examcellApi.cheatingCases({ status, page, pageSize: 20 }),
    [status, page],
  );
  const cases = queue.data?.cases ?? [];

  const reload = useCallback(() => queue.reload(), [queue]);

  const applyFilter = (v) => {
    setStatus(v);
    setPage(1);
  };

  return (
    <CheatingScreen
      title="Committee review"
      blurb="Cases referred for a second opinion, and what the committee found."
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
            { label: 'With committee', value: status === 'COMMITTEE_REVIEW' ? cases.length : undefined, tone: VIOLET },
          ]}
        />

        <FilterChips options={FILTERS} value={status} onChange={applyFilter} />

        <NoteStrip>
          A committee recommends; the exam cell decides. Nothing here closes a case on its own, and a
          recommendation that reads like a verdict is how a case gets closed by the people who were
          only supposed to advise on it.
        </NoteStrip>

        {queue.loading && !queue.data ? (
          <LoadingState label="Loading the committee queue" />
        ) : queue.error ? (
          <ErrorState message={queue.error} onRetry={reload} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Nothing with the committee"
            message={
              status === 'COMMITTEE_REVIEW'
                ? 'No case is waiting for a committee.'
                : 'No case in this state.'
            }
          />
        ) : (
          cases.map((c) => (
            <View key={c.id}>
              <CaseRow
                item={c}
                onPress={() => navigation?.navigate?.('CheatingCasesDetail', { caseId: c.id })}
              />
              {c.reviewNote ? (
                <View style={styles.finding}>
                  <View style={styles.findingHead}>
                    <Ionicons name="document-text-outline" size={12} color={VIOLET} />
                    <Text style={styles.findingLabel}>What the committee found</Text>
                    <Text style={styles.findingDate}>{fmtDateTime(c.reviewedAt)}</Text>
                  </View>
                  <Text style={styles.findingText}>{c.reviewNote}</Text>
                  {c.committeeUserIds?.length ? (
                    <Text style={styles.findingMeta}>
                      {plural(c.committeeUserIds.length, 'member')} on the panel
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))
        )}

        {queue.data?.pagination?.hasMore ? (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setPage((p) => p + 1)}
            activeOpacity={0.8}
          >
            <Text style={styles.moreText}>Load more</Text>
            <Ionicons name="chevron-down" size={14} color={THEME} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </CheatingScreen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 40 },
  flex: { flex: 1 },

  finding: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderLeftWidth: 3,
    borderLeftColor: VIOLET,
    padding: 12,
    marginHorizontal: 20,
    marginTop: -5,
    marginBottom: 10,
  },
  findingHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  findingLabel: { fontSize: 10.5, fontWeight: '700', color: VIOLET, flex: 1 },
  findingDate: { fontSize: 10, color: MUTED },
  findingText: { fontSize: 12, color: '#475569', marginTop: 5, lineHeight: 18 },
  findingMeta: { fontSize: 10, color: MUTED, marginTop: 4 },

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
});
