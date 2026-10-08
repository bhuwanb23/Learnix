/**
 * The warden's visitor desk.
 *
 * WAS A MOCK. This screen used to hold five hardcoded visitors in `useState`, offer two free-text
 * boxes for the resident and the room, and print a literal `24` for "this week". None of it came
 * from the server, so none of it could be right: a name typed by hand cannot resolve to a
 * `studentProfileId`, and a stat nobody counted is decoration. Everything below is driven by
 * `GET /hostel/visitors`, and the counters come off `response.stats`.
 *
 * WHY THE ORDER IS THE SERVER'S
 * -----------------------------
 * The list arrives sorted with alerts first, then overstays, then whatever is waiting on a
 * human. The client does not re-sort - if it did, the screen and the API would disagree about what
 * is urgent, and there would be no way to tell which was right.
 *
 * THE FILTERS ARE DERIVED, SO THEY CANNOT BE BOOLEAN FIELDS
 * ---------------------------------------------------------
 * `alerts` and `needsAction` come off the row, not the column, so they are applied by the server
 * AFTER shaping. The chips here are the same idea as the gate-pass screen's: counts come from
 * `facets`, which is computed from the UNFILTERED set, so a chip never reads "0" merely because
 * you tapped it and there is no way back.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, SearchBar, EmptyState } from '../../../../components/ui';
import { SkeletonCard } from '../../../../components/ui/SkeletonLoader';
import { hostelApi } from '../../../../services/api';
import { fmtDateTime } from './visitorMeta';
import VisitorRow from './components/VisitorRow';
import RegisterSheet from './components/RegisterSheet';
import BarredSheet from './components/BarredSheet';
import PolicySheet from './components/PolicySheet';
import VisitorDetail from './pages/visitor_detail/visitor_detail';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { key: undefined, label: 'All' },
  { key: 'PENDING', label: 'To confirm' },
  { key: 'APPROVED', label: 'Expected' },
  { key: 'IN', label: 'On campus' },
  { key: 'OUT', label: 'Left' },
  { key: 'REJECTED', label: 'Refused' },
];

export default function VisitorsModule() {
  const [passes, setPasses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [facets, setFacets] = useState(null);
  const [stats, setStats] = useState(null);
  const [policy, setPolicy] = useState(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(undefined);
  const [alertOnly, setAlertOnly] = useState(false);
  const [actionOnly, setActionOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [barredOpen, setBarredOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [frequentOpen, setFrequentOpen] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const fetchPage = useCallback(
    async (targetPage, mode) => {
      try {
        if (mode === 'append') setLoadingMore(true);
        else if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await hostelApi.visitors({
          q: query || undefined,
          status,
          alerts: alertOnly ? 'true' : undefined,
          needsAction: actionOnly ? 'true' : undefined,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setPagination(res.pagination ?? null);
        setFacets(res.facets ?? null);
        setStats(res.stats ?? null);
        setPasses((prev) => (mode === 'append' ? [...prev, ...(res.passes ?? [])] : res.passes ?? []));
      } catch (e) {
        setError(e.message || 'Failed to load visitors');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [query, status, alertOnly, actionOnly],
  );

  // Debounced: `SearchBar` debounces its callback, but each keystroke still restarted a timer per
  // character, and this is a round trip.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchPage(1, 'replace');
    }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, status, alertOnly, actionOnly, fetchPage]);

  // The policy is needed by the register sheet BEFORE it is opened, so it is fetched with the list
  // rather than lazily - a sheet that opens with `requirePurpose === undefined` would show the
  // wrong fields and then reject the submission.
  const loadPolicy = useCallback(async () => {
    try {
      const res = await hostelApi.visitorPolicy();
      setPolicy(res.policy ?? null);
    } catch {
      setPolicy(null);
    }
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

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

  // From the facets, which the server computes from the UNFILTERED set.
  const statusCount = useMemo(() => {
    const m = {};
    (facets?.statuses ?? []).forEach((s) => {
      m[s.status] = s.count;
    });
    return m;
  }, [facets]);

  const doApprove = async (visitor) => {
    try {
      await hostelApi.approveVisitor(visitor.id, null);
      reload();
    } catch (e) {
      Alert.alert('Could not confirm', e.message);
    }
  };

  const doEntry = async (visitor) => {
    try {
      await hostelApi.visitorEntry(visitor.id);
      Alert.alert('Let in', `${visitor.name} is recorded as on campus.`);
      reload();
    } catch (e) {
      // A barred visitor is refused here with a reason. That refusal is the whole point of the
      // bar, so it is shown prominently rather than as a generic failure.
      Alert.alert(e.code === 'CONFLICT' ? 'Blocked at the gate' : 'Could not record entry', e.message);
    }
  };

  const doExit = async (visitor) => {
    try {
      await hostelApi.visitorExit(visitor.id);
      reload();
    } catch (e) {
      Alert.alert('Could not record exit', e.message);
    }
  };

  const doReject = async () => {
    if (!rejecting) return;
    if (!rejectNote.trim()) {
      Alert.alert('Reason required', 'The resident is told why the visit was refused.');
      return;
    }
    try {
      await hostelApi.rejectVisitor(rejecting.id, rejectNote.trim());
      setRejecting(null);
      setRejectNote('');
      reload();
    } catch (e) {
      Alert.alert('Could not refuse', e.message);
    }
  };

  if (selectedId) {
    return (
      <VisitorDetail
        visitorId={selectedId}
        onBack={() => {
          setSelectedId(null);
          reload();
        }}
        onReject={(v) => {
          setRejectNote('');
          setRejecting(v);
        }}
        onChanged={reload}
        // Approve / entry / exit live inside the detail screen's own action bar, so these are only
        // needed for the case where it wants the parent to run them.
        onApprove={doApprove}
        onEntry={doEntry}
        onExit={doExit}
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

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={theme.colors.primary} />}
      >
        {/* ---- Stats, from the response. Never literals. ---- */}
        <View style={styles.statsRow}>
          <StatCard value={stats?.onCampus ?? 0} label="On campus" tone="#2563eb" />
          <StatCard value={stats?.awaiting ?? 0} label="To confirm" tone="#d97706" />
          <StatCard value={stats?.restricted ?? 0} label="Restricted" tone="#b91c1c" />
        </View>

        {stats?.overdue ? (
          <TouchableOpacity
            style={[styles.alertBanner, actionOnly && styles.alertBannerOn]}
            onPress={() => {
              setActionOnly((v) => !v);
              setPage(1);
            }}
          >
            <Ionicons name="warning-outline" size={16} color="#dc2626" />
            <Text style={styles.alertBannerText}>
              {stats.overdue} {stats.overdue === 1 ? 'visit needs' : 'visits need'} attention
            </Text>
            <Text style={styles.alertBannerHint}>{actionOnly ? 'Showing those only' : 'Tap to filter'}</Text>
          </TouchableOpacity>
        ) : null}

        {/* ---- Toolbar ---- */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setRegistering(true)}>
            <Ionicons name="person-add-outline" size={15} color="#fff" />
            <Text style={styles.toolBtnText}>Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolGhost, alertOnly && styles.toolGhostOn]} onPress={() => setAlertOnly((v) => !v)}>
            <Ionicons name="shield-ban-outline" size={15} color={alertOnly ? '#b91c1c' : theme.colors.textMuted} />
            <Text style={[styles.toolGhostText, alertOnly && { color: '#b91c1c' }]}>Restricted</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolGhost} onPress={() => setBarredOpen(true)}>
            <Ionicons name="hand-left-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.toolGhostText}>Barred</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolGhost} onPress={() => setFrequentOpen(true)}>
            <Ionicons name="repeat-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.toolGhostText}>Frequent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolGhost} onPress={() => setPolicyOpen(true)}>
            <Ionicons name="options-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.toolGhostText}>Rules</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12 }}>
          <SearchBar placeholder="Search visitor, resident or room…" onSearch={setQuery} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
          {STATUS_FILTERS.map((f) => {
            const on = status === f.key;
            const count = f.key ? statusCount[f.key] : pagination?.total;
            return (
              <TouchableOpacity
                key={f.label}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => {
                  setStatus(f.key);
                  setPage(1);
                }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {f.label}
                  {count !== undefined ? ` ${count}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={reload}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {passes.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={query || status || alertOnly || actionOnly ? 'No visitors match' : 'No visitors yet'}
            subtitle={
              query || status || alertOnly || actionOnly
                ? 'Try a different filter'
                : 'Register someone at the gate, or a resident can authorise a visit'
            }
            color="#0891b2"
          />
        ) : (
          passes.map((v, idx) => (
            <VisitorRow
              key={v.id}
              visitor={v}
              delay={Math.min(idx, 8) * 40}
              onPress={() => setSelectedId(v.id)}
              onApprove={doApprove}
              onReject={(visitor) => {
                setRejectNote('');
                setRejecting(visitor);
              }}
              onEntry={doEntry}
              onExit={doExit}
            />
          ))
        )}

        {pagination && page < pagination.totalPages ? (
          <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
            <Text style={styles.loadMoreText}>
              {loadingMore ? 'Loading…' : `Load more (${pagination.total - passes.length} remaining)`}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <RegisterSheet visible={registering} onClose={() => setRegistering(false)} onDone={reload} policy={policy} />
      <BarredSheet visible={barredOpen} onClose={() => setBarredOpen(false)} onChanged={reload} />
      <PolicySheet visible={policyOpen} onClose={() => setPolicyOpen(false)} onChanged={() => { loadPolicy(); reload(); }} />
      <FrequentSheet visible={frequentOpen} onClose={() => setFrequentOpen(false)} />

      {/* Refusal needs a reason — the resident is told it, so the server requires it too. */}
      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Refuse this visit</Text>
            <Text style={styles.modalSub}>
              {rejecting?.name} · {rejecting?.visiting}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason — the resident is told this"
              placeholderTextColor="#9ca3af"
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejecting(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={doReject}>
                <Text style={styles.modalConfirmText}>Refuse visit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ value, label, tone }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Frequent-visitor history.
 *
 * Two views because a warden has two questions: "who keeps coming round?" and "which resident is
 * seeing a stream of strangers?". Both are answered by the server over the policy's window, so
 * neither is computed by counting what happens to be on this page.
 */
function FrequentSheet({ visible, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    (async () => {
      try {
        setData(await hostelApi.frequentVisitors({ limit: 8 }));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Frequent visitors</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          {data ? (
            <Text style={styles.sheetSub}>
              Last {data.withinDays} days
              {data.threshold ? ` · flagged from ${data.threshold} visits` : ' · alerting is off'}
            </Text>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetBody}>
            {loading ? <Text style={styles.emptyLine}>Loading…</Text> : null}
            {!loading && !data ? <Text style={styles.emptyLine}>Could not load the history.</Text> : null}

            {data?.visitors?.length ? (
              <>
                <Text style={styles.sheetGroup}>By visitor</Text>
                {data.visitors.map((v) => (
                  <AnimatedCard key={v.name} style={styles.freqRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.freqName}>
                        {v.name}
                        {v.flagged ? <Text style={styles.freqFlag}>  ⚠ flagged</Text> : null}
                      </Text>
                      <Text style={styles.freqMeta}>{v.residents.join(', ')}</Text>
                    </View>
                    <Text style={styles.freqCount}>{v.visits}</Text>
                  </AnimatedCard>
                ))}
              </>
            ) : null}

            {data?.residents?.length ? (
              <>
                <Text style={styles.sheetGroup}>By resident</Text>
                {data.residents.map((r) => (
                  <AnimatedCard key={r.studentProfileId} style={styles.freqRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.freqName}>
                        {r.name}
                        {r.flagged ? <Text style={styles.freqFlag}>  ⚠ flagged</Text> : null}
                      </Text>
                      <Text style={styles.freqMeta} numberOfLines={1}>
                        {r.visitors.join(', ')}
                      </Text>
                    </View>
                    <Text style={styles.freqCount}>{r.visits}</Text>
                  </AnimatedCard>
                ))}
              </>
            ) : null}

            {!loading && data && !data.visitors?.length && !data.residents?.length ? (
              <Text style={styles.emptyLine}>No visits recorded in this window.</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 26 },
  statsRow: { flexDirection: 'row', marginTop: 16 },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  statValue: { fontSize: 17, fontFamily: 'Manrope-ExtraBold' },
  statLabel: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 11,
    padding: 11,
    marginTop: 10,
  },
  alertBannerOn: { backgroundColor: '#fecaca' },
  alertBannerText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#dc2626', marginLeft: 7, flex: 1 },
  alertBannerHint: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: '#dc2626' },
  toolbar: { flexDirection: 'row', alignItems: 'center', marginTop: 14, flexWrap: 'wrap' },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginRight: 6,
  },
  toolBtnText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 4 },
  toolGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
    marginRight: 6,
    marginTop: 4,
  },
  toolGhostOn: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  toolGhostText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted, marginLeft: 4 },
  chipsScroll: { marginTop: 12 },
  chips: { paddingRight: 8 },
  chip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginRight: 6,
  },
  chipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextOn: { color: '#fff' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', borderRadius: 10, padding: 11, marginTop: 12 },
  errorText: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Medium', color: '#dc2626', marginLeft: 7 },
  retryText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#dc2626' },
  loadMore: { alignItems: 'center', paddingVertical: 12 },
  loadMoreText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.primary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 18, width: '100%' },
  modalTitle: { fontSize: 15, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  modalSub: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },
  modalInput: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginTop: 12,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', marginTop: 14 },
  modalCancel: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: 10, paddingVertical: 11, marginRight: 8 },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modalConfirm: { flex: 1, alignItems: 'center', backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 11 },
  modalConfirmText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 26,
    maxHeight: '88%',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  sheetSub: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 5 },
  sheetBody: { marginTop: 12 },
  sheetGroup: {
    fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12, marginBottom: 6,
  },
  freqRow: { flexDirection: 'row', alignItems: 'center', padding: 11, marginBottom: 7 },
  freqName: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  freqFlag: { fontSize: 10, fontFamily: 'Manrope-Bold', color: '#7c3aed' },
  freqMeta: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  freqCount: { fontSize: 16, fontFamily: 'Manrope-ExtraBold', color: theme.colors.primary },
  emptyLine: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 12 },
});