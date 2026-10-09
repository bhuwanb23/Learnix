#!/usr/bin/env bash
# X-05 Evaluations — teeth proof.
#
# A test suite that passes proves nothing unless it CAN fail. Each case below
# breaks one specific fix, runs the suite that is supposed to catch it, and
# requires a NON-ZERO exit. The code is restored afterwards and the suite
# re-run, so a case that "broke" the file rather than the fix is caught too.
#
# Usage: bash scripts/prove-evaluations-teeth.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

# ── Helpers ────────────────────────────────────────────────────────────────
# Save a file, apply a python edit, run a command, require it to fail, restore.
#
# The checksum comparison is not decoration: several files here are NEW and
# therefore untracked, so `git diff` reports nothing for them; without it every
# no-op edit would be reported as "the suite still passed", which is
# indistinguishable from a vacuous assertion.
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
    *.js) node "$script" > /tmp/evaluations-teeth-suite.log 2>&1 ;;
    *)    npx tsx "$script" > /tmp/evaluations-teeth-suite.log 2>&1 ;;
  esac
  code=$?

  cp "$backup" "$file"; rm -f "$backup"
  # A case may CREATE something rather than edit an existing file. Restoring
  # the file it was handed does not remove that, so the tree stays dirty and
  # every LATER case measures an audit failing for an unrelated reason. The
  # optional fifth argument lists paths to delete on the way out.
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

EV="../learnix/users/exam_cell/pages/evaluations"
SHELL="../learnix/users/exam_cell/exam_cell.js"
API="../learnix/services/api.js"
SVC="src/modules/examcell/evaluation.service.ts"
RULES="src/modules/examcell/evaluation.rules.ts"
ROUTES="src/modules/examcell/evaluation.routes.ts"
SCHEMAS="src/modules/examcell/examcell.schemas.ts"

V="scripts/verify-evaluations.ts"
H="scripts/verify-evaluations-http.ts"
A="scripts/audit-evaluations-ui.ts"

echo "X-05 Evaluations — teeth proof"
echo "Each case breaks one fix and REQUIRES the matching suite to fail."

# ═══ 1. The tenant escape ═══════════════════════════════════════════════
# `evalWhere` is the scope every block and every mutation goes through. Drop
# `institutionId` from it and any controller can read and write another
# college's evaluations by guessing an id.
teeth "tenant scope dropped from evalWhere" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a='  id: evaluationId,\n  examSlot: { exam: { institutionId } },';assert s.count(a)==1,'evalWhere moved';s=s.replace(a,'  id: evaluationId,');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 2. The marks lock removed ══════════════════════════════════════════
# Once moderation APPROVES, marks are frozen. Delete the guard and an approved
# result can be rewritten after the fact — the exact thing the lock exists for.
teeth "the moderation lock deleted" \
  "$SVC" "$V" \
  "import io;p='$SVC';s=io.open(p,encoding='utf-8').read();a=\"  if (paper.evaluation.moderationStatus === 'APPROVED') {\";assert s.count(a)==1,'lock moved';s=s.replace(a,'  if (false) {');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 3. The bounds removed ══════════════════════════════════════════════
# `assertMarksSplit` publishes 0..40/0..60. Make it a no-op and a 41 becomes a
# 200 at the wire — the HTTP suite must notice.
teeth "the marks bounds turned into a no-op" \
  "$RULES" "$H" \
  "import io;p='$RULES';s=io.open(p,encoding='utf-8').read();a='export function assertMarksSplit(internalMarks: number, externalMarks: number): void {';assert s.count(a)==1,'assertMarksSplit moved';s=s.replace(a,a+'\n  return;');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 4. The auth gate dropped ═══════════════════════════════════════════
# The router applies its OWN auth. Removing it here would still answer 401 —
# the timetable and hall-ticket siblings mounted on the SAME prefix run their
# own `router.use(auth, ...)` first — which is exactly why the gate assertion
# lives at source level in the audit. This case proves that assertion bites.
teeth "the router's own auth gate removed" \
  "$ROUTES" "$A" \
  "import io;p='$ROUTES';s=io.open(p,encoding='utf-8').read();a=\"router.use(auth, requireRole('EXAMCELL', 'ADMIN'));\";assert s.count(a)==1,'gate moved';s=s.replace(a,'');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 5. A literal captured as an id ═════════════════════════════════════
# `/evaluations/catalogue` registered AFTER `/evaluations/:id/...` would
# never match — the literal is read as an evaluation id. The audit checks the
# source order; this proves the check bites.
teeth "catalogue registered after a :id path" \
  "$ROUTES" "$A" \
  "import io,re;p='$ROUTES';s=io.open(p,encoding='utf-8').read();m=re.search(r\"router\.get\(\n  '/evaluations/catalogue',[\s\S]*?\n\);\n\",s);assert m,'catalogue route not found';blk=m.group(0);s=s.replace(blk,'');s=s.replace('export default router;',blk+'\nexport default router;');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 6. An unregistered sub-screen ══════════════════════════════════════
# `openModule('EvaluationsMarks')` against a missing FEATURE_MODULES key
# renders NOTHING — the controller lands back on the hub with no error.
# Unregister it; the audit must fail.
teeth "the Marks screen unregistered" \
  "$SHELL" "$A" \
  "import io;p='$SHELL';s=io.open(p,encoding='utf-8').read();a=\"  EvaluationsMarks: { title: 'Marks Entry', icon: 'create-outline', component: EvaluationsMarks },\n\";assert s.count(a)==1,'registry entry moved';s=s.replace(a,'');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 7. The mirror drifting from the server ═════════════════════════════
# The mirror exists so a screen can colour a row without a round trip. If it
# disagrees with the rules, it looks like the truth while being wrong — the
# audit compares them block by block.
teeth "the mirror's MISSING route renamed" \
  "$EV/evaluationMeta.js" "$A" \
  "import io;p='$EV/evaluationMeta.js';s=io.open(p,encoding='utf-8').read();a=\"route: 'EvaluationsMissing',\";assert s.count(a)==1,'mirror route moved';s=s.replace(a,\"route: 'EvaluationsMissingX',\");io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 8. The stale fixture coming back ═══════════════════════════════════
# The fixture held invented stats one import away from a screen that would
# show them as fact. Recreate it; the audit must fail on its existence.
# The edit also touches the watched file (checksum sees the change) and
# removes the created directory on the way out (fifth argument).
teeth "the constants/evaluationsData.js fixture recreated" \
  "$EV/evaluationMeta.js" "$A" \
  "import io,os;p='$EV/evaluationMeta.js';s=io.open(p,encoding='utf-8').read();d=os.path.join('$EV','constants');os.makedirs(d,exist_ok=True);io.open(os.path.join(d,'evaluationsData.js'),'w',encoding='utf-8',newline='\n').write('export const EVALUATION_STATS = [];\n');io.open(p,'w',encoding='utf-8',newline='\n').write(s+'\n')"\
  "$EV/constants"

# ═══ 9. The superseded endpoint returning ═══════════════════════════════
# The old flat list is gone because its counters trusted the column. Call it
# from the client again and the HTTP suite's 404 assertion is what catches the
# contract coming back — here we check the CLIENT side of that contract.
teeth "the flat /examcell/evaluations call restored in api.js" \
  "$API" "$A" \
  "import io;p='$API';s=io.open(p,encoding='utf-8').read();a='  evaluationCatalogue: () => api.get';assert s.count(a)==1,'anchor moved';s=s.replace(a,'  evaluations: () => api.get(\'/examcell/evaluations\'),\n'+a);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ═══ 10. The error panel replaced with an empty state ═══════════════════
# A missing-marks list that fails and renders "0 missing" is how results get
# published with papers unmarked. Remove the shell's error branch; the audit
# must fail.
teeth "the shell's error branch removed" \
  "$EV/evaluationUi.js" "$A" \
  "import io;p='$EV/evaluationUi.js';s=io.open(p,encoding='utf-8').read();a='  if (error) {';assert s.count(a)==1,'error branch moved';s=s.replace(a,'  if (false) {');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

echo ""
echo "Restored files — re-running every suite clean:"
npx tsx "$V" > /tmp/evaluations-teeth-final-v.log 2>&1 && echo "  ok  verify-evaluations is green after restore" && PASS=$((PASS+1)) || { echo "  FAIL verify-evaluations FAILED after restore"; FAIL=$((FAIL+1)); }
npx tsx "$H" > /tmp/evaluations-teeth-final-h.log 2>&1 && echo "  ok  verify-evaluations-http is green after restore" && PASS=$((PASS+1)) || { echo "  FAIL verify-evaluations-http FAILED after restore"; FAIL=$((FAIL+1)); }
npx tsx "$A" > /tmp/evaluations-teeth-final-a.log 2>&1 && echo "  ok  audit-evaluations-ui is green after restore" && PASS=$((PASS+1)) || { echo "  FAIL audit-evaluations-ui FAILED after restore"; FAIL=$((FAIL+1)); }

echo ""
echo "${PASS} passed, ${FAIL} failed"
if [ "$FAIL" -ne 0 ]; then
  echo "Teeth proof FAILED — see /tmp/evaluations-teeth-suite.log"
  exit 1
fi
echo "ok prove-evaluations-teeth"
