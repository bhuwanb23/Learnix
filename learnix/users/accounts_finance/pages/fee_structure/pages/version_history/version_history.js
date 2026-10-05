// F-04 Fee Structure — version history (docs/users/06 §3.5.6).
//
// The timeline is the point of this screen. A fee structure is not a price, it
// is a series of prices each with a validity window, and the question a college
// actually gets asked is "what did semester 3 cost in 2024-25?" — which is
// unanswerable the moment rates are edited in place.
//
// So each version shows:
//   · the window it was in force for, with the end date INCLUSIVE
//   · what it cost, and how that moved against the version before it
//   · WHICH LINES moved and by how much — "we revised the fee structure" and
//     "we revised four lines of it" are different conversations
//   · who published it and why, when the office bothered to say
//
// Draft → publish is copy-then-publish, never edit-in-place. A draft bills
// nothing, can be abandoned with no effect, and only publishing moves money.
// Backdating is refused by the server, and this screen explains why before the
// officer finds out by trying: it would reprice bills that have already been
// issued and collected.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  rupees, compactRupees, formatDay, formatDateTime, versionStatusMeta,
  windowPhrase, changePhrase, changeColor, deltaPhrase, diffStatusMeta,
  todayIso, addDaysIso, THEME,
} from '../../feeStructureMeta';

function VersionCard({ entry, expanded, onToggle, onPublish, onDiscard, busy }) {
  const meta = versionStatusMeta(entry.status);
  const open = expanded === entry.id;
  const draft = entry.status === 'DRAFT';
  const discarded = entry.status === 'DRAFT_DISCARDED';

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHead} activeOpacity={0.85} onPress={onToggle}>
        <View style={[styles.noBadge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
          <Text style={[styles.noText, { color: meta.color }]}>v{entry.versionNo}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{meta.label}</Text>
            {entry.isCurrent && <View style={styles.liveChip}><Text style={styles.liveChipText}>prices today</Text></View>}
            {entry.publishedAt && <Text style={styles.publishedAt}>{formatDateTime(entry.publishedAt)}</Text>}
          </View>
          <Text style={styles.window}>{windowPhrase(entry)}</Text>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.total}>{compactRupees(entry.totalRupees)}</Text>
          {entry.deltaPercent !== null && entry.deltaPercent !== undefined ? (
            <Text style={[styles.delta, { color: changeColor(entry.deltaPercent) }]}>
              {entry.deltaPercent > 0 ? '+' : ''}{entry.deltaPercent}%
            </Text>
          ) : (
            <Text style={styles.deltaMuted}>first version</Text>
          )}
        </View>
      </TouchableOpacity>

      {entry.changeNote ? <Text style={styles.note}>“{entry.changeNote}”</Text> : null}

      {entry.priorVersionNo !== null && entry.priorVersionNo !== undefined && !draft && (
        <View style={styles.versusRow}>
          <Ionicons name="git-compare-outline" size={12} color={changeColor(entry.deltaPercent)} />
          <Text style={[styles.versusText, { color: changeColor(entry.deltaPercent) }]}>
            {changePhrase(entry.deltaPercent)} against v{entry.priorVersionNo} · {deltaPhrase(entry.deltaRupees)}
          </Text>
        </View>
      )}

      {open && entry.diff?.length > 0 && (
        <View style={styles.diffBox}>
          <Text style={styles.diffHead}>
            {entry.changedLines} line{entry.changedLines === 1 ? '' : 's'} changed
            {entry.unchangedLines > 0 ? `, ${entry.unchangedLines} untouched` : ''}
          </Text>
          {entry.diff.map((d) => {
            const dm = diffStatusMeta(d.status);
            return (
              <View key={`${d.label}-${d.status}`} style={styles.diffRow}>
                <View style={[styles.diffDot, { backgroundColor: dm.bg }]}>
                  <Ionicons name={dm.icon} size={10} color={dm.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.diffLabel} numberOfLines={1}>{d.label}</Text>
                  <Text style={styles.diffMeta}>{d.semesterLabel}</Text>
                </View>
                <Text style={styles.diffBefore}>{d.status === 'ADDED' ? '—' : rupees(d.beforeRupees)}</Text>
                <Ionicons name="arrow-forward" size={10} color="#cbd5e1" />
                <Text style={[styles.diffAfter, d.status === 'REMOVED' && { color: '#94a3b8', textDecorationLine: 'line-through' }]}>
                  {rupees(d.afterRupees)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {open && entry.diff?.length === 0 && !draft && (
        <View style={styles.diffBox}>
          <Text style={styles.noChange}>No line moved between v{entry.priorVersionNo ?? '—'} and v{entry.versionNo}.</Text>
        </View>
      )}

      {open && draft && (
        <View style={styles.draftBox}>
          <Text style={styles.draftText}>
            A draft bills nothing. Publishing it will supersede the version in force and close its window the
            day before the new one opens.
          </Text>
          <View style={styles.draftActions}>
            <TouchableOpacity
              style={styles.publishBtn}
              activeOpacity={0.85}
              onPress={() => onPublish(entry)}
              disabled={busy}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
              <Text style={styles.publishText}>{busy ? 'Publishing…' : 'Publish this version'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.discardBtn} activeOpacity={0.85} onPress={() => onDiscard(entry)} disabled={busy}>
              <Ionicons name="trash-outline" size={14} color="#dc2626" />
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {open && discarded && (
        <View style={styles.discardedBox}>
          <Ionicons name="information-circle-outline" size={13} color="#64748b" />
          <Text style={styles.discardedText}>
            Kept in the record rather than deleted — someone started a revision and abandoned it, which is
            itself worth knowing.
          </Text>
        </View>
      )}

      {!open && !draft && !discarded && entry.changedLines > 0 && (
        <Text style={styles.collapsedHint}>
          {entry.changedLines} line{entry.changedLines === 1 ? '' : 's'} moved — tap to see which
        </Text>
      )}
    </View>
  );
}

export default function FeeStructureVersions({ route, navigation }) {
  const id = route?.params?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [startDate, setStartDate] = useState(addDaysIso(todayIso(), 1));
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.feeStructureVersions(id);
      setData(result);
      // Open the draft by default: it is the one row with something to do.
      const draft = (result.timeline ?? []).find((v) => v.status === 'DRAFT');
      if (draft) setExpanded(draft.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const createDraft = useCallback(async () => {
    setBusy(true);
    try {
      await accountsApi.createFeeVersionDraft(id, { effectiveFrom: startDate || undefined, changeNote: reason || undefined });
      setReason('');
      await load();
    } catch (err) {
      Alert.alert('Could not open a draft', err.message);
    } finally {
      setBusy(false);
    }
  }, [id, startDate, reason, load]);

  const publish = useCallback((entry) => {
    Alert.alert(
      `Publish version ${entry.versionNo}?`,
      `It will be in force from ${formatDay(entry.effectiveFromDay)} and the current version will close the day before.\n\nBills already raised keep the rates they were issued at — that is the point of keeping versions.`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            setBusy(true);
            try {
              await accountsApi.publishFeeVersion(id, entry.id, { effectiveFrom: entry.effectiveFromDay });
              await load();
              Alert.alert('Published', `Version ${entry.versionNo} is now in force.`);
            } catch (err) {
              Alert.alert('Could not publish', err.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [id, load]);

  const discard = useCallback((entry) => {
    Alert.alert(`Discard draft ${entry.versionNo}?`, 'Nothing it contains was ever billed, so nothing changes.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await accountsApi.discardFeeVersion(id, entry.id);
            setExpanded(null);
            await load();
          } catch (err) {
            Alert.alert('Could not discard', err.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [id, load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME} />
        <Text style={styles.loadingText}>Loading version history…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error ?? 'Not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const timeline = data.timeline ?? [];
  const hasDraft = timeline.some((v) => v.status === 'DRAFT');
  const live = timeline.find((v) => v.isCurrent) ?? null;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{data.program}</Text>
        <Text style={styles.headerSub}>{data.academicYear} · {data.total} version{data.total === 1 ? '' : 's'}</Text>
        {live && (
          <View style={styles.liveBox}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={styles.liveText}>
              v{live.versionNo} prices today — {rupees(live.totalRupees)}, in force {windowPhrase(live)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Cut a new version ── */}
      <View style={styles.newCard}>
        <Text style={styles.newTitle}>Cut a new version</Text>
        <Text style={styles.newNote}>
          A draft copies the current lines, changes nothing, and can be abandoned. Publishing is the only step
          that moves the fee.
        </Text>

        <Text style={styles.fieldLabel}>In force from</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Tomorrow ({formatDay(addDaysIso(todayIso(), 1))}) by default. Earlier dates are refused by the server —
          backdating a revision would reprice bills that have already been issued and collected.
        </Text>

        <Text style={styles.fieldLabel}>Why are the rates changing?</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. 6% increase approved by the board on 12 Nov"
          placeholderTextColor="#94a3b8"
          multiline
        />

        {hasDraft ? (
          <View style={styles.draftOpen}>
            <Ionicons name="create-outline" size={14} color="#d97706" />
            <Text style={styles.draftOpenText}>
              A draft is already open. Publish or discard it before cutting another.
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.newBtn} activeOpacity={0.85} onPress={createDraft} disabled={busy}>
            <Ionicons name="git-branch-outline" size={16} color="#fff" />
            <Text style={styles.newBtnText}>{busy ? 'Opening…' : 'Open a draft'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Timeline ── */}
      <Text style={styles.timelineHead}>Every version, newest first</Text>
      {timeline.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="layers-outline" size={30} color="#94a3b8" />
          <Text style={styles.emptyText}>No versions recorded yet.</Text>
        </View>
      ) : (
        timeline.map((entry) => (
          <VersionCard
            key={entry.id}
            entry={entry}
            expanded={expanded}
            busy={busy}
            onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
            onPublish={publish}
            onDiscard={discard}
          />
        ))
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={15} color={THEME} />
        <Text style={styles.backText}>Back to the structure</Text>
      </TouchableOpacity>
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

  header: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  headerSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  liveBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 8, padding: 9 },
  liveText: { flex: 1, fontSize: 11, color: '#065f46', fontFamily: 'Manrope-Medium', lineHeight: 16 },

  newCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 14 },
  newTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  newNote: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-SemiBold', marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  inputMulti: { minHeight: 64, textAlignVertical: 'top' },
  hint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 14 },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: THEME, borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  draftOpen: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginTop: 12 },
  draftOpenText: { flex: 1, fontSize: 11, color: '#b45309', fontFamily: 'Manrope-Medium', lineHeight: 16 },

  timelineHead: { fontSize: 12, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold', marginBottom: 8, marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  noText: { fontSize: 14, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  liveChip: { backgroundColor: '#059669', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  liveChipText: { fontSize: 9, color: '#fff', fontFamily: 'Manrope-Bold' },
  publishedAt: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  window: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  totalBox: { alignItems: 'flex-end' },
  total: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  delta: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  deltaMuted: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  note: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Regular', marginTop: 8, fontStyle: 'italic', lineHeight: 16 },
  versusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  versusText: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Medium' },

  diffBox: { marginTop: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10 },
  diffHead: { fontSize: 10, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-SemiBold', marginBottom: 6 },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 },
  diffDot: { width: 18, height: 18, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  diffLabel: { fontSize: 11, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  diffMeta: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  diffBefore: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  diffAfter: { fontSize: 11, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  noChange: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  draftBox: { marginTop: 10, backgroundColor: '#fffbeb', borderRadius: 10, padding: 11 },
  draftText: { fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Regular', lineHeight: 16 },
  draftActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  publishBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10 },
  publishText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  discardBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  discardText: { color: '#dc2626', fontSize: 12, fontWeight: '700', fontFamily: 'Manrope-Bold' },

  discardedBox: { flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 10 },
  discardedText: { flex: 1, fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16 },
  collapsedHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 8 },

  empty: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7' },
  emptyText: { marginTop: 8, fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Regular' },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 12, marginTop: 6 },
  backText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
});