/**
 * X-08 — Cheating cases: the case file.
 * (docs/users/05 §3.6)
 *
 * ONE CASE, AND EVERYTHING THE DESK KNOWS ABOUT IT.
 *
 * The file is the audit trail, laid out in the order the case happened: what was reported, who it
 * happened to, where and who was watching, what was classified, what the student said, what the
 * committee found, what was decided, and when.
 *
 * WHY THE ACTIONS ARE HERE AND NOT ON THE QUEUE
 * ---------------------------------------------
 * A decision taken from a list is a decision taken without the file. Confirming a case means reading
 * the evidence and the student's statement, and the file is the only place both are. So the queue row
 * opens the file, and the file is where the decision is made.
 *
 * THE LEGAL MOVES COME FROM THE SERVER
 * -----------------------------------
 * `item.legalTransitions` is the case's own state machine, published by the server. The buttons are
 * drawn from it, so a screen can never offer a move the server would refuse — and a case that has
 * been CONFIRMED offers exactly one thing: reopen it, with a reason.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../services/api';
import {
  AMBER,
  GREEN,
  MUTED,
  RED,
  SLATE,
  THEME,
  VIOLET,
  classificationMeta,
  eventMeta,
  evidenceMeta,
  fmtDate,
  fmtDateTime,
  initials,
  penaltyMeta,
  plural,
  riskMeta,
  sourceMeta,
  statusMeta,
  timeAgo,
} from '../../cheating_casesMeta';
import { CheatingSheet } from './cheatingSheets';
import { styles } from './cheatingStyles';
import {
  CheatingScreen,
  DetailRow,
  EmptyState,
  ErrorState,
  LoadingState,
  NoteStrip,
  SectionHeading,
  useCheating,
} from '../../cheating_casesUi';

export default function CheatingCasesDetail({ navigation, route }) {
  const caseId = route?.params?.caseId;
  const detail = useCheating(() => examcellApi.cheatingCase(caseId), [caseId]);

  const [sheet, setSheet] = useState(null); // 'classify' | 'statement' | 'committee' | 'decide' | 'reopen' | 'note' | 'evidence'
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const item = detail.data;

  const reload = useCallback(() => detail.reload(), [detail]);

  const openSheet = (kind, seed) => {
    setForm(seed ?? {});
    setSheet(kind);
  };

  // The sheet builds the request and hands it over as a thunk; this runs it, then closes and reloads.
  // Keeping the "what to send" in the sheet and the "what to do after" here means neither file has to
  // know about the other's seven actions.
  const submit = async (request) => {
    setSaving(true);
    try {
      await request();
      setSheet(null);
      setForm({});
      reload();
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Try again');
    } finally {
      setSaving(false);
    }
  };

  if (!caseId) {
    return (
      <CheatingScreen title="Case file" onBack={() => navigation?.goBack?.()}>
        <EmptyState
          icon="help-circle-outline"
          title="No case selected"
          message="Open a case from the queue and its file will be here."
        />
      </CheatingScreen>
    );
  }

  if (detail.loading && !item) {
    return (
      <CheatingScreen title="Case file" onBack={() => navigation?.goBack?.()}>
        <LoadingState label="Opening the case file" />
      </CheatingScreen>
    );
  }

  if (detail.error) {
    return (
      <CheatingScreen title="Case file" onBack={() => navigation?.goBack?.()}>
        <ErrorState message={detail.error} onRetry={reload} />
      </CheatingScreen>
    );
  }

  const risk = riskMeta(item.riskLevel);
  const status = statusMeta(item.status);
  const cls = classificationMeta(item.classification);
  const canWork = !item.isTerminal;
  const moves = item.legalTransitions ?? [];

  return (
    <CheatingScreen
      title={item.student?.name ?? 'Case file'}
      blurb={`${item.student?.rollNo ?? ''} · ${item.exam?.name ?? ''}`}
      onBack={() => navigation?.goBack?.()}
      right={
        <View style={[styles.statusPill, { backgroundColor: status.color }]}>
          <Ionicons name={status.icon} size={11} color="#fff" />
          <Text style={styles.statusPillText}>{status.label}</Text>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={detail.refreshing} onRefresh={reload} tintColor={THEME} />
        }
      >
        <View style={styles.hero}>
          <View style={[styles.heroAvatar, { backgroundColor: risk.bg }]}>
            <Text style={[styles.heroInitial, { color: risk.color }]}>
              {initials(item.student?.name)}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroName}>{item.student?.name ?? 'Unknown student'}</Text>
            <Text style={styles.heroMeta}>
              {item.student?.rollNo ?? '—'} · {item.student?.section ?? '—'}
            </Text>
            <View style={styles.heroBadges}>
              <View style={[styles.heroBadge, { backgroundColor: risk.bg }]}>
                <Text style={[styles.heroBadgeText, { color: risk.color }]}>{risk.label}</Text>
              </View>
              {item.classification ? (
                <View style={[styles.heroBadge, { backgroundColor: VIOLET + '14' }]}>
                  <Text style={[styles.heroBadgeText, { color: VIOLET }]}>{cls.label}</Text>
                </View>
              ) : null}
              {item.overdue ? (
                <View style={[styles.heroBadge, { backgroundColor: RED }]}>
                  <Text style={[styles.heroBadgeText, { color: '#fff' }]}>
                    Overdue by {item.overdueByHours}h
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── The incident ── */}
        <View style={styles.card}>
          <SectionHeading title="What was reported" />
          <Text style={styles.issueText}>{item.issue}</Text>
          {item.description ? (
            <Text style={styles.descriptionText}>{item.description}</Text>
          ) : (
            <Text style={styles.muted}>The reporter did not write a description.</Text>
          )}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name={sourceMeta(item.source).icon} size={12} color={MUTED} />
              <Text style={styles.metaText}>{sourceMeta(item.source).label}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={MUTED} />
              <Text style={styles.metaText}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* ── Where and who ── */}
        <View style={styles.card}>
          <SectionHeading title="Exam, room and invigilator" />
          <DetailRow label="Exam" value={item.exam?.name} />
          <DetailRow label="Course" value={item.course ? `${item.course.name} (${item.course.code})` : null} />
          <DetailRow
            label="Slot"
            value={
              item.slot
                ? `${fmtDate(item.slot.date)} · ${item.slot.startTime}–${item.slot.endTime}`
                : null
            }
          />
          <DetailRow label="Room" value={item.slot?.room ?? item.roomId} />
          <DetailRow label="Invigilator" value={item.invigilatorName ?? item.invigilatorUserId} />
          {!item.invigilatorUserId ? (
            <NoteStrip tone="warn">
              No invigilator was recorded for this slot. The room roster had nobody on duty when the case
              was raised, which is itself worth knowing.
            </NoteStrip>
          ) : null}
        </View>

        {/* ── Evidence ── */}
        <View style={styles.card}>
          <SectionHeading
            title="Evidence"
            right={
              canWork ? (
                <TouchableOpacity onPress={() => openSheet('evidence')} hitSlop={8}>
                  <Text style={styles.linkAction}>Attach</Text>
                </TouchableOpacity>
              ) : null
            }
          />
          {item.evidenceFiles?.length ? (
            item.evidenceFiles.map((e) => (
              <View key={e.id} style={styles.evidenceRow}>
                <View style={styles.evidenceIcon}>
                  <Ionicons
                    name={evidenceMeta(e.kind).icon}
                    size={14}
                    color={THEME}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.evidenceName}>
                    {e.file?.originalName ?? 'Untitled file'}
                  </Text>
                  <Text style={styles.evidenceMeta}>
                    {evidenceMeta(e.kind).label}
                    {e.note ? ` · ${e.note}` : ''}
                  </Text>
                </View>
                {e.file?.url ? (
                  <Ionicons name="open-outline" size={14} color={MUTED} />
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.muted}>
              No evidence attached yet. A case without evidence is a rumour.
            </Text>
          )}
        </View>

        {/* ── The student's statement ── */}
        <View style={styles.card}>
          <SectionHeading
            title="The student's statement"
            right={
              canWork ? (
                <TouchableOpacity onPress={() => openSheet('statement')} hitSlop={8}>
                  <Text style={styles.linkAction}>
                    {item.studentStatement ? 'Replace' : 'Record'}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
          {item.studentStatement ? (
            <>
              <Text style={styles.statementText}>{item.studentStatement}</Text>
              <Text style={styles.statementMeta}>
                Taken {fmtDateTime(item.statementAt)}
              </Text>
            </>
          ) : (
            <Text style={styles.muted}>
              The student has not been asked. A committee that cannot see both accounts cannot judge.
            </Text>
          )}
        </View>

        {/* ── The committee ── */}
        <View style={styles.card}>
          <SectionHeading
            title="Committee review"
            right={
              canWork ? (
                <TouchableOpacity onPress={() => openSheet('committee')} hitSlop={8}>
                  <Text style={styles.linkAction}>
                    {item.reviewNote ? 'Update' : 'Refer'}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
          {item.reviewNote ? (
            <>
              <Text style={styles.statementText}>{item.reviewNote}</Text>
              <Text style={styles.statementMeta}>
                {item.committeeUserIds?.length
                  ? `${plural(item.committeeUserIds.length, 'member')} · reviewed ${fmtDateTime(item.reviewedAt)}`
                  : `Reviewed ${fmtDateTime(item.reviewedAt)}`}
              </Text>
            </>
          ) : (
            <Text style={styles.muted}>
              Not referred. A second opinion is available for anything that is not obvious.
            </Text>
          )}
        </View>

        {/* ── The decision ── */}
        <View style={styles.card}>
          <SectionHeading title="Decision" />
          {item.decisionNote ? (
            <>
              <DetailRow
                label="Outcome"
                value={status.label}
                tone={status.color}
              />
              {item.penalty ? (
                <DetailRow
                  label="Penalty"
                  value={penaltyMeta(item.penalty).label}
                  tone={penaltyMeta(item.penalty).severity === 'HIGH' ? RED : AMBER}
                />
              ) : null}
              {item.penaltyDetail ? (
                <DetailRow label="Detail" value={item.penaltyDetail} />
              ) : null}
              <Text style={styles.decisionNote}>{item.decisionNote}</Text>
              <Text style={styles.statementMeta}>
                Decided {fmtDateTime(item.decidedAt)}
                {item.notifiedStudentAt
                  ? ` · student told ${fmtDateTime(item.notifiedStudentAt)}`
                  : ' · STUDENT NOT TOLD'}
              </Text>
              {!item.notifiedStudentAt ? (
                <NoteStrip tone="danger">
                  This case was decided and the student was never told. A student who learns of an
                  outcome from somebody else has no chance to answer it.
                </NoteStrip>
              ) : null}
            </>
          ) : (
            <Text style={styles.muted}>Not decided yet.</Text>
          )}
        </View>

        {/* ── The timeline ── */}
        <View style={styles.card}>
          <SectionHeading title="What happened" />
          {item.events?.length ? (
            item.events.map((e, idx) => {
              const meta = eventMeta(e.type);
              const last = idx === item.events.length - 1;
              return (
                <View key={e.id} style={styles.eventRow}>
                  <View style={styles.eventRail}>
                    <View style={[styles.eventDot, { backgroundColor: meta.color }]}>
                      <Ionicons name={meta.icon} size={10} color="#fff" />
                    </View>
                    {!last ? <View style={styles.eventLine} /> : null}
                  </View>
                  <View style={[styles.eventBody, last && { borderBottomWidth: 0 }]}>
                    <Text style={styles.eventLabel}>{meta.label}</Text>
                    {e.note ? <Text style={styles.eventNote}>{e.note}</Text> : null}
                    <Text style={styles.eventTime}>{fmtDateTime(e.createdAt)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.muted}>Nothing recorded yet.</Text>
          )}
        </View>

        {/* ── The moves ── */}
        {canWork ? (
          <View style={styles.actionsCard}>
            <SectionHeading title="What you can do" />
            <View style={styles.actionRow}>
              {moves.includes('UNDER_REVIEW') && !moves.includes('CONFIRMED') ? (
                <ActionButton
                  label="Classify"
                  icon="pricetag-outline"
                  onPress={() =>
                    openSheet('classify', {
                      classification: item.classification ?? 'OTHER',
                      riskLevel: item.riskLevel,
                    })
                  }
                />
              ) : null}
              {moves.includes('COMMITTEE_REVIEW') ? (
                <ActionButton
                  label="Refer to committee"
                  icon="people-outline"
                  color={VIOLET}
                  onPress={() => openSheet('committee')}
                />
              ) : null}
              <ActionButton
                label="Add a note"
                icon="chatbubble-outline"
                color={SLATE}
                onPress={() => openSheet('note')}
              />
              {moves.includes('CONFIRMED') ? (
                <ActionButton
                  label="Confirm"
                  icon="alert-circle-outline"
                  color={RED}
                  onPress={() =>
                    openSheet('decide', {
                      decision: 'CONFIRMED',
                      penalty: 'WARNING',
                      decisionNote: '',
                    })
                  }
                />
              ) : null}
              {moves.includes('DISMISSED') ? (
                <ActionButton
                  label="Dismiss"
                  icon="checkmark-circle-outline"
                  color={GREEN}
                  onPress={() =>
                    openSheet('decide', { decision: 'DISMISSED', decisionNote: '' })
                  }
                />
              ) : null}
              {moves.includes('ESCALATED') ? (
                <ActionButton
                  label="Escalate"
                  icon="trending-up-outline"
                  color="#4f46e5"
                  onPress={() =>
                    openSheet('decide', { decision: 'ESCALATED', decisionNote: '' })
                  }
                />
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.actionsCard}>
            <SectionHeading title="What you can do" />
            {moves.includes('UNDER_REVIEW') ? (
              <ActionButton
                label="Reopen this case"
                icon="refresh-outline"
                color={AMBER}
                onPress={() => openSheet('reopen')}
              />
            ) : null}
            <ActionButton
              label="Add a note"
              icon="chatbubble-outline"
              color={SLATE}
              onPress={() => openSheet('note')}
            />
            <NoteStrip>
              This case has been decided. Reopening it clears the decision and the penalty, and it
              leaves a record that it was reopened and why.
            </NoteStrip>
          </View>
        )}
      </ScrollView>

      <CheatingSheet
        visible={!!sheet}
        kind={sheet}
        form={form}
        setForm={setForm}
        item={item}
        saving={saving}
        onClose={() => setSheet(null)}
        onSubmit={submit}
        catalogue={null}
      />
    </CheatingScreen>
  );
}

function ActionButton({ label, icon, color = THEME, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * The action sheets. One component, because they share a frame, and because a case file with seven
 * near-identical modals is seven chances to get the wording slightly different.
 */