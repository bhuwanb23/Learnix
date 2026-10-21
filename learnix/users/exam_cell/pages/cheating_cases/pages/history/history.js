/**
 * X-08 — Cheating cases: the historical record.
 * (docs/users/05 §3.6)
 *
 * WHAT HAS BEEN DECIDED, AND THE ANSWER TO "HAVE THEY BEEN IN TROUBLE BEFORE".
 *
 * This is a RECORD, not a worklist. The queue is "what is open"; this is "what was decided", and the
 * two are separate because the question a committee asks about a student — has this happened before —
 * is a question about decisions, and answering it from the open queue would find nothing.
 *
 * THE FILTERS ARE THE QUESTIONS SOMEBODY ACTUALLY ASKS
 * ------------------------------------------------------
 * By outcome, by risk, by classification, and by student. A search over the whole history, because
 * "did we do this student last year" spans every exam they have sat.
 *
 * A DISMISSED CASE IS A RECORD TOO
 * ------------------------------
 * It is not a smaller thing than a confirmed one. A student who was cleared has been through
 * something, and a file that only remembered the guilty would tell the next committee a story that is
 * not true.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../services/api';
import {
  AMBER,
  GREEN,
  MUTED,
  RED,
  SLATE,
  THEME,
  classificationMeta,
  fmtDate,
  initials,
  penaltyMeta,
  plural,
  riskMeta,
  statusMeta,
} from '../../cheating_casesMeta';
import {
  CheatingScreen,
  DetailRow,
  EmptyState,
  ErrorState,
  FilterChips,
  LoadingState,
  useCheating,
} from '../../cheating_casesUi';

const OUTCOME_FILTERS = [
  { value: 'ALL', label: 'Every decision', color: SLATE },
  { value: 'CONFIRMED', label: 'Confirmed', color: RED },
  { value: 'DISMISSED', label: 'Dismissed', color: GREEN },
  { value: 'ESCALATED', label: 'Escalated', color: '#4f46e5' },
];

const RISK_FILTERS = [
  { value: 'ALL', label: 'Any risk', color: SLATE },
  { value: 'HIGH', label: 'High', color: RED },
  { value: 'MEDIUM', label: 'Medium', color: AMBER },
  { value: 'LOW', label: 'Low', color: '#ca8a04' },
];

export default function CheatingCasesHistory({ navigation }) {
  const [status, setStatus] = useState('ALL');
  const [risk, setRisk] = useState('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const history = useCheating(
    () =>
      examcellApi.cheatingHistory({
        status,
        riskLevel: risk === 'ALL' ? undefined : risk,
        q: query.trim() || undefined,
        page,
        pageSize: 20,
      }),
    [status, risk, query, page],
  );

  const cases = history.data?.cases ?? [];

  const reload = useCallback(() => history.reload(), [history]);

  const applyFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <CheatingScreen
      title="Historical records"
      blurb="Every case that has been decided, and why."
      onBack={() => navigation?.goBack?.()}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={history.refreshing} onRefresh={reload} tintColor={THEME} />
        }
      >
        <View style={styles.searchRow}>
          <Ionicons name="search" size={15} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(v) => applyFilter(setQuery, v)}
            placeholder="Search by issue, roll number or name"
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
          options={OUTCOME_FILTERS}
          value={status}
          onChange={(v) => applyFilter(setStatus, v)}
        />
        <FilterChips
          options={RISK_FILTERS}
          value={risk}
          onChange={(v) => applyFilter(setRisk, v)}
        />

        <Text style={styles.count}>
          {history.data?.pagination?.total !== undefined
            ? plural(history.data.pagination.total, 'decided case')
            : 'Loading…'}
        </Text>

        {history.loading && !history.data ? (
          <LoadingState label="Loading the record" />
        ) : history.error ? (
          <ErrorState message={history.error} onRetry={reload} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="Nothing decided yet"
            message="Once a case is confirmed or dismissed it is recorded here, and stays here."
          />
        ) : (
          cases.map((c) => {
            const status = statusMeta(c.status);
            const risk = riskMeta(c.riskLevel);
            const cls = classificationMeta(c.classification);
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.record}
                onPress={() => navigation?.navigate?.('CheatingCasesDetail', { caseId: c.id })}
                activeOpacity={0.8}
              >
                <View style={styles.recordTop}>
                  <View style={[styles.avatar, { backgroundColor: risk.bg }]}>
                    <Text style={[styles.avatarText, { color: risk.color }]}>
                      {initials(c.student?.name)}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.recordName}>{c.student?.name ?? 'Unknown student'}</Text>
                    <Text style={styles.recordMeta}>
                      {c.student?.rollNo ?? '—'} · {c.course?.code ?? '—'} · {c.exam?.name ?? '—'}
                    </Text>
                    <Text style={styles.recordIssue} numberOfLines={2}>
                      {c.issue}
                    </Text>
                  </View>
                  <View style={[styles.outcomeChip, { backgroundColor: status.color + '1A' }]}>
                    <Ionicons name={status.icon} size={10} color={status.color} />
                    <Text style={[styles.outcomeText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.recordFoot}>
                  <View style={styles.recordFootItem}>
                    <Ionicons name="pricetag-outline" size={11} color={MUTED} />
                    <Text style={styles.recordFootText}>{cls.label}</Text>
                  </View>
                  {c.penalty ? (
                    <View style={styles.recordFootItem}>
                      <Ionicons name="hammer-outline" size={11} color={AMBER} />
                      <Text style={styles.recordFootText}>{penaltyMeta(c.penalty).label}</Text>
                    </View>
                  ) : null}
                  <View style={styles.recordFootItem}>
                    <Ionicons name="calendar-outline" size={11} color={MUTED} />
                    <Text style={styles.recordFootText}>
                      Decided {fmtDate(c.decidedAt ?? c.createdAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {history.data?.pagination?.hasMore ? (
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

  count: {
    fontSize: 11,
    color: MUTED,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
  },

  record: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 13,
    marginHorizontal: 20,
    marginBottom: 9,
  },
  recordTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  avatarText: { fontSize: 14, fontWeight: '800' },
  recordName: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },
  recordMeta: { fontSize: 10.5, color: SLATE, marginTop: 1 },
  recordIssue: { fontSize: 11.5, color: '#475569', marginTop: 3, lineHeight: 16 },
  outcomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  outcomeText: { fontSize: 9, fontWeight: '700' },

  recordFoot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  recordFootItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recordFootText: { fontSize: 10, color: MUTED },

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
