// X-02 Timetable — Date & time slots (docs/users/05 §3.9, block 4).
//
// Requirements 2, 4 and 5 of this feature land on this screen: creating a
// schedule, managing dates and time slots, and allocating an examination centre.
//
// FIVE WRITES LIVE HERE, and all five reload from the server afterwards rather
// than patching a local row. That is not tidiness: every one of these writes
// runs the clash engine and can be REFUSED with 422, and a locally-patched row
// would show the controller a change the server never accepted.
//
// The refusals are the interesting part, and the screen reflects them exactly:
//
//   · STUDENT DOUBLE-BOOKED and INVIGILATOR DOUBLE-BOOKED are REFUSED, because
//     they cannot be undone by looking harder. The 422 names the offending slot.
//   · ROOM, SUBJECT, CAPACITY, UNALLOCATED and NO-INVIGILATOR are RECORDED and
//     the write goes through. A room overlap is usually the NEXT STEP of
//     splitting a large paper across two venues, so refusing it would make the
//     thing the controller needs to do impossible to stage.
//
// So a slot can be created WITH clashes still showing, and that is the design
// rather than a bug. The badge says which, and the Clashes screen lists them.
//
// ONE THING THIS SCREEN DELIBERATELY DOES NOT DO: pick the course. Adding a
// slot means naming an `offeringId`, and there is no catalogue endpoint that
// lists them for a given exam. The ALLOCATION screen is the one that knows
// which courses belong to an exam, and it links here — so the id is copied from
// there rather than guessed here. Inventing a picker that cannot be filled from
// real data would be worse than asking for the id.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import {
  THEME, RED, GREEN, AMBER, SLATE, MUTED,
  SLOT_STATUS_LABEL, SLOT_STATUS_COLOR,
  conflictMeta, plural, seatPhrase, shortDayLabel, timeToMinutes,
} from '../../timetableMeta';
import {
  ActionRow, Card, ClashBadge, NoteStrip, Pill, Section, StatGrid, StatCell,
  TimetableEmpty, TimetableScreen, goToRoute, useTimetable,
} from '../../timetableUi';

export default function TimetableSlots({ navigation }) {
  // The examId arrives from the Exams or Allocation screen, so "add a slot to
  // THIS exam" is one tap rather than a picker the controller has to drive.
  const examId = navigation?.getParam?.('examId') ?? navigation?.params?.examId ?? null;

  const { data, loading, refreshing, error, reload, onRefresh } = useTimetable(
    () => examcellApi.timetableBlock('SLOTS', examId),
    [examId],
  );

  const [busy, setBusy] = useState(null);
  const [venueTarget, setVenueTarget] = useState(null);
  const [venueList, setVenueList] = useState([]);
  const [formError, setFormError] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    offeringId: '', date: '', startTime: '09:00', endTime: '12:00', seats: '',
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', startTime: '', endTime: '' });

  const slots = data?.slots ?? [];
  const days = data?.days ?? [];
  const totals = data?.totals ?? {};

  // Venues for the allocate sheet. Fetched alongside the block so the sheet has
  // real venues with real capacities to offer.
  //
  // A failure here is silent BY DESIGN. This screen's job is slots; the venue
  // master is the ROOMS screen's subject. If the venue request fails, the slots
  // still load and still work, and the only thing lost is the "add room" button.
  // Rendering the whole screen as an error because a secondary picker could not
  // load would be the wrong trade.
  const loadVenues = useCallback(async () => {
    try {
      const block = await examcellApi.timetableBlock('ROOMS', examId);
      setVenueList(block.venues ?? []);
    } catch {
      setVenueList([]);
    }
  }, [examId]);

  useEffect(() => { loadVenues(); }, [loadVenues]);

  // ── Write 1: add a slot ──────────────────────────────────────────────────
  const addSlot = async () => {
    const f = addForm;
    if (!examId) {
      setFormError('Open this screen from an exam to add a slot to it.');
      return;
    }
    if (!f.offeringId.trim()) { setFormError('An offeringId is required.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date.trim())) {
      setFormError('The date must be YYYY-MM-DD. The server rejects 2026-02-30 outright.');
      return;
    }
    const start = timeToMinutes(f.startTime.trim());
    const end = timeToMinutes(f.endTime.trim());
    if (start === null || end === null) { setFormError('Times must be HH:MM, 24-hour.'); return; }
    // Checked here so the common typo gets a plain sentence rather than the
    // server's 422 body. The server still enforces it — this is not the guard.
    if (end <= start) { setFormError('The end time must be AFTER the start time.'); return; }

    setBusy('add');
    try {
      await examcellApi.addTimetableSlot(examId, {
        offeringId: f.offeringId.trim(),
        date: f.date.trim(),
        startTime: f.startTime.trim(),
        endTime: f.endTime.trim(),
        ...(f.seats.trim() ? { seats: Number(f.seats.trim()) } : {}),
      });
      setAddOpen(false);
      reload();
      loadVenues();
    } catch (err) {
      // A 422 here is a REFUSED CLASH, and its message names the slot. Shown
      // in the sheet rather than in an alert, so the form is not thrown away.
      setFormError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const openReschedule = (slot) => {
    setEditTarget(slot);
    setEditForm({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime });
    setFormError(null);
    setEditOpen(true);
  };

  // ── Write 2: reschedule ──────────────────────────────────────────────────
  // The old route checked NOTHING at all, which made the operation a controller
  // uses most — the one they reach for to FIX a problem — the only one with no
  // guard. It runs the same engine as everything else now.
  const reschedule = async () => {
    const f = editForm;
    const start = timeToMinutes(f.startTime.trim());
    const end = timeToMinutes(f.endTime.trim());
    if (start === null || end === null) { setFormError('Times must be HH:MM, 24-hour.'); return; }
    if (end <= start) { setFormError('The end time must be AFTER the start time.'); return; }
    setBusy('edit');
    try {
      await examcellApi.rescheduleTimetableSlot(editTarget.slotId, {
        date: f.date.trim(), startTime: f.startTime.trim(), endTime: f.endTime.trim(),
      });
      setEditOpen(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(null);
    }
  };

  // ── Write 3: mark done. Exam-level, so a paper cannot be sat twice. ───────
  const complete = (slot) => {
    Alert.alert('Mark this paper done?', `${slot.courseCode} · ${slot.date}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark done',
        onPress: async () => {
          setBusy(slot.slotId);
          try {
            await examcellApi.completeTimetableSlot(slot.slotId);
            reload();
          } catch (err) {
            Alert.alert('Cannot complete', err.message);
          } finally { setBusy(null); }
        },
      },
    ]);
  };

  // ── Write 4: delete. Refused when the slot has results against it. ───────
  const remove = (slot) => {
    Alert.alert(
      'Delete this slot?',
      `${slot.courseCode} on ${slot.date} will be removed, along with its room ` +
        'allocations. A slot with results against it cannot be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(slot.slotId);
            try {
              await examcellApi.deleteTimetableSlot(slot.slotId);
              reload();
              loadVenues();
            } catch (err) {
              Alert.alert('Cannot delete', err.message);
            } finally { setBusy(null); }
          },
        },
      ],
    );
  };

  // ── Write 5: allocate a venue ────────────────────────────────────────────
  // This is what lets a controller SPLIT a large paper across two rooms — and
  // splitting is exactly what produces the ROOM_DOUBLE_BOOKED soft clash, which
  // is recorded rather than refused. That pairing is the point: the write that
  // creates the problem is the same write that fixes a bigger one.
  const allocate = async (slot, venueId) => {
    setVenueTarget(null);
    setBusy(slot.slotId);
    try {
      await examcellApi.allocateVenue(slot.slotId, { venueId });
      reload();
      loadVenues();
    } catch (err) {
      Alert.alert('Cannot allocate this venue', err.message);
      reload();
    } finally { setBusy(null); }
  };

  // Venues this slot has not already got. A duplicate is a 409 from the server
  // ("already allocated to this slot"), so the list simply omits them.
  const offeredVenues = venueTarget
    ? venueList.filter((v) => !venueTarget.venues.includes(v.venueId))
    : [];

  return (
    <TimetableScreen
      title="Date & time slots"
      subtitle={examId ? 'One exam.' : 'Every slot in this institution.'}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      header={
        <ActionRow
          actions={[
            {
              label: 'Add slot',
              icon: 'add',
              color: THEME,
              onPress: () => {
                setAddForm({ offeringId: '', date: '', startTime: '09:00', endTime: '12:00', seats: '' });
                setFormError(null);
                setAddOpen(true);
              },
            },
            {
              label: 'Rooms',
              icon: 'business-outline',
              color: SLATE,
              onPress: () => goToRoute(navigation, 'TimetableRooms', false, { examId }),
            },
            {
              label: 'Duty',
              icon: 'people-outline',
              color: SLATE,
              onPress: () => goToRoute(navigation, 'TimetableDuty', false, { examId }),
            },
          ]}
        />
      }
    >
      <Card>
        <StatGrid>
          <StatCell label="Slots" value={totals.slots ?? 0} hint="all statuses" />
          <StatCell
            label="Scheduled"
            value={totals.scheduled ?? 0}
            tone={THEME}
            hint={`${totals.rescheduled ?? 0} rescheduled · ${totals.cancelled ?? 0} cancelled`}
          />
          <StatCell
            label="Seats vs enrolled"
            value={`${totals.seats ?? 0} / ${totals.enrolled ?? 0}`}
            tone={(totals.seats ?? 0) < (totals.enrolled ?? 0) ? AMBER : GREEN}
            hint={(totals.seats ?? 0) < (totals.enrolled ?? 0) ? 'short overall' : 'enough overall'}
          />
          <StatCell
            label="Clashes"
            value={totals.conflictCount ?? 0}
            tone={totals.blockingCount ? RED : totals.conflictCount ? AMBER : GREEN}
            hint={`${totals.blockingCount ?? 0} blocking · ${totals.completed ?? 0} done`}
          />
        </StatGrid>
      </Card>

      {totals.blockingCount > 0 ? (
        <NoteStrip
          tone="bad"
          text={`${plural(totals.blockingCount, 'blocking clash', 'blocking clashes')} recorded against these slots. Blocking clashes are refused at write time, so one stored here means the slot predates the engine — check the Clashes screen.`}
        />
      ) : (totals.conflictCount ?? 0) > 0 ? (
        <NoteStrip
          tone="warn"
          text={`${plural(totals.conflictCount, 'clash', 'clashes')} on these slots, all recorded rather than refused. Room, subject, capacity and unallocated clashes do not stop a schedule being built.`}
        />
      ) : null}

      <Section title="By day" note={plural(days.length, 'day')}>
        {days.length === 0 ? (
          <TimetableEmpty
            icon="time-outline"
            title="No slots yet"
            subtitle="A slot is one paper at one date and time. Without one, a student enrolled in the course is sitting nothing."
          />
        ) : null}

        {days.map((d) => (
          <View key={d.date} style={styles.dayBlock}>
            <View style={styles.dayHead}>
              <View style={styles.dayHeadBody}>
                <Text style={styles.dayLabel}>{shortDayLabel(d.date)}</Text>
                <Text style={styles.dayCount}>{plural(d.count, 'paper')}</Text>
              </View>
              <ClashBadge count={d.conflictCount} />
            </View>

            {slots.filter((s) => s.date === d.date).map((s) => (
              <View key={s.slotId} style={styles.slotCard}>
                <View style={styles.slotHead}>
                  <View style={styles.slotHeadBody}>
                    <Text style={styles.slotCourse}>{s.courseCode} · {s.courseName}</Text>
                    <Text style={styles.slotMeta}>{s.examName} · {s.section}</Text>
                  </View>
                  <Pill
                    text={SLOT_STATUS_LABEL[s.status] ?? s.status}
                    color={SLOT_STATUS_COLOR[s.status] ?? SLATE}
                  />
                </View>

                <View style={styles.slotTimeRow}>
                  <View style={styles.timeCell}>
                    <Text style={styles.timeBig}>{s.startTime}</Text>
                    <Text style={styles.timeSmall}>to {s.endTime}</Text>
                  </View>
                  <View style={styles.timeDivider} />
                  <View style={styles.timeCell}>
                    <Text style={styles.timeBig}>{s.durationLabel}</Text>
                    <Text style={styles.timeSmall}>{seatPhrase(s.enrolled, s.seats)}</Text>
                  </View>
                  <View style={styles.timeCell}>
                    <Text style={styles.timeBig}>{s.venues.length || '—'}</Text>
                    <Text style={styles.timeSmall}>{s.venues.length === 1 ? 'venue' : 'venues'}</Text>
                  </View>
                  <View style={styles.timeCell}>
                    <Text style={[styles.timeBig, { color: s.invigilators.length ? GREEN : RED }]}>
                      {s.invigilators.length || '—'}
                    </Text>
                    <Text style={styles.timeSmall}>
                      {s.invigilators.length === 1 ? 'invigilator' : 'invigilators'}
                    </Text>
                  </View>
                </View>

                {s.conflictCount > 0 ? (
                  <View style={styles.conflictStrip}>
                    {s.conflicts.map((c) => (
                      <Pill
                        key={c.kind}
                        text={conflictMeta(c.kind)?.label ?? c.kind}
                        color={c.severity === 'HIGH' ? RED : c.severity === 'LOW' ? SLATE : AMBER}
                        icon="warning-outline"
                      />
                    ))}
                  </View>
                ) : null}

                <ActionRow
                  actions={[
                    { label: 'Move', icon: 'swap-vertical-outline', color: THEME, onPress: () => openReschedule(s) },
                    ...(s.status !== 'COMPLETED' && s.status !== 'CANCELLED'
                      ? [{ label: 'Done', icon: 'checkmark-done-outline', color: GREEN, onPress: () => complete(s) }]
                      : []),
                    { label: 'Add room', icon: 'business-outline', color: SLATE, onPress: () => setVenueTarget(s) },
                    { label: 'Delete', icon: 'trash-outline', color: RED, onPress: () => remove(s) },
                  ]}
                />
              </View>
            ))}
          </View>
        ))}
      </Section>

      <SlotEditor
        title="Add a slot"
        open={addOpen}
        fields={[
          { key: 'offeringId', label: 'Course offering id', placeholder: 'from the Course allocation screen' },
          { key: 'date', label: 'Date (YYYY-MM-DD)', placeholder: '2026-03-14' },
          { key: 'startTime', label: 'Start (HH:MM)', placeholder: '09:00' },
          { key: 'endTime', label: 'End (HH:MM)', placeholder: '12:00' },
          { key: 'seats', label: 'Seats (optional)', placeholder: 'defaults to the enrolment' },
        ]}
        form={addForm}
        setForm={setAddForm}
        error={formError}
        busy={busy === 'add'}
        onClose={() => setAddOpen(false)}
        onSave={addSlot}
        saveLabel="Add"
      />

      <SlotEditor
        title={editTarget ? `Move ${editTarget.courseCode}` : 'Move this slot'}
        open={editOpen}
        fields={[
          { key: 'date', label: 'Date (YYYY-MM-DD)', placeholder: '2026-03-14' },
          { key: 'startTime', label: 'Start (HH:MM)', placeholder: '09:00' },
          { key: 'endTime', label: 'End (HH:MM)', placeholder: '12:00' },
        ]}
        form={editForm}
        setForm={setEditForm}
        error={formError}
        busy={busy === 'edit'}
        onClose={() => setEditOpen(false)}
        onSave={reschedule}
        saveLabel="Move"
      />

      <VenueSheet
        slot={venueTarget}
        venues={offeredVenues}
        onClose={() => setVenueTarget(null)}
        onPick={(v) => allocate(venueTarget, v.venueId)}
      />
    </TimetableScreen>
  );
}

// The add and move forms differ only in their fields, so they share one
// component. Two near-identical forms drift apart within a week.
function SlotEditor({ title, open, fields, form, setForm, error, busy, onClose, onSave, saveLabel }) {
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBack}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{title}</Text>
            {fields.map((f) => (
              <View key={f.key}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.key] ?? ''}
                  onChangeText={(t) => setForm((p) => ({ ...p, [f.key]: t }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={MUTED}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ))}
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
                <Text style={styles.saveText}>{busy ? 'Saving…' : saveLabel}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function VenueSheet({ slot, venues, onClose, onPick }) {
  return (
    <Modal visible={!!slot} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBack}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Allocate a venue</Text>
          <Text style={styles.modalNote}>
            Real venue capacity, not hostel rooms. A seat shortfall is recorded as a
            clash rather than refused, so a large paper can be staged across two
            venues before the second room is fully booked out.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {venues.map((v) => (
              <TouchableOpacity
                key={v.venueId}
                style={styles.venueRow}
                activeOpacity={0.8}
                onPress={() => onPick(v)}
                accessibilityRole="button"
                accessibilityLabel={`${v.name}, capacity ${v.capacity}`}
              >
                <View style={styles.venueBody}>
                  <Text style={styles.venueName}>{v.name}</Text>
                  <Text style={styles.venueMeta}>
                    Capacity {v.capacity}{v.location ? ` · ${v.location}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>
            ))}
            {venues.length === 0 ? (
              <Text style={styles.modalNote}>
                This slot already has every venue allocated to it.
              </Text>
            ) : null}
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtnFull} onPress={onClose} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dayBlock: { marginBottom: 14 },
  dayHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 12, marginBottom: 8,
  },
  dayHeadBody: { flex: 1 },
  dayLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  dayCount: { fontSize: 10, color: SLATE, marginTop: 1 },

  slotCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#eef2f7', padding: 14, marginBottom: 10, marginLeft: 12,
  },
  slotHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  slotHeadBody: { flex: 1 },
  slotCourse: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  slotMeta: { fontSize: 11, color: SLATE, marginTop: 2 },

  slotTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  timeCell: { flex: 1 },
  timeDivider: { width: 1, height: 26, backgroundColor: '#f1f5f9', marginHorizontal: 8 },
  timeBig: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  timeSmall: { fontSize: 9, color: MUTED, marginTop: 1 },

  conflictStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 },

  modalBack: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34, maxHeight: '88%',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  modalNote: { fontSize: 11, color: SLATE, lineHeight: 16, marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: SLATE, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a',
    fontFamily: 'Manrope-Medium',
  },
  formError: { fontSize: 11, color: RED, marginTop: 12, lineHeight: 16 },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    borderRadius: 11, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f1f5f9',
  },
  cancelBtnFull: {
    borderRadius: 11, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f1f5f9',
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: SLATE },
  saveBtn: { flex: 1, borderRadius: 11, paddingVertical: 12, alignItems: 'center', backgroundColor: THEME },
  saveText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  venueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  venueBody: { flex: 1 },
  venueName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  venueMeta: { fontSize: 10, color: SLATE, marginTop: 1 },
});