#!/usr/bin/env bash
# X-04 Hall tickets — teeth proof.
#
# A test suite that passes proves nothing unless it CAN fail. Each case below
# breaks one specific fix, runs the suite that is supposed to catch it, and
# requires a NON-ZERO exit. The code is restored afterwards and the suite re-run,
# so a case that "broke" the file rather than the fix is caught too.
#
# Usage: bash scripts/prove-hallticket-teeth.sh
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
    *.js) node "$script" > /tmp/hallticket-teeth-suite.log 2>&1 ;;
    *)    npx tsx "$script" > /tmp/hallticket-teeth-suite.log 2>&1 ;;
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

  node "$script" > /tmp/hallticket-teeth-suite.log 2>&1
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

HT="../learnix/users/exam_cell/pages/hall_tickets"
SHELL="../learnix/users/exam_cell/exam_cell.js"
SVC="src/modules/examcell/hallticket.service.ts"
RULES="src/modules/examcell/hallticket.rules.ts"
ROUTES="src/modules/examcell/hallticket.routes.ts"
SCHEMAS="src/modules/examcell/examcell.schemas.ts"
STUDENT="src/modules/student/student.service.ts"

V="scripts/verify-hallticket.ts"
H="scripts/verify-hallticket-http.ts"
A="scripts/audit-hallticket-ui.ts"

echo "X-04 Hall tickets — teeth proof"
echo "Each case breaks one fix and REQUIRES the matching suite to fail."

# ═══ 1. The tenant escape ═════════════════════════════════════════════════
# `requireExam` is the gate every block and every mutation goes through. Drop
# `institutionId` from it and any controller can read and publish another
# college's exam by guessing an id.
teeth "tenant scope dropped from requireExam" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='const exam = await prisma.exam.findFirst({ where: { id: examId, institutionId } });';assert s.count(a)==1,'requireExam moved';s=s.replace(a,'const exam = await prisma.exam.findFirst({ where: { id: examId } });');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 2. The warn-only policy flipped ══════════════════════════════════════
# The single decision this feature is built on. If `blocksGeneration` ever
# becomes true, a student with an unpaid fee or no photograph stops getting a
# ticket — and the screen still says warnings are shown alongside.
teeth "the warn-only policy flipped to blocking" \
  "$RULES" "$V" \
  "import io;p='$RULES';s=io.open(p,encoding='utf-8').read();a='blocksGeneration: false';assert s.count(a)==1,'the policy moved';s=s.replace(a,'blocksGeneration: true');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 3. The preview and the run disagreeing ═══════════════════════════════
# `wouldIssue` must be counted with THE SAME PREDICATE the run uses — skip the
# students who already hold a ticket. Without that skip the screen promises
# more tickets than the run issues, and "6 ready to issue" becomes 5.
teeth "the preview counts students who already have a ticket" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='      if (already.has(e.studentProfileId)) continue;';assert s.count(a)==1,'the preview predicate moved';s=s.replace(a,'');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 4. Seats handed out twice ════════════════════════════════════════════
# `nextSeatNo(taken)` walks past what is already taken. Ignore `taken` and every
# student in a run is given seat A-1 — the unique constraint on
# (examSlotId, seatNo) then fails the run part way through.
teeth "nextSeatNo ignoring the seats already taken" \
  "$RULES" "$V" \
  "import io;p='$RULES';s=io.open(p,encoding='utf-8').read();a='const used = new Set(taken);';assert s.count(a)==1,'nextSeatNo moved';s=s.replace(a,'const used = new Set<string>();');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 5. A second ticket for the same student ══════════════════════════════
# The refusal that stops a student being seated twice in one paper.
teeth "the duplicate-ticket refusal removed" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();i=s.index('export async function generateOne');j=s.index('export async function',i+10);seg=s[i:j];a='  if (existing) {';assert a in seg,'the duplicate guard moved';s=s[:i]+seg.replace(a,'  if (false) {',1)+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 6. Printing twice reported as a first print ══════════════════════════
# Printing is normal and idempotent. Without the short-circuit the second print
# reports `alreadyDownloaded: false`, and a screen can no longer tell "printed"
# from "just printed".
teeth "download idempotency removed" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='  if (ticket.status === \\'DOWNLOADED\\') return { ...ticket, alreadyDownloaded: true };';assert s.count(a)==1,'the idempotency short-circuit moved';s=s.replace(a,'');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 7. A correction that names no field ══════════════════════════════════
# A correction with no `requestedValue` would be stored as an empty string and
# then APPLIED as one — rewriting a roll number to nothing.
teeth "a correction with no replacement value accepted" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();i=s.index('export async function createRequest');j=s.index('export async function',i+10);seg=s[i:j];a='if (!body.requestedValue || !String(body.requestedValue).trim()) {';assert a in seg,'the requestedValue guard moved';s=s[:i]+seg.replace(a,'if (false) {',1)+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 8. A reissue that silently corrects a field ══════════════════════════
# A reissue that "corrects" a field leaves the reader unsure which of the two
# happened — which is exactly why the two kinds are one table with one rule.
teeth "a reissue allowed to carry a field" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();i=s.index('export async function createRequest');j=s.index('export async function',i+10);seg=s[i:j];a='    if (body.field) {';assert a in seg,'the reissue field refusal moved';s=s[:i]+seg.replace(a,'    if (false) {',1)+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 9. Approval and effect collapsed into one step ═══════════════════════
# The screen offers "Approve" and, only afterwards, "Apply". Merge them and a
# controller who approves a correction rewrites a student's record in the same
# breath.
teeth "completing an unapproved request" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='  if (request.status !== \\'APPROVED\\') {';assert s.count(a)==1,'the approval gate moved';s=s.replace(a,'  if (false) {');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 10. A queue of duplicate open requests ═══════════════════════════════
# One open request per kind per ticket. Without it a student who asks three
# times gets three seats on the eventual completion.
teeth "a second open request on the same ticket accepted" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();i=s.index('export async function createRequest');j=s.index('export async function',i+10);seg=s[i:j];a='  if (open) {';assert a in seg,'the open-request guard moved';s=s[:i]+seg.replace(a,'  if (false) {',1)+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 11. A reissue that keeps the old seat ════════════════════════════════
# A reissue exists to invalidate the old ticket. Same seat, same QR, same
# piece of paper.
teeth "a reissue that keeps the seat it already had" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();i=s.index('export async function completeRequest');j=s.index('export async function',i+10);seg=s[i:j];a='const seatNo = nextSeatNo(otherSeats);';assert a in seg,'the reissue seat hand-out moved';s=s[:i]+seg.replace(a,'const seatNo = ticket.seatNo;',1)+s[j:];io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 12. A roll number that never reaches the QR ══════════════════════════
# The QR payload CONTAINS the roll number. Rewrite the number and leave the QR
# and the student scans as their old identity at the door.
teeth "a roll-number correction that leaves the QR stale" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='data: { qrPayload: qrPayloadFor(slot.id, value, ticket.seatNo) },';assert s.count(a)==1,'the QR rebuild moved';s=s.replace(a,'data: {},');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 13. The publish gate ═════════════════════════════════════════════════
# "Published, 0 tickets" tells a controller the students can see their hall
# tickets when there are none to see.
teeth "the publish gate on an exam with no tickets" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='    if (tickets === 0) {';assert s.count(a)==1,'the publish gate moved';s=s.replace(a,'    if (false) {');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 14. The student-side gate ════════════════════════════════════════════
# The one assertion in the suite that reads `student.service`. Dropping the
# `hallTicketStatus` check hands a student a seat in a hall the exam cell has
# not announced — and no other hall-ticket suite reaches this file.
teeth "the student-side publication gate dropped" \
  "$STUDENT" "$V" \
  "import io;p='$STUDENT';s=io.open(p,encoding='utf-8').read();a='const visible = slot.exam.hallTicketStatus === \\'PUBLISHED\\' && slot.hallTickets[0];';assert s.count(a)==1,'the student gate moved';s=s.replace(a,'const visible = slot.hallTickets[0];');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 15. Tenant scope on the read path ════════════════════════════════════
# `cohortFor` scopes the offerings through `offeringWhere(institutionId)`.
# `CourseOffering` has NO institutionId of its own — it reaches its tenant
# through `Course.institutionId` — so forgetting it silently returns another
# college's students.
teeth "tenant scope dropped from the cohort lookup" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='...offeringWhere(institutionId),';assert a in s,'the offering filter moved';s=s.replace(a,'...{},',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 16. Non-strict schemas ═══════════════════════════════════════════════
# `GET /hall-tickets/catalogue?examTypo=FINAL` would be accepted and ignored. A
# field the server drops looks exactly like a field it honoured.
teeth "the catalogue query schema made non-strict" \
  "$SCHEMAS" "$H" \
  "import io;p='$SCHEMAS';s=io.open(p,encoding='utf-8').read();a='export const hallTicketCatalogueQuerySchema = z.object({}).strict();';assert s.count(a)==1,'the schema moved';s=s.replace(a,'export const hallTicketCatalogueQuerySchema = z.object({});');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 17. The superseded endpoint served again ═════════════════════════════
# `GET /hall-tickets?examId=` never validated the exam id at all, and its
# response shape was not the envelope the app reads. Gone, not re-pointed.
teeth "the superseded GET /hall-tickets served again" \
  "$ROUTES" "$H" \
  "import io;p='$ROUTES';s=io.open(p,encoding='utf-8').read();a=\"router.use(auth, requireRole('EXAMCELL', 'ADMIN'));\";assert a in s,'the auth line moved';s=s.replace(a,a+chr(10)+chr(10)+\"router.get('/hall-tickets', wrap(async (_req, res) => { res.json({ data: [] }); }));\",1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 18. The router stops applying its own auth ═══════════════════════════
# This runs the UI AUDIT, not the HTTP suite, for the same MEASURED reason
# X-02's identical case does. `timetableRoutes` is mounted first on
# `/api/v1/examcell` and runs its own `use(auth, requireRole(...))` for a
# request it then fails to MATCH — and Express runs `use` for non-matching
# paths too — so the first sibling answers 401/403 for the whole prefix before
# this router is reached and an HTTP probe cannot see the difference. What the
# line changes is the router's own guarantee: safe on its own versus safe only
# by an accident of mount order.
teeth "the hall-ticket router stops applying its own auth" \
  "$ROUTES" "$A" \
  "import io;p='$ROUTES';s=io.open(p,encoding='utf-8').read();a=\"router.use(auth, requireRole('EXAMCELL', 'ADMIN'));\";assert s.count(a)==1,'the auth line moved';s=s.replace(a,'');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 19. Route order ══════════════════════════════════════════════════════
# Everything under `/hall-tickets` shares the first two segments, so a
# parameterised path registered early swallows `catalogue`, `overview`,
# `blocks`, `exams` and `requests` as if they were ids. Moving
# `/:id/download` to the front is the realistic way that happens: it is the only
# route whose FIRST parameter sits where a literal would be captured.
teeth "the parameterised /:id/download registered first" \
  "$ROUTES" "$A" \
  "import io,re;p='$ROUTES';s=io.open(p,encoding='utf-8').read();m=re.search(r\"router\\.post\\(\\s*'/hall-tickets/:id/download',.*?\\n\\);\\n\",s,re.S);assert m,'the download route moved';blk=m.group(0);s=s[:m.start()]+s[m.end():];anchor=\"router.get(\\n  '/hall-tickets/catalogue',\";assert anchor in s,'the catalogue anchor moved';s=s.replace(anchor,blk+chr(10)+anchor,1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 20. A sub-screen de-registered ═══════════════════════════════════════
# The silent failure: `openModule('HallTicketsCentre')` to a missing key
# renders NOTHING and puts the controller back on the hub.
teeth "a hall-ticket sub-screen de-registered from FEATURE_MODULES" \
  "$SHELL" "$A" \
  "import io;p='$SHELL';s=io.open(p,encoding='utf-8').read();a='  HallTicketsCentre: {';assert a in s,'the entry moved';s=s.replace(a,'  HallTicketsCentre_OFF: {',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 21. goToRoute no longer distinguishing tabs ═══════════════════════════
# A TAB goes through `switchTab`; a sub-screen through `openModule`. Getting it
# backwards is silent.
teeth "goToRoute no longer routing tabs through switchTab" \
  "$HT/hallTicketUi.js" "$A" \
  "import io;p='$HT/hallTicketUi.js';s=io.open(p,encoding='utf-8').read();a=\"if (isTab && typeof navigation.switchTab === 'function') navigation.switchTab(route);\";assert s.count(a)==1,'the routing line moved';s=s.replace(a,'if (false) navigation.switchTab(route);');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 22. A block added server-side with no app mirror ═════════════════════
# The mirror exists so a screen can colour and label a row without a round trip.
# Duplication is only safe because something compares them.
teeth "a block added on the server alone, with no app mirror" \
  "$RULES" "$A" \
  "import io;p='$RULES';s=io.open(p,encoding='utf-8').read();a='export const BLOCKS: Block[] = [';assert s.count(a)==1,'the BLOCKS declaration moved';new=a+chr(10)+\"  { id: 'TREASURY', label: 'Treasury', blurb: 'x', icon: 'cash-outline', color: '#111111', route: 'HallTicketsTreasury', isTab: false, order: 99, requiresExam: false },\";s=s.replace(a,new,1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 23. The policy sentence paraphrased on the app ═══════════════════════
# A screen that prints a PARAPHRASE of the policy can contradict it while
# looking like it is quoting it.
teeth "the app's eligibility policy wording diverging" \
  "$HT/hallTicketMeta.js" "$A" \
  "import io;p='$HT/hallTicketMeta.js';s=io.open(p,encoding='utf-8').read();a='Warnings never stop a generation';assert s.count(a)==1,'the policy sentence moved';s=s.replace(a,'Warnings may stop a generation');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 24. The hub using its mirror as the source ═══════════════════════════
# If the mirror were also the source, a block added on the server would never
# draw itself and the two lists would be a second thing to keep true.
teeth "the hub hard-coding its own block list" \
  "$HT/hall_tickets.js" "$A" \
  "import io;p='$HT/hall_tickets.js';s=io.open(p,encoding='utf-8').read();a='const blocks = catalogue.data?.blocks?.length ? catalogue.data.blocks : BLOCKS;';assert s.count(a)==1,'the catalogue fallback moved';s=s.replace(a,'const blocks = BLOCKS;');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 25. A sub-screen fetching the whole overview ═════════════════════════
# A screen that opened every block would pay for six it never draws.
teeth "a sub-screen fetching the entire overview" \
  "$HT/pages/centre/centre.js" "$A" \
  "import io;p='$HT/pages/centre/centre.js';s=io.open(p,encoding='utf-8').read();a=\"examcellApi.hallTicketBlock('VENUE')\";assert s.count(a)==1,'the venue fetch moved';s=s.replace(a,'examcellApi.hallTicketOverview()',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 26. An institution-wide screen given an exam it never chose ═══════════
# The centre screen renders NO picker. Passing it an examId the controller
# never selected is a filter nobody asked for.
teeth "the institution-wide centre screen filtered by an exam" \
  "$HT/pages/centre/centre.js" "$A" \
  "import io;p='$HT/pages/centre/centre.js';s=io.open(p,encoding='utf-8').read();a=\"examcellApi.hallTicketBlock('VENUE')\";assert s.count(a)==1,'the venue fetch moved';s=s.replace(a,\"examcellApi.hallTicketBlock('VENUE', 'chosen-but-never-shown')\",1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 27. The stale fixture back ═══════════════════════════════════════════
# It held a `BLOCKED_STUDENTS` list naming students refused for "Fee dues
# pending" — the exact opposite of the policy this feature is built on.
teeth "the stale hard-coded hallTicketsData fixture restored" \
  "$HT/hall_tickets.js" "$A" \
  "import io,os;p='$HT/hall_tickets.js';s=io.open(p,encoding='utf-8').read();d=os.path.dirname(p)+'/constants';os.makedirs(d,exist_ok=True);io.open(d+'/hallTicketsData.js','w',encoding='utf-8').write('export const TICKETS = [];');io.open(p,'w',encoding='utf-8',newline='\n').write(s)" \
  "$HT/constants"

# ═══ 28. A write patched into local state instead of reloaded ═════════════
# A write can be REFUSED. A locally-patched row would show the controller a
# change the server never accepted.
teeth "a write patched into local state instead of reloaded" \
  "$HT/hallTicketUi.js" "$A" \
  "import io;p='$HT/hallTicketUi.js';s=io.open(p,encoding='utf-8').read();a='      setData(await fetcher());';assert s.count(a)==1,'the fetch assignment moved';s=s.replace(a,'      const fetched = await fetcher();'+chr(10)+'      setData((prev) => (prev ? prev : fetched));',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 29. A sub-screen importing one level too high ════════════════════════
# `pages/hall_tickets/pages/<block>/<block>.js` is SIX directories below
# `learnix/`, so reaching `services/api.js` takes SIX `../`. It parses
# perfectly, bundles as an unresolved module, and fails only at runtime.
teeth_app "a sub-screen importing one level too high" \
  "$HT/pages/eligibility/eligibility.js" \
  scripts/check-hallticket-jsx.ts \
  "import io;p='$HT/pages/eligibility/eligibility.js';s=io.open(p,encoding='utf-8').read();a=\"'../../../../../../services/api'\";assert s.count(a)==1,'the api import moved';s=s.replace(a,\"'../../../../../services/api'\");io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 30. A named import the meta does not export ══════════════════════════
# Parses, bundles, and throws `undefined is not a function` on a phone.
teeth_app "a screen importing a helper the meta does not export" \
  "$HT/pages/centre/centre.js" \
  scripts/check-hallticket-named-imports.js \
  "import io;p='$HT/pages/centre/centre.js';s=io.open(p,encoding='utf-8').read();a='seatPhrase,';assert a in s,'the import list moved';s=s.replace(a,'seatPhrases,',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 31. A component used but never imported ══════════════════════════════
# Invisible to every other check: it parses, it bundles, and it throws
# `Element type is invalid` on a phone the first time that line renders.
teeth_app "a screen rendering a component it never imported" \
  "$HT/pages/centre/centre.js" \
  scripts/check-hallticket-locals.js \
  "import io;p='$HT/pages/centre/centre.js';s=io.open(p,encoding='utf-8').read();a='<HallTicketScreen';assert a in s,'the shell element moved';s=s.replace(a,'<HallTicketScreenTypo',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 32. An unused import left behind by a rename ═════════════════════════
teeth_app "a half-finished rename leaving a dead import" \
  "$HT/pages/centre/centre.js" \
  scripts/check-hallticket-locals.js \
  "import io;p='$HT/pages/centre/centre.js';s=io.open(p,encoding='utf-8').read();a='AMBER, CYAN, GREEN, MUTED, RED, SLATE, THEME,';assert a in s,'the colour import moved';s=s.replace(a,'AMBER, CYAN, GREEN, MUTED, RED, SLATE, THEME, VIOLET,',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 33. The import depth, as the repo-wide checker sees it ═══════════════
# `check-fs-imports.js` is the check that catches a wrong depth across the whole
# app, so the check is only worth having if it bites here too.
teeth_app "a sub-screen importing one level too many" \
  "$HT/pages/schedule/schedule.js" \
  ../../learnix/scripts/check-fs-imports.js \
  "import io;p='$HT/pages/schedule/schedule.js';s=io.open(p,encoding='utf-8').read();a='../../../../../../services/api';assert a in s,'the api import depth moved';s=s.replace(a,'../../../../../../../services/api',1);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

echo
echo "================================================================"
echo "$PASS cases bite, $FAIL do not"
[ "$FAIL" -eq 0 ] || exit 1

# ── The other half of the proof ──────────────────────────────────────────────
# Every case above only shows the suite CAN fail. If it were failing all along
# for an unrelated reason, all 33 would "bite" and none of it would mean
# anything — so the last run is with every file restored, and it must be green.
# The suite also sweeps any fixture a killed case left on the books at its own
# start, so this run doubles as the debris check.
if npx tsx "$V" > /tmp/hallticket-teeth-suite.log 2>&1; then
  echo "ok prove-hallticket-teeth: every hall-ticket assertion can fail, and the restored suite is green"
else
  echo "FAIL prove-hallticket-teeth: the restored suite does NOT pass — every case above is suspect"
  tail -25 /tmp/hallticket-teeth-suite.log
  exit 1
fi
