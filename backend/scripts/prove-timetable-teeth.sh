#!/usr/bin/env bash
# X-02 Timetable — teeth proof.
#
# A test suite that passes proves nothing unless it CAN fail. Each case below
# breaks one specific fix, runs the suite that is supposed to catch it, and
# requires a NON-ZERO exit. The code is restored afterwards and the suite re-run,
# so a case that "broke" the file rather than the fix is caught too.
#
# Usage: bash scripts/prove-timetable-teeth.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

# ── Helpers ────────────────────────────────────────────────────────────────
# Save a file, apply a python edit, run a command, require it to fail, restore.
#
# The checksum comparison is not decoration. Several of these files are NEW and
# therefore untracked, so `git diff` reports nothing for them; without the
# checksum every no-op edit would be reported as "the suite still passed", which
# is indistinguishable from a vacuous assertion.
teeth() {
  local label="$1" file="$2" script="$3" edit="$4"
  local backup; backup="$(mktemp)"
  cp "$file" "$backup"

  local before_sum after_sum
  before_sum="$(md5sum "$file" | cut -d' ' -f1)"

  if ! PYTHONIOENCODING=utf-8 python -c "$edit"; then
    echo "  SETUP-FAIL $label (the edit script errored)"
    FAIL=$((FAIL+1)); cp "$backup" "$file"; rm -f "$backup"; return
  fi

  after_sum="$(md5sum "$file" | cut -d' ' -f1)"
  if [ "$before_sum" = "$after_sum" ]; then
    echo "  SETUP-FAIL $label (the edit did not change the file — the pattern no longer matches)"
    FAIL=$((FAIL+1)); rm -f "$backup"; return
  fi

  local code
  case "$script" in
    *.js) node "$script" > /tmp/timetable-teeth-suite.log 2>&1 ;;
    *)    npx tsx "$script" > /tmp/timetable-teeth-suite.log 2>&1 ;;
  esac
  code=$?

  cp "$backup" "$file"; rm -f "$backup"
  # A case may CREATE something rather than edit an existing file — the stale
  # fixture is restored by writing a whole new directory. Restoring the file it
  # was handed does not remove that, so the tree is left dirty and every LATER
  # case measures an audit that is failing for an unrelated reason. The optional
  # fifth argument lists paths to delete on the way out.
  local extra="${5:-}"
  for p in $extra; do rm -rf "$p"; done

  if [ "$code" -ne 0 ]; then
    echo "  ok  $label -> suite exited $code (it bites)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label -> suite still passed. THE ASSERTION IS VACUOUS."
    FAIL=$((FAIL+1))
  fi
}

# The same, for a check that is not a script in backend/scripts.
teeth_app() {
  local label="$1" file="$2" script="$3" edit="$4"
  local backup; backup="$(mktemp)"
  cp "$file" "$backup"

  local before_sum after_sum
  before_sum="$(md5sum "$file" | cut -d' ' -f1)"
  PYTHONIOENCODING=utf-8 python -c "$edit" || {
    echo "  SETUP-FAIL $label (edit errored)"; FAIL=$((FAIL+1))
    cp "$backup" "$file"; rm -f "$backup"; return; }
  after_sum="$(md5sum "$file" | cut -d' ' -f1)"
  if [ "$before_sum" = "$after_sum" ]; then
    echo "  SETUP-FAIL $label (edit changed nothing)"; FAIL=$((FAIL+1))
    rm -f "$backup"; return
  fi

  node "$script" > /tmp/timetable-teeth-suite.log 2>&1
  local code=$?
  cp "$backup" "$file"; rm -f "$backup"

  if [ "$code" -ne 0 ]; then
    echo "  ok  $label -> exited $code (it bites)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label -> still passed. THE ASSERTION IS VACUOUS."
    FAIL=$((FAIL+1))
  fi
}

TT="../learnix/users/exam_cell/pages/timetable"
SVC="src/modules/examcell/timetable.service.ts"
RULES="src/modules/examcell/timetable.rules.ts"
ROUTES="src/modules/examcell/timetable.routes.ts"
SCHEMAS="src/modules/examcell/examcell.schemas.ts"

echo "X-02 Timetable — teeth proof"
echo "Each case breaks one fix and REQUIRES the matching suite to fail."

# ═══ 1. The tenant escape ═════════════════════════════════════════════════
# `CourseOffering` has NO institutionId — it reaches its tenant through
# `Course.institutionId`. This is the single easiest thing to forget and the
# most expensive: without it, a controller could add a slot to a course offered
# by a different college.
teeth "tenant scope dropped from the offering lookup" \
  "$SVC" scripts/verify-timetable.ts \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='...offeringWhere(institutionId),';assert a in s,'the offering filter moved';s=s.replace(a,'...{},');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 2. The unchecked reschedule ══════════════════════════════════════════
# `rescheduleSlot` did zero conflict checking. The operation a controller uses
# MOST — to fix a problem — was the only one with no guard at all.
teeth "the clash guard removed from rescheduleSlot" \
  "$SVC" scripts/verify-timetable.ts \
  "import io,re;p='$SVC';s=io.open(p,encoding='utf-8').read();i=s.index('export async function rescheduleSlot');j=s.index('export async function',i+10);seg=s[i:j];m=re.search(r'\n  await preflight\([^;]*\);\n',seg,re.S);assert m,'rescheduleSlot has no preflight call to remove';s=s[:i]+seg[:m.start()]+'\n'+seg[m.end():]+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 3. The guard moving back AFTER the write ═════════════════════════════
# Writing first and guarding second means a REFUSED write leaves its row behind:
# the controller is told 422, the screen shows the paper was not added, and it is
# in fact sitting in the timetable creating a clash nobody can now see.
teeth "addSlot writes before it guards" \
  "$SVC" scripts/verify-timetable.ts \
  "import io,re;p='$SVC';s=io.open(p,encoding='utf-8').read();i=s.index('export async function addSlot');j=s.index('export async function',i+10);seg=s[i:j];pf=seg.index('await preflight(');wr=seg.index('prisma.examSlot.create');assert pf<wr,'expected guard before write';pfend=seg.index(');',pf)+3;call=seg[pf:pfend];s=s[:i]+seg.replace(call,'',1)+call+'\n'+seg[wr:wr]+seg[pfend:wr]+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 4. Student clash detection removed ════════════════════════════════════
# The old check compared `offeringId` INSIDE ONE EXAM, so it could never see a
# student in two papers from two different examinations — which is the clash
# that actually hurts a person.
teeth "student double-booking no longer detected" \
  "$SVC" scripts/verify-timetable.ts \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='kind: \'STUDENT_DOUBLE_BOOKED\'';assert a in s,'the student clash moved';s=s.replace(a,'kind: \'STUDENT_DOUBLE_BOOKED_DISABLED\'',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 5. A blocking clash becoming a soft one ═══════════════════════════════
# If STUDENT_DOUBLE_BOOKED stops blocking, a controller is told the write
# succeeded, the student is seated twice, and the timetable publishes.
teeth "student double-booking downgraded to non-blocking" \
  "$RULES" scripts/verify-timetable.ts \
  "import io,re;p='$RULES';s=io.open(p,encoding='utf-8').read();i=s.index(\"id: 'STUDENT_DOUBLE_BOOKED'\");j=s.index('},',i);seg=s[i:j];assert 'blocking: true' in seg,'the kind is not blocking to begin with';s=s[:i]+seg.replace('blocking: true','blocking: false')+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 6. The publish gate removed ═══════════════════════════════════════════
# Publishing while a HIGH clash is open is the failure with a real person at the
# end of it: a student told to sit two papers at once.
teeth "publish no longer gated on HIGH clashes" \
  "$SVC" scripts/verify-timetable-http.ts \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='if (!blocks.publishable) {';assert a in s,'the gate moved';s=s.replace(a,'if (false) {',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 7. The publish short-circuit ══════════════════════════════════════════
# "It is already PUBLISHED, nothing to do, return ok" answers a question nobody
# asked. The realistic sequence is: the timetable goes out, then somebody is
# pulled off duty — and that caller gets a true statement about the past and
# nothing about the present.
teeth "publish short-circuits on alreadyPublished again" \
  "$SVC" scripts/verify-timetable.ts \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();i=s.index('export async function publishExam');j=s.index('export async function',i+10);seg=s[i:j];m='const blocks = await conflictsBlock(institutionId, examId);';assert m in seg,'the gate moved';s=s[:i]+seg.replace(m,'if (exam.status === \'PUBLISHED\') return { ...exam, publishable: true, alreadyPublished: true };'+chr(10)+'  '+m,1)+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 8. The invigilator self-clash ════════════════════════════════════════
# A slot split across two venues has two allocations, so a naive engine compares
# the slot against itself and reports a HIGH blocking clash — which makes it
# impossible to staff a paper that has deliberately been split across two rooms.
teeth "invigilators no longer deduped per slot" \
  "$SVC" scripts/verify-timetable.ts \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='new Set<string>()';assert a in s,'no per-slot Set to defeat';s=s.replace(a,'[] as unknown as Set<string>',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 9. `exam_conflicts` back to being a dead table ════════════════════════
# It is a schema claim with no content: nothing ever wrote a row, so the table
# said a clash history existed and there was none.
teeth "conflict rows no longer written" \
  "$SVC" scripts/verify-timetable.ts \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='await prisma.examConflict.create({';assert a in s,'recordConflicts moved';s=s.replace(a,'if (false) await prisma.examConflict.create({',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 10. The 30-seat default ═══════════════════════════════════════════════
# Seats were read as `offering.enrollments.length ?? 30` against an include that
# never fetched enrollments — so it was ALWAYS 30, whatever the real roll.
teeth "seats back to the hard-coded 30 default" \
  "$SVC" scripts/verify-timetable.ts \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='seats: body.seats ?? Math.max(enrolled, 1)';assert s.count(a)==2,'the seats default moved or is no longer used twice';s=s.replace(a,'seats: 30');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 11. The window validation ═════════════════════════════════════════════
# An inverted or malformed window — `endTime` before `startTime`, or "9:00" —
# used to be accepted, producing a slot with a negative duration.
teeth "inverted time windows accepted again" \
  "$RULES" scripts/verify-timetable.ts \
  "import io,re;p='$RULES';s=io.open(p,encoding='utf-8').read();i=s.index('export function validateWindow');j=s.index('export ',i+10);seg=s[i:j];mm=re.search(r'\n  if \(end <= start\) \{\n(?:[^\n]*\n){1,6}?\s*\}\n',seg);assert mm,'the inverted-window guard moved';s=s[:i]+seg[:mm.start()]+'\n'+seg[mm.end():]+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 12. The date parse accepting 2026-02-30 ══════════════════════════════
teeth "impossible dates accepted again" \
  "$RULES" scripts/verify-timetable.ts \
  "import io,re;p='$RULES';s=io.open(p,encoding='utf-8').read();i=s.index('export function parseExamDate');j=s.index('export ',i+10);seg=s[i:j];mm=re.search(r'\n  if \(dt\.getFullYear\(\) !== y \|\| dt\.getMonth\(\) !== m - 1 \|\| dt\.getDate\(\) !== d\) \{\n(?:[^\n]*\n){1,4}?  \}\n',seg);assert mm,'the round-trip calendar check moved';s=s[:i]+seg[:mm.start()]+'\n'+seg[mm.end():]+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 13. Non-strict schemas ════════════════════════════════════════════════
# `POST /timetable { name, typr }` created an exam with the default type and no
# complaint. A field the server ignores looks exactly like a field it honoured.
teeth "a timetable schema made non-strict again" \
  "$SCHEMAS" scripts/verify-timetable-http.ts \
  "import io;p='$SCHEMAS';s=io.open(p,encoding='utf-8').read();i=s.index('export const createTimetableExamSchema');j=s.index('export const',i+10);seg=s[i:j];assert '.strict()' in seg,'the schema is already non-strict';s=s[:i]+seg.replace('.strict()','',1)+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 14. `roomId` back as the user-facing field ════════════════════════════
# `Room` is a HOSTEL room — capacity 2, off a block. Accepting `roomId` again
# means a controller can seat a hundred students in a bunk.
teeth "allocation accepting a hostel roomId again" \
  "$SCHEMAS" scripts/verify-timetable-http.ts \
  "import io;p='$SCHEMAS';s=io.open(p,encoding='utf-8').read();a='venueId: z.string().min(1).max(64)';assert a in s,'the venue field moved';s=s.replace(a,'roomId: z.string().min(1).max(64)',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 15. The superseded routes served again ════════════════════════════════
teeth "the superseded GET /examcell/timetable served again" \
  "$ROUTES" scripts/verify-timetable-http.ts \
  "import io;p='$ROUTES';s=io.open(p,encoding='utf-8').read();a=\"router.get(\\n  '/timetable/catalogue',\";assert a in s,'the catalogue route moved';s=s.replace(a,\"router.get('/timetable', wrap(async (_req, res) => { res.json({ data: [] }); }));\\n\\nrouter.get(\\n  '/timetable/catalogue',\");io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 16. The superseded service functions back ══════════════════════════════
for fn in listExams addExamSlot allocateRoom; do
  teeth "$fn re-added to examcell.service" \
    src/modules/examcell/examcell.service.ts \
    scripts/audit-timetable-ui.ts \
    "import io;p='src/modules/examcell/examcell.service.ts';s=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8',newline='\n').write(s+'\\nexport async function $fn() { return []; }\\n')"
done

# ═══ 17. The router stops applying its own auth ═══════════════════════════
# This runs the UI AUDIT, not the HTTP suite, and the reason is a MEASURED
# property of Express rather than a shortcut. `timetableRoutes` is mounted
# before `examcellRoutes`, and the sibling runs a `use` middleware for a request
# it then fails to MATCH — and Express runs `use` for non-matching paths too. So
# the first sibling answers 401 for the whole `/api/v1/examcell` prefix before
# this router is reached, and an HTTP probe cannot see the difference. What it
# changes is the router's own guarantee: it stops being safe on its own and
# becomes safe only by an accident of ordering.
teeth "the timetable router stops applying its own auth" \
  "$ROUTES" scripts/audit-timetable-ui.ts \
  "import io;p='$ROUTES';s=io.open(p,encoding='utf-8').read();a=\"router.use(auth, requireRole('EXAMCELL', 'ADMIN'));\";assert a in s,'the auth line moved';s=s.replace(a,'');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

teeth "timetableRoutes mounted AFTER examcellRoutes again" \
  src/app.ts \
  scripts/audit-timetable-ui.ts \
  "import io;p='src/app.ts';s=io.open(p,encoding='utf-8').read();a=\"app.use('/api/v1/examcell', timetableRoutes)\";b=\"app.use('/api/v1/examcell', examcellRoutes)\";assert a in s and b in s,'the mount lines moved';s=s.replace(a,'@@TT@@').replace(b,a).replace('@@TT@@',b);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 18. Route order ══════════════════════════════════════════════════════
# Express matches in registration order and a `:param` matches ANY single
# segment. So if a literal route ever sits UNDER a parameterised prefix, it is
# unreachable — Express answers with the parameterised handler and the literal is
# never consulted. Here `/timetable/blocks/:block` is registered before
# `/timetable/students/:studentProfileId`, and the two prefixes differ, so today
# they cannot collide. Move the students literal under `blocks/` and they can:
# GET /timetable/blocks/students is then answered by the BLOCK handler, and the
# student timetable silently becomes "block = students", a 422.
teeth "a literal route reachable only through a parameterised one" \
  "$ROUTES" scripts/audit-timetable-ui.ts \
  "import io;p='$ROUTES';s=io.open(p,encoding='utf-8').read();a=\"'/timetable/students/:studentProfileId',\";assert s.count(a)==1,'the students route is not declared once';s=s.replace(a,\"'/timetable/blocks/students',\",1);io.open(p,'w',encoding='utf-8',newline='\\n').write(s)"

# ═══ 19. A screen de-registered from FEATURE_MODULES ══════════════════════
# The silent failure: `openModule('TimetableSlots')` to a missing key renders
# NOTHING and puts the controller back on the hub.
teeth "a timetable sub-screen de-registered from FEATURE_MODULES" \
  ../learnix/users/exam_cell/exam_cell.js \
  scripts/audit-timetable-ui.ts \
  "import io;p='../learnix/users/exam_cell/exam_cell.js';s=io.open(p,encoding='utf-8').read();a='  TimetableSlots: {';assert a in s,'the entry moved';s=s.replace(a,'  TimetableSlots_OFF: {',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 20. The `switchTab` that was missing from the Timetable tab ═══════════
teeth "switchTab removed from the Timetable tab again" \
  ../learnix/users/exam_cell/exam_cell.js \
  scripts/audit-timetable-ui.ts \
  "import io;p='../learnix/users/exam_cell/exam_cell.js';s=io.open(p,encoding='utf-8').read();i=s.index('<TimetableModule');j=s.index(\"case 'Evaluations':\",i);seg=s[i:j];assert 'switchTab' in seg,'switchTab is already absent';s=s[:i]+seg.replace('switchTab: (tabId) => handleTabChange(tabId),','')+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 21. A tab routed as a sub-screen ═════════════════════════════════════
# `openModule('Timetable')` finds no such key and opens NOTHING, silently.
teeth "a tab routed through openModule instead of switchTab" \
  "$TT/timetableUi.js" \
  scripts/audit-timetable-ui.ts \
  "import io;p='$TT/timetableUi.js';s=io.open(p,encoding='utf-8').read();a='if (isTab && TAB_ROUTES.includes(route)) navigation.switchTab(route);';assert a in s,'the routing line moved';s=s.replace(a,'if (false) navigation.switchTab(route);');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 22. A block added server-side with no app mirror ════════════════════
teeth "a block added on the server alone, with no app mirror" \
  "$RULES" scripts/audit-timetable-ui.ts \
  "import io;p='$RULES';s=io.open(p,encoding='utf-8').read();a=\"  {\n    id: 'CONFLICTS',\";assert a in s,'the conflicts block moved';new=\"  {\n    id: 'TREASURY',\n    label: 'Treasury',\n    blurb: 'x',\n    icon: 'cash-outline',\n    color: '#111111',\n    route: 'TimetableTreasury',\n    isTab: false,\n    order: 9,\n  },\n  {\n    id: 'CONFLICTS',\";s=s.replace(a,new);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 23. A conflict kind added server-side with no app mirror ═════════════
teeth "a conflict kind added on the server alone, with no app mirror" \
  "$RULES" scripts/audit-timetable-ui.ts \
  "import io;p='$RULES';s=io.open(p,encoding='utf-8').read();a=\"  {\n    id: 'NO_INVIGILATOR',\";assert a in s,'the last kind moved';new=\"  {\n    id: 'WIFI_DOWN',\n    label: 'No wifi',\n    blurb: 'x',\n    severity: 'LOW',\n    blocking: false,\n    icon: 'wifi',\n    color: '#111111',\n  },\n  {\n    id: 'NO_INVIGILATOR',\";s=s.replace(a,new);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 24. A blocking flag that disagrees between app and server ════════════
# A client that decides for itself which clashes are fatal will eventually
# disagree with the server about which writes are allowed — and that surfaces as
# a screen that lets the controller do something the server refuses.
teeth "the app's blocking flag disagreeing with the server's" \
  "$TT/timetableMeta.js" \
  scripts/audit-timetable-ui.ts \
  "import io;p='$TT/timetableMeta.js';s=io.open(p,encoding='utf-8').read();i=s.index(\"id: 'STUDENT_DOUBLE_BOOKED',\");j=s.index('},',i);seg=s[i:j];assert 'blocking: true' in seg,'the mirror is not blocking';s=s[:i]+seg.replace('blocking: true','blocking: false')+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 25. The hard-coded fixture back ══════════════════════════════════════
teeth "the stale hard-coded timetableData fixture restored" \
  "$TT/timetable.js" \
  scripts/audit-timetable-ui.ts \
  "import io,os;p='$TT/timetable.js';s=io.open(p,encoding='utf-8').read();d=os.path.dirname(p)+'/constants';os.makedirs(d,exist_ok=True);io.open(d+'/timetableData.js','w',encoding='utf-8').write('export const EXAMS = [];');s='import { EXAMS } from \\'./constants/timetableData\\';\\n'+s;io.open(p,'w',encoding='utf-8',newline='\n').write(s)" \
  "$TT/constants"

# ═══ 26. The failed request rendered as clear ═════════════════════════════
# The most dangerous thing this screen can do. "0 clashes" because nothing was
# fetched and "0 clashes" because nothing is wrong look identical, and the first
# is what lets a controller publish a broken schedule.
teeth "a failed timetable request rendered as empty figures" \
  "$TT/timetableUi.js" \
  scripts/audit-timetable-ui.ts \
  "import io;p='$TT/timetableUi.js';s=io.open(p,encoding='utf-8').read();i=s.index('export function TimetableScreen');j=s.index('export ',i+10);seg=s[i:j];a='if (error) {';assert a in seg,'the error branch moved';s=s[:i]+seg.replace(a,'if (false) {',1)+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 27. A clear conflict painted as an alarm ══════════════════════════════
# A conflict list where every row is painted is a list whose colours have
# stopped meaning anything — and then the red rows are not read either.
teeth "a clear conflict painted in its alarm colour again" \
  "$TT/timetableUi.js" \
  scripts/audit-timetable-ui.ts \
  "import io;p='$TT/timetableUi.js';s=io.open(p,encoding='utf-8').read();a=\"name={count > 0 ? meta.icon : 'checkmark-circle-outline'}\";assert a in s,'the tick logic moved';s=s.replace(a,'name={meta.icon}');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 28. Zero clashes painted as a warning ════════════════════════════════
teeth "conflictTone treating zero as a warning again" \
  "$TT/timetableMeta.js" \
  scripts/verify-timetable-ui.ts \
  "import io;p='$TT/timetableMeta.js';s=io.open(p,encoding='utf-8').read();a='if (!count || count <= 0) return \\'clear\\';';assert a in s,'conflictTone moved';s=s.replace(a,'if (!count || count <= 0) return \\'warn\\';');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 29. The off-by-one-day date parse ═══════════════════════════════════
# `new Date('2026-03-14')` is UTC midnight, which in any timezone behind UTC is
# the 13th — so a paper scheduled for the 14th renders on the 13th.
teeth "the app parsing day keys as UTC again" \
  "$TT/timetableMeta.js" \
  scripts/verify-timetable-ui.ts \
  "import io;p='$TT/timetableMeta.js';s=io.open(p,encoding='utf-8').read();a=\"  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));\";assert a in s,'the local-date parse moved';s=s.replace(a,'  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 30. Impossible dates accepted again ══════════════════════════════════
teeth "2026-02-30 accepted by the app's date parser again" \
  "$TT/timetableMeta.js" \
  scripts/verify-timetable-ui.ts \
  "import io;p='$TT/timetableMeta.js';s=io.open(p,encoding='utf-8').read();a='  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;';assert a in s,'the impossible-date guard moved';s=s.replace(a,'');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 31. A sub-screen importing from the wrong depth ══════════════════════
# The Accounts F-11 build shipped this in all seven of its sub-screens: it
# parses perfectly, bundles as an unresolved module, and fails only when that
# line first runs.
teeth_app "a sub-screen importing one level too high" \
  "$TT/pages/slots/slots.js" \
  scripts/check-timetable-jsx.ts \
  "import io;p='$TT/pages/slots/slots.js';s=io.open(p,encoding='utf-8').read();a=\"'../../../../../../services/api'\";assert a in s,'the api import moved';s=s.replace(a,\"'../../../../../services/api'\");io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 32. A named import that does not exist ═══════════════════════════════
teeth_app "a screen importing a helper the meta does not export" \
  "$TT/pages/duty/duty.js" \
  scripts/check-timetable-named-imports.js \
  "import io;p='$TT/pages/duty/duty.js';s=io.open(p,encoding='utf-8').read();a='formatDuration, ';assert a in s,'the import list moved';s=s.replace(a,'formatDuty, ',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 33. An undeclared component used in JSX ══════════════════════════════
# Invisible to every other check: it parses, it bundles, and it throws
# `Element type is invalid` on a phone the first time that line renders.
teeth_app "a screen rendering a component it never imported" \
  "$TT/pages/duty/duty.js" \
  scripts/check-timetable-locals.js \
  "import io;p='$TT/pages/duty/duty.js';s=io.open(p,encoding='utf-8').read();a='<TimetableScreen';assert a in s,'the shell element moved';s=s.replace(a,'<TimetableScreenTypo',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 34. An unused import left behind by a rename ════════════════════════
teeth_app "a half-finished rename leaving a dead import" \
  "$TT/pages/rooms/rooms.js" \
  scripts/check-timetable-locals.js \
  "import io;p='$TT/pages/rooms/rooms.js';s=io.open(p,encoding='utf-8').read();a='THEME, GREEN, AMBER';assert a in s,'the colour import moved';s=s.replace(a,'THEME, GREEN, AMBER, VIOLET',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 35. A sub-screen fetching the whole overview ═════════════════════════
# A screen that opened seven requests could show seven different moments.
teeth "a sub-screen fetching the entire overview" \
  "$TT/pages/duty/duty.js" \
  scripts/audit-timetable-ui.ts \
  "import io;p='$TT/pages/duty/duty.js';s=io.open(p,encoding='utf-8').read();a=\"examcellApi.timetableBlock('DUTY'\";assert a in s,'the duty fetch moved';s=s.replace(a,'examcellApi.timetableOverview()',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 36. A write patched into local state instead of reloading ════════════
# A write can be REFUSED. A locally-patched row would show the controller a
# change the server never accepted.
teeth "a write patched into local state instead of reloading" \
  "$TT/timetableUi.js" \
  scripts/audit-timetable-ui.ts \
  "import io;p='$TT/timetableUi.js';s=io.open(p,encoding='utf-8').read();a='      setData(await fetcher());';assert a in s,'the fetch assignment moved';s=s.replace(a,'      const fetched = await fetcher();'+chr(10)+'      setData((prev) => (prev ? prev : fetched));',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 37. The hub hard-coding its own block list ═══════════════════════════
# If the mirror were also the source, a block added on the server would never
# draw itself and the two lists would be a second thing to keep true.
teeth "the hub using its mirror as the source of block ids" \
  "$TT/timetable.js" \
  scripts/audit-timetable-ui.ts \
  "import io;p='$TT/timetable.js';s=io.open(p,encoding='utf-8').read();a='const blocks = catalogue.data?.blocks?.length ? catalogue.data.blocks : BLOCKS;';assert a in s,'the catalogue fallback moved';s=s.replace(a,'const blocks = BLOCKS;');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 38. The policy wording removed from a screen ════════════════════════
teeth "the publish policy removed from the conflicts screen" \
  "$TT/pages/conflicts/conflicts.js" \
  scripts/audit-timetable-ui.ts \
  "import io;p='$TT/pages/conflicts/conflicts.js';s=io.open(p,encoding='utf-8').read();a='AN EXAM CAN BE PUBLISHED ONLY ONCE EVERY HIGH-SEVERITY CLASH IS RESOLVED.';assert a in s,'the policy sentence moved';s=s.replace(a,'AN EXAM CAN BE PUBLISHED.');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 39. The heavy-duty threshold re-invented on the app ══════════════════
# Two thresholds for one rule is how they drift: the app flags someone as heavy
# at 5 and the server at 4, and nobody can say which is right.
teeth "the app's heavy-duty threshold diverging from the server's" \
  "$TT/timetableMeta.js" \
  scripts/verify-timetable-ui.ts \
  "import io;p='$TT/timetableMeta.js';s=io.open(p,encoding='utf-8').read();a='export const HEAVY_DUTY_COUNT = 4;';assert a in s,'the threshold moved';s=s.replace(a,'export const HEAVY_DUTY_COUNT = 6;');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 40. The seats shortfall rounded away ════════════════════════════════
# A paper needing 61 seats with 40 allocated is the sentence that makes
# somebody go and book another room. "21 short" is the whole value.
teeth "the seat shortfall no longer reported" \
  "$TT/timetableMeta.js" \
  scripts/verify-timetable-ui.ts \
  "import io;p='$TT/timetableMeta.js';s=io.open(p,encoding='utf-8').read();a='short of \${have}';assert a in s,'the shortfall phrase moved';s=s.replace(a,'short of the allocated room');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 41. The sub-screen import depth ═════════════════════════════════════
# `pages/timetable/pages/<block>/<block>.js` is FIVE directories below
# `learnix/`, so reaching `services/api.js` takes SIX `../`. The Accounts F-11
# build shipped five in all seven of its sub-screens: valid syntax, unresolved
# module, and the failure only appears at runtime. `check-fs-imports.js` is the
# check that catches it, so the check is only worth having if it bites here.
teeth_app "a sub-screen importing one level too many" \
  "$TT/pages/duty/duty.js" \
  ../../learnix/scripts/check-fs-imports.js \
  "import io;p='$TT/pages/duty/duty.js';s=io.open(p,encoding='utf-8').read();a='../../../../../../services/api';assert a in s,'the api import depth moved';s=s.replace(a,'../../../../../../../services/api',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

echo
echo "================================================================"
echo "$PASS cases bite, $FAIL do not"
[ "$FAIL" -eq 0 ] || exit 1
echo "ok prove-timetable-teeth: every timetable assertion can fail"