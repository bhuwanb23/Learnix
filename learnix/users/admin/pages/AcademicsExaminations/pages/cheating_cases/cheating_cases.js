/**
 * A-04 — The admin's view of the exam cell's cheating cases.
 *
 * WAS A MOCK. This screen held five hardcoded alerts in a module-level array — "John Smith /
 * CSE-21-007 / Chemistry Mid-term" — and none of them existed anywhere in the database. It also
 * resolved a case with an `Alert.alert` and a local `resolvedIds` array, so "resolving" a case
 * removed it from the list and changed nothing else.
 *
 * It now reads the SAME endpoint the exam cell reads, from the SAME table. That is the point: the
 * two desks look at one set of cases, and the docs already promise that the admin's cheating module
 * and the exam cell's share the cases. Two screens with their own copies of the truth is how the
 * admin ends up deciding a case the exam cell has already dismissed.
 *
 * WHY THE ADMIN SEES A DIFFERENT SLICE
 * -------------------------------------
 * The exam cell works a queue; the admin is an oversight view. So the admin gets the history —
 * what was decided — rather than the open worklist, and a case the exam cell has not yet decided is
 * shown as one. The admin can read a case in full, but the DECISION belongs to the exam cell: the
 * state machine that refuses a second decision is the server's, and this screen does not offer a
 * move the server would reject.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import {
  classificationMeta,
  fmtDate,
  initials,
  penaltyMeta,
  plural,
  riskMeta,
  statusMeta,
  timeAgo,
} from '../../../../../exam_cell/pages/cheating_cases/cheating_casesMeta';

const FILTERS = [
  { value: 'ALL', label: 'All', color: '#64748b' },
  { value: 'CONFIRMED', label: 'Confirmed', color: '#dc2626' },
  { value: 'DISMISSED', label: 'Dismissed', color: '#059669' },
  { value: 'ESCALATED', label: 'Escalated', color: '#4f46e5' },
  { value: 'UNDER_REVIEW', label: 'Open', color: '#d97706' },
];

export default function CheatingCases({ onBack }) {
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (mode) => {
    try {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      // The HISTORY endpoint, because an oversight view is a record of decisions. The open cases are
      // on the exam cell's queue and the admin can see them through the same history call with the
      // status filter opened up.
      const res = await examcellApi.cheatingCases({ pageSize: 50 });
      setCases(res?.cases ?? []);
    } catch (e) {
      setError(e.message || 'Could not load the cases');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = cases.filter((c) => {
    if (filter === 'ALL') return true;
    if (filter === 'UNDER_REVIEW') return !c.isTerminal;
    return c.status === filter;
  });

  const highRisk = visible.filter((c) => c.riskLevel === 'HIGH').length;
  const confirmed = visible.filter((c) => c.status === 'CONFIRMED').length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor="#2563eb" />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Cheating Cases</Text>
            <Text style={styles.subTitle}>
              {plural(visible.length, 'case')} · {highRisk} high risk · {confirmed} confirmed
            </Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.filterText, filter === f.value && styles.filterTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading the cases…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryBtn} activeOpacity={0.8}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="checkmark-done-outline" size={40} color="#94a3b8" />
            <Text style={styles.errorText}>No case matches this filter.</Text>
          </View>
        ) : (
          visible.map((item) => {
            const risk = riskMeta(item.riskLevel);
            const status = statusMeta(item.status);
            const cls = classificationMeta(item.classification);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.caseCard}
                onPress={() => setSelected(item)}
                activeOpacity={0.8}
              >
                <View style={styles.caseHeader}>
                  <View style={[styles.caseAvatar, { backgroundColor: risk.bg }]}>
                    <Text style={[styles.caseInitial, { color: risk.color }]}>
                      {initials(item.student?.name)}
                    </Text>
                  </View>
                  <View style={styles.caseInfo}>
                    <Text style={styles.caseName}>{item.student?.name}</Text>
                    <Text style={styles.caseMeta}>
                      {item.student?.rollNo} · {item.course?.code} · {item.exam?.name}
                    </Text>
                    <Text style={styles.caseMeta2}>
                      {item.slot?.room ? `Room ${item.slot.room}` : 'Room not recorded'}
                      {item.invigilatorName ? ` · ${item.invigilatorName}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.riskChip, { backgroundColor: risk.bg }]}>
                    <Text style={[styles.riskText, { color: risk.color }]}>{risk.label}</Text>
                  </View>
                </View>

                <View style={styles.evidenceBox}>
                  <Ionicons name="analytics-outline" size={14} color="#64748b" />
                  <Text style={styles.evidenceText}>{item.issue}</Text>
                </View>

                <View style={styles.caseFoot}>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '1A' }]}>
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                  <Text style={styles.caseMeta2}>{cls.label}</Text>
                  {item.penalty ? (
                    <Text style={styles.penaltyText}>{penaltyMeta(item.penalty).label}</Text>
                  ) : null}
                  <Text style={styles.caseMeta2}>{timeAgo(item.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.footNote}>
          The admin and the exam cell read the same cases. A decision belongs to the exam cell; this
          view is for oversight.
        </Text>
      </ScrollView>

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text-outline" size={20} color="#2563eb" />
              <Text style={styles.modalTitle}>
                {selected?.student?.name ?? 'Case'}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={10}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            {selected ? (
              <ScrollView style={styles.modalBody}>
                <Row label="Roll number" value={selected.student?.rollNo} />
                <Row label="Course" value={selected.course?.name} />
                <Row label="Exam" value={selected.exam?.name} />
                <Row
                  label="Slot"
                  value={
                    selected.slot
                      ? `${fmtDate(selected.slot.date)} · ${selected.slot.startTime}–${selected.slot.endTime}`
                      : null
                  }
                />
                <Row label="Room" value={selected.slot?.room} />
                <Row label="Invigilator" value={selected.invigilatorName} />
                <Row label="Classification" value={classificationMeta(selected.classification).label} />
                <Row label="Risk" value={riskMeta(selected.riskLevel).label} />
                <Row label="Status" value={statusMeta(selected.status).label} />
                {selected.penalty ? (
                  <Row label="Penalty" value={penaltyMeta(selected.penalty).label} />
                ) : null}

                <Text style={styles.sectionLabel}>What was reported</Text>
                <Text style={styles.bodyText}>{selected.issue}</Text>
                {selected.description ? (
                  <Text style={styles.bodyText}>{selected.description}</Text>
                ) : null}

                {selected.studentStatement ? (
                  <>
                    <Text style={styles.sectionLabel}>The student's statement</Text>
                    <Text style={styles.bodyText}>{selected.studentStatement}</Text>
                  </>
                ) : null}

                {selected.reviewNote ? (
                  <>
                    <Text style={styles.sectionLabel}>The committee's finding</Text>
                    <Text style={styles.bodyText}>{selected.reviewNote}</Text>
                  </>
                ) : null}

                {selected.decisionNote ? (
                  <>
                    <Text style={styles.sectionLabel}>The decision</Text>
                    <Text style={styles.bodyText}>{selected.decisionNote}</Text>
                  </>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: { paddingRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  subTitle: { fontSize: 12, color: '#64748b', marginTop: 2 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  caseCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  caseHeader: { flexDirection: 'row', alignItems: 'center' },
  caseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  caseInitial: { fontSize: 16, fontWeight: '800' },
  caseInfo: { flex: 1 },
  caseName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  caseMeta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  caseMeta2: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  riskChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  riskText: { fontSize: 10, fontWeight: '800' },
  evidenceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  evidenceText: { flex: 1, fontSize: 11, color: '#475569', lineHeight: 16, marginLeft: 8 },
  caseFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  penaltyText: { fontSize: 10, fontWeight: '700', color: '#d97706' },

  center: { alignItems: 'center', paddingVertical: 46 },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748b' },
  errorText: { marginTop: 12, fontSize: 13, color: '#64748b', textAlign: 'center' },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },

  footNote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 16,
  },

  modalBackdrop: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0f172a' },
  modalBody: { padding: 18 },
  row: { flexDirection: 'row', paddingVertical: 4 },
  rowLabel: { width: 104, fontSize: 12, color: '#94a3b8' },
  rowValue: { flex: 1, fontSize: 12, color: '#0f172a', fontWeight: '600' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bodyText: { fontSize: 12.5, color: '#475569', lineHeight: 19 },
});
