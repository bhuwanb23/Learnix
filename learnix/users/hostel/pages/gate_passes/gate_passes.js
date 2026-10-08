/**
 * The warden's gate-pass inbox.
 *
 * WHAT THIS USED TO BE
 * --------------------
 * Six hardcoded rows in a module-level array, no API call at all, approve/reject mutating local
 * state, and two invented stat numbers ("28 today's passes", "6 overnight") that were string
 * literals. Nothing on this screen was ever true. It is now entirely server-driven.
 *
 * WHY IT IS SORTED BY URGENCY AND NOT BY DATE
 * -------------------------------------------
 * The backend orders by `lifecycleRank`: emergency awaiting a decision, then overdue returns,
 * then the approval queue, then departures that were missed, then everything healthy. The old
 * screen ordered by creation date, which put a request from three weeks ago above one where a
 * student is overdue right now. This screen preserves the server's order and does not re-sort.
 *
 * VERIFICATION IS A SEPARATE CLAIM FROM APPROVAL
 * ---------------------------------------------
 * The approve sheet has an explicit "I checked this student's ID" tick, defaulting OFF. Approving
 * a pass records who decided; it does not record that anyone looked at the student's face, and
 * a pass approved without an identity check is a real case the warden needs to see.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hostelApi } from '../../../../services/api';
import { AnimatedCard, SearchBar, EmptyState, SkeletonCard } from '../../../../components/ui';
import PassDetail from './pages/pass_detail/pass_detail';
import DecisionSheet from './components/DecisionSheet';
import { lifecycleMeta, lateBy, fmtDateTime, initials } from './gatePassMeta';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { key: 'All', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Withdrawn' },
];

export default function GatePassesModule() {
  const [passes, setPasses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [facets, setFacets] = useState(null);
  const [stats, setStats] = useState(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(undefined);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [actionOnly, setActionOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [decision, setDecision] = useState(null); // { pass, decision }

  const fetchPage = useCallback(
    async (targetPage, mode) => {
      try {
        if (mode === 'append') setLoadingMore(true);
        else if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await hostelApi.gatePasses({
          q: query || undefined,
          status,
          emergency: emergencyOnly ? 'true' : undefined,
          needsAction: actionOnly ? 'true' : undefined,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setPagination(res.pagination ?? null);
        setFacets(res.facets ?? null);
        setStats(res.stats ?? null);
        setPasses((prev) => (mode === 'append' ? [...prev, ...(res.passes ?? [])] : res.passes ?? []));
      } catch (e) {
        setError(e.message || 'Failed to load gate passes');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [query, status, emergencyOnly, actionOnly],
  );

  // Debounced: `SearchBar` already debounces `onSearch`, but each keystroke still restarts a
  // timer per character and this is a round trip.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchPage(1, 'replace');
    }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, status, emergencyOnly, actionOnly, fetchPage]);

  const loadMore = () => {
    if (!pagination || page >= pagination.totalPages) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next, 'append');
  };

  const reload = () => {
    setPage(1);
    fetchPage(1, 'replace');
  };

  // Counts for the status chips, from the facets. The server computes these from the UNFILTERED
  // set, so a chip never reads "Pending 0" just because you filtered to Approved — which would
  // leave you with no way to see the pending ones again.
  const statusCount = useMemo(() => {
    const m = {};
    (facets?.statuses ?? []).forEach((s) => {
      m[s.status] = s.count;
    });
    return m;
  }, [facets]);

  if (selectedId) {
    return (
      <PassDetail
        passId={selectedId}
        onBack={() => {
          setSelectedId(null);
          reload();
        }}
        onDecide={(pass, d) => setDecision({ pass, decision: d })}
      />
    );
  }

  if (loading && passes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={{ marginTop: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  if (error && passes.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="cloud-offline-outline" size={32} color={theme.colors.textMuted} />
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={reload}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canLoadMore = pagination && page < pagination.totalPages;

  return (
    <View style={styles.container}>
      {/* Stats come from the response. They used to be the literals 28 and 6. */}
      {stats && (
        <AnimatedCard delay={0} style={styles.statsWrap}>
          <View style={styles.statsRow}>
            <Stat value={stats.pending} label="Awaiting" tone="#d97706" />
            <Stat value={stats.overdue} label="Overdue" tone="#dc2626" />
            <Stat value={stats.emergency} label="Emergency" tone="#7c3aed" />
            <Stat value={stats.open} label="Open" tone="#2563eb" />
          </View>
        </AnimatedCard>
      )}

      <View style={{ marginTop: 12 }}>
        <SearchBar placeholder="Search student, room, reason or destination…" onSearch={setQuery} />
      </View>

      {/* Status chips with live counts. */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          const count = f.key === 'All' ? (facets ? stats?.total : undefined) : statusCount[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatus((s) => (f.key === 'All' ? undefined : s === f.key ? undefined : f.key))}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
                {count !== undefined ? ` · ${count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* The two operational shortcuts: emergency only, and "needs me". */}
      <View style={styles.filterRow}>
        <Toggle
          label={`Emergency${stats?.emergency ? ` · ${stats.emergency}` : ''}`}
          active={emergencyOnly}
          onPress={() => setEmergencyOnly((v) => !v)}
        />
        <Toggle
          label="Needs action"
          active={actionOnly}
          onPress={() => setActionOnly((v) => !v)}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
      >
        {passes.length === 0 && !error ? (
          <EmptyState
            icon="exit-outline"
            title="No gate passes"
            subtitle={
              actionOnly
                ? 'Nothing needs your attention right now'
                : query || status
                  ? 'Try a different search or clear the filters'
                  : 'No passes have been requested'
            }
            color="#0891b2"
          />
        ) : (
          passes.map((p, idx) => (
            <PassRow
              key={p.id}
              pass={p}
              delay={Math.min(idx, 8) * 40}
              onPress={() => setSelectedId(p.id)}
              onDecide={setDecision}
              // Separate from `onPress`: a mutation here must refresh the LIST, not push the
              // detail screen. Reusing `onPress` made a successful exit appear to do nothing,
              // because the row it lived on was immediately replaced by a detail view.
              onChanged={reload}
            />
          ))
        )}

        {canLoadMore && (
          <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
            <Text style={styles.loadMoreText}>
              {loadingMore ? 'Loading…' : `Load more (${pagination.total - passes.length} remaining)`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <DecisionSheet
        request={decision}
        onClose={() => setDecision(null)}
        onDone={() => {
          setDecision(null);
          reload();
        }}
      />
    </View>
  );
}

function Stat({ value, label, tone }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: value > 0 ? tone : theme.colors.textMuted }]}>
        {value ?? 0}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Toggle({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.toggleChip, active && styles.toggleChipActive]}
      onPress={onPress}
    >
      <Ionicons
        name={active ? 'checkbox' : 'square-outline'}
        size={13}
        color={active ? '#fff' : theme.colors.textMuted}
      />
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * One pass. The actions offered are exactly the ones the lifecycle permits — an Approve button
 * on a returned pass is a control that can only fail.
 */
function PassRow({ pass, onPress, onDecide, onChanged, delay }) {
  const meta = lifecycleMeta(pass.lifecycle);
  const late = lateBy(pass.minutesLate);
  const decidable = pass.status === 'PENDING';
  const canExit = pass.status === 'APPROVED' && !pass.actualOutAt && !pass.actualInAt;
  const canReturn = pass.status === 'APPROVED' && !!pass.actualOutAt && !pass.actualInAt;

  const markExit = () => {
    Alert.alert('Mark as checked out', `Record that ${pass.student} has left the hostel now?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark exited',
        onPress: async () => {
          try {
            await hostelApi.gatePassExit(pass.id);
            // Refresh the list so the row's lifecycle and its buttons update in place.
            onChanged();
          } catch (e) {
            Alert.alert('Cannot record exit', e.message);
          }
        },
      },
    ]);
  };

  return (
    <AnimatedCard delay={delay} style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, pass.isEmergency && styles.avatarEmergency]}>
          <Text style={[styles.avatarText, pass.isEmergency && { color: '#7c3aed' }]}>
            {initials(pass.student)}
          </Text>
        </View>
        <View style={styles.cardHead}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {pass.student}
            </Text>
            {pass.isEmergency && (
              <View style={styles.emergencyChip}>
                <Ionicons name="flash" size={9} color="#fff" />
                <Text style={styles.emergencyText}>EMERGENCY</Text>
              </View>
            )}
          </View>
          <Text style={styles.roll} numberOfLines={1}>
            {pass.rollNo}
            {pass.room ? ` · Room ${pass.room}` : ''}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.short}</Text>
        </View>
      </View>

      {/* WHY and WHERE are separate lines: "medical" is the reason, the hospital is the
          destination, and a warden deciding on a night out needs the where. */}
      <View style={styles.reasonBox}>
        <Ionicons name="information-circle-outline" size={14} color={theme.colors.textMuted} />
        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.reasonText}>{pass.reason}</Text>
          {pass.destination ? (
            <Text style={styles.destination}>
              <Ionicons name="navigate-outline" size={10} color={theme.colors.textMuted} />{' '}
              {pass.destination}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Planned vs actual, always distinguishable. Showing "Out" and "Back" without saying
          which was which is how a gate log becomes fiction. */}
      <View style={styles.timesRow}>
        <View style={styles.timeItem}>
          <Ionicons name="log-out-outline" size={13} color="#d97706" />
          <Text style={styles.timeText}>
            {pass.actualOutAt ? 'Left' : 'Out'}: {fmtDateTime(pass.actualOutAt ?? pass.outAt)}
          </Text>
        </View>
      </View>
      <View style={styles.timesRow}>
        <View style={styles.timeItem}>
          <Ionicons name="log-in-outline" size={13} color="#059669" />
          <Text style={styles.timeText}>
            {pass.actualInAt ? 'Back' : 'Due'}: {fmtDateTime(pass.actualInAt ?? pass.expectedInAt)}
          </Text>
        </View>
      </View>

      {late && <Text style={styles.lateText}>{late}</Text>}

      {/* An approved pass with no ID check is stated, not hidden — it is the pass a warden
          should look at twice. */}
      {pass.status === 'APPROVED' && !pass.idVerified && (
        <View style={styles.unverifiedRow}>
          <Ionicons name="id-card-outline" size={12} color="#94a3b8" />
          <Text style={styles.unverifiedText}>Approved without an ID check</Text>
        </View>
      )}

      {pass.status === 'REJECTED' && (
        <Text style={styles.noteText}>
          {pass.decisionNote ? `Reason: ${pass.decisionNote}` : 'Rejected — no reason recorded'}
        </Text>
      )}

      {(decidable || canExit || canReturn) && (
        <View style={styles.actionRow}>
          {decidable && (
            <>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => onDecide(pass, 'REJECTED')}
              >
                <Ionicons name="close-outline" size={15} color="#dc2626" />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => onDecide(pass, 'APPROVED')}
              >
                <Ionicons name="checkmark-outline" size={15} color="#fff" />
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
            </>
          )}
          {canExit && (
            <TouchableOpacity style={styles.gateBtn} onPress={markExit}>
              <Ionicons name="log-out-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.gateText}>Mark exited</Text>
            </TouchableOpacity>
          )}
          {canReturn && (
            <TouchableOpacity style={styles.gateBtn} onPress={() => onDecide(pass, 'RETURN')}>
              <Ionicons name="log-in-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.gateText}>Mark returned</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 8 },
  retryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  statsWrap: { marginTop: 14, padding: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  statValue: { fontSize: 16, fontFamily: 'Manrope-ExtraBold' },
  statLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 7,
    marginBottom: 6,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  filterTextActive: { color: '#fff' },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 7,
    marginBottom: 6,
  },
  toggleChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  toggleText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted, marginLeft: 5 },
  toggleTextActive: { color: '#fff' },
  list: { paddingTop: 10, paddingBottom: 24 },
  card: { padding: 12, marginBottom: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarEmergency: { backgroundColor: '#ede9fe' },
  avatarText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#2563eb' },
  cardHead: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, flexShrink: 1 },
  emergencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 6,
  },
  emergencyText: { fontSize: 8, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 2 },
  roll: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontFamily: 'Manrope-Bold' },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  reasonText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  destination: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  timesRow: { flexDirection: 'row', marginTop: 6 },
  timeItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  timeText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginLeft: 5 },
  lateText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#dc2626', marginTop: 7 },
  unverifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  unverifiedText: { fontSize: 10, fontFamily: 'Manrope-Medium', color: '#94a3b8', marginLeft: 4 },
  noteText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#dc2626', marginTop: 7 },
  actionRow: { flexDirection: 'row', marginTop: 12 },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 10,
    marginRight: 8,
  },
  rejectText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#dc2626', marginLeft: 4 },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  approveText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 4 },
  gateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
  },
  gateText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.primary, marginLeft: 5 },
  loadMore: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.primary },
});