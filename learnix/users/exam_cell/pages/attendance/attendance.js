/**
 * X-11 — The mark-roll: who was actually in the room.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHAT THIS SCREEN IS FOR
 * -----------------------
 * The invigilator takes the roll on a phone, in a room, with a queue of students at the door. So
 * the screen is a LIST OF NAMES with a PRESENT/ABSENT choice on each, and ONE button that submits
 * the whole roll — not a form per student, and not a screen that needs a network round trip per
 * tap.
 *
 * WHY IT IS ITS OWN SCREEN AND NOT A TIMETABLE BLOCK
 * --------------------------------------------------
 * The timetable's eight blocks are a published contract that the docs and the UI audit both assert,
 * and the timetable's job is the SCHEDULE. The mark-roll is a different job, taken by a different
 * person at a different moment, and it gets its own router and its own `FEATURE_MODULES` key.
 *
 * IT PICKS ITS OWN PAPER
 * ----------------------
 * The screen opens on a list of the papers and their roll state, and a tap opens the roll. It does
 * NOT wait to be handed a slot id, and that is not a preference: `openModule` on the client is
 * `openModule: (key) => setCurrentScreen(key)` (`exam_cell.js`) — it DROPS its second argument, so
 * a slot id handed to it would be silently discarded and the screen would open on nothing. Every
 * exam-cell screen that needs an exam owns its picker for the same reason.
 *
 * THE THIRD STATE IS NOT A CHOICE
 * -------------------------------
 * "Not marked" is what a name looks like before anybody has touched it. It is shown — a name with no
 * mark is visibly waiting for one — but it is not a CHOICE, because choosing it is choosing to
 * record nothing. An invigilator marks a student PRESENT or ABSENT, or leaves them for later.
 *
 * THE SUBMIT IS A BULK WRITE
 * --------------------------
 * One request for the whole roll, and it is idempotent: submitting twice CORRECTS rather than
 * duplicating, because somebody walking in late is the ordinary case, not the exceptional one.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, EmptyState } from '../../../../components/ui';
import { examcellApi } from '../../../../services/api';
import { GREEN, MUTED, RED, SLATE, fmtDay, plural } from '../dashboard/dashboardMeta';

const STATE_STYLE = {
  PRESENT: { color: GREEN, bg: '#dcfce7' },
  ABSENT: { color: RED, bg: '#fee2e2' },
  UNMARKED: { color: MUTED, bg: '#f1f5f9' },
};

export default function ExamAttendanceScreen({ navigation }) {
  // THE PAPER PICKER, and the roll. `slotId` is INTERNAL state, not a route param — see the
  // header for why.
  const [slotId, setSlotId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSummary(await examcellApi.attendanceSummary());
    } catch (e) {
      setError(e.message || 'Could not load the papers');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoll = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await examcellApi.attendanceRoll(id);
      setData(res);
      // The marks already on the roll are the starting point, so an invigilator correcting one
      // name does not have to remember the other thirty.
      const existing = {};
      for (const row of res?.rows ?? []) {
        if (row.state !== 'UNMARKED') existing[row.studentProfileId] = row.state;
      }
      setMarks(existing);
    } catch (e) {
      setError(e.message || 'Could not load the roll');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slotId) loadRoll(slotId);
    else loadSummary();
  }, [slotId, loadRoll, loadSummary]);

  const rows = data?.rows ?? [];
  const pending = useMemo(() => rows.filter((r) => r.state === 'UNMARKED').length, [rows]);

  const setMark = (studentProfileId, state) => {
    setMarks((prev) => ({ ...prev, [studentProfileId]: state }));
  };

  const markAll = (state) => {
    const next = {};
    for (const r of rows) next[r.studentProfileId] = state;
    setMarks(next);
  };

  const submit = async () => {
    const entries = Object.entries(marks);
    if (entries.length === 0) {
      Alert.alert('Nothing to save', 'Mark at least one student before saving the roll.');
      return;
    }
    setSaving(true);
    try {
      const res = await examcellApi.markAttendance(slotId, {
        marks: entries.map(([studentProfileId, state]) => ({ studentProfileId, state })),
      });
      Alert.alert('Roll saved', `${res?.present ?? 0} present, ${res?.absent ?? 0} absent.`);
      loadRoll(slotId);
    } catch (e) {
      Alert.alert('Could not save the roll', e.message || 'Try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error && !summary && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={RED} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={slotId ? () => loadRoll(slotId) : loadSummary}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── THE ROLL ───────────────────────────────────────────────────────────
  if (data) {
    const slot = data.slot ?? {};
    const counts = data.counts ?? {};
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <TouchableOpacity style={styles.back} onPress={() => setSlotId(null)}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
          <Text style={styles.backText}>All papers</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Mark the roll</Text>
        <Text style={styles.sub}>
          {slot.courseName} · {slot.examName}
        </Text>
        <Text style={styles.sub}>
          {fmtDay(slot.date)} · {slot.startTime}–{slot.endTime}
          {slot.room ? ` · ${slot.room}` : ''}
        </Text>

        <AnimatedCard style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: GREEN }]}>{counts.PRESENT ?? 0}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: RED }]}>{counts.ABSENT ?? 0}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: MUTED }]}>{counts.UNMARKED ?? 0}</Text>
              <Text style={styles.statLabel}>Not marked</Text>
            </View>
          </View>

          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => markAll('PRESENT')}>
              <Text style={[styles.quickText, { color: GREEN }]}>All present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => setMarks({})}>
              <Text style={[styles.quickText, { color: SLATE }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {rows.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Nobody on this roll"
            message="The paper has no enrolled students and no hall tickets issued."
          />
        ) : (
          rows.map((row) => {
            const state = marks[row.studentProfileId] ?? 'UNMARKED';
            const s = STATE_STYLE[state];
            return (
              <View key={row.studentProfileId} style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={styles.meta}>
                    {row.rollNo}
                    {row.seatNo ? ` · Seat ${row.seatNo}` : ''}
                    {row.hasTicket ? '' : ' · no ticket'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.markBtn, { backgroundColor: s.bg }]}
                  onPress={() => setMark(row.studentProfileId, 'PRESENT')}
                  hitSlop={6}
                >
                  <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.markBtn, { backgroundColor: s.bg }]}
                  onPress={() => setMark(row.studentProfileId, 'ABSENT')}
                  hitSlop={6}
                >
                  <Ionicons name="close-circle" size={18} color={RED} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {pending > 0 ? (
          <Text style={styles.pending}>
            {plural(pending, 'student')} not marked yet. Saving keeps them unmarked — which is not the
            same as absent.
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveOff]}
          onPress={submit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={17} color="#fff" />
              <Text style={styles.saveText}>Save the roll</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── THE PAPER PICKER ────────────────────────────────────────────────────
  const papers = summary?.slots ?? [];
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <TouchableOpacity style={styles.back} onPress={() => navigation?.goBack?.()}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Mark the roll</Text>
      <Text style={styles.sub}>
        Take the roll for a paper. Every paper shows how much of its roll has been accounted for.
      </Text>

      {papers.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No papers yet"
          message="A paper appears here once it has been scheduled."
        />
      ) : (
        papers.map((p) => (
          <TouchableOpacity
            key={p.slotId}
            style={styles.paperRow}
            onPress={() => setSlotId(p.slotId)}
            activeOpacity={0.75}
          >
            <View style={styles.paperWhen}>
              <Text style={styles.paperDay}>{fmtDay(p.date)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={1}>
                {p.courseName}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {p.code} · {p.examName}
              </Text>
            </View>
            <View style={styles.paperCounts}>
              <Text style={[styles.paperCount, { color: GREEN }]}>{p.present}</Text>
              <Text style={[styles.paperCount, { color: RED }]}>{p.absent}</Text>
              <Text style={[styles.paperCount, { color: MUTED }]}>{p.unmarked}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.legend}>
        Each paper shows three numbers: present, absent, and not marked. The last is not an absence —
        it is a roll nobody has taken.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  h1: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 12, color: theme.colors.textMuted },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  loadingText: { marginTop: theme.spacing.sm, fontSize: 13, color: theme.colors.textMuted },
  errorText: { marginTop: theme.spacing.sm, fontSize: 13, color: RED, textAlign: 'center' },
  retryBtn: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  retryText: { color: '#fff', fontWeight: '700' },

  card: { gap: theme.spacing.sm },
  statRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  quickRow: { flexDirection: 'row', gap: theme.spacing.sm },
  quickBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 7,
    alignItems: 'center',
  },
  quickText: { fontSize: 12, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  name: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  meta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  markBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  paperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  paperWhen: { width: 46 },
  paperDay: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  paperCounts: { flexDirection: 'row', gap: 6 },
  paperCount: { fontSize: 13, fontWeight: '700' },
  legend: { fontSize: 11, color: SLATE, lineHeight: 15, marginTop: theme.spacing.xs },

  pending: { fontSize: 11, color: SLATE, lineHeight: 15 },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
  },
  saveOff: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
