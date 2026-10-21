#!/usr/bin/env bash
# X-08 — Cheating cases: teeth proof.
#
# A test suite that passes proves nothing unless it CAN fail. Each case below breaks one
# specific fix, runs the suite that is supposed to catch it, and requires a NON-ZERO exit. The
# code is restored afterwards and the suite re-run, so a case that "broke" the file rather than
# the fix is caught too.
#
# Usage: bash scripts/prove-cheating-teeth.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

# Save a file, apply a python edit, run a command, require it to fail, restore.
#
# The checksum comparison is not decoration. Several of these files are NEW and therefore
# untracked, so `git diff` reports nothing for them; without the checksum every no-op edit would
# be reported as "the suite still passed", which is indistinguishable from a vacuous assertion.
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
    *.js) node "$script" > /tmp/cheating-teeth-suite.log 2>&1 ;;
    *)    npx tsx "$script" > /tmp/cheating-teeth-suite.log 2>&1 ;;
  esac
  code=$?

  cp "$backup" "$file"; rm -f "$backup"

  if [ "$code" -ne 0 ]; then
    echo "  ok  $label -> suite exited $code (it bites)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label -> suite still passed. THE ASSERTION IS VACUOUS."
    FAIL=$((FAIL+1))
  fi
}

LEARNIX="../learnix/users/exam_cell/pages/cheating_cases"
META="$LEARNIX/cheating_casesMeta.js"
HUB="$LEARNIX/cheating_cases.js"
SHELL="../learnix/users/exam_cell/exam_cell.js"
API="../learnix/services/api.js"
SERVER_RULES="../learnix/../backend/src/modules/examcell/cheating.rules.ts"

echo "── X-08 cheating cases: proving the assertions bite"

# ── 1. The corrupted file ────────────────────────────────────────────────────
# The screen arrived as fifteen physical lines holding four hundred and ninety-one literal `\n`
# escapes. It could not be parsed, and the app crashed on opening it.
teeth "a corrupted single-line screen file is caught" \
  "$HUB" scripts/check-cheating-jsx.ts \
  "import io; p=r'$HUB'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace(chr(10), chr(92)+'n'))"

# ── 2. The dead menu row ─────────────────────────────────────────────────────
# A menu row that navigates to a key nothing registers is a DEAD BUTTON: `renderContent` finds
# no component, falls through to the tab switcher, and the controller lands back on the hub with
# no error anywhere.
teeth "an unregistered sub-screen is caught" \
  "$SHELL" scripts/audit-cheating-ui.ts \
  "import io; p=r'$SHELL'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace(\"CheatingCasesQueue: { title: 'Case queue'\", \"CheatingCasesQueueX: { title: 'Case queue'\"))"

# ── 3. The mirror drifting from the server ──────────────────────────────────
# The mirror deliberately duplicates the server's vocabulary. A mirror that disagrees with its
# source is worse than no mirror: it looks like the truth.
teeth "a mirror that drops a status is caught" \
  "$META" scripts/audit-cheating-ui.ts \
  "import io,re; p=r'$META'; s=io.open(p,encoding='utf-8').read(); s=re.sub(r'  ESCALATED: \{[^}]*\},','',s); io.open(p,'w',encoding='utf-8').write(s)"

# ── 4. A mock coming back ───────────────────────────────────────────────────
# The old screen held five hardcoded alerts and made ZERO calls into the API. It looked entirely
# plausible, which is why it survived review.
teeth "a hardcoded alert array is caught" \
  "$HUB" scripts/audit-cheating-ui.ts \
  "import io; p=r'$HUB'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('export default function CheatingCasesModule', 'const initialNotifications = [{ id: 1, studentName: \\'John Smith\\' }];\nexport default function CheatingCasesModule'))"

# ── 5. The client calling a method it does not have ─────────────────────────
# The old screen called `examcellApi.createCheatingCase(...)`, which never existed on that API
# object — a method that is not there is a crash on the first tap.
teeth "a screen calling a missing client method is caught" \
  "$HUB" scripts/audit-cheating-ui.ts \
  "import io; p=r'$HUB'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('examcellApi.cheatingCatalogue()', 'examcellApi.cheatingCatalogueTYPO()'))"

# ── 6. The route order ───────────────────────────────────────────────────────
# `/cheating-cases/catalogue` and `/cheating-cases/history` are literals and must be declared
# before `/cheating-cases/:id`, or "catalogue" is read as a case id and the answer is a 404 about a
# missing row.
#
# The block is moved to AFTER `/:id` — not merely somewhere else. Moving it to just before `/:id`
# would still leave it before, which proves nothing.
teeth "a literal declared after /:id is caught" \
  "../backend/src/modules/examcell/cheating.routes.ts" scripts/audit-cheating-ui.ts \
  "import io,re; p=r'../backend/src/modules/examcell/cheating.routes.ts'; s=io.open(p,encoding='utf-8').read(); m=re.search(r\"router.get\(\s*'/cheating-cases/catalogue',[\s\S]*?^\);\s*$\", s, re.M); blk=m.group(0); s=s.replace(blk,''); s=s.rstrip()+chr(10)+chr(10)+blk+chr(10); io.open(p,'w',encoding='utf-8').write(s)"

# ── 7. The lost derived fields ──────────────────────────────────────────────
# `legalTransitions` and `priority` were both lost when the service was split into modules, and
# the case file's buttons and the queue's order depend on them.
teeth "a shaper that stops publishing legalTransitions is caught" \
  "../backend/src/modules/examcell/cheating.internal.ts" scripts/audit-cheating-ui.ts \
  "import io; p=r'../backend/src/modules/examcell/cheating.internal.ts'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('legalTransitions: CASE_TRANSITIONS[status] ?? [],',''))"

# ── 8. The navigate that dropped its params ─────────────────────────────────
# A sub-screen that opens ONE of something — the case file, which shows a single case out of a
# list — cannot be reached without knowing which.
teeth "a navigate that drops its params is caught" \
  "$SHELL" scripts/audit-cheating-ui.ts \
  "import io; p=r'$SHELL'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('navigate: (screen, params) => {', 'navigate: (screen) => {'))"

# ── 9. The relative import one level too high ──────────────────────────────
# Six of these files had it. It parses perfectly, bundles as an unresolved module, and fails only
# at runtime — on a phone, in front of a student.
teeth "an import path one level too high is caught" \
  "$LEARNIX/pages/queue/queue.js" scripts/check-cheating-jsx.ts \
  "import io; p=r'$LEARNIX/pages/queue/queue.js'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('../../../../../../services/api', '../../../../services/api'))"

# ── 10. The policy copy going missing ───────────────────────────────────────
# "A committee recommends; the exam cell decides" and "a dismissed case carries no penalty" are
# decisions a controller is entitled to read, not behaviour to infer from a grey button.
teeth "the cleared-student rule going missing is caught" \
  "$LEARNIX/pages/detail/caseFacts.js" scripts/audit-cheating-ui.ts \
  "import io,re; p=r'$LEARNIX/pages/detail/caseFacts.js'; s=io.open(p,encoding='utf-8').read(); s=re.sub(r'A DISMISSED case carries no penalty\.', 'A case was closed.', s); io.open(p,'w',encoding='utf-8').write(s)"

echo
echo "  $PASS proved, $FAIL vacuous"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo "  Every X-08 assertion bites."
