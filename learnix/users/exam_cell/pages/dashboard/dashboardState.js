/**
 * X-11 — The exam cell dashboard: the first four sections, as components.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHY THE SECTIONS ARE THEIR OWN FILES
 * ------------------------------------
 * The screen that composes them was 594 lines, and a file has to stay under 500. This file carries
 * the four that describe the STATE of the season — the exams, the marking, the results and the
 * students — and `dashboardSections.js` carries the three that describe what to DO about it.
 *
 * The order is the server's: what the office must ACT ON is above what it must merely KNOW. It is
 * not a client-side decision, because the server publishes the blocks in that order and a client
 * that reordered them would be showing a different dashboard from the one the API describes.
 *
 * EVERY FIGURE IS WHAT THE SERVER SENT
 * ------------------------------------
 * No section computes anything about the data. A number the client derived is a number the client
 * can get wrong, and the whole point of this rewrite was that every figure comes from one place.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import {
  GREEN,
  MUTED,
  RED,
  SLATE,
  blockMeta,
  fmtDay,
  fmtDayFull,
  plural,
} from './dashboardMeta';
import {
  DashboardEmpty,
  DetailRow,
  NoteStrip,
  ProgressBar,
  Section,
  StatRow,
  StatTile,
} from './dashboardUi';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  link: { color: theme.colors.primary, fontWeight: '600', fontSize: 12 },

  deadline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deadlineText: { fontSize: 11, color: SLATE, flex: 1 },

  paperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  paperWhen: { width: 46 },
  paperDay: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  paperTime: { fontSize: 10, color: MUTED },
  paperTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  paperMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  rescheduledTag: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rescheduledText: { fontSize: 9, fontWeight: '700', color: '#d97706' },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  blockers: { fontSize: 10, color: '#d97706', maxWidth: 130, textAlign: 'right' },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: '700' },
});

// ═══ 1. Exam overview ═════════════════════════════════════════════════════

export function ExamOverviewSection({ data, navigation }) {
  const meta = blockMeta('EXAM_OVERVIEW');
  const ex = data?.overview;
  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
      right={
        <TouchableOpacity onPress={() => navigation?.switchTab?.('Timetable')} hitSlop={8}>
          <Text style={styles.link}>Timetable</Text>
        </TouchableOpacity>
      }
    >
      <StatRow>
        <StatTile label="Ongoing" value={ex?.ongoing ?? 0} icon="pulse-outline" color={meta?.color} />
        <StatTile
          label="Scheduled"
          value={ex?.scheduled ?? 0}
          hint={`${ex?.draft ?? 0} draft`}
          icon="calendar-outline"
          color={meta?.color}
        />
        <StatTile
          label="Completed"
          value={ex?.completed ?? 0}
          icon="checkmark-done-outline"
          color={GREEN}
        />
      </StatRow>

      {ex?.deadline ? (
        <View style={styles.deadline}>
          <Ionicons
            name={ex.deadline.overdue ? 'alarm' : 'alarm-outline'}
            size={14}
            color={ex.deadline.overdue ? RED : SLATE}
          />
          <Text style={[styles.deadlineText, ex.deadline.overdue ? { color: RED } : null]}>
            {ex.deadline.examName} — grading due {fmtDayFull(ex.deadline.dueAt)}
            {ex.deadline.daysLeft !== null
              ? ex.deadline.overdue
                ? ` (${Math.abs(ex.deadline.daysLeft)}d overdue)`
                : ` (${ex.deadline.daysLeft}d left)`
              : ''}
          </Text>
        </View>
      ) : null}

      {(ex?.upcoming ?? []).length === 0 ? (
        <DashboardEmpty
          icon="calendar-outline"
          title="No papers in the next week"
          message="Papers appear here once they are scheduled."
        />
      ) : (
        (ex?.upcoming ?? []).map((u) => (
          <View key={u.slotId} style={styles.paperRow}>
            <View style={styles.paperWhen}>
              <Text style={styles.paperDay}>{fmtDay(u.date)}</Text>
              <Text style={styles.paperTime}>{u.startTime}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.paperTitle} numberOfLines={1}>
                {u.subject}
              </Text>
              <Text style={styles.paperMeta} numberOfLines={1}>
                {u.code} · {u.examName}
                {u.room ? ` · ${u.room}` : ''}
              </Text>
            </View>
            {u.rescheduled ? (
              <View style={styles.rescheduledTag}>
                <Text style={styles.rescheduledText}>moved</Text>
              </View>
            ) : null}
          </View>
        ))
      )}
    </Section>
  );
}

// ═══ 2. Evaluation status ═════════════════════════════════════════════════

export function EvaluationStatusSection({ data, navigation }) {
  const meta = blockMeta('EVALUATION_STATUS');
  const ev = data?.evaluation;
  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
      right={
        <TouchableOpacity onPress={() => navigation?.switchTab?.('Evaluations')} hitSlop={8}>
          <Text style={styles.link}>Evaluations</Text>
        </TouchableOpacity>
      }
    >
      <StatRow>
        <StatTile label="Evaluated" value={ev?.evaluated ?? 0} hint={`of ${ev?.total ?? 0}`} />
        <StatTile
          label="Still to mark"
          value={ev?.pending ?? 0}
          tone={ev?.pending > 0 ? 'warn' : 'clear'}
        />
        <StatTile
          label="Under review"
          value={ev?.underReview ?? 0}
          tone={ev?.underReview > 0 ? 'warn' : 'clear'}
          hint="moderation"
        />
      </StatRow>
      <ProgressBar
        percent={ev?.percent ?? 0}
        color={meta?.color}
        label={`${ev?.percent ?? 0}% of papers marked`}
      />
      <DetailRow
        label="Scripts in custody"
        value={`${ev?.scripts?.inCustody ?? 0} of ${ev?.total ?? 0}`}
      />
      <DetailRow label="Scripts verified" value={`${ev?.scripts?.verified ?? 0}`} />
      {ev?.flagged > 0 ? (
        <NoteStrip tone="warn">
          {plural(ev.flagged, 'subject')} flagged by moderation — the marks are unlocked and need
          looking at.
        </NoteStrip>
      ) : null}
    </Section>
  );
}

// ═══ 3. Result progress ════════════════════════════════════════════════════

export function ResultProgressSection({ data, navigation }) {
  const meta = blockMeta('RESULT_PROGRESS');
  const rs = data?.results;
  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
      right={
        <TouchableOpacity onPress={() => navigation?.switchTab?.('Results')} hitSlop={8}>
          <Text style={styles.link}>Results</Text>
        </TouchableOpacity>
      }
    >
      <StatRow>
        <StatTile
          label="Published"
          value={rs?.published ?? 0}
          hint={`of ${rs?.total ?? 0}`}
          tone="clear"
        />
        <StatTile
          label="In processing"
          value={rs?.inProcessing ?? 0}
          tone={rs?.inProcessing > 0 ? 'warn' : 'clear'}
        />
        <StatTile
          label="Ready to publish"
          value={rs?.readyToPublish ?? 0}
          tone={rs?.readyToPublish > 0 ? 'warn' : 'clear'}
        />
      </StatRow>
      <ProgressBar
        percent={rs?.publishPercent ?? 0}
        color={meta?.color}
        label={`${rs?.publishPercent ?? 0}% published`}
      />
      {(rs?.slots ?? []).length === 0 ? (
        <DashboardEmpty
          icon="trophy-outline"
          title="No results yet"
          message="Marks appear here as the papers are consolidated."
        />
      ) : (
        (rs?.slots ?? []).slice(0, 4).map((s) => (
          <View key={s.slotId} style={styles.slotRow}>
            <View style={styles.flex}>
              <Text style={styles.paperTitle} numberOfLines={1}>
                {s.subject}
              </Text>
              <Text style={styles.paperMeta} numberOfLines={1}>
                {s.code} · {s.examName}
              </Text>
            </View>
            {s.ready ? (
              <View style={[styles.tag, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.tagText, { color: GREEN }]}>ready</Text>
              </View>
            ) : (
              <Text style={styles.blockers} numberOfLines={1}>
                {s.blockers[0] ?? 'blocked'}
              </Text>
            )}
          </View>
        ))
      )}
    </Section>
  );
}

// ═══ 4. Student statistics ═════════════════════════════════════════════════

export function StudentStatisticsSection({ data }) {
  const meta = blockMeta('STUDENT_STATISTICS');
  const st = data?.students;
  return (
    <Section title={meta?.label} blurb={meta?.blurb} icon={meta?.icon} color={meta?.color}>
      <StatRow>
        <StatTile label="Registered" value={st?.registered ?? 0} hint="enrolments" />
        <StatTile label="Eligible" value={st?.eligible ?? 0} hint="no warnings" />
        <StatTile
          label="Appeared"
          value={st?.appeared ?? 0}
          tone={st?.marked ? 'clear' : undefined}
          hint={st?.marked ? 'present' : 'not marked yet'}
        />
        <StatTile
          label="Absent"
          value={st?.absent ?? 0}
          tone={st?.absent > 0 ? 'bad' : 'clear'}
        />
      </StatRow>
      {st && !st.marked ? (
        <NoteStrip tone="warn">
          No paper has been marked yet, so the appeared and absent figures are zero because the roll
          has not been taken — not because nobody came. Take the roll from a paper.
        </NoteStrip>
      ) : null}
      {st && st.eligible === 0 && st.registered > 0 ? (
        <NoteStrip tone="warn">
          No student is currently clear for a hall ticket.{' '}
          {st.warnings?.outstandingFees > 0
            ? `${st.warnings.outstandingFees} carry fee dues`
            : ''}
          {st.warnings?.outstandingFees > 0 && st.warnings?.missingPhotos > 0 ? ' and ' : ''}
          {st.warnings?.missingPhotos > 0
            ? `${st.warnings.missingPhotos} ${st.warnings.missingPhotos === 1 ? 'has' : 'have'} no photo`
            : ''}
          . A warning does not block a ticket — it is shown, and never enforced.
        </NoteStrip>
      ) : null}
      {st && st.unmarked > 0 ? (
        <NoteStrip>
          {plural(st.unmarked, 'student')} on the roll {st.unmarked === 1 ? 'has' : 'have'} not been
          marked yet. That is not an absence.
        </NoteStrip>
      ) : null}
      <DetailRow label="Students on the roll" value={`${st?.rollTotal ?? 0}`} />
      <DetailRow label="Papers marked" value={`${st?.markedSlots ?? 0} of ${st?.slots ?? 0}`} />
      <DetailRow label="With fee dues" value={`${st?.warnings?.outstandingFees ?? 0}`} />
    </Section>
  );
}
