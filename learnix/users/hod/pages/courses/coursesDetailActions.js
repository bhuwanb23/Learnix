/**
 * HD-06 — The HOD's Courses desk: the sheets.
 * Docs: 11-hod.md §3.3
 *
 * THE THREE SHEETS
 * ----------------
 *   · EditCourseSheet     — the HOD changes a course's name, credits, semester or type.
 *   · MapCourseSheet      — the HOD declares which programme runs this course, and in which
 *                           semester. This is a DECLARATION, and it can exist before the course is
 *                           ever taught — which is the whole point, because a curriculum is decided
 *                           before it is delivered.
 *   · PrerequisiteSheet   — the HOD declares what this course demands first.
 *
 * WHY SHEETS AND NOT ROUTES
 * -------------------------
 * Because each of these is a SHORT, SINGLE-PURPOSE edit that ends in a save. A route would put a
 * full screen between the HOD and the thing they came to change, and the screen would have to
 * carry the course's context in the param channel to render a form.
 *
 * EVERY SHEET DISABLES ITS OWN SAVE WHILE THE REQUEST IS IN FLIGHT
 * -----------------------------------------------------------------
 * A double-tap on Save fires two requests, and the second one is an update with the OLD values
 * arriving after the first — so the HOD's change silently reverts. The button is disabled while
 * the request is in flight, and the sheet says what it is doing.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { ActionButton, ChipRow, NoteStrip } from './coursesUi';
import {
  CYAN,
  GREEN,
  RED,
  SLATE,
  THEME,
  VIOLET,
  plural,
} from './coursesMeta';

// ── The sheet frame ─────────────────────────────────────────────────────────

/**
 * The bottom-sheet frame every sheet here uses.
 *
 * The title says what the sheet DOES and the sub-line says what it WILL NOT do — "A course is
 * created by the Admin" under an edit sheet is the sentence that stops the reader hunting for a
 * create button that is not there.
 */
export function Sheet({ visible, onClose, title, sub, children, footer }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {sub ? <Text style={styles.sheetSub}>{sub}</Text> : null}
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyInner}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer}
        </View>
      </View>
    </Modal>
  );
}

// ── 1. Edit the course ─────────────────────────────────────────────────────

/**
 * THE EDIT SHEET.
 *
 * The fields are the ones the HOD OWNS. There is no "code" field, because the code is the
 * institution's identifier for the course and changing it would break every paper that has ever
 * quoted it; and there is no "department" field, because the course belongs to the HOD's
 * department and saying otherwise would be a lie.
 */
export function EditCourseSheet({ visible, course, onClose, onSave, saving, error }) {
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('');
  const [semester, setSemester] = useState('');
  const [type, setType] = useState('CORE');

  useEffect(() => {
    if (!course) return;
    setName(course.name ?? '');
    setCredits(String(course.credits ?? ''));
    setSemester(String(course.semester ?? ''));
    setType(course.type ?? 'CORE');
  }, [course, visible]);

  const canSave =
    name.trim().length >= 2 &&
    credits !== '' &&
    semester !== '' &&
    !saving;

  const submit = () => {
    if (!canSave) return;
    onSave?.({
      name: name.trim(),
      credits: Number(credits),
      semester: Number(semester),
      type,
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Edit this course"
      sub="A course is created by the Admin. You can change what this one is called and how it sits in the curriculum."
      footer={
        <View style={styles.footer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.footerRow}>
            <ActionButton label="Cancel" icon="close-outline" color={SLATE} onPress={onClose} />
            <ActionButton
              label={saving ? 'Saving…' : 'Save changes'}
              icon="checkmark-outline"
              color={THEME}
              filled
              onPress={submit}
              disabled={!canSave}
            />
          </View>
        </View>
      }
    >
      <Field label="Name" value={name} onChangeText={setName} placeholder="Course name" />
      <View style={styles.twoUp}>
        <View style={styles.twoUpItem}>
          <Field
            label="Credits"
            value={credits}
            onChangeText={setCredits}
            placeholder="0–30"
            keyboard="number-pad"
          />
        </View>
        <View style={styles.twoUpItem}>
          <Field
            label="Semester"
            value={semester}
            onChangeText={setSemester}
            placeholder="1–12"
            keyboard="number-pad"
          />
        </View>
      </View>
      <Text style={styles.fieldLabel}>Type</Text>
      <ChipRow
        options={[
          { id: 'CORE', label: 'Core', color: THEME },
          { id: 'ELECTIVE', label: 'Elective', color: VIOLET },
        ]}
        value={type}
        onChange={setType}
      />
      {type === 'ELECTIVE' ? (
        <NoteStrip>
          The type here is the course's DEFAULT. A course can be core in one programme and an
          elective in another — the curriculum mapping carries its own type for that.
        </NoteStrip>
      ) : null}
    </Sheet>
  );
}

// ── 2. Map the course to a programme ───────────────────────────────────────

/**
 * THE CURRICULUM SHEET.
 *
 * The programme list comes from the DETAIL, which already knows which programmes the department
 * runs and which of them are already mapped — so the sheet can say "already mapped" rather than
 * offering a mapping that exists.
 */
export function MapCourseSheet({
  visible,
  course,
  onClose,
  onMap,
  onUnmap,
  saving,
  error,
}) {
  const [programId, setProgramId] = useState(null);
  const [semester, setSemester] = useState('');
  const [type, setType] = useState('CORE');
  const [isElective, setIsElective] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setProgramId(null);
    setSemester(String(course?.semester ?? ''));
    setType(course?.type ?? 'CORE');
    setIsElective(false);
  }, [visible, course]);

  const programs = course?.curriculum?.programs ?? [];
  const declared = course?.curriculum?.declared ?? [];
  const chosen = programs.find((p) => p.id === programId);
  const already = declared.find((d) => d.programId === programId);

  const canMap = !!programId && semester !== '' && !saving;

  const submit = () => {
    if (!canMap) return;
    onMap?.({
      programId,
      semester: Number(semester),
      type,
      isElective: type === 'ELECTIVE' ? isElective : false,
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Map this course to a programme"
      sub="The curriculum the department DECLARES. A course can be mapped before it is ever taught."
      footer={
        <View style={styles.footer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.footerRow}>
            <ActionButton label="Cancel" icon="close-outline" color={SLATE} onPress={onClose} />
            {already ? (
              <ActionButton
                label="Unmap"
                icon="unlink-outline"
                color={RED}
                onPress={() => onUnmap?.(programId)}
                disabled={saving}
              />
            ) : (
              <ActionButton
                label={saving ? 'Saving…' : 'Map it'}
                icon="link-outline"
                color={THEME}
                filled
                onPress={submit}
                disabled={!canMap}
              />
            )}
          </View>
        </View>
      }
    >
      {programs.length === 0 ? (
        <NoteStrip tone="warn">
          This department has no programme to map a course into yet.
        </NoteStrip>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Programme</Text>
          {programs.map((p) => {
            const active = p.id === programId;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setProgramId(p.id)}
                activeOpacity={0.75}
              >
                <View style={styles.flex}>
                  <Text style={styles.optionTitle}>{p.name}</Text>
                  <Text style={styles.optionMeta}>
                    {p.code}
                    {p.level ? ` · ${p.level}` : ''}
                  </Text>
                </View>
                {p.mapped ? (
                  <Ionicons name="checkmark-circle" size={17} color={GREEN} />
                ) : active ? (
                  <Ionicons name="radio-button-on" size={17} color={THEME} />
                ) : (
                  <Ionicons name="radio-button-off" size={17} color={SLATE} />
                )}
              </TouchableOpacity>
            );
          })}

          {chosen ? (
            <>
              {already ? (
                <NoteStrip>
                  {chosen.name} is already mapped to this course in semester {already.semester}.
                  Saving replaces that mapping.
                </NoteStrip>
              ) : null}
              <Field
                label="Semester"
                value={semester}
                onChangeText={setSemester}
                placeholder="1–12"
                keyboard="number-pad"
              />
              <Text style={styles.fieldLabel}>Type in this programme</Text>
              <ChipRow
                options={[
                  { id: 'CORE', label: 'Core', color: THEME },
                  { id: 'ELECTIVE', label: 'Elective', color: VIOLET },
                ]}
                value={type}
                onChange={setType}
              />
              {type === 'ELECTIVE' ? (
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setIsElective((v) => !v)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={isElective ? 'checkbox' : 'square-outline'}
                    size={17}
                    color={isElective ? THEME : SLATE}
                  />
                  <Text style={styles.checkText}>
                    Students choose this as an elective
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

// ── 3. Add a prerequisite ──────────────────────────────────────────────────

/**
 * THE PREREQUISITE SHEET.
 *
 * The list is the department's OTHER courses — a course cannot be its own prerequisite, and a
 * course cannot demand one from another department's catalogue. The server refuses both, and this
 * sheet does not offer them in the first place.
 */
export function PrerequisiteSheet({
  visible,
  course,
  courses,
  onClose,
  onAdd,
  saving,
  error,
}) {
  const [prerequisiteCourseId, setPrerequisiteCourseId] = useState(null);
  const [type, setType] = useState('REQUIRED');

  useEffect(() => {
    if (!visible) return;
    setPrerequisiteCourseId(null);
    setType('REQUIRED');
  }, [visible]);

  const existing = (course?.prerequisites ?? []).map((p) => p.courseId);
  const options = (courses ?? []).filter((c) => c.id !== course?.id);
  const chosen = options.find((c) => c.id === prerequisiteCourseId);
  const canAdd = !!prerequisiteCourseId && !saving;

  const submit = () => {
    if (!canAdd) return;
    onAdd?.({ prerequisiteCourseId, type });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="What must come first"
      sub="The courses this one demands. A course cannot demand itself, and the graph cannot contain a loop."
      footer={
        <View style={styles.footer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.footerRow}>
            <ActionButton label="Cancel" icon="close-outline" color={SLATE} onPress={onClose} />
            <ActionButton
              label={saving ? 'Saving…' : 'Add it'}
              icon="add-circle-outline"
              color={THEME}
              filled
              onPress={submit}
              disabled={!canAdd}
            />
          </View>
        </View>
      }
    >
      {options.length === 0 ? (
        <NoteStrip tone="warn">
          This department has no other course to demand first.
        </NoteStrip>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Course</Text>
          {options.map((c) => {
            const active = c.id === prerequisiteCourseId;
            const already = existing.includes(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => !already && setPrerequisiteCourseId(c.id)}
                activeOpacity={0.75}
              >
                <View style={styles.flex}>
                  <Text style={styles.optionTitle}>{c.name}</Text>
                  <Text style={styles.optionMeta}>
                    {c.code} · sem {c.semester} · {plural(c.credits ?? 0, 'credit', 'credits')}
                  </Text>
                </View>
                {already ? (
                  <Ionicons name="checkmark-circle" size={17} color={GREEN} />
                ) : active ? (
                  <Ionicons name="radio-button-on" size={17} color={THEME} />
                ) : (
                  <Ionicons name="radio-button-off" size={17} color={SLATE} />
                )}
              </TouchableOpacity>
            );
          })}
          {chosen ? (
            <>
              <Text style={styles.fieldLabel}>How strongly</Text>
              <ChipRow
                options={[
                  { id: 'REQUIRED', label: 'Required', color: RED },
                  { id: 'RECOMMENDED', label: 'Recommended', color: CYAN },
                ]}
                value={type}
                onChange={setType}
              />
              <NoteStrip>
                A REQUIRED prerequisite is a hard edge. The server refuses an edge that would close
                a loop, so "what must come first" always has an answer.
              </NoteStrip>
            </>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

// ── A field ────────────────────────────────────────────────────────────────

/** A labelled text field. */
export function Field({ label, value, onChangeText, placeholder, keyboard }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
    maxHeight: '88%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  sheetSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 15,
  },
  sheetBody: { marginTop: 14 },
  sheetBodyInner: { paddingBottom: 12 },
  footer: { paddingTop: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
  errorText: { fontSize: 11, color: RED, fontWeight: '600' },

  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  twoUp: { flexDirection: 'row', gap: 10 },
  twoUpItem: { flex: 1 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 7,
  },
  optionActive: { borderColor: THEME, backgroundColor: `${THEME}0d` },
  optionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  optionMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  checkText: { fontSize: 12, color: theme.colors.text, fontWeight: '600' },

  flex: { flex: 1 },
});
