/**
 * The resident's complaint screen: report something, then watch it get dealt with.
 *
 * THIS SCREEN IS WHERE THE MESS "REPORT A PROBLEM" BUTTON LANDS
 * -------------------------------------------------------------
 * That button has existed for a while and did nothing: it called `navigation.navigate('Complaints', …)`,
 * but `students.js` is a `currentScreen` switch, not a navigator, so there was no `Complaints` case and
 * the call went nowhere. A resident who found a hair in the dal tapped the one control on the meal card
 * aimed at exactly that situation and got silence.
 *
 * IT IS ONE QUEUE, NOT TWO
 * ------------------------
 * A food complaint is not a separate thing. It is filed as `category: 'FOOD'` into the same
 * OPEN → ASSIGNED → RESOLVED lifecycle as a broken tap, and lands in the mess steward's inbox by the
 * same category-group routing as any other complaint. Two queues would mean two counts, and a warden
 * looking at "3 open complaints" would be reading a number that excluded the kitchen entirely.
 *
 * WHY THE RESIDENT SEES THE DERIVED FIELDS
 * ----------------------------------------
 * `escalated`, `priority` and `hoursToEscalation` come back on each row. Hiding them would leave a
 * resident who filed three weeks ago with no idea whether anyone had looked — and "we are working on
 * it" is not something a system can honestly claim when it has escalated past the warden's threshold.
 * The screen says so plainly rather than showing a reassuring static "Submitted".
 *
 * SEVERITY IS THE RESIDENT'S CALL, EXCEPT WHERE POLICY OVERRIDES IT
 * -----------------------------------------------------------------
 * For SECURITY the server applies a MEDIUM floor and returns `severityRaised`. The screen says
 * "raised to Medium by the security policy" instead of quietly overriding what the resident picked —
 * a resident who chose "Low" for "someone was waiting in the corridor" deserves to know it was treated
 * more seriously than they asked, and why.
 *
 * A POOR RATING REOPENS, IT IS NOT JUST A SCORE
 * ---------------------------------------------
 * `POST /student/complaints/:id/feedback` with a rating at or below the threshold (default 3) puts the
 * complaint back on the board as OPEN with a REOPENED entry in its timeline. The screen reflects that
 * in its copy — a resident is told their rating reopened the complaint, because if it silently only
 * wrote "2/5" to a database the repair would be lost and the complaint would read "Resolved" forever.
 */
import React, { useCallback, useEffect, useState } from 'react';
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
import { AnimatedCard, EmptyState } from '../../../../components/ui';
import { SkeletonCard } from '../../../../components/ui/SkeletonLoader';
import { studentApi } from '../../../../services/api';

const CATEGORIES = [
  { key: 'PLUMBING', label: 'Plumbing', icon: 'water-outline' },
  { key: 'ELECTRICAL', label: 'Electrical', icon: 'flash-outline' },
  { key: 'MAINTENANCE', label: 'Furniture', icon: 'hammer-outline' },
  { key: 'NETWORK', label: 'WiFi', icon: 'wifi-outline' },
  { key: 'FOOD', label: 'Food', icon: 'restaurant-outline' },
  { key: 'SECURITY', label: 'Security', icon: 'shield-checkmark-outline' },
];

const SEVERITIES = [
  { key: 'LOW', label: 'Minor', hint: 'Annoying, not urgent' },
  { key: 'MEDIUM', label: 'Medium', hint: 'Needs fixing this week' },
  { key: 'HIGH', label: 'Urgent', hint: 'Unsafe or unusable' },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

const severityTone = (s) =>
  s === 'HIGH' ? { bg: '#fee2e2', color: '#dc2626' }
    : s === 'MEDIUM' ? { bg: '#fef3c7', color: '#d97706' }
      : { bg: '#e0e7ff', color: '#4f46e5' };

const statusTone = (s) =>
  s === 'RESOLVED' ? { bg: '#dcfce7', color: '#059669' }
    : s === 'ASSIGNED' ? { bg: '#dbeafe', color: '#2563eb' }
      : { bg: '#fef3c7', color: '#d97706' };

const GROUP_ICON = {
  maintenance: 'construct-outline',
  electrical: 'flash-outline',
  network: 'wifi-outline',
  food: 'restaurant-outline',
  security: 'shield-checkmark-outline',
};

function ageLabel(iso) {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * `prefillCategory` arrives from the mess screen's "Report a problem" button, which already knows the
 * complaint is about food — so it opens the form on FOOD with that category selected rather than
 * making the resident choose it again.
 */
export default function ComplaintsPage({ navigation, route }) {
  const prefill = route?.params?.category;
  const prefillIsFood = prefill === 'FOOD';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState(prefillIsFood ? 'FOOD' : null);
  const [severity, setSeverity] = useState(null);
  const [description, setDescription] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastRaised, setLastRaised] = useState(null);

  const [rating, setRating] = useState(null);
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [comment, setComment] = useState('');

  const [noteFor, setNoteFor] = useState(null);
  const [noteText, setNoteText] = useState('');

  const load = useCallback(async (mode) => {
    try {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await studentApi.myComplaints();
      setRows(Array.isArray(res) ? res : (res?.complaints ?? []));
    } catch (e) {
      setError(e.message || 'Could not load your complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Opening the form straight from the mess complaint button is the whole point of the prefill, so
  // the button lands on the form — not on a list the resident then has to find the "+" on.
  useEffect(() => {
    if (prefillIsFood) setFormOpen(true);
  }, [prefillIsFood]);

  const reset = () => {
    setCategory(prefillIsFood ? 'FOOD' : null);
    setSeverity(null);
    setDescription('');
    setLocationNote('');
    setLastRaised(null);
  };

  const submit = async () => {
    if (!category || !severity || description.trim().length < 5) {
      Alert.alert('Almost there', 'Pick a category, a severity, and describe the problem.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await studentApi.reportComplaint({
        category,
        severity,
        description: description.trim(),
        locationNote: locationNote.trim() || undefined,
      });
      setLastRaised(res?.severityRaised ?? null);
      setFormOpen(false);
      reset();
      load('refresh');
    } catch (e) {
      Alert.alert('Could not file it', e.message || 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  const sendFeedback = async () => {
    if (!feedbackFor || !rating) return;
    setSubmitting(true);
    try {
      const res = await studentApi.submitComplaintFeedback(feedbackFor.id, rating, comment.trim() || undefined);
      setFeedbackFor(null);
      setRating(null);
      setComment('');
      // The response says whether the poor rating REOPENED it, and saying so is the point: a resident
      // who rated 2 and watched the row stay "Resolved" would have every reason to distrust the button.
      if (res?.reopened) Alert.alert('Reopened', 'You rated this below the threshold, so it is back on the list.');
      load('refresh');
    } catch (e) {
      Alert.alert('Could not send', e.message || 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  const sendNote = async () => {
    if (!noteFor || !noteText.trim()) return;
    setSubmitting(true);
    try {
      await studentApi.addComplaintNote(noteFor.id, noteText.trim());
      setNoteFor(null);
      setNoteText('');
      load('refresh');
    } catch (e) {
      Alert.alert('Could not add note', e.message || 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !rows.length) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
      >
        <Text style={styles.h1}>My complaints</Text>
        <Text style={styles.sub}>
          Report something in your room or the mess, and watch who picks it up.
        </Text>

        {error ? (
          <AnimatedCard style={styles.errorCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => load()} hitSlop={8}>
                <Text style={styles.retry}>Retry</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        ) : null}

        {lastRaised ? (
          <AnimatedCard style={styles.raisedCard}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.raisedText}>
              Filed. Your {lastRaised === 'MEDIUM' ? 'severity was raised to Medium' : 'severity was raised'}
              {' '}by the security policy, because security complaints are never treated as minor.
            </Text>
          </AnimatedCard>
        ) : null}

        <TouchableOpacity style={styles.newBtn} onPress={() => { reset(); setFormOpen(true); }}>
          <Ionicons name="add" size={20} color={theme.colors.white} />
          <Text style={styles.newBtnText}>Report a problem</Text>
        </TouchableOpacity>

        {rows.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="Nothing reported"
            message="Anything you report shows up here with who is handling it."
          />
        ) : (
          rows.map((c) => {
            const sv = severityTone(c.severity);
            const st = statusTone(c.status);
            const canRate = c.status === 'RESOLVED' && !c.feedback;
            const due = c.escalated && c.status !== 'RESOLVED'
              ? { text: 'Overdue — escalated', urgent: true }
              : typeof c.hoursToEscalation === 'number' && c.status !== 'RESOLVED' && c.hoursToEscalation < 24
                ? { text: `Escalates in ${c.hoursToEscalation}h`, urgent: true }
                : null;
            return (
              <AnimatedCard key={c.id} style={styles.card}>
                <View style={styles.rowLeft}>
                  <Ionicons name={GROUP_ICON[c.group] ?? 'alert-circle-outline'} size={18} color={theme.colors.textMuted} />
                  <View style={styles.flex}>
                    <Text style={styles.cat}>{CATEGORY_LABEL[c.category] ?? c.category}</Text>
                    <Text style={styles.desc}>{c.description}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={[styles.pill, { backgroundColor: sv.bg }]}>
                    <Text style={[styles.pillText, { color: sv.color }]}>{c.severity}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.pillText, { color: st.color }]}>{c.status}</Text>
                  </View>
                  {due ? (
                    <View style={[styles.pill, due.urgent && styles.pillDanger]}>
                      <Text style={[styles.pillText, due.urgent && styles.pillTextOn]}>{due.text}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.age}>{ageLabel(c.createdAt)}</Text>
                </View>

                <View style={styles.facts}>
                  <Text style={styles.fact}>
                    {c.roomNumber ? `Room ${c.roomNumber}` : 'Location recorded'}
                  </Text>
                  <Text style={styles.fact}>
                    {c.assignedToName ? `With ${c.assignedToName}` : 'Waiting for the warden'}
                  </Text>
                  {c.reopenedCount > 0 ? (
                    <Text style={[styles.fact, styles.factWarn]}>
                      Reopened {c.reopenedCount}× — the last fix did not hold
                    </Text>
                  ) : null}
                  {c.resolutionNote ? (
                    <Text style={styles.fact}>Fixed: {c.resolutionNote}</Text>
                  ) : null}
                  {c.feedback ? (
                    <Text style={styles.fact}>
                      You rated this {c.feedback.rating}/5
                      {c.feedback.comment ? ` — "${c.feedback.comment}"` : ''}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.actions}>
                  {canRate ? (
                    <TouchableOpacity style={styles.action} onPress={() => { setFeedbackFor(c); setRating(null); setComment(''); }}>
                      <Ionicons name="star-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.actionText}>Rate the fix</Text>
                    </TouchableOpacity>
                  ) : null}
                  {c.status !== 'RESOLVED' ? (
                    <TouchableOpacity style={styles.action} onPress={() => { setNoteFor(c); setNoteText(''); }}>
                      <Ionicons name="chatbubble-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.actionText}>Add detail</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </AnimatedCard>
            );
          })
        )}
      </ScrollView>

      {/* The report form. Opened with FOOD preselected when arriving from the mess card, because that
          button already established the category and asking again is a small insult. */}
      <Modal visible={formOpen} animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <ScrollView style={styles.container} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Report a problem</Text>
          {prefillIsFood ? (
            <Text style={styles.sub}>Reported from a meal, so this starts as a food complaint.</Text>
          ) : (
            <Text style={styles.sub}>Be specific — "the tap drips" beats "tap is bad".</Text>
          )}

          <Text style={styles.label}>What is it?</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[styles.catChip, category === c.key && styles.catChipOn]}
                onPress={() => setCategory(c.key)}
              >
                <Ionicons
                  name={c.icon}
                  size={15}
                  color={category === c.key ? theme.colors.white : theme.colors.textMuted}
                />
                <Text style={[styles.catChipText, category === c.key && styles.catChipTextOn]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>How bad is it?</Text>
          {SEVERITIES.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sevRow, severity === s.key && styles.sevRowOn]}
              onPress={() => setSeverity(s.key)}
            >
              <Ionicons
                name={severity === s.key ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={severity === s.key ? theme.colors.primary : theme.colors.textMuted}
              />
              <View style={styles.flex}>
                <Text style={styles.sevLabel}>{s.label}</Text>
                <Text style={styles.sevHint}>{s.hint}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {category === 'SECURITY' ? (
            <Text style={styles.policyNote}>
              Security complaints are always treated as at least Medium, whatever you pick here.
            </Text>
          ) : null}

          <Text style={styles.label}>What is happening?</Text>
          <TextInput
            style={[styles.input, styles.inputTall]}
            placeholder="e.g. the hot tap in the bathroom drips all night"
            placeholderTextColor={theme.colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />

          <Text style={styles.label}>Where exactly? (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. second-floor corridor, outside room 204"
            placeholderTextColor={theme.colors.textMuted}
            value={locationNote}
            onChangeText={setLocationNote}
            maxLength={160}
          />

          <TouchableOpacity
            style={[styles.submit, submitting && styles.submitOff]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.submitText}>Submit complaint</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => setFormOpen(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Rating. The copy states the consequence up front, because a resident asked to grade a repair
          should not be surprised by a rule they were never told. */}
      <Modal visible={!!feedbackFor} transparent animationType="slide" onRequestClose={() => setFeedbackFor(null)}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Was it actually fixed?</Text>
            <Text style={styles.sheetSub}>
              Rating {SEVERITIES[0].label.toLowerCase()} or below puts it back on the list instead of closing it.
            </Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
                  <Ionicons
                    name={rating && n <= rating ? 'star' : 'star-outline'}
                    size={30}
                    color={rating && n <= rating ? '#f59e0b' : theme.colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, styles.inputTall]}
              placeholder="Anything to add? (optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={400}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setFeedbackFor(null)}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, !rating && styles.btnOff]}
                onPress={sendFeedback}
                disabled={!rating || submitting}
              >
                <Text style={styles.btnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!noteFor} transparent animationType="slide" onRequestClose={() => setNoteFor(null)}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add detail</Text>
            <Text style={styles.sheetSub}>The warden and the staff handling it will see this.</Text>
            <TextInput
              style={[styles.input, styles.inputTall]}
              placeholder="Anything else they should know?"
              placeholderTextColor={theme.colors.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              maxLength={500}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setNoteFor(null)}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, !noteText.trim() && styles.btnOff]}
                onPress={sendNote}
                disabled={!noteText.trim() || submitting}
              >
                <Text style={styles.btnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  rowLeft: { flexDirection: 'row', gap: theme.spacing.sm, flex: 1 },

  errorCard: { borderColor: theme.colors.error, borderWidth: 1 },
  errorText: { color: theme.colors.error, fontSize: 13, flex: 1 },
  retry: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },
  raisedCard: { flexDirection: 'row', gap: theme.spacing.sm, backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary, borderWidth: 1 },
  raisedText: { flex: 1, fontSize: 12, color: theme.colors.text },

  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.sm + 4, borderRadius: theme.radius.md,
  },
  newBtnText: { color: theme.colors.white, fontWeight: '700', fontSize: 14 },

  card: { gap: 6 },
  cat: { fontSize: 12, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  desc: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.sm },
  pillDanger: { backgroundColor: theme.colors.error },
  pillText: { fontSize: 10, fontWeight: '700' },
  pillTextOn: { color: theme.colors.white },
  age: { fontSize: 11, color: theme.colors.textMuted, marginLeft: 'auto' },

  facts: { gap: 2, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6 },
  fact: { fontSize: 12, color: theme.colors.textMuted },
  factWarn: { color: theme.colors.error, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'flex-end' },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 6, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.primary,
  },
  actionText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  label: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.sm },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 7, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  catChipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catChipText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  catChipTextOn: { color: theme.colors.white },

  sevRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.sm,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface, marginBottom: 6,
  },
  sevRowOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  sevLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  sevHint: { fontSize: 11, color: theme.colors.textMuted },
  policyNote: { fontSize: 11, color: theme.colors.primary, marginBottom: 4 },

  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    padding: theme.spacing.sm, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface,
  },
  inputTall: { minHeight: 88, textAlignVertical: 'top' },
  submit: {
    backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radius.md, alignItems: 'center', marginTop: theme.spacing.sm,
  },
  submitOff: { opacity: 0.5 },
  submitText: { color: theme.colors.white, fontWeight: '700', fontSize: 14 },
  cancel: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  cancelText: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 14 },

  sheetWrap: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl, padding: theme.spacing.md, gap: theme.spacing.sm,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  sheetSub: { fontSize: 13, color: theme.colors.textMuted },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  sheetActions: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'flex-end' },
  btn: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.lg, paddingVertical: 10, borderRadius: theme.radius.md },
  btnOff: { opacity: 0.4 },
  btnText: { color: theme.colors.white, fontWeight: '700', fontSize: 14 },
  btnGhost: { paddingHorizontal: theme.spacing.md, paddingVertical: 10 },
  btnGhostText: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 14 },
});