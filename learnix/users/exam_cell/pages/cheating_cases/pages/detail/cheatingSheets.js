/**
 * X-08 — Cheating cases: the action sheets.
 * (docs/users/05 §3.6)
 *
 * ONE COMPONENT FOR EVERY ACTION ON A CASE
 * ---------------------------------------
 * Classifying, taking a statement, referring to a committee, deciding, reopening, adding a note and
 * attaching evidence are seven different actions, and they share a frame, a set of field widgets and
 * one rule: the thing the user submits must be exactly what the server expects.
 *
 * They live here rather than inside the case file because a screen that has seven near-identical
 * modals inline is a screen nobody can read, and because the sheets are the part of this feature
 * most likely to change — the vocabulary of what a committee records will grow.
 *
 * THE SHEETS DO NOT DECIDE ANYTHING
 * -------------------------------
 * They collect what the user chose and hand it to the API. The state machine is the server's, and a
 * sheet that offered a move the server would refuse would be a sheet that lies.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { AMBER, GREEN, MUTED, RED, SLATE, THEME, VIOLET, classificationMeta } from '../../cheating_casesMeta';
import { NoteStrip } from '../../cheating_casesUi';

/**
 * The request the sheet builds, per action.
 *
 * It is ONE function rather than seven inline bodies, because the mapping from "what the user chose"
 * to "what the server wants" is exactly the thing that drifts, and a drift here would be a body the
 * server silently ignores.
 */
export function buildRequest(kind, item, form) {
  switch (kind) {
    case 'classify':
      return () => examcellApi.classifyCheatingCase(item.id, form);
    case 'statement':
      return () => examcellApi.recordCheatingStatement(item.id, form);
    case 'committee':
      return () => examcellApi.submitCheatingCommitteeReview(item.id, form);
    case 'decide':
      return () => examcellApi.decideCheatingCase(item.id, form);
    case 'reopen':
      return () => examcellApi.reopenCheatingCase(item.id, form);
    case 'note':
      return () => examcellApi.addCheatingCaseNote(item.id, form);
    case 'evidence':
      return () => examcellApi.addCheatingEvidence(item.id, form);
    default:
      return async () => {};
  }
}

export function CheatingSheet({ visible, kind, form, setForm, item, saving, onClose, onSubmit, onDone }) {
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const titleFor = {
    classify: 'Classify this case',
    statement: "Record the student's statement",
    committee: 'Refer to a committee',
    decide: 'Decide this case',
    reopen: 'Reopen this case',
    note: 'Add a note',
    evidence: 'Attach evidence',
  };

  const body = () => {
    switch (kind) {
      case 'classify':
        return (
          <>
            <SheetLabel>What is the misconduct?</SheetLabel>
            <Text style={styles.sheetHint}>
              This is what happened, as distinct from how risky it looked. A penalty attaches to the
              classification, not to the risk.
            </Text>
            <SheetChoices
              options={Object.entries(classificationMeta).length ? CLASSIFICATION_CHOICES.map((id) => ({
                value: id,
                label: classificationMeta(id).label,
                hint: classificationMeta(id).blurb,
              })) : []}
              value={form.classification}
              onChange={set('classification')}
            />
            <SheetLabel>Risk level</SheetLabel>
            <SheetChoices
              options={[
                { value: 'HIGH', label: 'High risk' },
                { value: 'MEDIUM', label: 'Medium risk' },
                { value: 'LOW', label: 'Low risk' },
              ]}
              value={form.riskLevel}
              onChange={set('riskLevel')}
            />
          </>
        );
      case 'statement':
        return (
          <>
            <SheetLabel>The student's own account</SheetLabel>
            <Text style={styles.sheetHint}>
              Kept separate from the incident description, because they are two different accounts of
              the same event.
            </Text>
            <SheetInput
              value={form.statement ?? ''}
              onChange={set('statement')}
              placeholder="What the student says happened"
              multiline
            />
          </>
        );
      case 'committee':
        return (
          <>
            <SheetLabel>Who is on the committee?</SheetLabel>
            <Text style={styles.sheetHint}>
              Comma-separated user ids of this institution. A committee with nobody on it is not a
              review.
            </Text>
            <SheetInput
              value={(form.committeeUserIds ?? []).join(', ')}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  committeeUserIds: v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="usr_abc123, usr_def456"
            />
            <SheetLabel>What did the committee find?</SheetLabel>
            <SheetInput
              value={form.reviewNote ?? ''}
              onChange={set('reviewNote')}
              placeholder="The finding"
              multiline
            />
            <SheetLabel>Recommendation</SheetLabel>
            <SheetChoices
              options={[
                { value: 'RECOMMEND_CONFIRM', label: 'Recommend confirming' },
                { value: 'RECOMMEND_DISMISS', label: 'Recommend dismissing' },
                { value: 'NEEDS_MORE_INFO', label: 'Needs more information' },
              ]}
              value={form.decision ?? 'RECOMMEND_CONFIRM'}
              onChange={set('decision')}
            />
          </>
        );
      case 'decide':
        return (
          <>
            <SheetLabel>Decision</SheetLabel>
            <SheetChoices
              options={[
                { value: 'CONFIRMED', label: 'Confirm malpractice' },
                { value: 'DISMISSED', label: 'Dismiss the case' },
                { value: 'ESCALATED', label: 'Escalate it' },
              ]}
              value={form.decision}
              onChange={set('decision')}
            />
            {form.decision === 'CONFIRMED' ? (
              <>
                <SheetLabel>Penalty</SheetLabel>
                <SheetChoices
                  options={[
                    { value: 'WARNING', label: 'Formal warning' },
                    { value: 'REPEAT_OFFENDER', label: 'Repeat offender' },
                    { value: 'SUSPENSION', label: 'Suspension' },
                    { value: 'CANCEL_EXAM', label: 'Cancel this exam' },
                    { value: 'EXCLUSION', label: 'Exclude from the programme' },
                    { value: 'NONE', label: 'No penalty' },
                  ]}
                  value={form.penalty ?? 'WARNING'}
                  onChange={set('penalty')}
                />
              </>
            ) : null}
            <SheetLabel>What was decided, and why</SheetLabel>
            <SheetInput
              value={form.decisionNote ?? ''}
              onChange={set('decisionNote')}
              placeholder="The finding and the reasoning"
              multiline
            />
            <NoteStrip>
              The student is told, unless you say otherwise. A case that was decided and never
              communicated is a case they cannot answer.
            </NoteStrip>
          </>
        );
      case 'reopen':
        return (
          <>
            <SheetLabel>Why is it being reopened?</SheetLabel>
            <Text style={styles.sheetHint}>
              Reopening clears the decision and the penalty, and leaves a record that it was reopened
              and why.
            </Text>
            <SheetInput
              value={form.reason ?? ''}
              onChange={set('reason')}
              placeholder="The reason"
              multiline
            />
          </>
        );
      case 'note':
        return (
          <>
            <SheetLabel>Note</SheetLabel>
            <SheetInput
              value={form.note ?? ''}
              onChange={set('note')}
              placeholder="Anything worth recording"
              multiline
            />
          </>
        );
      case 'evidence':
        return (
          <>
            <SheetLabel>File</SheetLabel>
            <Text style={styles.sheetHint}>
              The id of a file already uploaded to this institution. Evidence is a document that
              exists; it is not a description of one.
            </Text>
            <SheetInput
              value={form.fileId ?? ''}
              onChange={set('fileId')}
              placeholder="File id"
            />
            <SheetLabel>What kind of evidence is it?</SheetLabel>
            <SheetChoices
              options={[
                { value: 'SCREENSHOT', label: 'Screenshot' },
                { value: 'SCRIPT', label: 'Answer script' },
                { value: 'DEVICE_PHOTO', label: 'Device photo' },
                { value: 'REPORT', label: 'Report' },
                { value: 'STATEMENT_DOCUMENT', label: 'Statement' },
                { value: 'OTHER', label: 'Other' },
              ]}
              value={form.kind ?? 'OTHER'}
              onChange={set('kind')}
            />
            <SheetInput
              value={form.note ?? ''}
              onChange={set('note')}
              placeholder="A note about it (optional)"
            />
          </>
        );
      default:
        return null;
    }
  };

  const submitLabel = {
    classify: 'Save classification',
    statement: 'Save the statement',
    committee: 'Save the review',
    decide: 'Record the decision',
    reopen: 'Reopen the case',
    note: 'Add the note',
    evidence: 'Attach it',
  }[kind];

  const go = async () => {
    try {
      await onSubmit(buildRequest(kind, item, form));
      onDone?.();
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Try again');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{titleFor[kind] ?? ''}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={SLATE} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetBody}>{body()}</ScrollView>
          <View style={styles.sheetFoot}>
            <TouchableOpacity style={styles.sheetCancel} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetSubmit, saving && { opacity: 0.5 }]}
              onPress={go}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.sheetSubmitText}>{saving ? 'Saving…' : submitLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SheetLabel({ children }) {
  return <Text style={styles.sheetLabel}>{children}</Text>;
}

function SheetHint({ children }) {
  return <Text style={styles.sheetHint}>{children}</Text>;
}

function SheetInput({ value, onChange, placeholder, multiline }) {
  return (
    <TextInput
      style={[styles.sheetInput, multiline && styles.sheetInputTall]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={MUTED}
      multiline={multiline}
    />
  );
}

function SheetChoices({ options, value, onChange }) {
  return (
    <View style={styles.choices}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.choice, on && styles.choiceOn]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={on ? 'radio-button-on' : 'radio-button-off'}
              size={16}
              color={on ? THEME : MUTED}
            />
            <View style={styles.flex}>
              <Text style={[styles.choiceLabel, on && styles.choiceLabelOn]}>{o.label}</Text>
              {o.hint ? <Text style={styles.choiceHint}>{o.hint}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// The classification ids, mirrored from the server's vocabulary so the choices can be rendered
// before the catalogue has loaded.
export const CLASSIFICATION_CHOICES = [
  'IMPERSONATION',
  'HIDDEN_DEVICE',
  'COPY_PASTE',
  'ANSWER_SIMILARITY',
  'TIMING_PATTERN',
  'LOOKING_AROUND',
  'POSSESSION',
  'OTHER',
];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheetBackdrop: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', paddingTop: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  sheetBody: { paddingHorizontal: 20, paddingBottom: 10 },
  sheetLabel: { fontSize: 12, fontWeight: '700', color: SLATE, marginTop: 14, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 },
  sheetHint: { fontSize: 11, color: MUTED, marginBottom: 4, lineHeight: 16 },
  sheetInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12.5, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 4 },
  sheetInputTall: { minHeight: 84, textAlignVertical: 'top' },
  choices: { gap: 6 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  choiceOn: { borderColor: THEME, backgroundColor: THEME + '0D' },
  choiceLabel: { fontSize: 12.5, fontWeight: '600', color: '#0f172a' },
  choiceLabelOn: { color: THEME },
  choiceHint: { fontSize: 10.5, color: MUTED, marginTop: 1, lineHeight: 15 },
  sheetFoot: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  sheetCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  sheetCancelText: { fontSize: 13, fontWeight: '600', color: SLATE },
  sheetSubmit: { backgroundColor: THEME, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  sheetSubmitText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
