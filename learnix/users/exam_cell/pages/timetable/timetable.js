// X-02 Timetable — the exam controller's hub (docs/users/05 §3.9).
//
// The screen this replaces was a two-tabbed list with a hard-coded fixture of 38
// exams and a literal "2 conflicts" printed in the header. The fixture was the
// only thing the header could ever say: it was a string in a constants file, so
// it was true on a Tuesday and false on a Wednesday and true again on a Tuesday
// in a month when nothing was happening.
//
// It is now eight blocks, each answering one question:
//
//   1. Examination calendar  — the season as a date grid, not a list
//   2. Exam schedules         — create and edit the examinations themselves
//   3. Course & subject allocation — which courses are in, and which are missing
//   4. Date & time slots      — every slot, its duration, what sits against it
//   5. Centres & rooms        — seated against real venue capacity
//   6. Invigilator duty       — who supervises what, and the load on each person
//   7. Student timetable      — one student's season, unallocated shown as such
//   8. Clashes & publishing   — every clash, and whether this may go out
//
// EVERYTHING COMES FROM ONE CALL. The block list is NOT hard-coded here: it
// arrives from `/timetable/catalogue` with each block's id, label, icon, colour
// and route, so a block added on the server draws itself. `timetableMeta.js`
// still mirrors the ids because the eight sub-screens are separate modules that
// must exist at build time, and `audit-timetable-ui.ts` asserts the two agree.
//
// THE HERO STATES WHETHER THE SEASON MAY BE PUBLISHED, and names the reason if
// it may not. That is the one question this desk exists to answer, and the old
// header answered it with a constant. When it cannot go out, the hub says how
// many HIGH clashes are unresolved rather than going grey for no stated reason.
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../services/api';
import {
  THEME, RED, GREEN, AMBER, SLATE, MUTED, BLOCKS,
  dayLabel, plural, seatPhrase, publishPhrase,
} from './timetableMeta';
import {
  BlockCard, Card, ClashBadge, FigureRow, NoteStrip, Section,
  TimetableEmpty, TimetableScreen, goToRoute, useTimetable,
} from './timetableUi';

export default function TimetableModule({ navigation }) {
  const catalogue = useTimetable(() => examcellApi.timetableCatalogue());
  const overview = useTimetable(() => examcellApi.timetableOverview());

  const reload = useCallback(() => {
    catalogue.reload();
    overview.reload();
  }, [catalogue, overview]);

  // The block list comes from the server. The mirror in timetableMeta.js is the
  // FALLBACK for the frame before the catalogue lands, and nothing more — a
  // fallback that also acted as the source would be a second list to keep true.
  const blocks = catalogue.data?.blocks?.length ? catalogue.data.blocks : BLOCKS;
  const s = overview.data?.summary;

  // Every block card carries the live number that block exists to report, so
  // the controller can see WHICH of the eight is wrong without opening any of
  // them. A badge of 0 is not drawn — an eight-row list of zeroes is noise.
  const badgeFor = (id) => {
    if (!s) return undefined;
    switch (id) {
      case 'CONFLICTS': return s.highConflictCount || s.conflictCount;
      case 'EXAMS': return s.exams;
      case 'ALLOCATION': return s.unallocatedCourses;
      case 'SLOTS': return s.slots;
      case 'DUTY': return s.unstaffedSlots;
      // ROOMS and STUDENTS carry no single "this many are wrong" figure: the
      // room block's problem is capacity, which is a MEDIUM clash the ROOMS
      // screen already shows against each venue, and the students block's is
      // unallocated courses, which the ALLOCATION badge already carries.
      case 'ROOMS': return undefined;
      case 'STUDENTS': return undefined;
      case 'CALENDAR': return s.examDays;
      default: return undefined;
    }
  };

  const clashColor = s ? (s.highConflictCount > 0 ? RED : s.conflictCount > 0 ? AMBER : GREEN) : MUTED;
  const ready = s ? s.publishable : false;
  const readyColor = ready ? GREEN : s && s.highConflictCount > 0 ? RED : AMBER;

  return (
    <TimetableScreen
      loading={overview.loading && catalogue.loading}
      refreshing={overview.refreshing || catalogue.refreshing}
      error={overview.error ?? catalogue.error}
      onRetry={reload}
      onRefresh={reload}
    >
      {/* ── The one question this desk exists to answer ── */}
      <View style={[styles.hero, { backgroundColor: readyColor }]}>
        <View style={styles.heroTop}>
          <Ionicons
            name={ready ? 'checkmark-circle' : 'alert-circle'}
            size={22}
            color="rgba(255,255,255,0.95)"
          />
          <Text style={styles.heroStamp}>
            {ready ? 'Publishable' : 'Not publishable'}
          </Text>
        </View>
        <Text style={styles.heroValue}>
          {ready
            ? 'Every HIGH clash resolved'
            : s
              ? `${plural(s.highConflictCount ?? 0, 'HIGH clash', 'HIGH clashes')} unresolved`
              : 'Reading the timetable…'}
        </Text>
        <View style={styles.heroRule} />
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Exams</Text>
            <Text style={styles.heroCellValue}>{s?.exams ?? '—'}</Text>
            <Text style={styles.heroCellNote}>{s?.published ?? 0} published</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Papers</Text>
            <Text style={styles.heroCellValue}>{s?.slots ?? '—'}</Text>
            <Text style={styles.heroCellNote}>{s?.examDays ?? 0} exam days</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Clashes</Text>
            <Text style={styles.heroCellValue}>{s?.conflictCount ?? '—'}</Text>
            <Text style={styles.heroCellNote}>{s?.highConflictCount ?? 0} high</Text>
          </View>
        </View>
        {s?.firstExamDay ? (
          <Text style={styles.heroFootnote}>
            Runs {dayLabel(s.firstExamDay)} to {dayLabel(s.lastExamDay)}
          </Text>
        ) : (
          <Text style={styles.heroFootnote}>
            No paper is dated yet — create an exam and add slots to begin.
          </Text>
        )}
      </View>

      {/* ── The eight blocks ── */}
      <Section
        title="The desk"
        note={s ? `${plural(s.enrolled ?? 0, 'enrollment')} across ${plural(s.slots ?? 0, 'slot')}` : undefined}
      >
        {blocks.map((b) => (
          <BlockCard
            key={b.id}
            block={b}
            badge={badgeFor(b.id)}
            badgeTone={b.id === 'CONFLICTS' ? clashColor : undefined}
            onPress={() => goToRoute(navigation, b.route, b.isTab)}
          >
            {b.id === 'CONFLICTS' && s ? (
              <View style={styles.blockFoot}>
                <ClashBadge
                  count={s.conflictCount}
                  severity={s.highConflictCount > 0 ? 'HIGH' : 'MEDIUM'}
                  blocking={s.highConflictCount > 0}
                />
                <Text style={styles.blockFootText} numberOfLines={1}>
                  {publishPhrase(s.publishable, s.highConflictCount ? 'Resolve the HIGH clashes first' : null, s.slots)}
                </Text>
              </View>
            ) : null}
          </BlockCard>
        ))}
      </Section>

      {/* ── What is actually outstanding on the desk ──
          These four are the things a controller is asked about by other
          departments, so they sit where they can be read without opening
          anything. */}
      <Section title="Outstanding work" note="Tap a block above to fix">
        <Card>
          <FigureRow
            label="Courses with no slot"
            value={s?.unallocatedCourses ?? 0}
            tone={s?.unallocatedCourses ? AMBER : GREEN}
            sublabel="Enrolled and eligible, but nobody has said when they sit"
          />
          <FigureRow
            label="Papers with no invigilator"
            value={s?.unstaffedSlots ?? 0}
            tone={s?.unstaffedSlots ? RED : GREEN}
            sublabel="Seated but unsupervised"
          />
          <FigureRow
            label="Seats available"
            value={s?.seated ?? 0}
            tone={s?.seated ? THEME : MUTED}
            sublabel={s ? seatPhrase(s.enrolled, s.seated) : undefined}
          />
          <FigureRow
            label="Unresolved clashes"
            value={s?.conflictCount ?? 0}
            tone={clashColor}
            sublabel={`${s?.highConflictCount ?? 0} HIGH, ${(s?.conflictCount ?? 0) - (s?.highConflictCount ?? 0)} lower severity`}
          />
        </Card>
      </Section>

      {s && s.highConflictCount > 0 ? (
        <NoteStrip
          tone="bad"
          text={`${plural(s.highConflictCount, 'HIGH clash', 'HIGH clashes')} must be resolved before any exam can be published. Room, capacity and unallocated clashes are recorded instead, and do not block.`}
        />
      ) : null}

      {!s || (s.exams === 0 && s.slots === 0) ? (
        <TimetableEmpty
          icon="calendar-outline"
          title="No timetable yet"
          subtitle="Create an examination first, then add its slots. Nothing here is scheduled, and no clash count below means anything until it is."
        />
      ) : null}
    </TimetableScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 16, padding: 16, marginTop: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroStamp: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '800', letterSpacing: 1 },
  heroValue: { fontSize: 20, color: '#fff', fontWeight: '800', marginTop: 8, letterSpacing: -0.5 },
  heroRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroCell: { flex: 1 },
  heroDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.22)', marginHorizontal: 8 },
  heroCellLabel: { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 0.5 },
  heroCellValue: { fontSize: 18, color: '#fff', fontWeight: '800', marginTop: 1 },
  heroCellNote: { fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  heroFootnote: { fontSize: 10, color: 'rgba(255,255,255,0.9)', marginTop: 12, lineHeight: 15 },

  blockFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  blockFootText: { flex: 1, fontSize: 10, color: SLATE, lineHeight: 14 },

  statCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 15, marginTop: 12 },
});