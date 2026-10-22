#!/usr/bin/env bash
# HD-06 — The HOD's Courses desk: teeth proof.
#
# A test suite that passes proves nothing unless it CAN fail. Each case below breaks one specific
# fix, runs the suite that is supposed to catch it, and requires a NON-ZERO exit. The code is
# restored afterwards, so a case that "broke" the file rather than the fix is caught too.
#
# WHY THE PYTHON EDIT COMES FROM A HEREDOC AND NOT FROM `python -c`
# ----------------------------------------------------------------------
# Because a double-quoted bash string expands `$`, and a python program that mentions a colour
# like '#dc2626' inside one is silently rewritten to '#c2626' before python ever sees it. The
# edit then changes nothing, the suite passes, and the case reports a VACUOUS assertion — which
# is worse than no case at all, because it looks like coverage.
#
# So the program arrives on STDIN through a QUOTED heredoc, which bash does not expand, and the
# file it edits arrives through the environment.
#
# Usage: bash scripts/prove-hod-courses-teeth.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

# Save a file, apply the python program on stdin, run a command, require it to fail, restore.
#
# The checksum comparison is not decoration, and it is taken on the NORMALISED content: python's
# text-mode write converts LF to CRLF on this platform, so a byte checksum would report a change
# for a file whose content did not change at all — and every case would look like it had bitten
# when it had edited nothing.
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
    *.js) node "$script" > /tmp/hod-courses-teeth-suite.log 2>&1 ;;
    *)    npx tsx "$script" > /tmp/hod-courses-teeth-suite.log 2>&1 ;;
  esac
  code=$?

  cp "$backup" "$file"; rm -f "$backup" "$py"

  if [ "$code" -ne 0 ]; then
    echo "  ok  $label -> suite exited $code (it bites)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label -> suite still passed. THE ASSERTION IS VACUOUS."
    FAIL=$((FAIL+1))
  fi
}

COURSES="../learnix/users/hod/pages/courses"
SCREEN="$COURSES/courses.js"
META="$COURSES/coursesMeta.js"
UI="$COURSES/coursesUi.js"
RESULTS="$COURSES/coursesDetailResults.js"
SHELL="../learnix/users/hod/hod.js"
API="../learnix/services/api.js"
RULES="src/modules/hod/hod-courses.rules.ts"
SCOPE="src/modules/hod/hod-courses.scope.ts"
WRITES="src/modules/hod/hod-courses.writes.ts"
APP="src/app.ts"

echo "-- HD-06 HOD Courses desk: proving the assertions bite"

# ═══ 1. The corrupted file ═════════════════════════════════════════════════
# The screen could arrive as fifteen physical lines holding four hundred and ninety-one literal
# `\n` escapes. It could not be parsed, and the app crashed on opening it.
teeth "a corrupted single-line screen file is caught" \
  "$SCREEN" scripts/check-hod-courses-jsx.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
io.open(p, 'w', encoding='utf-8').write(s.replace(chr(10), chr(92) + 'n'))
PY

# ═══ 2. The unreachable screen ══════════════════════════════════════════════
# A module missing from `FEATURE_MODULES` renders NOTHING: `renderContent` finds no component,
# falls through to the tab switcher, and the HOD lands back on the Courses tab with no error
# anywhere. That is exactly how the OLD course detail was unreachable.
teeth "an unregistered course detail is caught" \
  "$SHELL" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("CourseDetail: { title: 'Course', icon: 'book-outline', component: CourseDetailScreen },\n", '')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 3. The param channel going missing ═════════════════════════════════════
# Without the params the detail screen cannot know WHICH course it is showing, so the screen is
# registered and still useless.
teeth "a course detail that receives no params is caught" \
  "$SHELL" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('route={{ params: screenParams }}', 'route={{}}')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 4. The mirror dropping a status ════════════════════════════════════════
# The mirror deliberately duplicates the server's vocabulary. A mirror that disagrees with its
# source is worse than no mirror: it looks like the truth.
#
# The edit removes the status from the LIST — not just the word, because a mirror that still
# mentions 'ARCHIVED' in a comparison is not a mirror that still HAS the status.
teeth "a mirror that drops a course status is caught" \
  "$META" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os, re
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = re.sub(r"  \{\s*id: 'ARCHIVED',[\s\S]*?\n  \},\n", '', s, count=1)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 5. The mirror changing a colour ═══════════════════════════════════════
# A mirror that paints an AT RISK course in green is exactly the drift the colour check exists
# for. The edit moves the RED constant itself, because the bands and the chips both read it.
teeth "a mirror that changes a health colour is caught" \
  "$META" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("export const RED = '#dc2626';", "export const RED = '#94a3b8';")
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 6. The mirror changing a weight ═══════════════════════════════════════
# A mirror that scores a course differently from the server is a mirror that shows a healthy
# course as being at risk.
teeth "a mirror that changes a health weight is caught" \
  "$META" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('weight: 0.35,', 'weight: 0.5,')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 7. The client calling a method it does not have ═══════════════════════
# A method that is not on the API object is a crash on the first render.
teeth "a screen calling a missing client method is caught" \
  "$SCREEN" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('hodApi.coursesDirectory(', 'hodApi.coursesDirectoryTYPO(')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 8. The server ceding the vocabulary ════════════════════════════════════
# The catalogue is the server's list and the mirror is the FALLBACK. A screen that keeps its own
# list has two lists, and they drift.
teeth "a screen that stops fetching the catalogue is caught" \
  "$SCREEN" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('hodApi.coursesCatalogue()', 'Promise.resolve(null)')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 9. The health score scoring a missing leg as zero ══════════════════════
# A leg with no data is EXCLUDED, never scored as zero. Scoring a brand-new course's missing
# results as zero would report it as failing, and confidently so.
teeth "a health score that scores a missing leg as zero is caught" \
  "$RULES" scripts/check-hod-courses.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'const scored = components.filter((c) => c.value !== null && c.value !== undefined);',
    'const scored = components.map((c) => ({ id: c.id, value: c.value ?? 0 }));',
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 10. The weakest leg going unnamed ══════════════════════════════════════
# A single number a HOD cannot act on is a decoration.
teeth "a health score that stops naming the weakest leg is caught" \
  "$RULES" scripts/check-hod-courses.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('weakest,', 'weakest: null,')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 11. An unmeasured course being banded AT_RISK ═════════════════════════
# A course with no data is NOT an unhealthy course. Banding it AT_RISK is a false alarm that
# teaches the reader to ignore the alarm colour.
teeth "an unmeasured course that is banded AT_RISK is caught" \
  "$RULES" scripts/check-hod-courses.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('band: null,', "band: 'AT_RISK',")
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 12. The tenancy scope going missing ═══════════════════════════════════
# The course list is filtered by `institutionId` alone, so an HOD could see — and ARCHIVE —
# another department's courses. The suite proves it with a COLLEAGUE DEPARTMENT IN THE SAME
# INSTITUTION, because a cross-institution check passes even when the scope is institution-wide.
teeth "a course query that is institution-scoped is caught" \
  "$SCOPE" scripts/check-hod-courses.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('where: { institutionId, departmentId },', 'where: { institutionId },')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 13. The curriculum mapping escaping the department ═════════════════════
# A course must not be mapped into another department's programme.
teeth "a curriculum mapping into another department is caught" \
  "$WRITES" scripts/check-hod-courses.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'const program = scope.programs.find((p) => p.id === programId);',
    "const program = await prisma.program.findFirst({ where: { id: programId }, select: { id: true, name: true, code: true, level: true } });",
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 14. The prerequisite loop check going missing ══════════════════════════
# A course that demands a course that demands IT is a graph with no answer, and "what must come
# first" becomes unanswerable.
teeth "a prerequisite loop that is allowed is caught" \
  "$WRITES" scripts/check-hod-courses.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('await assertNoPrerequisiteCycle(scope, courseId, prerequisiteCourseId);', '')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 15. The audit trail going missing ══════════════════════════════════════
# The course's HISTORY panel reads the audit table, so the trail is the feature and not a side
# effect.
teeth "an unaudited course edit is caught" \
  "$WRITES" scripts/check-hod-courses.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("action: 'COURSE_UPDATED',", "action: 'COURSE_TOUCHED',")
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 16. The old endpoint being replaced under the same name ════════════════
# A caller holding `GET /hod/courses` must get the old document, not a quietly different one.
teeth "the old courses endpoint being replaced is caught" \
  "$API" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("courses: () => api.get('/hod/courses'),", "courses: () => api.get('/hod/courses/directory'),")
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 17. The router mounted in the wrong order ═════════════════════════════
# The Courses router must be mounted BEFORE the old HOD router, or `/courses/directory` never
# reaches it and the whole desk is a 404.
teeth "the Courses router mounted after the old one is caught" \
  "$APP" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("app.use('/api/v1/hod', hodCoursesRoutes);", '')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 18. The client computing a figure of its own ══════════════════════════
# A number the client derived is a number the client can get wrong.
teeth "a client that computes its own grade share is caught" \
  "$RESULTS" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('width: `${g.percent}%`,', 'width: `${Math.round((g.count / p.results) * 100)}%`,')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 19. The "no data yet" rule going missing ═══════════════════════════════
# "A course with no data is unmeasured, not unhealthy" is a decision a HOD is entitled to read,
# not behaviour to infer from a grey box.
teeth "the no-data-is-not-zero rule going missing is caught" \
  "$UI" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('No data yet', 'At risk')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 20. The dead "New Course" button coming back ═════════════════════════
# A button that opens an alert is a dead button, and a dead button teaches the reader that the
# screen's controls are decorative.
teeth "a dead New Course button coming back is caught" \
  "$SCREEN" scripts/audit-hod-courses-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('A course is created by the Admin.', 'A course is created by you.')
io.open(p, 'w', encoding='utf-8').write(s)
PY

echo
echo "  $PASS proved, $FAIL vacuous"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo "  Every HD-06 assertion bites."
