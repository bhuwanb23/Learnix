#!/usr/bin/env bash
# X-11 — The exam cell dashboard and mark-roll: teeth proof.
#
# A test suite that passes proves nothing unless it CAN fail. Each case below breaks one
# specific fix, runs the suite that is supposed to catch it, and requires a NON-ZERO exit. The
# code is restored afterwards and the suite re-run, so a case that "broke" the file rather than
# the fix is caught too.
#
# Usage: bash scripts/prove-examcell-dashboard-teeth.sh
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
    echo "  SETUP-FAIL $label (the edit did not change the file - the pattern no longer matches)"
    FAIL=$((FAIL+1)); rm -f "$backup"; return
  fi

  local code
  case "$script" in
    *.js) node "$script" > /tmp/examcell-dashboard-teeth-suite.log 2>&1 ;;
    *)    npx tsx "$script" > /tmp/examcell-dashboard-teeth-suite.log 2>&1 ;;
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

# Some cases break something by CREATING a file rather than by editing one. The restore above puts
# back the file it edited, but a file it CREATED would survive the run and poison the next one — so
# every path this script may have created is removed after the whole run.
cleanup_created() {
  rm -rf "../learnix/users/exam_cell/pages/dashboard/constants"
}

DASH="../learnix/users/exam_cell/pages/dashboard"
ATT="../learnix/users/exam_cell/pages/attendance"
SHELL="../learnix/users/exam_cell/exam_cell.js"
API="../learnix/services/api.js"
RULES="src/modules/examcell/examcell-dashboard.rules.ts"
SECTIONS="src/modules/examcell/examcell-dashboard.sections.ts"
ACTIONS="src/modules/examcell/examcell-dashboard.actions.ts"
ATT_RULES="src/modules/examcell/attendance.rules.ts"
ATT_SERVICE="src/modules/examcell/attendance.service.ts"

echo "-- X-11 exam cell dashboard: proving the assertions bite"

# -- 1. The corrupted file ----------------------------------------------------
# The screen arrived as fifteen physical lines holding four hundred and ninety-one literal `\n`
# escapes. It could not be parsed, and the app crashed on opening it.
teeth "a corrupted single-line screen file is caught" \
  "$DASH/dashboard.js" scripts/check-examcell-dashboard-jsx.ts \
  "import io; p=r'$DASH/dashboard.js'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace(chr(10), chr(92)+'n'))"

# -- 2. The dead menu row -----------------------------------------------------
# The mark-roll screen that is never registered is DEAD CODE: `renderContent` finds no component,
# falls through to the tab switcher, and the officer lands back on the dashboard with no error.
teeth "an unregistered mark-roll screen is caught" \
  "$SHELL" scripts/audit-examcell-dashboard-ui.ts \
  "import io; p=r'$SHELL'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('ExamAttendance: {', 'ExamAttendanceX: {'))"

# -- 3. The mirror drifting from the server -----------------------------------
# The mirror deliberately duplicates the server's vocabulary. A mirror that disagrees with its
# source is worse than no mirror: it looks like the truth.
teeth "a mirror that drops a section is caught" \
  "$DASH/dashboardMeta.js" scripts/audit-examcell-dashboard-ui.ts \
  "import io,re; p=r'$DASH/dashboardMeta.js'; s=io.open(p,encoding='utf-8').read(); s=re.sub(r\"  \{\s*id: 'PERFORMANCE_SNAPSHOT',[\s\S]*?order: 7,\s*\},?\", '', s); io.open(p,'w',encoding='utf-8').write(s)"

# -- 4. A mock coming back ---------------------------------------------------
# The old dashboard held a `constants/dashboardData.js` with hardcoded figures - "12", "97",
# "Dr. R. Menon" - imported by NOTHING. Dead mock data is worse than none: it reads like an
# answer.
teeth "the dead mock file coming back is caught" \
  "$DASH/dashboard.js" scripts/audit-examcell-dashboard-ui.ts \
  "import io,os; p=r'$DASH/dashboard.js'; s=io.open(p,encoding='utf-8').read(); d=r'$DASH/constants'; os.makedirs(d,exist_ok=True); io.open(os.path.join(d,'dashboardData.js'),'w',encoding='utf-8').write('export const EXAM_STATS = [{ id: \\'x\\', value: \\'12\\' }];'); io.open(p,'w',encoding='utf-8').write(s)"

# -- 5. The client calling a method it does not have -------------------------
# A method that is not on the API object is a crash on the first render.
teeth "a screen calling a missing client method is caught" \
  "$DASH/dashboard.js" scripts/audit-examcell-dashboard-ui.ts \
  "import io; p=r'$DASH/dashboard.js'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('examcellApi.dashboardOverview()', 'examcellApi.dashboardOverviewTYPO()'))"

# -- 6. The old dashboard coming back ----------------------------------------
# The old route served a flat hero-and-stats shape. A caller holding it must get a 404, not a
# quietly different document.
teeth "the old flat dashboard route coming back is caught" \
  "src/modules/examcell/examcell.routes.ts" scripts/verify-examcell-dashboard-http.ts \
  "import io; p=r'src/modules/examcell/examcell.routes.ts'; s=io.open(p,encoding='utf-8').read(); blk=chr(10)+'router.get('+chr(39)+'/dashboard'+chr(39)+', wrap(async (req, res) => {'+chr(10)+'  res.json({ data: { hero: {}, stats: {} } });'+chr(10)+'}));'+chr(10); io.open(p,'w',encoding='utf-8').write(s.replace('// X-09 notifications + X-10 profile', blk+chr(10)+'// X-09 notifications + X-10 profile'))"

# -- 7. The old client method coming back -------------------------------------
teeth "the old client dashboard method coming back is caught" \
  "$API" scripts/audit-examcell-dashboard-ui.ts \
  "import io; p=r'$API'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('export const examcellApi = {', 'export const examcellApi = {'+chr(10)+'  dashboard: () => api.get('+chr(39)+'/examcell/dashboard'+chr(39)+'),'))"

# -- 8. The three exam statuses coming back ----------------------------------
# The old dashboard counted ONGOING, SCHEDULED and COMPLETED and left DRAFT and PUBLISHED
# INVISIBLE. An officer reading "0 ongoing" could not tell whether that meant "none running" or
# "the dashboard does not count that".
teeth "a dashboard that stops counting DRAFT is caught" \
  "$SECTIONS" scripts/check-examcell-dashboard.ts \
  "import io; p=r'$SECTIONS'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('for (const s of EXAM_STATUSES) counts[s] = 0;', 'for (const s of [chr(39)+chr(39)].slice(0,0)) counts[s] = 0;'.replace(chr(39)+chr(39), 'DRAFT')))"

# -- 9. The one open case status coming back ---------------------------------
# The open set is REPORTED | UNDER_REVIEW | COMMITTEE_REVIEW | ESCALATED. The old dashboard counted
# only UNDER_REVIEW, so three of the four were invisible.
teeth "a dashboard that counts only UNDER_REVIEW is caught" \
  "$ACTIONS" scripts/check-examcell-dashboard.ts \
  "import io; p=r'$ACTIONS'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace(\"const OPEN_CASE_STATUSES = ['REPORTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'ESCALATED'] as const;\", \"const OPEN_CASE_STATUSES = ['UNDER_REVIEW'] as const;\"))"

# -- 10. Unmarked folded into absent ----------------------------------------
# A paper nobody has marked is not a paper full of absentees. The roll has THREE labels, and
# collapsing UNMARKED into ABSENT is the exact conflation the feature exists to prevent.
teeth "a roll that folds UNMARKED into ABSENT is caught" \
  "$ATT_RULES" scripts/check-examcell-attendance.ts \
  "import io; p=r'$ATT_RULES'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace(\"export const ROLL_ROW_STATES = ['PRESENT', 'ABSENT', 'UNMARKED'] as const;\", \"export const ROLL_ROW_STATES = ['PRESENT', 'ABSENT'] as const;\"))"

# -- 11. The mute that stops suppressing -------------------------------------
# A muted category must write NO ROW. If the delivery path started writing a row and filtering it
# out, the unread badge would count rows the recipient cannot see.
teeth "a roll that stops reporting an unmarked student is caught" \
  "$ATT_SERVICE" scripts/check-examcell-attendance.ts \
  "import io; p=r'$ATT_SERVICE'; s=io.open(p,encoding='utf-8').read(); s=s.replace(chr(63)+chr(63)+' '+chr(39)+'UNMARKED'+chr(39), chr(63)+chr(63)+' '+chr(39)+'ABSENT'+chr(39)); io.open(p,'w',encoding='utf-8').write(s)"

# -- 12. The student who is not on the roll being accepted -------------------
# A roll that silently accepts a name from nowhere is a roll that can be padded, and the absence
# count is what a college is reported on.
teeth "a roll that accepts a student from nowhere is caught" \
  "$ATT_SERVICE" scripts/check-examcell-attendance.ts \
  "import io; p=r'$ATT_SERVICE'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('if (offRoll.length > 0) {', 'if (false) {'))"

# -- 13. The relative import one level too high ------------------------------
# It parses perfectly, bundles as an unresolved module, and fails only at runtime - on a phone, in
# front of a student.
teeth "an import path one level too high is caught" \
  "$ATT/attendance.js" scripts/check-examcell-dashboard-jsx.ts \
  "import io; p=r'$ATT/attendance.js'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('../../../../services/api', '../../../../../../services/api'))"

# -- 14. The policy copy going missing ---------------------------------------
# "A zero is clear, not alarming" and "not marked is not absent" are decisions a controller is
# entitled to read, not behaviour to infer from a grey box.
teeth "the not-marked-is-not-absent rule going missing is caught" \
  "$DASH/dashboardState.js" scripts/audit-examcell-dashboard-ui.ts \
  "import io,re; p=r'$DASH/dashboardState.js'; s=io.open(p,encoding='utf-8').read(); s=re.sub(r'That is not an absence\.', 'That is fine.', s); io.open(p,'w',encoding='utf-8').write(s)"

# -- 15. The bulk write becoming one-per-student ----------------------------
# An invigilator takes the roll on a phone in a room. One request per student is a form per
# student, and it is the difference between a mark-roll that works and one that does not.
teeth "a mark-roll that submits one request per student is caught" \
  "$ATT/attendance.js" scripts/audit-examcell-dashboard-ui.ts \
  "import io; p=r'$ATT/attendance.js'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('marks: entries.map(([studentProfileId, state]) => ({ studentProfileId, state })),', 'marks: entries[0] ? [{ studentProfileId: entries[0][0], state: entries[0][1] }] : [],'))"

echo
cleanup_created
echo "  $PASS proved, $FAIL vacuous"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo "  Every X-11 assertion bites."
