// X-02 Timetable — Exam schedules (docs/users/05 §3.9, block 2).
//
// Requirement 2 of this feature is "create/edit exam schedules", and the screen
// this replaces could neither do it nor explain why. It POSTed to an endpoint
// this build removed, so every "Create exam" attempt 404'd; it offered no
// rename, no status change, and — because `DRAFT` and `PUBLISHED` did not exist
// as statuses until this build added them — no way to express "written but not
// announced". A draft timetable and a published one were indistinguishable and
// there was nothing to publish.
//
// THREE WRITES LIVE HERE, and each one reloads from the server afterwards
// rather than patching a local copy. That is not tidiness: a write runs the
// clash engine and can be REFUSED, and a locally-patched row would show the
// controller an exam or a publish that the server never accepted.
//
// THE PUBLISH BUTTON IS REFUSED BY THE SERVER WHILE ANY HIGH CLASH IS OPEN,
// and this screen shows the gate BEFORE the tap rather than after it. A button
// that is enabled and then refuses with a 422 teaches the controller that the
// button lies; here it is drawn with the reason on it.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import {
  THEME, RED, GREEN, SLATE, MUTED,
  EXAM_STATUSES, EXAM_STATUS_LABEL, EXAM_STATUS_COLOR, EXAM_TYPES,
  dayLabel, plural, publishPhrase,
} from '../../timetableMeta';
import {
  ActionRow, Card, ClashBadge, NoteStrip, Pill, Section, StatGrid, StatCell,
  TimetableEmpty, TimetableScreen, goToRoute, useTimetable,
} from '../../timetableUi';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetableExams({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useTimetable(
    () => examcellApi.timetableBlock('EXAMS'),
  );

  const [busy, setBusy] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // `editingId` is what separates create from rename. Without it `save` would
  // POST a second exam every time a name was edited — and the server's
  // uniqueness check is on (semester, type, name), so it would 409 only when
  // the name was left unchanged, and silently create a duplicate when it was
  // not. That is the worst shape of bug: it works until you type something.
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'MID_TERM', semester: '4' });
  const [formError, setFormError] = useState(null);

  const exams = data ?? [];
  const ready = exams.filter((e) => e.publishable).length;
  const blocked = exams.length - ready;

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', type: 'MID_TERM', semester: '4' });
    setFormError(null);
    setEditorOpen(true);
  };

  const openRename = (exam) => {
    setEditingId(exam.examId);
    setForm({ name: exam.name, type: exam.type, semester: String(exam.semester) });
    setFormError(null);
    setEditorOpen(true);
  };

  // ── Write 1: create or rename. The two share a form because the schema is
  //    `.strict()` and takes the same fields; only the verb and the id differ.
  const save = async () => {
    const name = form.name.trim();
    if (name.length < 3) {
      setFormError('The name needs at least 3 characters.');
      return;
    }
    const semester = Number(form.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
      setFormError('Semester must be between 1 and 8.');
      return;
    }
    setBusy('save');
    try {
      // `semester` is sent as a NUMBER. The schema is `z.number()`, so the
      // string a TextInput produces is a 400 — and the error names the type,
      // which is why this is not worth letting the server discover.
      if (editingId) {
        // `updateTimetableExamSchema` has no `type`. An exam's type is fixed
        // once it exists — changing MID_TERM to FINAL after slots were built
        // against it would silently re-label every paper in it. So the type
        // chips are read-only while renaming, and the screen says so rather
        // than offering a control that does nothing.
        await examcellApi.updateTimetableExam(editingId, { name, semester });
      } else {
        await examcellApi.createTimetableExam({ name, type: form.type, semester });
      }
      setEditorOpen(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(null);
    }
  };

  // ── Write 2: move an exam's status. A COMPLETED or RESULTS_PUBLISHED exam
  //    cannot be moved back — the papers have been sat — and the server says so.
  const changeStatus = (exam, status) => {
    Alert.alert(
      `Move to ${EXAM_STATUS_LABEL[status]}?`,
      `"${exam.name}" will be marked ${EXAM_STATUS_LABEL[status]}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          onPress: async () => {
            setBusy(exam.examId);
            try {
              await examcellApi.updateTimetableExam(exam.examId, { status });
              reload();
            } catch (err) {
              Alert.alert('Cannot change status', err.message);
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  // ── Write 3: publish. Refused with 422 while any HIGH clash is open, and the
  //    refusal NAMES them. The button is already drawn as blocked, so arriving
  //    here means the server found something this screen did not — which is a
  //    real possibility and is reported rather than swallowed.
  const publish = (exam) => {
    Alert.alert(
      'Publish this timetable?',
      `"${exam.name}" goes out to students and faculty. It cannot be un-published ` +
        'from here, and any later change to a slot has to be announced separately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            setBusy(exam.examId);
            try {
              const res = await examcellApi.publishTimetableExam(exam.examId);
              reload();
              Alert.alert(
                res.alreadyPublished ? 'Already published' : 'Published',
                res.alreadyPublished
                  ? 'This timetable had already gone out. The gate was re-checked and it still passes.'
                  : `"${exam.name}" is now published.`,
              );
            } catch (err) {
              reload();
              Alert.alert('Cannot publish yet', err.message);
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const openSlots = (exam) =>
    goToRoute(navigation, 'TimetableSlots', false, { examId: exam.examId });

  return (
    <TimetableScreen
      title="Exam schedules"
      subtitle="Create the examinations, then fill them with slots."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <ActionRow
          actions={[{ label: 'New exam', icon: 'add', onPress: openCreate, color: THEME }]}
        />
      }
    >
      <Card>
        <StatGrid>
          <StatCell label="Exams" value={exams.length} hint="this institution" />
          <StatCell
            label="Ready to publish"
            value={ready}
            tone={ready ? GREEN : MUTED}
            hint="no HIGH clash open"
          />
          <StatCell
            label="Blocked"
            value={blocked}
            tone={blocked ? RED : GREEN}
            hint="clashes or no slots"
          />
          <StatCell
            label="Slots"
            value={exams.reduce((t, e) => t + e.slotCount, 0)}
            tone={THEME}
            hint={`${exams.reduce((t, e) => t + e.scheduledCount, 0)} live`}
          />
        </StatGrid>
      </Card>

      {blocked > 0 ? (
        <NoteStrip
          tone="warn"
          text={`${plural(blocked, 'exam')} cannot be published yet. The gate is re-checked on the server every time, not just here.`}
        />
      ) : null}

      <Section title="Examinations" note={plural(exams.length, 'exam')}>
        {exams.length === 0 ? (
          <TimetableEmpty
            icon="document-text-outline"
            title="No examinations yet"
            subtitle="Create one to begin. An exam holds the slots for its courses — it is the container, not the papers themselves."
          />
        ) : null}

        {exams.map((e) => (
          <Card key={e.examId}>
            <View style={styles.examHead}>
              <View style={styles.examHeadBody}>
                <Text style={styles.examName}>{e.name}</Text>
                <Text style={styles.examMeta}>
                  {e.typeLabel} · Sem {e.semester}
                  {e.academicYearName ? ` · ${e.academicYearName}` : ''}
                </Text>
              </View>
              <Pill
                text={EXAM_STATUS_LABEL[e.status] ?? e.status}
                color={EXAM_STATUS_COLOR[e.status] ?? SLATE}
              />
            </View>

            <View style={styles.examFlags}>
              <ClashBadge
                count={e.conflictCount}
                severity={e.highConflictCount > 0 ? 'HIGH' : 'MEDIUM'}
                blocking={e.highConflictCount > 0}
              />
              <Pill
                text={`${plural(e.scheduledCount, 'slot')}`}
                color={SLATE}
                icon="time-outline"
              />
            </View>

            <View style={styles.examDates}>
              <Ionicons name="calendar-outline" size={13} color={MUTED} />
              <Text style={styles.examDateText}>
                {e.firstDay && e.lastDay
                  ? e.firstDay === e.lastDay
                    ? dayLabel(e.firstDay)
                    : `${dayLabel(e.firstDay)} → ${dayLabel(e.lastDay)}`
                  : 'no slots dated yet'}
              </Text>
            </View>

            {/* The gate, stated before the tap. */}
            <View style={styles.gateRow}>
              <Ionicons
                name={e.publishable ? 'checkmark-circle' : 'lock-closed'}
                size={14}
                color={e.publishable ? GREEN : RED}
              />
              <Text style={[styles.gateText, { color: e.publishable ? GREEN : RED }]}>
                {publishPhrase(e.publishable, e.blockReason, e.slotCount)}
              </Text>
            </View>

            <ActionRow
              actions={[
                {
                  label: 'Slots',
                  icon: 'time-outline',
                  color: THEME,
                  onPress: () => openSlots(e),
                },
                {
                  label: 'Rename',
                  icon: 'create-outline',
                  color: SLATE,
                  onPress: () => openRename(e),
                },
                {
                  label: e.status === 'PUBLISHED' ? 'Published' : 'Publish',
                  icon: 'megaphone-outline',
                  // Drawn disabled WITH its reason rather than hidden: a tile
                  // that is enabled and then refuses is worse than one that
                  // says why it cannot.
                  disabled: !e.publishable,
                  color: GREEN,
                  onPress: () => publish(e),
                },
              ]}
            />
            {e.blockReason && !e.publishable ? (
              <Text style={styles.blockReason}>{e.blockReason}</Text>
            ) : null}

            {e.status !== 'PUBLISHED' && e.status !== 'COMPLETED' && e.status !== 'RESULTS_PUBLISHED' ? (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status</Text>
                {EXAM_STATUSES.filter((s) => s !== e.status).slice(0, 4).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => changeStatus(e, s)}
                    disabled={busy === e.examId}
                    activeOpacity={0.8}
                    style={styles.statusBtn}
                    accessibilityRole="button"
                  >
                    <Text style={styles.statusBtnText}>{EXAM_STATUS_LABEL[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </Card>
        ))}
      </Section>

      <CreateEditor
        open={editorOpen}
        form={form}
        setForm={setForm}
        error={formError}
        busy={busy === 'save'}
        editing={!!editingId}
        onClose={() => setEditorOpen(false)}
        onSave={save}
      />
    </TimetableScreen>
  );
}

// ── The create/rename sheet. Kept in this file rather than its own module
//    because it is the only modal in the whole feature.
function CreateEditor({ open, form, setForm, error, busy, editing, onClose, onSave }) {
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBack}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              {editing ? 'Edit examination' : 'New examination'}
            </Text>
            {editing ? (
              <Text style={styles.modalNote}>
                The type of an examination is fixed once it exists — its slots are
                already built against it.
              </Text>
            ) : null}

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              placeholder="Mid Term · Semester 4"
              placeholderTextColor={MUTED}
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.chipRow}>
              {EXAM_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => !editing && setForm((f) => ({ ...f, type: t.id }))}
                  disabled={editing}
                  activeOpacity={0.85}
                  style={[
                    styles.chip,
                    form.type === t.id && styles.chipOn,
                    editing && styles.chipLocked,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: form.type === t.id, disabled: editing }}
                >
                  <Text style={[styles.chipText, form.type === t.id && styles.chipTextOn]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Semester</Text>
            <View style={styles.chipRow}>
              {SEMESTERS.map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setForm((f) => ({ ...f, semester: String(n) }))}
                  activeOpacity={0.85}
                  style={[styles.chip, String(n) === form.semester && styles.chipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: String(n) === form.semester }}
                >
                  <Text style={[styles.chipText, String(n) === form.semester && styles.chipTextOn]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <Text style={styles.formError}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, busy && { opacity: 0.6 }]}
                onPress={onSave}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.saveText}>
                  {busy ? 'Saving…' : editing ? 'Save' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  examHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  examHeadBody: { flex: 1 },
  examName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  examMeta: { fontSize: 11, color: SLATE, marginTop: 2 },
  examFlags: { flexDirection: 'row', gap: 7, marginTop: 10, flexWrap: 'wrap' },
  examDates: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  examDateText: { flex: 1, fontSize: 11, color: SLATE },

  gateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  gateText: { flex: 1, fontSize: 11, fontWeight: '700' },
  blockReason: { fontSize: 10, color: MUTED, marginTop: 6, fontStyle: 'italic' },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  statusLabel: { fontSize: 10, color: MUTED, marginRight: 2 },
  statusBtn: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  statusBtnText: { fontSize: 10, fontWeight: '700', color: SLATE },

  modalBack: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34, maxHeight: '88%',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  modalNote: { fontSize: 11, color: SLATE, lineHeight: 16, marginBottom: 2 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: SLATE, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a',
    fontFamily: 'Manrope-Medium',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999,
    paddingHorizontal: 13, paddingVertical: 7,
  },
  chipOn: { backgroundColor: THEME, borderColor: THEME },
  chipLocked: { opacity: 0.7 },
  chipText: { fontSize: 12, fontWeight: '700', color: SLATE },
  chipTextOn: { color: '#fff' },
  formError: { fontSize: 11, color: RED, marginTop: 12 },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, borderRadius: 11, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: SLATE },
  saveBtn: { flex: 1, borderRadius: 11, paddingVertical: 12, alignItems: 'center', backgroundColor: THEME },
  saveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});