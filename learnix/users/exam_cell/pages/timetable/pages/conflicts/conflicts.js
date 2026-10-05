// X-02 Timetable — Clashes & publishing (docs/users/05 §3.9, block 8).
//
// Requirements 9 and 10 of this feature land here: clash/conflict detection and
// timetable publishing. They are one screen because they are one decision.
//
// The publish gate is the agreed policy, and it is worth stating precisely
// because it is the design and not a convenience:
//
//   AN EXAM CAN BE PUBLISHED ONLY ONCE EVERY HIGH-SEVERITY CLASH IS RESOLVED.
//
// HIGH means one of three things, and all three are real:
//   · a student booked into two papers at once — a person loses an afternoon
//   · an invigilator booked twice — a room has nobody in it
//   · a paper seated but unsupervised — the same, seen from the paper's side
//
// MEDIUM and LOW do NOT block. A room overlap is very often the correct NEXT
// STEP of splitting a large paper across two venues; a capacity shortfall is
// exactly what tells the controller to book another room. Refusing a publish
// because of those would make the fix unreachable.
//
// The gate is RE-EVALUATED ON THE SERVER EVERY TIME, not cached here, and that
// was a real bug once: `publishExam` used to return early with "already
// published", so the realistic sequence — timetable goes out, then somebody is
// pulled off duty — answered "yes it already did". A true statement about the
// past, useless about the present. So `alreadyPublished` is reported ALONGSIDE
// the real answer now, and a publish button here reflects the CURRENT gate.
//
// Every conflict is listed by kind with the server's own message, because
// "student double-booked" without naming WHICH two papers is not something a
// controller can act on.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../../../services/api';
import {
  THEME, RED, GREEN, AMBER, SLATE, MUTED,
  EXAM_STATUS_LABEL, EXAM_STATUS_COLOR, PUBLISH_POLICY,
  conflictTone, plural, publishPhrase,
} from '../../timetableMeta';
import {
  ActionRow, Card, ClashBadge, ConflictRow, NoteStrip, Pill, Section, StatGrid, StatCell,
  TimetableEmpty, TimetableScreen, goToRoute, useTimetable,
} from '../../timetableUi';

export default function TimetableConflicts({ navigation }) {
  const examId = navigation?.getParam?.('examId') ?? navigation?.params?.examId ?? null;
  const { data, loading, refreshing, error, reload, onRefresh } = useTimetable(
    () => examcellApi.timetableBlock('CONFLICTS', examId),
    [examId],
  );

  const [busy, setBusy] = useState(null);

  const kinds = data?.kinds ?? [];
  const exams = data?.exams ?? [];
  const total = data?.total ?? 0;
  const high = data?.high ?? 0;
  const tone = conflictTone(total);
  const clearKinds = kinds.filter((k) => k.count === 0);

  // ── Write: publish. The button is disabled with the reason shown, so a tap
  //    here means the server agrees the gate is open — and if it disagrees
  //    anyway, the refusal is shown rather than swallowed.
  const publish = (exam) => {
    Alert.alert(
      'Publish this timetable?',
      `"${exam.name}" goes out to students and faculty. Later changes to a slot have to be announced separately.`,
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
            } finally { setBusy(null); }
          },
        },
      ],
    );
  };

  return (
    <TimetableScreen
      title="Clashes & publishing"
      subtitle="Every detected clash, and whether this season may be published."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      {/* ── The gate, as the screen's verdict ── */}
      <View
        style={[
          styles.verdict,
          { backgroundColor: data?.publishable ? GREEN : tone === 'bad' ? RED : AMBER },
        ]}
      >
        <View style={styles.verdictTop}>
          <Ionicons
            name={data?.publishable ? 'checkmark-circle' : 'lock-closed'}
            size={20}
            color="rgba(255,255,255,0.95)"
          />
          <Text style={styles.verdictStamp}>
            {data?.publishable ? 'Publishable' : 'Blocked'}
          </Text>
        </View>
        <Text style={styles.verdictValue}>
          {data?.publishable
            ? 'No HIGH clash is open'
            : high > 0
              ? `${plural(high, 'HIGH clash', 'HIGH clashes')} must be resolved`
              : data?.blockReason || 'Nothing can be published yet'}
        </Text>
        <View style={styles.verdictRule} />
        <View style={styles.verdictRow}>
          <View style={styles.verdictCell}>
            <Text style={styles.verdictCellLabel}>Total</Text>
            <Text style={styles.verdictCellValue}>{total}</Text>
          </View>
          <View style={styles.verdictCell}>
            <Text style={styles.verdictCellLabel}>HIGH</Text>
            <Text style={styles.verdictCellValue}>{high}</Text>
          </View>
          <View style={styles.verdictCell}>
            <Text style={styles.verdictCellLabel}>Lower</Text>
            <Text style={styles.verdictCellValue}>{total - high}</Text>
          </View>
          <View style={styles.verdictCell}>
            <Text style={styles.verdictCellLabel}>Blocking</Text>
            <Text style={styles.verdictCellValue}>{data?.blocking ?? 0}</Text>
          </View>
        </View>
      </View>

      <NoteStrip
        tone={data?.publishable ? 'ok' : 'bad'}
        text={data?.policy ?? PUBLISH_POLICY}
      />

      <Card>
        <StatGrid>
          <StatCell
            label="Kinds firing"
            value={kinds.filter((k) => k.count > 0).length}
            tone={total ? AMBER : GREEN}
            hint={`of ${kinds.length} checked`}
          />
          <StatCell
            label="Recorded, not refused"
            value={total - (data?.blocking ?? 0)}
            tone={SLATE}
            hint="visible and fixable"
          />
          <StatCell
            label="Refused at write"
            value={data?.blocking ?? 0}
            tone={(data?.blocking ?? 0) ? RED : MUTED}
            hint="never stored"
          />
          <StatCell
            label="Exams ready"
            value={exams.filter((e) => e.publishable).length}
            tone={exams.some((e) => e.publishable) ? GREEN : MUTED}
            hint={`of ${exams.length}`}
          />
        </StatGrid>
      </Card>

      {/* ── The eight kinds ── */}
      <Section
        title="Every kind checked"
        note={total === 0 ? 'all clear' : `${plural(total, 'clash', 'clashes')} found`}
      >
        {total === 0 && clearKinds.length === kinds.length ? (
          <TimetableEmpty
            icon="checkmark-circle-outline"
            title="Nothing wrong"
            subtitle="All eight checks pass across every slot in this season. A clear tick per kind is shown rather than the list being hidden."
          />
        ) : null}

        {kinds.map((k) => (
          <ConflictRow
            key={k.kind}
            kind={k.kind}
            count={k.count}
            items={k.items}
          />
        ))}
      </Section>

      {/* ── Publish ── */}
      <Section title="Publishing" note={plural(exams.length, 'exam')}>
        {exams.length === 0 ? (
          <TimetableEmpty
            icon="megaphone-outline"
            title="Nothing to publish"
            subtitle="An examination has to exist, with at least one slot, before a timetable can go out."
          />
        ) : null}

        {exams.map((e) => (
          <Card key={e.examId}>
            <View style={styles.examHead}>
              <View style={styles.examHeadBody}>
                <Text style={styles.examName}>{e.name}</Text>
                <Text style={styles.examMeta}>
                  {plural(e.slotCount, 'slot')} · {plural(e.conflictCount, 'clash', 'clashes')}
                  {e.highConflictCount ? ` · ${e.highConflictCount} HIGH` : ''}
                </Text>
              </View>
              <View style={styles.examHeadRight}>
                <Pill
                  text={EXAM_STATUS_LABEL[e.status] ?? e.status}
                  color={EXAM_STATUS_COLOR[e.status] ?? SLATE}
                />
                {/* The badge carries the HIGH count, because that is the number
                    the publish gate reads. The total clash count is beside it,
                    and the two are deliberately not the same figure: a MEDIUM
                    clash is allowed to sit there unpublished-blocking. */}
                <ClashBadge
                  count={e.highConflictCount}
                  severity="HIGH"
                  blocking={e.highConflictCount > 0}
                />
              </View>
            </View>

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

            {/* The two numbers that are not the same: HIGH clashes BLOCK the
                publish, and BLOCKING clashes are refused at write time so they
                cannot exist on a stored slot. A clash counted in the first and
                not the second is the MEDIUM kind that is deliberately allowed. */}
            <View style={styles.kvRow}>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Blocks publish</Text>
                <Text style={[styles.kvValue, { color: e.highConflictCount ? RED : GREEN }]}>
                  {e.highConflictCount}
                </Text>
              </View>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Blocked on write</Text>
                <Text style={[styles.kvValue, { color: GREEN }]}>0</Text>
              </View>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Recorded</Text>
                <Text style={[styles.kvValue, { color: e.conflictCount ? AMBER : GREEN }]}>
                  {e.conflictCount}
                </Text>
              </View>
            </View>

            <ActionRow
              actions={[
                {
                  label: e.status === 'PUBLISHED' ? 'Re-check' : 'Publish',
                  icon: 'megaphone-outline',
                  color: GREEN,
                  disabled: !e.publishable,
                  onPress: () => publish(e),
                },
                {
                  label: 'Fix on slots',
                  icon: 'time-outline',
                  color: THEME,
                  onPress: () => goToRoute(navigation, 'TimetableSlots', false, { examId: e.examId }),
                },
              ]}
            />
            {e.blockReason && !e.publishable ? (
              <Text style={styles.blockReason}>{e.blockReason}</Text>
            ) : null}
          </Card>
        ))}
      </Section>

      <NoteStrip
        tone="info"
        icon="shield-checkmark-outline"
        text="A student double-booking or an invigilator booked twice is refused the moment it is written, so it cannot appear on a stored slot. Everything listed here was recorded deliberately, and every one can be fixed."
      />
    </TimetableScreen>
  );
}

const styles = StyleSheet.create({
  verdict: { borderRadius: 16, padding: 16, marginTop: 12 },
  verdictTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  verdictStamp: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '800', letterSpacing: 1 },
  verdictValue: { fontSize: 18, color: '#fff', fontWeight: '800', marginTop: 8, letterSpacing: -0.4, lineHeight: 24 },
  verdictRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 12 },
  verdictRow: { flexDirection: 'row' },
  verdictCell: { flex: 1 },
  verdictCellLabel: { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 0.4 },
  verdictCellValue: { fontSize: 18, color: '#fff', fontWeight: '800', marginTop: 1 },

  examHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  examHeadRight: { alignItems: 'flex-end', gap: 5 },
  examHeadBody: { flex: 1 },
  examName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  examMeta: { fontSize: 11, color: SLATE, marginTop: 2 },
  gateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11,
    paddingTop: 11, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  gateText: { flex: 1, fontSize: 11, fontWeight: '700' },
  kvRow: { flexDirection: 'row', marginTop: 11, gap: 10 },
  kv: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 10,
    padding: 9, borderWidth: 1, borderColor: '#f1f5f9',
  },
  kvLabel: { fontSize: 9, color: MUTED, fontWeight: '700' },
  kvValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  blockReason: { fontSize: 10, color: MUTED, marginTop: 6, fontStyle: 'italic' },
});