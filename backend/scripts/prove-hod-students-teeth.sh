#!/usr/bin/env bash
# HD-05 — The HOD's Students desk: teeth proof.
#
# A test suite that passes proves nothing unless it CAN fail. Each case below breaks one specific
# fix, runs the suite that is supposed to catch it, and requires a NON-ZERO exit. The code is
# restored afterwards, so a case that "broke" the file rather than the fix is caught too.
#
# WHY THE PYTHON EDIT COMES FROM A HEREDOC AND NOT FROM `python -c`
# ----------------------------------------------------------------------
# Because a double-quoted bash string expands `$`, and a python program that mentions a colour
# like '#dc2626' inside one is silently rewritten to '#c2626' before python ever sees it. The edit
# then changes nothing, the suite passes, and the case reports a VACUOUS assertion — which is
# worse than no case at all, because it looks like coverage.
#
# The checksum is taken on the NORMALISED content: python's text-mode write converts LF to CRLF on
# this platform, so a byte checksum would report a change for a file whose content did not change
# and every case would look like it had bitten when it had edited nothing.
#
# Usage: bash scripts/prove-hod-students-teeth.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

teeth() {
  local label="$1" file="$2" script="$3"
  local backup py; backup="$(mktemp)"; py="$(mktemp --suffix=.py)"
  cp "$file" "$backup"

  cat > "$py"

  local before_sum after_sum
  before_sum="$(tr -d '\r' < "$file" | md5sum | cut -d' ' -f1)"

  if ! TEETH_FILE="$file" PYTHONIOENCODING=utf-8 python "$py"; then
    echo "  SETUP-FAIL $label (the edit script errored)"
    FAIL=$((FAIL+1)); cp "$backup" "$file"; rm -f "$backup" "$py"; return
  fi

  after_sum="$(tr -d '\r' < "$file" | md5sum | cut -d' ' -f1)"
  if [ "$before_sum" = "$after_sum" ]; then
    echo "  SETUP-FAIL $label (the edit did not change the file - the pattern no longer matches)"
    FAIL=$((FAIL+1)); cp "$backup" "$file"; rm -f "$backup" "$py"; return
  fi

  local code
  case "$script" in
    *.js) node "$script" > /tmp/hod-students-teeth-suite.log 2>&1 ;;
    *)    npx tsx "$script" > /tmp/hod-students-teeth-suite.log 2>&1 ;;
  esac
  code=$?

  # A case that breaks a SECOND file saves it beside itself as `<file>.teethbak`, and those are
  # restored here. A case that left a second file broken would poison the next run.
  for extra in "$(dirname "$file")"/*.teethbak; do
    [ -e "$extra" ] || continue
    local orig="${extra%.teethbak}"
    cp "$extra" "$orig"
    rm -f "$extra"
  done

  cp "$backup" "$file"; rm -f "$backup" "$py"

  if [ "$code" -ne 0 ]; then
    echo "  ok  $label -> suite exited $code (it bites)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label -> suite still passed. THE ASSERTION IS VACUOUS."
    FAIL=$((FAIL+1))
  fi
}

SS="../learnix/users/hod/pages/students"
SCREEN="$SS/students.js"
META="$SS/studentsMeta.js"
ATRISK="$SS/studentsAtRisk.js"
INTERV="$SS/studentsInterventions.js"
DETAIL="$SS/studentsDetail.js"
SHELL="../learnix/users/hod/hod.js"
API="../learnix/services/api.js"
RULES="src/modules/hod/hod-students.rules.ts"
FIGURES="src/modules/hod/hod-students.figures.ts"
SMART="src/modules/hod/hod-students.smart.ts"
SCOPE="src/modules/hod/hod-students.scope.ts"
ROUTES="src/modules/hod/hod-students.routes.ts"
SVCDETAIL="src/modules/hod/hod-students.detail.ts"
APP="src/app.ts"

echo "-- HD-05 HOD Students desk: proving the assertions bite"

# ═══ 1. The corrupted file ═════════════════════════════════════════════════
teeth "a corrupted single-line screen file is caught" \
  "$SCREEN" scripts/check-hod-faculty-jsx.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
io.open(p, 'w', encoding='utf-8').write(s.replace(chr(10), chr(92) + 'n'))
PY

# ═══ 2. The unreachable screen ══════════════════════════════════════════════
# A module missing from `FEATURE_MODULES` renders NOTHING: `renderContent` finds no component,
# falls through to the tab switcher, and the HOD lands back on the Students tab with no error.
teeth "an unregistered student detail is caught" \
  "$SHELL" scripts/audit-hod-students-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("StudentDetail: { title: 'Student', icon: 'school-outline', component: StudentDetailScreen },\n", '')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 3. The param channel going missing ═════════════════════════════════════
# Without the params the detail screen cannot know WHICH student it is showing, so the screen is
# registered and still useless.
teeth "a student detail that receives no params is caught" \
  "$SHELL" scripts/audit-hod-students-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('route={{ params: screenParams }}', 'route={{}}')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 4. The mirror dropping a signal ════════════════════════════════════════
# The mirror deliberately duplicates the server's vocabulary. A mirror that disagrees with its
# source is worse than no mirror: it looks like the truth.
teeth "a mirror that drops a risk signal is caught" \
  "$META" scripts/audit-hod-students-ui.ts <<'PY'
import io, os, re
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = re.sub(r"  \{\s*id: 'REPEATED_ABSENCE',[\s\S]*?\n  \},\n", '', s, count=1)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 5. The mirror changing a colour ═══════════════════════════════════════
# A mirror that paints an AT RISK student in green is exactly the drift the colour check exists
# for.
teeth "a mirror that changes a risk colour is caught" \
  "$META" scripts/audit-hod-students-ui.ts <<'PY'
import io, os, re
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
# The SIGNAL colours are literals in the mirror's list, so the literal is what has to change — and
# EVERY one of them, in both the list form and the object form, because the client keeps the
# colour in more than one place and the check is about the palette as a whole.
s = re.sub(r"color: '#dc2626'", "color: '#94a3b8'", s)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 6. The mirror changing a weight ═══════════════════════════════════════
# A mirror that scores a student differently from the server is a mirror that shows a student in
# trouble as being fine.
teeth "a mirror that changes a signal weight is caught" \
  "$META" scripts/audit-hod-students-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('weight: 0.25,', 'weight: 0.5,')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 7. The client calling a method it does not have ═══════════════════════
# A method that is not on the API object is a crash on the first render.
teeth "a screen calling a missing client method is caught" \
  "$SCREEN" scripts/audit-hod-students-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('hodApi.studentsDirectory(', 'hodApi.studentsDirectoryTYPO(')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 8. The server ceding the vocabulary ════════════════════════════════════
# The catalogue is the server's list and the mirror is the FALLBACK. A screen that keeps its own
# list has two lists, and they drift.
teeth "a screen that stops fetching the catalogue is caught" \
  "$SCREEN" scripts/audit-hod-students-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('hodApi.studentsCatalogue()', 'Promise.resolve(null)')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 9. The unmeasured student becoming "on track" ════════════════════════
# A student with nothing measured is not SAFE and not at risk. They are UNMEASURED, and a list of
# students at risk that quietly includes everybody the department knows nothing about is a list
# nobody can act on.
teeth "an unmeasured student that is called on track is caught" \
  "$RULES" scripts/check-hod-students.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("if (!measured) return 'UNMEASURED';", "if (!measured) return 'OK';")
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 10. The serious signal becoming a mild one ═══════════════════════════
# A failed course is serious. Treating it as the same as a missing assignment is how a student
# with a backlog ends up on a WATCH list.
teeth "a serious signal that is downgraded is caught" \
  "$RULES" scripts/check-hod-students.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    "const serious = signals.some(\n    (s) => s !== 'POOR_ASSIGNMENT_COMPLETION' && s !== 'REPEATED_ABSENCE',\n  );",
    "const serious = false;",
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 11. The percentage multiplied by 100 twice ═════════════════════════════
# THE BUG THIS FEATURE SHIPPED WITH. `percentSum` is already a sum of PERCENTAGES, so dividing
# by the count and multiplying by 100 again made every figure a hundred times too big — and the
# skill gap came out at 1130%.
teeth "a percentage that is multiplied by 100 twice is caught" \
  "$FIGURES" scripts/check-hod-students.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'const studentPercent = Math.round(b.percentSum / b.results);',
    'const studentPercent = Math.round((b.percentSum / b.results) * 100);',
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 12. The overdue rule going missing ════════════════════════════════════
# A student cannot have failed to hand in an assignment that is not due yet, and counting one is
# crying wolf about a deadline that has not arrived.
teeth "an assignment that is not due yet counting as poor completion is caught" \
  "$FIGURES" scripts/check-hod-students.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'if (overdueAssignments.length >= POOR_ASSIGNMENT_COUNT) {',
    'if (missingAssignments.length >= POOR_ASSIGNMENT_COUNT) {',
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 13. The department's assignments counting for the student ══════════════
# Using the DEPARTMENT'S assignments would flag every student for work that was never theirs, and
# a signal that fires for everybody is not a signal.
teeth "the department's assignments counting as the student's is caught" \
  "$FIGURES" scripts/check-hod-students.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'const relevantAssignments = scope.assignments.filter(\n    (a) => myOfferingIds.has(a.offeringId) && a.status !== \'DRAFT\',\n  );',
    'const relevantAssignments = scope.assignments.filter((a) => a.status !== \'DRAFT\');',
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 14. The tenancy scope going missing ═══════════════════════════════════
# The student list is filtered by `institutionId` alone, so an HOD would see the next
# department's students in the same college.
teeth "a student query that is institution-scoped is caught" \
  "$SCOPE" scripts/check-hod-students.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'where: { institutionId, programId: { in: programIds }, user: { deletedAt: null } },',
    'where: { institutionId, user: { deletedAt: null } },',
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 15. The suggestion losing its reason ═══════════════════════════════════
# A generic "get help" card for every student is not advice, it is a form letter. The suggestion
# is derived from the signal that FIRED.
teeth "a suggestion that ignores the signal that fired is caught" \
  "$SMART" scripts/check-hod-students.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'if (type.forSignals.some((s) => signals.includes(s))) wanted.add(type.id);',
    'wanted.add(type.id);',
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 16. The old endpoint being replaced under the same name ════════════════
# A caller holding `GET /hod/students` must get the old document, not a quietly different one.
teeth "the old students endpoint being replaced is caught" \
  "$API" scripts/audit-hod-students-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    "students: (year) => api.get(`/hod/students${year ? `?year=${year}` : ''}`),",
    "students: (year) => api.get(`/hod/students/directory${year ? `?year=${year}` : ''}`),",
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 17. The router mounted in the wrong order ═════════════════════════════
# The Students router must be mounted BEFORE the old HOD router, or `/students/directory` never
# reaches it and the whole desk is a 404.
teeth "the Students router mounted after the old one is caught" \
  "$APP" scripts/audit-hod-students-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("app.use('/api/v1/hod', hodStudentsRoutes);", '')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 18. The weak-topics note going missing ═══════════════════════════════
# "The topics of the course they are behind in" is the honest label. Without it, a list of topic
# titles looks like a per-topic score, and the platform has no per-topic marks.
teeth "the weak-topics note going missing is caught" \
  "$SVCDETAIL" scripts/audit-hod-students-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('not a score for each', 'the topics they are weakest in')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 19. The suggestion button going missing ═══════════════════════════════
# A suggestion card that cannot be acted on is a decoration.
teeth "a suggestion that cannot be recorded is caught" \
  "$INTERV" scripts/audit-hod-students-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('Record this intervention', 'Suggested')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 20. The at-risk list losing its order ═════════════════════════════════
# The list is the work, and a HOD reads the top of it. Most signals first, then the lowest
# attendance.
teeth "an at-risk list that stops ordering by signals is caught" \
  "$SMART" scripts/check-hod-students.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'b.risk.signals.length - a.risk.signals.length ||',
    '',
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

echo
echo "  $PASS proved, $FAIL vacuous"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo "  Every HD-05 assertion bites."
