/**
 * X-08 — Cheating cases: the case file's facts.
 * (docs/users/05 §3.6)
 *
 * WHAT WAS REPORTED, WHERE, WHAT WAS FOUND, AND WHAT WAS DECIDED
 * ---------------------------------------------------------
 * These are the parts of the case file that are READ. They are apart from the screen because they
 * are one thing — the record — and they are read on every open of the file, while the things you
 * can DO to a case are not.
 *
 * The order is the order the case happened: the incident, then where and who was watching it, then
 * the evidence, then the student's account, then the committee's finding, and last the decision. A
 * reader who opens a case should be able to follow it without being told what order to read it in.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AMBER, GREEN, MUTED, RED, SLATE, THEME, VIOLET,
  classificationMeta, evidenceMeta, fmtDate, fmtDateTime, initials,
  penaltyMeta, riskMeta, sourceMeta, statusMeta, timeAgo,
} from '../../cheating_casesMeta';
import { DetailRow, NoteStrip, SectionHeading } from '../../cheating_casesUi';

export function CaseFacts({ item, onEdit, canWork }) {
  return (
    <>
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
              {item.status === 'DISMISSED' ? (
                <NoteStrip tone="ok">
                  A DISMISSED case carries no penalty. The student was cleared, and a consequence on
                  a clearance is a contradiction the file would happily store.
                </NoteStrip>
              ) : null}
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
    </>
  );
}
