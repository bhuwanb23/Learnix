/**
 * The warden's complaint desk — triage, assignment, escalation watch.
 *
 * WAS A MOCK. This screen used to hold six hardcoded complaints in `useState` named `initialComplaints`
 * and render them forever. Nothing about it could be right: a complaint list that never changes is
 * not a queue, and the six rows it shipped with described a "Lift stuck between floors" and a "Mess
 * sink clogged" that existed nowhere in the database. The chips read "All / Plumbing / Electrical /
 * Network / Maintenance" — no PLUMBING or ELECTRICAL category exists in the schema at all, and FOOD
 * and SECURITY, which do, were absent. So the filter chips could only ever empty the list.
 *
 * Everything below is driven by `GET /hostel/complaints`.
 *
 * WHY THE ORDER IS THE SERVER'S
 * -----------------------------
 * The list arrives sorted by derived `priority` (severity + age + status). The client does not
 * re-sort. If it did, the screen and the API would disagree about what is urgent and there would be
 * no way to tell which was right.
 *
 * THE BADGES ARE DERIVED, SO THEY CANNOT BE COLUMNS
 * -------------------------------------------------
 * `escalated`, `priority` and `hoursToEscalation` depend on `createdAt`, the severity and the live
 * policy, so they are computed by the server AFTER shaping. The chips are driven by `facets`, which
 * is counted from the UNFILTERED set, so tapping "Escalated" cannot make a chip read 0 with no way back.
 *
 * SECURITY IS NOT A COSMETIC ROW
 * ------------------------------
 * The severity a resident picks for SECURITY is raised to the policy floor server-side, and the
 * response says so in `severityRaised`. The row shows the raised value, so a warden triaging it can
 * see that "LOW" became "MEDIUM" by policy rather than by a student's judgement.
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, SearchBar, EmptyState } from '../../../../components/ui';
import { SkeletonCard, SkeletonStatRow } from '../../../../components/ui/SkeletonLoader';
import { hostelApi } from '../../../../services/api';

const PAGE_SIZE = 20;

// `OPEN_LIKE` is the server's "needs a human" bucket — OPEN plus ASSIGNED. It is the default,
// because "everything" buries the unassigned work under resolved rows nobody needs to act on.
const STATUS_FILTERS = [
  { key: 'OPEN_LIKE', label: 'Needs attention' },
  { key: undefined, label: 'All' },
  { key: 'OPEN', label: 'New' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'RESOLVED', label: 'Resolved' },
];

const SEVERITIES = ['HIGH', 'MEDIUM', 'LOW'];

const CATEGORY_LABEL = {
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  NETWORK: 'Network',
  MAINTENANCE: 'Maintenance',
  FOOD: 'Food',
  SECURITY: 'Security',
};

const tone = (bg, color) => ({ bg, color });

const severityTone = (s) =>
  s === 'HIGH' ? tone('#fee2e2', '#dc2626')
    : s === 'MEDIUM' ? tone('#fef3c7', '#d97706')
      : tone('#e0e7ff', '#4f46e5');

const statusTone = (s) =>
  s === 'RESOLVED' ? tone('#dcfce7', '#059669')
    : s === 'ASSIGNED' ? tone('#dbeafe', '#2563eb')
      : tone('#fef3c7', '#d97706');

const GROUP_ICON = {
  maintenance: 'construct-outline',
  electrical: 'flash-outline',
  network: 'wifi-outline',
  food: 'restaurant-outline',
  security: 'shield-checkmark-outline',
};

/** "just now" / "3h" / "5d" — the age a warden actually scans for, not a wall of date. */
function ageLabel(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/**
 * The escalation countdown, phrased as how much time is LEFT rather than how long it has waited.
 * `hoursToEscalation <= 0` means it has already crossed, and the server sets `escalated` — so the
 * "due" wording is only reached when the flag is set, never computed here.
 */
function dueLabel(c) {
  if (c.status === 'RESOLVED') return null;
  if (c.escalated) return { text: 'Escalated', urgent: true };
  if (typeof c.hoursToEscalation !== 'number') return null;
  if (c.hoursToEscalation < 24) return { text: `Escalates in ${c.hoursToEscalation}h`, urgent: true };
  const days = Math.round(c.hoursToEscalation / 24);
  return { text: `Escalates in ${days}d`, urgent: false };
}

export default function ComplaintsModule() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [facets, setFacets] = useState(null);
  const [pagination, setPagination] = useState(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('OPEN_LIKE');
  const [severity, setSeverity] = useState(undefined);
  const [escalatedOnly, setEscalatedOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [busyId, setBusyId] = useState(null);
  const [assigning, setAssigning] = useState(null); // complaint row
  const [assignees, setAssignees] = useState([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [chosenAssignee, setChosenAssignee] = useState(null);
  const [assignNote, setAssignNote] = useState('');

  const [resolving, setResolving] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const [noteing, setNoteing] = useState(null);
  const [noteText, setNoteText] = useState('');

  const [expanded, setExpanded] = useState(null);

  const fetchPage = useCallback(
    async (targetPage, mode) => {
      try {
        if (mode === 'append') setLoadingMore(true);
        else if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await hostelApi.complaints({
          q: query || undefined,
          status,
          severity,
          escalated: escalatedOnly ? 'true' : undefined,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setPagination(res.pagination ?? null);
        setFacets(res.facets ?? null);
        setStats(res.stats ?? null);
        setComplaints((prev) =>
          mode === 'append' ? [...prev, ...(res.complaints ?? [])] : res.complaints ?? [],
        );
      } catch (e) {
        setError(e.message || 'Failed to load complaints');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [query, status, severity, escalatedOnly],
  );

  useEffect(() => {
    const t = setTimeout(() => fetchPage(1), query ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchPage, query]);

  // A filter change invalidates the page cursor, so it must return to page 1. Without this, switching
  // from "All" (page 3 of 6) to "Escalated" appends page 2 of a DIFFERENT query onto the old list.
  const applyFilter = useCallback((patch) => {
    setPage(1);
    setComplaints([]);
    setPagination((p) => (p ? { ...p, page: 1 } : p));
    Object.entries(patch).forEach(([k, v]) => {
      if (k === 'status') setStatus(v);
      if (k === 'severity') setSeverity(v);
      if (k === 'escalated') setEscalatedOnly(v);
    });
  }, []);

  const loadMore = () => {
    if (!pagination || loadingMore || page >= pagination.totalPages) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next, 'append');
  };

  // ── assignment ───────────────────────────────────────────────────────────────
  // The picker loads ELIGIBILITY from the server rather than filtering a staff list on the client:
  // who may take a plumbing job depends on a designation string and the policy, so a client-side
  // guess would either hide the technician or let a warden hand security work to a plumber.
  const openAssign = async (c) => {
    setAssigning(c);
    setChosenAssignee(null);
    setAssignNote('');
    setAssigneeLoading(true);
    try {
      const list = await hostelApi.complaintAssignees(c.category);
      setAssignees(Array.isArray(list) ? list : []);
    } catch (e) {
      Alert.alert('Could not load staff', e.message || 'Try again');
      setAssignees([]);
    } finally {
      setAssigneeLoading(false);
    }
  };

  const confirmAssign = async () => {
    if (!assigning || !chosenAssignee) return;
    setBusyId(assigning.id);
    try {
      await hostelApi.assignComplaint(assigning.id, chosenAssignee, assignNote || undefined);
      setAssigning(null);
      setAssignNote('');
      fetchPage(page, 'refresh');
    } catch (e) {
      Alert.alert('Could not assign', e.message || 'Try again');
    } finally {
      setBusyId(null);
    }
  };

  // ── resolution ───────────────────────────────────────────────────────────────
  const openResolve = (c) => {
    setResolving(c);
    setResolutionNote('');
  };

  const confirmResolve = async () => {
    if (!resolving) return;
    setBusyId(resolving.id);
    try {
      await hostelApi.resolveComplaint(resolving.id, resolutionNote);
      setResolving(null);
      setResolutionNote('');
      fetchPage(page, 'refresh');
    } catch (e) {
      Alert.alert('Could not resolve', e.message || 'Try again');
    } finally {
      setBusyId(null);
    }
  };

  const reopen = (c) => {
    Alert.alert('Reopen this complaint?', 'It goes back on the board for the support staff.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reopen',
        style: 'destructive',
        onPress: async () => {
          setBusyId(c.id);
          try {
            await hostelApi.reopenComplaint(c.id, 'Reopened by the warden');
            fetchPage(page, 'refresh');
          } catch (e) {
            Alert.alert('Could not reopen', e.message || 'Try again');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const confirmNote = async () => {
    if (!noteing || !noteText.trim()) return;
    setBusyId(noteing.id);
    try {
      await hostelApi.addComplaintNote(noteing.id, noteText.trim());
      setNoteing(null);
      setNoteText('');
      fetchPage(page, 'refresh');
    } catch (e) {
      Alert.alert('Could not add note', e.message || 'Try again');
    } finally {
      setBusyId(null);
    }
  };

  const statTiles = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Open', value: stats.open ?? 0, icon: 'ellipse-outline', color: theme.colors.warning },
      { label: 'Assigned', value: stats.assigned ?? 0, icon: 'person-outline', color: theme.colors.primary },
      { label: 'Unassigned', value: stats.unassigned ?? 0, icon: 'alert-circle-outline', color: theme.colors.error },
      { label: 'Escalated', value: stats.escalated ?? 0, icon: 'trending-up-outline', color: theme.colors.error },
    ];
  }, [stats]);

  if (loading && !complaints.length) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchPage(page, 'refresh')} />
        }
      >
        <Text style={styles.h1}>Complaints</Text>
        <Text style={styles.sub}>
          Triage, assign and chase. Order is by urgency — oldest high-severity work rises.
        </Text>

        {error ? (
          <AnimatedCard style={styles.errorCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => fetchPage(page, 'refresh')} hitSlop={8}>
                <Text style={styles.retry}>Retry</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        ) : null}

        <View style={styles.statRow}>
          {statTiles.map((s) => (
            <View key={s.label} style={styles.statTile}>
              <Ionicons name={s.icon} size={16} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <SearchBar value={query} onChangeText={setQuery} placeholder="Search description, room, student" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipRow}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.label}
                style={[styles.chip, status === f.key && styles.chipOn]}
                onPress={() => applyFilter({ status: f.key })}
              >
                <Text style={[styles.chipText, status === f.key && styles.chipTextOn]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, escalatedOnly && styles.chipDanger]}
              onPress={() => applyFilter({ escalated: !escalatedOnly })}
            >
              <Ionicons name="trending-up-outline" size={13} color={escalatedOnly ? '#fff' : theme.colors.error} />
              <Text style={[styles.chipText, escalatedOnly && styles.chipTextOn]}>
                Escalated{facets ? ` ${stats?.escalated ?? 0}` : ''}
              </Text>
            </TouchableOpacity>
            {SEVERITIES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, severity === s && styles.chipOn]}
                onPress={() => applyFilter({ severity: severity === s ? undefined : s })}
              >
                <Text style={[styles.chipText, severity === s && styles.chipTextOn]}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {complaints.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="Nothing here"
            message={escalatedOnly ? 'No complaint has escalated.' : 'No complaint matches these filters.'}
          />
        ) : (
          complaints.map((c) => {
            const due = dueLabel(c);
            const isOpen = expanded === c.id;
            const busy = busyId === c.id;
            const st = statusTone(c.status);
            const sv = severityTone(c.severity);
            return (
              <AnimatedCard key={c.id} style={styles.card}>
                <TouchableOpacity onPress={() => setExpanded(isOpen ? null : c.id)}>
                  <View style={styles.rowBetween}>
                    <View style={styles.rowLeft}>
                      <Ionicons
                        name={GROUP_ICON[c.group] ?? 'alert-circle-outline'}
                        size={18}
                        color={theme.colors.textMuted}
                      />
                      <View style={styles.flex}>
                        <Text style={styles.cat}>{CATEGORY_LABEL[c.category] ?? c.category}</Text>
                        <Text style={styles.desc} numberOfLines={isOpen ? undefined : 2}>
                          {c.description}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={theme.colors.textMuted}
                    />
                  </View>

                  <View style={styles.metaRow}>
                    <View style={[styles.pill, { backgroundColor: sv.bg }]}>
                      <Text style={[styles.pillText, { color: sv.color }]}>{c.severity}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: st.bg }]}>
                      <Text style={[styles.pillText, { color: st.color }]}>{c.status}</Text>
                    </View>
                    {due ? (
                      <View style={[styles.pill, due.urgent ? styles.pillDanger : styles.pillMuted]}>
                        <Text style={[styles.pillText, due.urgent ? styles.pillTextOn : styles.pillMutedText]}>
                          {due.text}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.age}>{ageLabel(c.createdAt)}</Text>
                  </View>

                  {isOpen ? (
                    <View style={styles.detail}>
                      <DetailLine label="Student" value={c.student ?? '—'} />
                      <DetailLine label="Room" value={c.roomNumber ?? c.locationNote ?? '—'} />
                      <DetailLine label="Assigned to" value={c.assignedToName ?? 'Nobody yet'} />
                      <DetailLine label="Filed" value={new Date(c.createdAt).toLocaleString()} />
                      {c.locationNote ? <DetailLine label="Where" value={c.locationNote} /> : null}
                      {c.severityRaised ? (
                        <DetailLine
                          label="Severity"
                          value={`${c.severityRaised} (raised by policy)`}
                        />
                      ) : null}
                      {c.reopenedCount > 0 ? (
                        <DetailLine label="Reopened" value={`${c.reopenedCount}× after a poor rating`} />
                      ) : null}
                      {c.resolutionNote ? <DetailLine label="Resolution" value={c.resolutionNote} /> : null}
                      {c.feedback ? (
                        <DetailLine
                          label="Rating"
                          value={`${c.feedback.rating}/5${c.feedback.comment ? ` — ${c.feedback.comment}` : ''}`}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </TouchableOpacity>

                {c.status !== 'RESOLVED' ? (
                  <View style={styles.actions}>
                    <Action
                      label="Assign"
                      icon="person-add-outline"
                      onPress={() => openAssign(c)}
                      disabled={busy}
                    />
                    <Action
                      label="Note"
                      icon="chatbubble-outline"
                      onPress={() => { setNoteing(c); setNoteText(''); }}
                      disabled={busy}
                    />
                    <Action
                      label="Resolve"
                      icon="checkmark-circle-outline"
                      onPress={() => openResolve(c)}
                      disabled={busy}
                      primary
                    />
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Action label="Reopen" icon="refresh-outline" onPress={() => reopen(c)} disabled={busy} />
                    <Action
                      label="Note"
                      icon="chatbubble-outline"
                      onPress={() => { setNoteing(c); setNoteText(''); }}
                      disabled={busy}
                    />
                  </View>
                )}
              </AnimatedCard>
            );
          })
        )}

        {pagination && page < pagination.totalPages ? (
          <TouchableOpacity style={styles.more} onPress={loadMore} disabled={loadingMore}>
            {loadingMore ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={styles.moreText}>
                Load more ({pagination.total - complaints.length} left)
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Assign. Ineligible staff are shown greyed with the server's reason rather than hidden —
          a warden who does not know who the plumber is needs to see WHY that person is a candidate. */}
      <Modal visible={!!assigning} transparent animationType="slide" onRequestClose={() => setAssigning(null)}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Assign this complaint</Text>
            <Text style={styles.sheetSub} numberOfLines={2}>
              {assigning ? assigning.description : ''}
            </Text>

            {assigneeLoading ? (
              <ActivityIndicator style={{ marginVertical: theme.spacing.lg }} color={theme.colors.primary} />
            ) : (
              <ScrollView style={styles.people}>
                {assignees.length === 0 ? (
                  <Text style={styles.sheetSub}>No support staff configured for this category.</Text>
                ) : (
                  assignees.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.person,
                        chosenAssignee === s.id && styles.personOn,
                        !s.eligible && styles.personOff,
                      ]}
                      disabled={!s.eligible}
                      onPress={() => setChosenAssignee(s.id)}
                    >
                      <Ionicons
                        name={chosenAssignee === s.id ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={s.eligible ? theme.colors.primary : theme.colors.textMuted}
                      />
                      <View style={styles.flex}>
                        <Text style={styles.personName}>{s.fullName}</Text>
                        <Text style={styles.personRole}>
                          {s.designation ?? s.roles.join(', ')}
                          {s.reason ? ` · ${s.reason}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            <TextInput
              style={styles.input}
              placeholder="Note for the staff (optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={assignNote}
              onChangeText={setAssignNote}
              multiline
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setAssigning(null)}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, !chosenAssignee && styles.btnOff]}
                onPress={confirmAssign}
                disabled={!chosenAssignee || busyId === assigning?.id}
              >
                <Text style={styles.btnText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Resolve. The note is required — the server rejects a short or empty one, and the button is
          disabled until it is long enough, so the failure is prevented rather than explained after. */}
      <Modal visible={!!resolving} transparent animationType="slide" onRequestClose={() => setResolving(null)}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Resolve this complaint</Text>
            <Text style={styles.sheetSub}>
              Say what was actually done. This is what the resident reads.
            </Text>
            <TextInput
              style={[styles.input, styles.inputTall]}
              placeholder="What was done to fix it?"
              placeholderTextColor={theme.colors.textMuted}
              value={resolutionNote}
              onChangeText={setResolutionNote}
              multiline
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setResolving(null)}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, resolutionNote.trim().length < 5 && styles.btnOff]}
                onPress={confirmResolve}
                disabled={resolutionNote.trim().length < 5 || busyId === resolving?.id}
              >
                <Text style={styles.btnText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!noteing} transparent animationType="slide" onRequestClose={() => setNoteing(null)}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add a note</Text>
            <Text style={styles.sheetSub}>Visible to the resident and to support staff.</Text>
            <TextInput
              style={[styles.input, styles.inputTall]}
              placeholder="What did you find or arrange?"
              placeholderTextColor={theme.colors.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setNoteing(null)}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, !noteText.trim() && styles.btnOff]}
                onPress={confirmNote}
                disabled={!noteText.trim() || busyId === noting?.id}
              >
                <Text style={styles.btnText}>Add note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailLine({ label, value }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Action({ label, icon, onPress, disabled, primary }) {
  return (
    <TouchableOpacity
      style={[styles.action, primary && styles.actionPrimary]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={14} color={primary ? theme.colors.white : theme.colors.primary} />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  rowLeft: { flexDirection: 'row', gap: theme.spacing.sm, flex: 1 },

  errorCard: { borderColor: theme.colors.error, borderWidth: 1 },
  errorText: { color: theme.colors.error, fontSize: 13, flex: 1 },
  retry: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },

  statRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statTile: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    padding: theme.spacing.sm, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, color: theme.colors.textMuted },

  chipScroll: { marginHorizontal: -theme.spacing.md },
  chipRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 6, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipDanger: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  chipText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '500' },
  chipTextOn: { color: theme.colors.white },

  card: { gap: theme.spacing.sm },
  cat: { fontSize: 12, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  desc: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.sm },
  pillDanger: { backgroundColor: theme.colors.error },
  pillMuted: { backgroundColor: theme.colors.surfaceMuted },
  pillText: { fontSize: 10, fontWeight: '700' },
  pillTextOn: { color: theme.colors.white },
  pillMutedText: { color: theme.colors.textMuted },
  age: { fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto' },

  detail: { gap: 6, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm },
  detailLine: { flexDirection: 'row', gap: theme.spacing.sm },
  detailLabel: { width: 96, fontSize: 12, color: theme.colors.textMuted },
  detailValue: { flex: 1, fontSize: 12, color: theme.colors.text },

  actions: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'flex-end' },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 6, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.primary,
  },
  actionPrimary: { backgroundColor: theme.colors.primary },
  actionText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  actionTextPrimary: { color: theme.colors.white },

  more: { alignItems: 'center', paddingVertical: theme.spacing.md },
  moreText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },

  sheetWrap: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl, padding: theme.spacing.md, gap: theme.spacing.sm,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  sheetSub: { fontSize: 13, color: theme.colors.textMuted },
  people: { maxHeight: 260 },
  person: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    padding: theme.spacing.sm, borderRadius: theme.radius.sm, borderWidth: 1,
    borderColor: theme.colors.border, marginBottom: 6,
  },
  personOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  personOff: { opacity: 0.5 },
  personName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  personRole: { fontSize: 11, color: theme.colors.textMuted },

  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    padding: theme.spacing.sm, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface,
  },
  inputTall: { minHeight: 88, textAlignVertical: 'top' },
  sheetActions: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'flex-end' },
  btn: {
    backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.lg, paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  btnOff: { opacity: 0.4 },
  btnText: { color: theme.colors.white, fontWeight: '700', fontSize: 14 },
  btnGhost: { paddingHorizontal: theme.spacing.md, paddingVertical: 10 },
  btnGhostText: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 14 },
});