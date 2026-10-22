#!/usr/bin/env bash
# HD-02 — The HOD's Faculty desk: teeth proof.
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
# The checksum is taken on the NORMALISED content: python's text-mode write converts LF to CRLF on
# this platform, so a byte checksum would report a change for a file whose content did not change
# and every case would look like it had bitten when it had edited nothing.
#
# Usage: bash scripts/prove-hod-faculty-teeth.sh
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
    *.js) node "$script" > /tmp/hod-faculty-teeth-suite.log 2>&1 ;;
    *)    npx tsx "$script" > /tmp/hod-faculty-teeth-suite.log 2>&1 ;;
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

FACULTY="../learnix/users/hod/pages/faculty"
SCREEN="$FACULTY/faculty.js"
META="$FACULTY/facultyMeta.js"
UI="$FACULTY/facultyUi.js"
DIR="$FACULTY/facultyDirectory.js"
DETAIL="$FACULTY/facultyDetail.js"
SHELL="../learnix/users/hod/hod.js"
API="../learnix/services/api.js"
RULES="src/modules/hod/hod-faculty.rules.ts"
SVC="src/modules/hod/hod-faculty.service.ts"
SCOPE="src/modules/hod/hod-dashboard.scope.ts"
HOD_SVC="src/modules/hod/hod.service.ts"
ROUTES="src/modules/hod/hod-faculty.routes.ts"
APP="src/app.ts"

echo "-- HD-02 HOD Faculty desk: proving the assertions bite"

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
# falls through to the tab switcher, and the HOD lands back on the Faculty tab with no error.
teeth "an unregistered faculty detail is caught" \
  "$SHELL" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("FacultyDetail: { title: 'Faculty', icon: 'person-outline', component: FacultyDetailScreen },\n", '')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 3. The param channel going missing ═════════════════════════════════════
# Without the params the detail screen cannot know WHICH teacher it is showing, so the screen is
# registered and still useless.
teeth "a faculty detail that receives no params is caught" \
  "$SHELL" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('route={{ params: screenParams }}', 'route={{}}')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 4. The mirror dropping a band ═════════════════════════════════════════
# The mirror deliberately duplicates the server's vocabulary. A mirror that disagrees with its
# source is worse than no mirror: it looks like the truth.
teeth "a mirror that drops a workload band is caught" \
  "$META" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os, re
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = re.sub(r"  \{\s*id: 'UNDERUTILISED',[\s\S]*?\n  \},\n", '', s, count=1)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 5. The mirror changing a colour ═══════════════════════════════════════
# A mirror that paints an OVERLOADED teacher in green is exactly the drift the colour check
# exists for.
teeth "a mirror that changes a workload colour is caught" \
  "$META" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("export const RED = '#dc2626';", "export const RED = '#94a3b8';")
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 6. The mirror changing a weight ═══════════════════════════════════════
# A mirror that scores a teacher differently from the server is a mirror that shows a strong
# teacher as needing support.
teeth "a mirror that changes an insight weight is caught" \
  "$META" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('weight: 0.3,', 'weight: 0.6,')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 7. The client calling a method it does not have ═══════════════════════
# A method that is not on the API object is a crash on the first render.
teeth "a screen calling a missing client method is caught" \
  "$SCREEN" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('hodApi.facultyDirectory(', 'hodApi.facultyDirectoryTYPO(')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 8. The server ceding the vocabulary ════════════════════════════════════
# The catalogue is the server's list and the mirror is the FALLBACK. A screen that keeps its own
# list has two lists, and they drift.
teeth "a screen that stops fetching the catalogue is caught" \
  "$SCREEN" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('hodApi.facultyCatalogue()', 'Promise.resolve(null)')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 9. The insight scoring a missing leg as zero ══════════════════════════
# A leg with no data is EXCLUDED, never scored as zero. Scoring a teacher in their first
# fortnight as failing because they have no attendance yet is a false alarm.
teeth "an insight that scores a missing leg as zero is caught" \
  "$RULES" scripts/check-hod-faculty.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'const scored = legs.filter((l) => l.value !== null && l.value !== undefined);',
    'const scored = legs.map((l) => ({ id: l.id, value: l.value ?? 0 }));',
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 10. The weakest leg going unnamed ══════════════════════════════════════
# A single number a HOD cannot act on is a decoration.
teeth "an insight that stops naming the weakest leg is caught" \
  "$RULES" scripts/check-hod-faculty.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('weakest,', 'weakest: null,')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 11. THE WORKLOAD UNIT GOING BACK TO SLOTS ════════════════════════════
# THE BUG THIS FEATURE FOUND. The cap is `maxWorkloadHours` and the guard compared a SCHEDULE-SLOT
# COUNT against it, so a three-hour lecture counted as one hour and the guard and the screen
# disagreed about the same teacher.
teeth "a reassign guard that counts slots instead of hours is caught" \
  "$HOD_SVC" scripts/check-hod-faculty.ts <<'PY'
import io, os, re
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = re.sub(
    r"  const currentLoad = siblings\.reduce\(\n(?:.*\n)*?  \);",
    "  const currentLoad = siblings.reduce((sum, o) => sum + o.scheduleSlots.length, 0);",
    s,
    count=1,
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 12. The balancer offering a target with no headroom ═══════════════════
# A suggestion that would be refused the moment it was pressed is a bad suggestion, and a HOD who
# learns to ignore the suggestions learns to ignore the screen.
teeth "a balancer that offers a target with no headroom is caught" \
  "$SVC" scripts/check-hod-faculty.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    ".filter((r) => !r.figures.workload.overloaded && r.figures.workload.freeHours >= MIN_FREE_HOURS_TO_SUGGEST)",
    ".filter((r) => !r.figures.workload.overloaded)",
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 13. The availability matrix going missing ════════════════════════════
# The matrix is one of the three smart features, and it is derived from the timetable — a matrix
# that cannot be derived is a matrix that lies.
teeth "an availability matrix that is not derived is caught" \
  "$SVC" scripts/check-hod-faculty.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('availability: buildAvailabilityMatrix(rows),', 'availability: null,')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 14. The progress monitor going missing ════════════════════════════════
teeth "a teaching progress monitor that is not built is caught" \
  "$SVC" scripts/check-hod-faculty.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('progress: buildProgressMonitor(rows),', 'progress: null,')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 15. The tenancy scope going missing ═══════════════════════════════════
# The faculty list is filtered by `institutionId` alone, so an HOD would see the next
# department's teachers in the same college. The department is the boundary, not the college.
#
# THE EDIT BREAKS BOTH LAYERS, AND THAT IS THE POINT. The department boundary is enforced
# TWICE — by the shared scope's query and by the Faculty desk's own re-check — so breaking
# either one alone changes nothing, which is what defence in depth is FOR. The case that proves
# the boundary is real has to break both.
teeth "a faculty query that is institution-scoped is caught" \
  "$SCOPE" scripts/check-hod-faculty.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'where: { institutionId, departmentId: dept.id, user: { deletedAt: null } },',
    'where: { institutionId, user: { deletedAt: null } },',
)
io.open(p, 'w', encoding='utf-8').write(s)

# AND THE FACULTY DESK'S OWN RE-CHECK, which is the second layer.
q = os.path.join(os.path.dirname(p), 'hod-faculty.scope.ts')
io.open(q + '.teethbak', 'w', encoding='utf-8').write(io.open(q, encoding='utf-8').read())
t = io.open(q, encoding='utf-8').read()
t = t.replace(
    'staff: base.staff.filter((s) => s.departmentId === departmentId),',
    'staff: base.staff,',
)
io.open(q, 'w', encoding='utf-8').write(t)
PY

# ═══ 16. The old endpoint being replaced under the same name ════════════════
# A caller holding `GET /hod/faculty` must get the old document, not a quietly different one.
teeth "the old faculty endpoint being replaced is caught" \
  "$API" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("faculty: () => api.get('/hod/faculty'),", "faculty: () => api.get('/hod/faculty/directory'),")
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 17. The router mounted in the wrong order ═════════════════════════════
# The Faculty router must be mounted BEFORE the old HOD router, or `/faculty/directory` never
# reaches it and the whole desk is a 404.
teeth "the Faculty router mounted after the old one is caught" \
  "$APP" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace("app.use('/api/v1/hod', hodFacultyRoutes);", '')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 18. The "no data yet" rule going missing ══════════════════════════════
# "A teacher with no data is unmeasured, not failing" is a decision a HOD is entitled to read,
# not behaviour to infer from a grey box.
teeth "the no-data-is-not-zero rule going missing is caught" \
  "$UI" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('No data yet', 'Failing')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 19. The dead "Add Faculty" button coming back ════════════════════════
# A button that opens an alert is a dead button, and a dead button teaches the reader that the
# screen's controls are decorative.
teeth "a dead Add Faculty button coming back is caught" \
  "$SCREEN" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace('A teacher joins the department through the Admin.', 'You add a teacher here.')
io.open(p, 'w', encoding='utf-8').write(s)
PY

# ═══ 20. The client computing the utilisation itself ═══════════════════════
# A number the client derived is a number the client can get wrong — and the workload unit is
# the obvious place for that to happen.
teeth "a client that computes its own utilisation is caught" \
  "$DIR" scripts/audit-hod-faculty-ui.ts <<'PY'
import io, os
p = os.environ['TEETH_FILE']
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    'percent={faculty.workload?.utilizationPct ?? 0}',
    'percent={(faculty.workload.assignedWeeklyHours / faculty.workload.maxWorkloadHours) * 100}',
)
io.open(p, 'w', encoding='utf-8').write(s)
PY

echo
echo "  $PASS proved, $FAIL vacuous"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo "  Every HD-02 assertion bites."
