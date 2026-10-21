/**
 * X-08 — Cheating cases: report an incident.
 * (docs/users/05 §3.6)
 *
 * THE STUDENT IS A PICKER, NOT A TYPED NAME
 * -----------------------------------------
 * A report is about a student IN a room. So the screen asks which exam slot, and then offers the
 * students who actually sat it — from the hall tickets issued for that slot. Typing a roll number
 * into a box is how a report ends up attached to nobody, and a case attached to nobody cannot be
 * reviewed, decided, or appealed.
 *
 * THE ROOM AND THE INVIGILATOR ARE SHOWN, NOT ASKED
 * --------------------------------------------------
 * They come from the slot's room allocation, and they are DISPLAYED because they are facts, not
 * choices. A reporter who is asked "which room" will pick a room they were told was theirs.
 *
 * THE EVIDENCE IS A DOCUMENT, NOT A DESCRIPTION
 * ----------------------------------------------
 * The evidence field takes the id of a file that exists. What kind of evidence it is — a screenshot,
 * a script, a photograph of a device — is chosen separately, because "evidence" and "a photo of a
 * phone" are different facts and one field cannot hold both.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import { styles } from './reportStyles';
import { AMBER, MUTED, RED, SLATE, THEME, VIOLET, classificationMeta } from '../../cheating_casesMeta';
import {
  CheatingScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  NoteStrip,
  SectionHeading,
} from '../../cheating_casesUi';

const RISKS = [
  { value: 'HIGH', label: 'High', blurb: 'Unauthorised material, impersonation, a second person.' },
  { value: 'MEDIUM', label: 'Medium', blurb: 'Answer similarity, an odd timing pattern.' },
  { value: 'LOW', label: 'Low', blurb: 'Looking around — worth noting, not acting on alone.' },
];

const SOURCES = [
  { value: 'INVIGILATOR', label: 'I saw it', icon: 'eye-outline' },
  { value: 'AI', label: 'Pattern detection', icon: 'sparkles-outline' },
  { value: 'STUDENT_REPORT', label: 'A student told me', icon: 'megaphone-outline' },
  { value: 'EXTERNAL', label: 'External', icon: 'globe-outline' },
];

const CLASSIFICATIONS = [
  'IMPERSONATION',
  'HIDDEN_DEVICE',
  'COPY_PASTE',
  'ANSWER_SIMILARITY',
  'TIMING_PATTERN',
  'LOOKING_AROUND',
  'POSSESSION',
  'OTHER',
];

export default function CheatingCasesReport({ navigation }) {
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState(null);

  const [slotId, setSlotId] = useState(null);
  const [context, setContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  const [studentProfileId, setStudentProfileId] = useState(null);
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState('MEDIUM');
  const [classification, setClassification] = useState(null);
  const [source, setSource] = useState('INVIGILATOR');
  const [fileId, setFileId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSlots = useCallback(async () => {
    try {
      setSlotsLoading(true);
      setSlotsError(null);
      const rows = await examcellApi.cheatingReportableSlots();
      setSlots(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setSlotsError(e.message || 'Could not load the exams');
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // The room, the invigilator and the roster all come from the slot. Choosing a different slot
  // clears the student, because a student from another room is not a student from this one.
  const chooseSlot = useCallback(async (id) => {
    setSlotId(id);
    setStudentProfileId(null);
    setContext(null);
    if (!id) return;
    try {
      setContextLoading(true);
      setContext(await examcellApi.cheatingReportContext(id));
    } catch (e) {
      Alert.alert('Could not open that exam', e.message || 'Try again');
    } finally {
      setContextLoading(false);
    }
  }, []);

  const submit = async () => {
    if (!slotId) {
      Alert.alert('Which exam?', 'Choose the exam the incident happened in.');
      return;
    }
    if (!studentProfileId) {
      Alert.alert('Which student?', 'Choose the student this concerns.');
      return;
    }
    if (issue.trim().length < 3) {
      Alert.alert('Say what happened', 'A one-line description of the incident is the minimum.');
      return;
    }
    setSaving(true);
    try {
      const created = await examcellApi.reportCheatingCase({
        studentProfileId,
        examSlotId: slotId,
        issue: issue.trim(),
        description: description.trim() || undefined,
        riskLevel,
        classification: classification || undefined,
        source,
      });
      // Evidence is attached after the case exists, because it needs the case's id.
      if (fileId.trim()) {
        try {
          await examcellApi.addCheatingEvidence(created.id, {
            fileId: fileId.trim(),
            kind: 'OTHER',
          });
        } catch {
          // The case is filed; the evidence did not attach. Say so rather than pretending the
          // report is complete.
          Alert.alert(
            'Case filed, evidence not attached',
            'The case was raised, but the evidence could not be attached. Add it from the case file.',
          );
        }
      }
      Alert.alert('Case raised', 'It is now on the queue, and the timeline has started.', [
        {
          text: 'Open the file',
          onPress: () => navigation?.navigate?.('CheatingCasesDetail', { caseId: created.id }),
        },
        { text: 'Done', onPress: () => navigation?.goBack?.() },
      ]);
    } catch (e) {
      Alert.alert('Could not raise the case', e.message || 'Try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CheatingScreen
      title="Report malpractice"
      blurb="Raise a case against a student in an exam you have the details of."
      onBack={() => navigation?.goBack?.()}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={slotsLoading} onRefresh={loadSlots} tintColor={THEME} />
        }
      >
        {/* ── The exam ── */}
        <View style={styles.card}>
          <SectionHeading title="Which exam?" />
          {slotsLoading ? (
            <LoadingState label="Loading the exams" />
          ) : slotsError ? (
            <ErrorState message={slotsError} onRetry={loadSlots} />
          ) : slots.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No exams to report against"
              message="A case is raised against an exam slot, and no exam has been scheduled yet."
            />
          ) : (
            slots.map((s) => {
              const on = s.id === slotId;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.slotRow, on && styles.slotRowOn]}
                  onPress={() => chooseSlot(on ? null : s.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={on ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={on ? THEME : MUTED}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.slotName}>{s.examName}</Text>
                    <Text style={styles.slotMeta}>
                      {s.course?.code ?? '—'} · {s.startTime}–{s.endTime}
                      {s.room ? ` · ${s.room}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {slotId ? (
          <>
            {/* ── Where and who ── */}
            <View style={styles.card}>
              <SectionHeading title="Where and who" />
              {contextLoading ? (
                <LoadingState label="Loading the room" />
              ) : context ? (
                <>
                  <View style={styles.whereRow}>
                    <Ionicons name="business-outline" size={13} color={MUTED} />
                    <Text style={styles.whereText}>
                      Room {context.room ?? 'not recorded'}
                    </Text>
                  </View>
                  <View style={styles.whereRow}>
                    <Ionicons name="eye-outline" size={13} color={MUTED} />
                    <Text style={styles.whereText}>
                      Invigilator {context.invigilator?.name ?? 'nobody was on duty'}
                    </Text>
                  </View>
                  {!context.invigilator ? (
                    <NoteStrip tone="warn">
                      No invigilator was recorded for this slot. The case will still be raised, and
                      the absence will be on the file.
                    </NoteStrip>
                  ) : null}

                  <Text style={styles.subLabel}>Which student?</Text>
                  {context.students.length === 0 ? (
                    <Text style={styles.muted}>
                      No hall tickets were issued for this slot, so there is no roster to pick from.
                      The case can still be raised, but the student must be named by hand.
                    </Text>
                  ) : (
                    context.students.map((s) => {
                      const on = s.studentProfileId === studentProfileId;
                      return (
                        <TouchableOpacity
                          key={s.studentProfileId}
                          style={[styles.studentRow, on && styles.studentRowOn]}
                          onPress={() => setStudentProfileId(on ? null : s.studentProfileId)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={on ? 'radio-button-on' : 'radio-button-off'}
                            size={15}
                            color={on ? THEME : MUTED}
                          />
                          <View style={styles.flex}>
                            <Text style={styles.studentName}>{s.name}</Text>
                            <Text style={styles.studentMeta}>
                              {s.rollNo ?? '—'}
                              {s.seatNo ? ` · seat ${s.seatNo}` : ''}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              ) : null}
            </View>

            {/* ── What happened ── */}
            <View style={styles.card}>
              <SectionHeading title="What happened" />
              <TextInput
                style={styles.input}
                value={issue}
                onChangeText={setIssue}
                placeholder="One line: what was seen"
                placeholderTextColor={MUTED}
                maxLength={200}
              />
              <TextInput
                style={[styles.input, styles.inputTall]}
                value={description}
                onChangeText={setDescription}
                placeholder="The incident, in as much detail as is useful"
                placeholderTextColor={MUTED}
                multiline
                maxLength={2000}
              />
            </View>

            {/* ── How risky ── */}
            <View style={styles.card}>
              <SectionHeading title="How risky does it look?" />
              <Text style={styles.hint}>
                This is a triage signal, not a verdict. It is what a case that looks serious is
                prioritised on — and it is not the same as what the misconduct turned out to be.
              </Text>
              {RISKS.map((r) => {
                const on = r.value === riskLevel;
                return (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.riskRow, on && styles.riskRowOn]}
                    onPress={() => setRiskLevel(r.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={on ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={on ? THEME : MUTED}
                    />
                    <View style={styles.flex}>
                      <Text style={styles.riskLabel}>{r.label}</Text>
                      <Text style={styles.riskBlurb}>{r.blurb}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── What it is ── */}
            <View style={styles.card}>
              <SectionHeading title="What is it, if you know?" />
              <Text style={styles.hint}>
                Optional. This is what the misconduct actually is, and it is what a penalty attaches
                to. Leave it blank if it is not known yet — the desk can classify it.
              </Text>
              <View style={styles.classGrid}>
                {CLASSIFICATIONS.map((id) => {
                  const on = id === classification;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.classChip, on && styles.classChipOn]}
                      onPress={() => setClassification(on ? null : id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.classChipText, on && styles.classChipTextOn]}>
                        {classificationMeta(id).label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Who noticed ── */}
            <View style={styles.card}>
              <SectionHeading title="Who noticed?" />
              <Text style={styles.hint}>
                A source says who saw something, not what happened. A case raised by pattern detection
                is reviewed exactly like one an invigilator raised.
              </Text>
              {SOURCES.map((s) => {
                const on = s.value === source;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.sourceRow, on && styles.sourceRowOn]}
                    onPress={() => setSource(s.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={s.icon} size={15} color={on ? THEME : MUTED} />
                    <Text style={[styles.sourceLabel, on && styles.sourceLabelOn]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Evidence ── */}
            <View style={styles.card}>
              <SectionHeading title="Evidence" />
              <Text style={styles.hint}>
                The id of a file already uploaded to this institution. Evidence is a document that
                exists; it is not a description of one.
              </Text>
              <TextInput
                style={styles.input}
                value={fileId}
                onChangeText={setFileId}
                placeholder="File id (optional)"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, saving && { opacity: 0.5 }]}
              onPress={submit}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Ionicons name="flag" size={15} color="#fff" />
              <Text style={styles.submitText}>{saving ? 'Raising…' : 'Raise the case'}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </CheatingScreen>
  );
}
