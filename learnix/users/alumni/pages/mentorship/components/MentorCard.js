import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { EmptyState } from '../../../../../components/ui';
import {
  pairStatusMeta,
  requestStatusMeta,
  goalStatusMeta,
  fmtDate,
  fmtDateTime,
  fmtDuration,
  relativeDay,
  initials,
  avatarColor,
  stars,
  menteeLabel,
} from '../mentorshipMeta';

/** Circular initials avatar. Colour derives from the name, never from list order. */
export function Avatar({ name, size = 38, color, badge }) {
  const c = color ?? avatarColor(name);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 3, backgroundColor: c + '18' },
      ]}
    >
      <Text style={[styles.avatarText, { color: c, fontSize: size * 0.36 }]}>{initials(name)}</Text>
      {badge ? (
        <View style={[styles.avatarBadge, { backgroundColor: badge.color }]}>
          <Ionicons name={badge.icon} size={9} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

export function StatusChip({ status, kind = 'pair' }) {
  const meta = kind === 'request' ? requestStatusMeta(status) : pairStatusMeta(status);
  return (
    <View style={[styles.statusChip, { backgroundColor: meta.color + '14' }]}>
      <Ionicons name={meta.icon} size={10} color={meta.color} />
      <Text style={[styles.statusText, { color: meta.color }]}>{meta.short ?? meta.label}</Text>
    </View>
  );
}

/** Horizontal 0–100 bar. `null` renders an explicit dash, never a 0% bar. */
export function ProgressBar({ percent, color = '#2563eb', height = 6, track }) {
  if (percent === null || percent === undefined) {
    return <View style={[styles.progressTrack, { backgroundColor: track ?? theme.colors.surfaceMuted }]} />;
  }
  return (
    <View style={[styles.progressTrack, { backgroundColor: track ?? theme.colors.surfaceMuted }]}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, percent))}%`, height, backgroundColor: color }]} />
    </View>
  );
}

/** A mentorship pair. `onOpen` makes the whole card tappable. */
export function PairCard({ pair, onOpen, onRemind, busy, showStatus = true }) {
  const st = pairStatusMeta(pair.status);
  const goalPct = pair.goals?.percent ?? null;
  const duration = fmtDuration(pair.sessions?.totalMinutes);

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <Avatar name={pair.mentor.name} badge={{ color: st.color, icon: st.icon }} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {pair.mentor.name}
            </Text>
            {showStatus ? <StatusChip status={pair.status} /> : null}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            Mentor{pair.mentor.batch ? ` · batch ${pair.mentor.batch}` : ''}
            {pair.mentor.role ? ` · ${pair.mentor.role}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.linkRow}>
        <Ionicons name="swap-horizontal" size={12} color={theme.colors.textMuted} />
        <Text style={styles.meta} numberOfLines={1}>
          with <Text style={styles.strong}>{pair.mentee.name}</Text>
          {pair.mentee.kind === 'STUDENT' ? ' (student)' : ''}
        </Text>
      </View>

      <View style={styles.chipRow}>
        <View style={styles.fieldChip}>
          <Ionicons name="briefcase-outline" size={10} color="#2563eb" />
          <Text style={styles.fieldChipText}>{pair.field}</Text>
        </View>
        {pair.matchScore != null ? (
          <View style={[styles.fieldChip, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="sparkles-outline" size={10} color="#059669" />
            <Text style={[styles.fieldChipText, { color: '#059669' }]}>{pair.matchScore}% match</Text>
          </View>
        ) : null}
        {pair.feedback?.ofMentor != null ? (
          <View style={[styles.fieldChip, { backgroundColor: '#fffbeb' }]}>
            <Ionicons name="star" size={10} color="#f59e0b" />
            <Text style={[styles.fieldChipText, { color: '#b45309' }]}>{pair.feedback.ofMentor}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statRow}>
        <Stat icon="calendar-outline" label={`${pair.sessions?.held ?? 0} sessions`} />
        {duration ? <Stat icon="time-outline" label={duration} /> : null}
        <Stat
          icon="flag-outline"
          label={
            goalPct === null
              ? 'no goals yet'
              : `${pair.goals.achieved}/${pair.goals.total} goals`
          }
        />
      </View>

      {goalPct !== null ? (
        <View style={styles.goalBlock}>
          <ProgressBar percent={goalPct} color={goalPct === 100 ? '#059669' : '#2563eb'} />
          <Text style={styles.goalText}>{goalPct}% of goals achieved</Text>
        </View>
      ) : null}

      <View style={styles.cardFoot}>
        <View style={{ flex: 1 }}>
          {pair.status === 'ACTIVE' && pair.nextSessionAt ? (
            <Text style={styles.nextText}>
              Next session {relativeDay(pair.nextSessionAt)} · {fmtDate(pair.nextSessionAt)}
            </Text>
          ) : pair.status === 'DECLINED' && pair.declinedReason ? (
            <Text style={styles.reasonText} numberOfLines={2}>
              {pair.declinedReason}
            </Text>
          ) : pair.status === 'COMPLETED' ? (
            <Text style={styles.meta}>
              Completed {pair.completedAt ? fmtDate(pair.completedAt) : ''}
            </Text>
          ) : (
            <Text style={styles.meta}>
              {pair.approvedAt ? `Started ${fmtDate(pair.approvedAt)}` : `Requested ${fmtDate(pair.requestedAt)}`}
            </Text>
          )}
        </View>
        {onRemind ? (
          <TouchableOpacity style={styles.remindBtn} onPress={onRemind} disabled={busy} hitSlop={6}>
            {busy ? (
              <Text style={styles.remindText}>…</Text>
            ) : (
              <Ionicons name="notifications-outline" size={14} color="#2563eb" />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function Stat({ icon, label }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={11} color={theme.colors.textMuted} />
      <Text style={styles.statText}>{label}</Text>
    </View>
  );
}

/** A mentor in the directory, or a match candidate with its reasons. */
export function MentorCard({ mentor, onPress, onRequest, matched }) {
  const c = avatarColor(mentor.name);
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardTop} onPress={onPress} activeOpacity={0.8}>
        <Avatar name={mentor.name} size={42} color={c} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {mentor.name}
            </Text>
            {matched ? (
              <View style={[styles.scoreChip, { backgroundColor: c + '14' }]}>
                <Text style={[styles.scoreText, { color: c }]}>{matched}% match</Text>
              </View>
            ) : mentor.activeMentees > 0 ? (
              <View style={styles.loadChip}>
                <Text style={styles.loadText}>{mentor.activeMentees} mentee(s)</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {/* `batch` from the directory, `graduationYear` from ranked matches —
                the two shapes name the same thing differently, and showing "—" on
                a 94%-match card because of a field name would be absurd. */}
            {mentor.batch ?? mentor.graduationYear ? `Batch ${mentor.batch ?? mentor.graduationYear}` : '—'}
            {mentor.role ? ` · ${mentor.role}` : ''}
          </Text>
          {mentor.company ? <Text style={styles.meta} numberOfLines={1}>{mentor.company}</Text> : null}
        </View>
      </TouchableOpacity>

      {matched && mentor.reasons?.length > 0 ? (
        <View style={styles.reasons}>
          {/* A recommendation nobody can explain is one nobody will use — so the
              reasons are shown, not just the number. */}
          {mentor.reasons.slice(0, 4).map((r, i) => (
            <View key={i} style={styles.reasonRow}>
              <Ionicons name="checkmark-circle" size={10} color="#059669" />
              <Text style={styles.reasonTextInline}>{r}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {(mentor.skills ?? []).length > 0 ? (
        <View style={styles.chipRow}>
          {mentor.skills.slice(0, 4).map((s) => (
            <View key={s.skill} style={styles.skillChip}>
              <Text style={styles.skillText}>{s.skill}</Text>
            </View>
          ))}
          {mentor.skills.length > 4 ? (
            <Text style={styles.meta}>+{mentor.skills.length - 4}</Text>
          ) : null}
        </View>
      ) : null}

      {mentor.fields?.length > 0 ? (
        <Text style={styles.meta}>Available for: {mentor.fields.join(' · ')}</Text>
      ) : null}

      {onRequest ? (
        <TouchableOpacity style={styles.requestBtn} onPress={onRequest} activeOpacity={0.85}>
          <Ionicons name="hand-left-outline" size={13} color="#fff" />
          <Text style={styles.requestBtnText}>Request this mentor</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** A mentorship request awaiting a decision. */
export function RequestCard({ request, onAccept, onDecline, busy }) {
  const st = requestStatusMeta(request.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar name={request.mentee.name} badge={{ color: st.color, icon: st.icon }} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {request.mentee.name}
            </Text>
            <StatusChip status={request.status} kind="request" />
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {menteeLabel(request.mentee) || (request.mentee.kind === 'STUDENT' ? 'Student' : 'Alumnus')}
          </Text>
        </View>
      </View>

      {request.requestedSkills ? (
        <View style={styles.askedBlock}>
          <Text style={styles.askedLabel}>Wants help with</Text>
          <Text style={styles.askedText}>{request.requestedSkills}</Text>
        </View>
      ) : null}

      {request.message ? (
        <Text style={styles.message} numberOfLines={3}>
          “{request.message}”
        </Text>
      ) : null}

      <View style={styles.cardFoot}>
        <Text style={styles.meta}>{fmtDateTime(request.createdAt)}</Text>
        {request.mentor ? <Text style={styles.meta}>→ {request.mentor.name}</Text> : null}
      </View>

      {request.status === 'PENDING' && (onAccept || onDecline) ? (
        <View style={styles.actionRow}>
          {onAccept ? (
            <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} disabled={busy}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.acceptText}>{busy ? 'Working…' : 'Accept'}</Text>
            </TouchableOpacity>
          ) : null}
          {onDecline ? (
            <TouchableOpacity style={styles.declineBtn} onPress={onDecline} disabled={busy}>
              <Ionicons name="close" size={14} color="#dc2626" />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {request.declineReason ? (
        <View style={styles.declinedNote}>
          <Ionicons name="information-circle-outline" size={12} color="#dc2626" />
          <Text style={styles.declinedText}>{request.declineReason}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** A goal with its progress. */
export function GoalCard({ goal, onEdit, onDelete }) {
  const st = goalStatusMeta(goal.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, goal.status === 'ACHIEVED' && styles.doneText]} numberOfLines={2}>
              {goal.title}
            </Text>
          </View>
          <View style={[styles.goalStatusRow, { backgroundColor: st.color + '14' }]}>
            <Ionicons name={st.icon} size={9} color={st.color} />
            <Text style={[styles.goalStatusText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
      </View>

      {goal.detail ? <Text style={styles.message}>{goal.detail}</Text> : null}

      <View style={styles.goalBlock}>
        <ProgressBar
          percent={goal.progressPct}
          color={goal.status === 'ACHIEVED' ? '#059669' : '#2563eb'}
        />
        <View style={styles.goalFoot}>
          <Text style={styles.goalText}>{goal.progressPct}%</Text>
          {goal.targetDate ? (
            <Text style={[styles.meta, goal.isOverdue && { color: '#dc2626' }]}>
              {goal.isOverdue ? 'Overdue · ' : 'Due '}
              {fmtDate(goal.targetDate)}
            </Text>
          ) : null}
        </View>
      </View>

      {onEdit || onDelete ? (
        <View style={styles.actionRow}>
          {onEdit ? (
            <TouchableOpacity style={styles.smallBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={12} color="#2563eb" />
              <Text style={styles.smallBtnText}>Update</Text>
            </TouchableOpacity>
          ) : null}
          {onDelete ? (
            <TouchableOpacity style={[styles.smallBtn, { borderColor: '#fecaca' }]} onPress={onDelete}>
              <Ionicons name="trash-outline" size={12} color="#dc2626" />
              <Text style={[styles.smallBtnText, { color: '#dc2626' }]}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** A logged or booked session. */
export function SessionCard({ session, onCancel }) {
  const mode = session.mode;
  return (
    <View style={[styles.card, session.cancelledAt && styles.cancelledCard]}>
      <View style={styles.cardTop}>
        <View style={[styles.sessionIcon, session.planned ? styles.sessionPlanned : styles.sessionHeld]}>
          <Ionicons
            name={session.planned ? 'calendar-outline' : 'checkmark-done-outline'}
            size={15}
            color={session.planned ? '#d97706' : '#059669'}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name}>{session.planned ? 'Upcoming session' : 'Session held'}</Text>
          <Text style={styles.meta}>
            {fmtDateTime(session.sessionDate)}
            {session.cancelledAt ? ' · cancelled' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.statRow}>
        {mode ? <Stat icon={mode === 'VIDEO' ? 'videocam-outline' : mode === 'PHONE' ? 'call-outline' : 'location-outline'} label={mode.replace('_', ' ').toLowerCase()} /> : null}
        {fmtDuration(session.durationMinutes) ? (
          <Stat icon="time-outline" label={fmtDuration(session.durationMinutes)} />
        ) : null}
        <Stat icon="person-outline" label={`logged by ${session.loggedByName ?? 'a participant'}`} />
      </View>

      {session.agenda ? <Text style={styles.message}>{session.agenda}</Text> : null}
      {session.notes ? <Text style={styles.message}>{session.notes}</Text> : null}
      {session.outcome ? (
        <View style={styles.outcomeBox}>
          <Text style={styles.outcomeLabel}>Outcome</Text>
          <Text style={styles.outcomeText}>{session.outcome}</Text>
        </View>
      ) : null}

      {onCancel && session.planned && !session.cancelledAt ? (
        <TouchableOpacity style={[styles.smallBtn, { borderColor: '#fecaca', alignSelf: 'flex-start', marginTop: 8 }]} onPress={onCancel}>
          <Ionicons name="close-circle-outline" size={12} color="#dc2626" />
          <Text style={[styles.smallBtnText, { color: '#dc2626' }]}>Cancel booking</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Star row. `onChange` turns it into an input; omit for a read-only display. */
export function StarPicker({ value, onChange, size = 24 }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={onChange ? () => onChange(n) : undefined} disabled={!onChange} hitSlop={4}>
          <Ionicons name={n <= (value ?? 0) ? 'star' : 'star-outline'} size={size} color={n <= (value ?? 0) ? '#f59e0b' : '#cbd5e1'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function RatingRow({ label, rating, count }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={{ flex: 1 }}>
        <StarPicker value={rating} size={13} />
      </View>
      <Text style={styles.ratingValue}>{rating != null ? rating.toFixed(1) : '—'}</Text>
      {count != null ? <Text style={styles.ratingCount}>({count})</Text> : null}
    </View>
  );
}

export function NoData({ title, subtitle, icon = 'sparkles-outline', color = '#2563eb', actionLabel, onAction }) {
  return (
    <EmptyState icon={icon} title={title} subtitle={subtitle} color={color} actionLabel={actionLabel} onAction={onAction} />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  cancelledCard: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, flexShrink: 1 },
  doneText: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  strong: { fontFamily: 'Manrope-Bold', color: theme.colors.text },
  message: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 16, marginTop: 6 },

  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Manrope-ExtraBold' },
  avatarBadge: { position: 'absolute', right: -4, bottom: -4, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },

  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 9, fontFamily: 'Manrope-Bold' },
  scoreChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  scoreText: { fontSize: 9, fontFamily: 'Manrope-Bold' },
  loadChip: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  loadText: { fontSize: 9, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 8 },
  fieldChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  fieldChipText: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#2563eb' },
  skillChip: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  skillText: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },

  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },

  goalBlock: { marginTop: 10 },
  goalFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  goalText: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { borderRadius: 3 },

  nextText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: '#2563eb' },
  reasonText: { fontSize: 10, fontFamily: 'Manrope-Medium', color: '#dc2626', fontStyle: 'italic' },
  remindBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  remindText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#2563eb' },

  reasons: { marginTop: 8, gap: 3 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reasonTextInline: { fontSize: 10, fontFamily: 'Manrope-Medium', color: '#059669', flex: 1 },

  askedBlock: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginTop: 8 },
  askedLabel: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.4 },
  askedText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: '#78350f', marginTop: 3 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#059669', borderRadius: 11, paddingVertical: 10 },
  acceptText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  declineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#fecaca', borderRadius: 11, paddingVertical: 10, paddingHorizontal: 16 },
  declineText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#dc2626' },
  requestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#2563eb', borderRadius: 11, paddingVertical: 10, marginTop: 10 },
  requestBtnText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  smallBtnText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#2563eb' },
  declinedNote: { flexDirection: 'row', gap: 5, marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 9, padding: 9 },
  declinedText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: '#991b1b' },

  goalStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 5 },
  goalStatusText: { fontSize: 9, fontFamily: 'Manrope-Bold' },

  sessionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sessionPlanned: { backgroundColor: '#fffbeb' },
  sessionHeld: { backgroundColor: '#ecfdf5' },
  outcomeBox: { backgroundColor: '#f0fdf4', borderRadius: 9, padding: 9, marginTop: 8 },
  outcomeLabel: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.4 },
  outcomeText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#166534', marginTop: 3, lineHeight: 16 },

  starRow: { flexDirection: 'row', gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ratingLabel: { width: 96, fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  ratingValue: { fontSize: 12, fontFamily: 'Manrope-ExtraBold', color: '#f59e0b', minWidth: 26, textAlign: 'right' },
  ratingCount: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
});
