import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { studentApi } from '../../../../services/api';
import { SkeletonCard } from '../../../../components/ui';
// The alumni module already built the presentation pieces, and duplicating them
// would guarantee the two sides drift apart on status wording, date formatting and
// star rendering. Presentation is shared deliberately; the DATA layer is not —
// these components are pure, and every call below is `studentApi`.
import {
  Avatar,
  StatusChip,
  SessionCard,
  GoalCard,
  StarPicker,
  RatingRow,
  NoData,
} from '../../../alumni/pages/mentorship/components/MentorCard';
import {
  requestStatusMeta,
  MENTORSHIP_FIELDS,
  SESSION_MODES,
  fmtDate,
  fmtDateTime,
  fmtDuration,
  relativeDay,
} from '../../../alumni/pages/mentorship/mentorshipMeta';

const TABS = [
  { id: 'active', label: 'My mentor', icon: 'people-outline' },
  { id: 'pending', label: 'Requests', icon: 'mail-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
];

/**
 * Student-side mentorship.
 *
 * Why this exists at all: `MentorshipPair.menteeStudentProfileId` has been part of
 * the schema from the start, so a student could be assigned a mentor — and then
 * had no screen at all. The office could see the pair; the student could not. This
 * closes that, and it is deliberately a smaller screen than the alumni one: a
 * student is always the mentee, so there is no request inbox to accept from, no
 * office actions, and no peer-to-peer ambiguity.
 */
export default function StudentMentorship({ navigation }) {
  const [tab, setTab] = useState('active');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null); // pairId
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const [findOpen, setFindOpen] = useState(false);
  const [mentors, setMentors] = useState([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [request, setRequest] = useState(null);
  const [form, setForm] = useState({ skills: '', message: '', field: MENTORSHIP_FIELDS[0] });
  const [matches, setMatches] = useState(null);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const [sessionModal, setSessionModal] = useState(null); // 'schedule' | 'log'
  const [sessionForm, setSessionForm] = useState({ sessionDate: '', mode: 'VIDEO', durationMinutes: '45', agenda: '', outcome: '' });
  const [goalModal, setGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', progressPct: '0', status: 'PENDING' });
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [fbForm, setFbForm] = useState({ rating: 0, comment: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (spinner = true) => {
    try {
      if (spinner) setLoading(true);
      setError(null);
      setData(await studentApi.mentorship({ scope: tab }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  // Collapse an open pair when the tab changes: the detail belongs to a pair the
  // list may no longer be showing, and leaving it open underneath a different
  // list is how a student ends up reading one mentor while looking at another.
  useEffect(() => {
    setExpanded(null);
    setDetail(null);
  }, [tab]);

  const togglePair = async (pairId) => {
    if (expanded === pairId) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(pairId);
    setDetail(null);
    try {
      const [p, f] = await Promise.all([
        studentApi.mentorshipPair(pairId),
        studentApi.mentorshipFeedback(pairId).catch(() => null),
      ]);
      setDetail({ ...p, feedbackData: f });
    } catch (e) {
      Alert.alert('Cannot open', e.message);
      setExpanded(null);
    }
  };

  // ── Finding a mentor ──
  const openFind = async () => {
    setFindOpen(true);
    try {
      setMentorsLoading(true);
      const [dir, reqs] = await Promise.all([
        studentApi.mentorDirectory(),
        studentApi.mentorshipRequests({ status: 'PENDING' }),
      ]);
      setMentors(dir.mentors ?? []);
      const pending = reqs.requests?.[0];
      if (pending) {
        setMatchesLoading(true);
        const m = await studentApi.requestMatches(pending.id).catch(() => null);
        setMatches(m);
        setMatchesLoading(false);
      } else {
        setMatches(null);
      }
    } catch (e) {
      Alert.alert('Cannot load mentors', e.message);
    } finally {
      setMentorsLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!form.skills.trim() && !form.message.trim()) {
      Alert.alert('Add a little more', 'Tell the mentor what you want help with.');
      return;
    }
    try {
      setBusy(true);
      await studentApi.requestMentor({
        requestedSkills: form.skills.trim() || undefined,
        message: form.message.trim() || undefined,
        field: form.field,
        mentorUserId: request.userId,
      });
      setRequest(null);
      setForm({ skills: '', message: '', field: MENTORSHIP_FIELDS[0] });
      Alert.alert('Request sent', 'You will be notified when they answer.');
      setFindOpen(false);
      setTab('pending');
    } catch (e) {
      Alert.alert('Cannot send request', e.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Sessions / goals / feedback ──
  const submitSession = async () => {
    const planned = sessionModal === 'schedule';
    if (!sessionForm.sessionDate) {
      Alert.alert('Pick a date', 'A session needs a date.');
      return;
    }
    try {
      setBusy(true);
      await studentApi.logMentorshipSession(expanded, {
        sessionDate: new Date(sessionForm.sessionDate).toISOString(),
        mode: sessionForm.mode,
        durationMinutes: planned ? undefined : Number(sessionForm.durationMinutes) || undefined,
        agenda: planned ? sessionForm.agenda || undefined : undefined,
        outcome: planned ? undefined : sessionForm.outcome || undefined,
        planned,
      });
      setSessionModal(null);
      setSessionForm({ sessionDate: '', mode: 'VIDEO', durationMinutes: '45', agenda: '', outcome: '' });
      refreshDetail();
    } catch (e) {
      Alert.alert('Cannot save session', e.message);
    } finally {
      setBusy(false);
    }
  };

  const refreshDetail = async () => {
    if (!expanded) return;
    try {
      const [p, f] = await Promise.all([
        studentApi.mentorshipPair(expanded),
        studentApi.mentorshipFeedback(expanded).catch(() => null),
      ]);
      setDetail({ ...p, feedbackData: f });
      load(false);
    } catch {
      /* the list refresh is enough; the expanded sheet keeps its last good state */
    }
  };

  const submitGoal = async () => {
    if (!goalForm.title.trim()) {
      Alert.alert('Give it a title', 'A goal needs a title.');
      return;
    }
    try {
      setBusy(true);
      await studentApi.createMentorshipGoal(expanded, {
        title: goalForm.title.trim(),
        progressPct: Number(goalForm.progressPct) || 0,
        status: goalForm.status,
      });
      setGoalModal(false);
      setGoalForm({ title: '', progressPct: '0', status: 'PENDING' });
      refreshDetail();
    } catch (e) {
      Alert.alert('Cannot save goal', e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = async () => {
    if (fbForm.rating === 0) {
      Alert.alert('Give a rating', 'Pick a star rating first.');
      return;
    }
    try {
      setBusy(true);
      await studentApi.submitMentorshipFeedback(expanded, {
        mentorRating: fbForm.rating,
        comment: fbForm.comment.trim() || undefined,
      });
      setFeedbackModal(false);
      setFbForm({ rating: 0, comment: '' });
      refreshDetail();
    } catch (e) {
      Alert.alert('Cannot submit review', e.message);
    } finally {
      setBusy(false);
    }
  };

  const pendingRequests = data?.pending ?? [];
  const pairs = tab === 'active' ? data?.active ?? [] : tab === 'history' ? data?.history ?? [] : [];
  const openRequest = pendingRequests.find((r) => r.status === 'PENDING');
  const ctx = detail?.viewerContext ?? {};

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6d28d9', '#7c3aed']} style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Mentorship</Text>
            <Text style={styles.heroSub}>
              {openRequest ? 'Waiting for a mentor to answer' : `${data?.stats?.active ?? 0} active mentorship(s)`}
            </Text>
          </View>
          {navigation?.goBack ? (
            <TouchableOpacity style={styles.circleBtn} onPress={navigation.goBack}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={openFind}>
          <Ionicons name="search-outline" size={15} color="#7c3aed" />
          <Text style={styles.actionText}>{openRequest ? 'See suggested mentors' : 'Ask for a mentor'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabWrap} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.tabActive]} onPress={() => setTab(t.id)}>
            <Ionicons name={t.icon} size={13} color={tab === t.id ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && !data ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />
          }
        >
          {/* Requests. A student can only ever have one open request, which is
              why the server refuses a second — so this list is never a queue. */}
          {tab === 'pending'
            ? pendingRequests.map((r) => {
                const st = requestStatusMeta(r.status);
                return (
                  <View key={r.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{r.status === 'PENDING' ? 'Waiting for a reply' : st.label}</Text>
                        <Text style={styles.meta}>{fmtDateTime(r.createdAt)}</Text>
                      </View>
                      <StatusChip status={r.status} kind="request" />
                    </View>

                    {r.requestedSkills ? (
                      <View style={styles.askBox}>
                        <Text style={styles.askLabel}>Asked for help with</Text>
                        <Text style={styles.askText}>{r.requestedSkills}</Text>
                      </View>
                    ) : null}
                    {r.message ? <Text style={styles.message}>“{r.message}”</Text> : null}
                    {r.mentor ? <Text style={styles.meta}>→ {r.mentor.name}</Text> : null}
                    {r.declineReason ? (
                      <View style={styles.declinedBox}>
                        <Ionicons name="information-circle-outline" size={13} color="#dc2626" />
                        <Text style={styles.declinedText}>{r.declineReason}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            : null}

          {pairs.map((p) => (
            <View key={p.id} style={styles.card}>
              <TouchableOpacity onPress={() => togglePair(p.id)} activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <Avatar name={p.mentor.name} size={42} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.name}>{p.mentor.name}</Text>
                    <Text style={styles.meta}>
                      {p.mentor.role ?? 'Mentor'}
                      {p.mentor.batch ? ` · batch ${p.mentor.batch}` : ''}
                    </Text>
                    <View style={styles.chipRow}>
                      <StatusChip status={p.status} />
                      <View style={styles.fieldChip}>
                        <Text style={styles.fieldChipText}>{p.field}</Text>
                      </View>
                      {p.goals.percent !== null ? (
                        <Text style={styles.meta}>{p.goals.achieved}/{p.goals.total} goals</Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name={expanded === p.id ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} />
                </View>

                {p.nextSessionAt ? (
                  <Text style={styles.nextText}>Next session {relativeDay(p.nextSessionAt)} · {fmtDate(p.nextSessionAt)}</Text>
                ) : p.status === 'ACTIVE' ? (
                  <Text style={styles.warnText}>No session booked yet</Text>
                ) : null}
              </TouchableOpacity>

              {expanded === p.id ? (
                detail?.id === p.id ? (
                  <PairSheet
                    detail={detail}
                    ctx={ctx}
                    onSchedule={() => setSessionModal('schedule')}
                    onLog={() => setSessionModal('log')}
                    onAddGoal={() => { setGoalForm({ title: '', progressPct: '0', status: 'PENDING' }); setGoalModal(true); }}
                    onReview={() => { setFbForm({ rating: 0, comment: '' }); setFeedbackModal(true); }}
                  />
                ) : (
                  <View style={styles.sheetLoading}>
                    <ActivityIndicator color="#7c3aed" size="small" />
                  </View>
                )
              ) : null}
            </View>
          ))}

          {tab === 'active' && pairs.length === 0 ? (
            <NoData
              icon="people-outline"
              title="No mentor yet"
              subtitle="Ask for one and an alumnus with the right experience will be matched to you."
              actionLabel="Ask for a mentor"
              onAction={openFind}
              color="#7c3aed"
            />
          ) : null}

          {tab === 'history' && pairs.length === 0 ? (
            <NoData icon="time-outline" title="Nothing in the history" subtitle="Finished and ended mentorships are kept here." />
          ) : null}

          {tab === 'pending' && pendingRequests.length === 0 ? (
            <NoData
              icon="mail-outline"
              title="No requests"
              subtitle="Ask for a mentor and the request shows here until it is answered."
              actionLabel="Ask for a mentor"
              onAction={openFind}
              color="#7c3aed"
            />
          ) : null}
        </ScrollView>
      )}

      {/* ── Find a mentor ── */}
      <Modal visible={findOpen} transparent animationType="slide" onRequestClose={() => setFindOpen(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Find a mentor</Text>
              <TouchableOpacity onPress={() => setFindOpen(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {mentorsLoading || matchesLoading ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator color="#7c3aed" size="small" />
              </View>
            ) : (
              <>
                {matches ? (
                  <>
                    <View style={styles.noteBox}>
                      <Ionicons name="sparkles" size={13} color="#7c3aed" />
                      <Text style={styles.noteText}>
                        {matches.matchedOnSkills
                          ? `Suggested for you, ranked on the skills you asked for.`
                          : 'Nobody has been matched to your skills yet, so these are the alumni willing to mentor.'}
                      </Text>
                    </View>
                    {(matches.candidates ?? []).map((c) => (
                      <MentorRow key={c.userId} mentor={c} matched={c.score} onPick={() => setRequest({ ...c, name: c.name })} />
                    ))}
                    {(matches.candidates ?? []).length === 0 ? (
                      <NoData icon="sparkles-outline" title="No matches yet" subtitle="Try asking for one or two broader skills." color="#7c3aed" />
                    ) : null}
                    <Text style={styles.divider}>Everyone else available</Text>
                  </>
                ) : null}

                {mentors.slice(0, 25).map((m) => (
                  <MentorRow key={m.profileId} mentor={m} onPick={() => setRequest(m)} />
                ))}
                {mentors.length === 0 ? (
                  <NoData icon="people-outline" title="No mentors listed" subtitle="The Alumni Relations Office has not listed any mentors yet." color="#7c3aed" />
                ) : null}
              </>
            )}

            {request ? (
              <View style={styles.composeBox}>
                <Text style={styles.modalTitle}>Ask {request.name}</Text>
                <Text style={styles.meta}>{request.role ?? ''}{request.company ? ` · ${request.company}` : ''}</Text>

                <Text style={styles.fieldLabel}>Area</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {MENTORSHIP_FIELDS.map((f) => (
                    <TouchableOpacity key={f} style={[styles.chip, form.field === f && styles.chipActive]} onPress={() => setForm((s) => ({ ...s, field: f }))}>
                      <Text style={[styles.chipText, form.field === f && styles.chipTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>What do you want help with?</Text>
                <TextInput
                  style={styles.field}
                  value={form.skills}
                  onChangeText={(t) => setForm((s) => ({ ...s, skills: t }))}
                  placeholder="e.g. C++, placements, resume"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.fieldHint}>Comma separated — this is what the matching uses.</Text>

                <Text style={styles.fieldLabel}>Anything else? (optional)</Text>
                <TextInput
                  style={[styles.field, styles.fieldMultiline]}
                  value={form.message}
                  onChangeText={(t) => setForm((s) => ({ ...s, message: t }))}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor="#94a3b8"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setRequest(null)}>
                    <Text style={styles.modalCancelText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmit} onPress={submitRequest} disabled={busy}>
                    {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Send request</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Session ── */}
      <Modal visible={!!sessionModal} transparent animationType="slide" onRequestClose={() => setSessionModal(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{sessionModal === 'schedule' ? 'Book a session' : 'Log a session'}</Text>
              <TouchableOpacity onPress={() => setSessionModal(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Date & time</Text>
            <TextInput
              style={styles.field}
              value={sessionForm.sessionDate}
              onChangeText={(t) => setSessionForm((s) => ({ ...s, sessionDate: t }))}
              placeholder="2026-03-14T17:00"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.fieldHint}>Format YYYY-MM-DDTHH:mm. A booking must be in the future.</Text>

            <Text style={styles.fieldLabel}>Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {SESSION_MODES.map((m) => (
                <TouchableOpacity key={m.id} style={[styles.chip, sessionForm.mode === m.id && styles.chipActive]} onPress={() => setSessionForm((s) => ({ ...s, mode: m.id }))}>
                  <Text style={[styles.chipText, sessionForm.mode === m.id && styles.chipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {sessionModal === 'log' ? (
              <>
                <Text style={styles.fieldLabel}>Duration (minutes)</Text>
                <TextInput
                  style={styles.field}
                  value={sessionForm.durationMinutes}
                  onChangeText={(t) => setSessionForm((s) => ({ ...s, durationMinutes: t }))}
                  keyboardType="number-pad"
                  placeholder="45"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.fieldLabel}>What did you get out of it?</Text>
                <TextInput
                  style={[styles.field, styles.fieldMultiline]}
                  value={sessionForm.outcome}
                  onChangeText={(t) => setSessionForm((s) => ({ ...s, outcome: t }))}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor="#94a3b8"
                />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Agenda</Text>
                <TextInput
                  style={[styles.field, styles.fieldMultiline]}
                  value={sessionForm.agenda}
                  onChangeText={(t) => setSessionForm((s) => ({ ...s, agenda: t }))}
                  multiline
                  textAlignVertical="top"
                  placeholder="What will you cover?"
                  placeholderTextColor="#94a3b8"
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSessionModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitSession} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Goal ── */}
      <Modal visible={goalModal} transparent animationType="slide" onRequestClose={() => setGoalModal(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add a goal</Text>
              <TouchableOpacity onPress={() => setGoalModal(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.field}
              value={goalForm.title}
              onChangeText={(t) => setGoalForm((s) => ({ ...s, title: t }))}
              placeholder="e.g. Finish my first open-source PR"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.fieldLabel}>Progress — {goalForm.progressPct}%</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {[0, 25, 50, 75, 100].map((p) => (
                <TouchableOpacity key={p} style={[styles.chip, Number(goalForm.progressPct) === p && styles.chipActive]} onPress={() => setGoalForm((s) => ({ ...s, progressPct: String(p) }))}>
                  <Text style={[styles.chipText, Number(goalForm.progressPct) === p && styles.chipTextActive]}>{p}%</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setGoalModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitGoal} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Feedback ── */}
      <Modal visible={feedbackModal} transparent animationType="slide" onRequestClose={() => setFeedbackModal(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate your mentor</Text>
              <TouchableOpacity onPress={() => setFeedbackModal(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <StarPicker value={fbForm.rating} onChange={(n) => setFbForm((s) => ({ ...s, rating: n }))} size={32} />
            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={fbForm.comment}
              onChangeText={(t) => setFbForm((s) => ({ ...s, comment: t }))}
              multiline
              textAlignVertical="top"
              placeholder="What helped? (optional)"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setFeedbackModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: '#f59e0b' }]} onPress={submitFeedback} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/** The expanded pair: sessions, goals, and the student's own review. */
function PairSheet({ detail, ctx, onSchedule, onLog, onAddGoal, onReview }) {
  const fb = detail.feedbackData;
  const myReview = (fb?.reviews ?? []).find((r) => r.isMine);

  return (
    <View style={styles.sheet}>
      <View style={styles.statRow}>
        <StatCell value={String(detail.sessions.held)} label="sessions" />
        <StatCell value={fmtDuration(detail.sessions.totalMinutes) ?? '—'} label="time" />
        <StatCell value={detail.goals.percent != null ? `${detail.goals.percent}%` : '—'} label="goals" />
      </View>

      <View style={styles.sheetActions}>
        {ctx.canScheduleSession ? <SheetBtn icon="calendar-outline" label="Book" onPress={onSchedule} /> : null}
        {ctx.canLogSession ? <SheetBtn icon="create-outline" label="Log" onPress={onLog} /> : null}
        {ctx.canManageGoals ? <SheetBtn icon="add" label="Goal" onPress={onAddGoal} /> : null}
        {ctx.canLeaveFeedback ? <SheetBtn icon="star-outline" label="Rate" onPress={onReview} /> : null}
      </View>

      {(detail.sessions.log ?? []).map((s) => (
        <SessionCard key={s.id} session={s} />
      ))}
      {(detail.sessions.log ?? []).length === 0 ? (
        <Text style={styles.sheetNote}>No sessions logged yet.</Text>
      ) : null}

      <Text style={styles.sheetLabel}>Goals</Text>
      {(detail.goals ?? []).map((g) => (
        <GoalCard key={g.id} goal={g} />
      ))}
      {(detail.goals ?? []).length === 0 ? (
        <Text style={styles.sheetNote}>No goals set. Adding one is what makes progress visible.</Text>
      ) : null}

      {fb ? (
        <>
          <Text style={styles.sheetLabel}>Feedback</Text>
          <RatingRow label="Your mentor" rating={fb.ofMentor} count={fb.count} />
          {myReview?.comment ? <Text style={styles.sheetNote}>Your note: “{myReview.comment}”</Text> : null}
        </>
      ) : null}
    </View>
  );
}

function MentorRow({ mentor, matched, onPick }) {
  return (
    <TouchableOpacity style={styles.mentorRow} onPress={onPick}>
      <Avatar name={mentor.name} size={36} />
      <View style={{ flex: 1, marginLeft: 9 }}>
        <Text style={styles.name} numberOfLines={1}>
          {mentor.name}
          {matched ? <Text style={styles.match}> · {matched}%</Text> : null}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {mentor.role ?? '—'}
          {mentor.company ? ` · ${mentor.company}` : ''}
        </Text>
        {matched && mentor.reasons?.length ? (
          <Text style={styles.reason} numberOfLines={1}>
            {mentor.reasons.slice(0, 2).join(' · ')}
          </Text>
        ) : null}
      </View>
      <Ionicons name="send-outline" size={15} color="#7c3aed" />
    </TouchableOpacity>
  );
}

function SheetBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.sheetBtn} onPress={onPress}>
      <Ionicons name={icon} size={12} color="#7c3aed" />
      <Text style={styles.sheetBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCell({ value, label }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { marginTop: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#7c3aed', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10, alignSelf: 'center' },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },

  hero: { padding: 18, paddingTop: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 20, fontFamily: 'Manrope-ExtraBold' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: 'Manrope-Medium', marginTop: 2 },
  circleBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 11 },
  actionText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },

  tabWrap: { flexGrow: 0, marginTop: 12 },
  tabRow: { paddingHorizontal: 16, gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 11, paddingVertical: 8 },
  tabActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  tabText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: '#fff' },

  list: { padding: 16, paddingBottom: 28 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  message: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 16, marginTop: 6, fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 7 },
  fieldChip: { backgroundColor: '#f5f3ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  fieldChipText: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#7c3aed' },
  nextText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: '#7c3aed', marginTop: 8 },
  warnText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: '#d97706', marginTop: 8 },

  askBox: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginTop: 8 },
  askLabel: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.4 },
  askText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: '#78350f', marginTop: 3 },
  declinedBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginTop: 8 },
  declinedText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: '#991b1b', lineHeight: 15 },

  sheet: { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 },
  sheetLoading: { paddingVertical: 20, alignItems: 'center' },
  sheetActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f3ff', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  sheetBtnText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#7c3aed' },
  sheetLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 7 },
  sheetNote: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 15, marginBottom: 8 },
  statRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 11, padding: 10, marginBottom: 10 },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 14, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  statLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },

  mentorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 11, marginBottom: 8 },
  match: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#059669' },
  reason: { fontSize: 9, fontFamily: 'Manrope-Medium', color: '#059669', marginTop: 2 },
  divider: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f5f3ff', borderRadius: 10, padding: 10, marginBottom: 10 },
  noteText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: '#5b21b6', lineHeight: 15 },

  composeBox: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 12, paddingTop: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  fieldLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 12 },
  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  fieldMultiline: { minHeight: 70 },
  fieldHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 4 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modalSubmit: { flex: 1, backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});
