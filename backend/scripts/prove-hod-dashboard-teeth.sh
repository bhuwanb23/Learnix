#!/usr/bin/env bash
# HD-01 — The HOD dashboard: teeth proof.
#
# A test suite that passes proves nothing unless it CAN fail. Each case below breaks one specific
# fix, runs the suite that is supposed to catch it, and requires a NON-ZERO exit. The code is
# restored afterwards, so a case that "broke" the file rather than the fix is caught too.
#
# Usage: bash scripts/prove-hod-dashboard-teeth.sh
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
    *.js) node "$script" > /tmp/hod-dashboard-teeth-suite.log 2>&1 ;;
    *)    npx tsx "$script" > /tmp/hod-dashboard-teeth-suite.log 2>&1 ;;
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

DASH="../learnix/users/hod/pages/dashboard"
META="$DASH/dashboardMeta.js"
SCREEN="$DASH/dashboard.js"
ACTIONS="$DASH/dashboardActions.js"
WORKLOAD="$DASH/dashboardWorkload.js"
SHELL="../learnix/users/hod/hod.js"
API="../learnix/services/api.js"
SVC="src/modules/hod/hod.service.ts"
HOD_ROUTES="src/modules/hod/hod.routes.ts"
ACTIONS_SVC="src/modules/hod/hod-dashboard.actions.ts"
RULES="src/modules/hod/hod-dashboard.rules.ts"
HEALTH="src/modules/hod/hod-dashboard.health.ts"

echo "-- HD-01 HOD dashboard: proving the assertions bite"

# ── 1. The corrupted file ────────────────────────────────────────────────────
# The screen arrived as fifteen physical lines holding four hundred and ninety-one literal `\n`
# escapes. It could not be parsed, and the app crashed on opening it.
teeth "a corrupted single-line screen file is caught" \
  "$SCREEN" scripts/check-hod-dashboard-jsx.ts \
  "import io; p=r'$SCREEN'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace(chr(10), chr(92)+'n'))"

# ── 2. A dead quick action ──────────────────────────────────────────────────
# A quick action pointing at a key nothing registers is a DEAD BUTTON: `renderContent` finds no
# component, falls through to the tab switcher, and the HOD lands back on the hub with no error
# anywhere.
teeth "a quick action pointing at a section instead of a screen is caught" \
  "$META" scripts/audit-hod-dashboard-ui.ts \
  "import io; p=r'$META'; s=io.open(p,encoding='utf-8').read(); s=s.replace(\"route: 'Leave',\", \"route: 'AttendanceSnapshot',\"); io.open(p,'w',encoding='utf-8').write(s)"

# ── 3. The mirror drifting from the server ──────────────────────────────────
# The mirror deliberately duplicates the server's vocabulary. A mirror that disagrees with its
# source is worse than no mirror: it looks like the truth.
teeth "a mirror that drops an alert kind is caught" \
  "$META" scripts/audit-hod-dashboard-ui.ts \
  "import io,re; p=r'$META'; s=io.open(p,encoding='utf-8').read(); s=re.sub(r\"    id: 'STALLED_SYLLABUS',[\s\S]*?isTab: false,\n  \},\n\", '', s); io.open(p,'w',encoding='utf-8').write(s)"

# ── 4. A mirror that disagrees about a COLOUR ────────────────────────────────
# A mirror that paints a HIGH alert in green is exactly the drift the colour check exists for.
teeth "a mirror that changes a colour is caught" \
  "$META" scripts/audit-hod-dashboard-ui.ts \
  "import io; p=r'$META'; s=io.open(p,encoding='utf-8').read(); s=s.replace(\"color: '#b91c1c',\", \"color: '#94a3b8',\"); io.open(p,'w',encoding='utf-8').write(s)"

# ── 5. The client calling a method it does not have ──────────────────────────
# A method that is not on the API object is a crash on the first render.
teeth "a screen calling a missing client method is caught" \
  "$SCREEN" scripts/audit-hod-dashboard-ui.ts \
  "import io; p=r'$SCREEN'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('hodApi.dashboardOverview()', 'hodApi.dashboardOverviewTYPO()'))"

# ── 6. The old client method coming back ─────────────────────────────────────
teeth "the old client dashboard method coming back is caught" \
  "$API" scripts/audit-hod-dashboard-ui.ts \
  "import io; p=r'$API'; s=io.open(p,encoding='utf-8').read(); io.open(p,'w',encoding='utf-8').write(s.replace('export const hodApi = {', 'export const hodApi = {'+chr(10)+'  dashboard: () => api.get('+chr(39)+'/hod/dashboard'+chr(39)+'),'))"

# ── 7. A section that stops computing its own data ───────────────────────────
# The screen draws what the server sent. A section that aggregates the rows itself is a second
# place for a figure to be wrong — and the audit asserts that no section calls `.reduce(`.
teeth "a section that aggregates the data itself is caught" \
  "$WORKLOAD" scripts/audit-hod-dashboard-ui.ts \
  "import io; p=r'$WORKLOAD'; s=io.open(p,encoding='utf-8').read(); s=s.replace('const r = data?.risk;', 'const r = (data?.risk ?? {}).reduce((acc, k) => ({ ...acc, [k]: acc[k] }), data?.risk);'); io.open(p,'w',encoding='utf-8').write(s)"

# ── 8. The policy copy going missing ─────────────────────────────────────────
# "An unmarked student is not an absent one" is a decision a HOD is entitled to read, not
# behaviour to infer from a grey box.
teeth "the not-marked-is-not-absent rule going missing is caught" \
  "$WORKLOAD" scripts/audit-hod-dashboard-ui.ts \
  "import io,re; p=r'$WORKLOAD'; s=io.open(p,encoding='utf-8').read(); s=re.sub(r'An unmarked student is not an absent one', 'An unmarked student is fine.', s); io.open(p,'w',encoding='utf-8').write(s)"

# ── 9. The health score's "no data" rule going missing ──────────────────────
# A component with no data is EXCLUDED, never scored as zero. Scoring a brand-new department's
# missing syllabus as zero would report it as unhealthy, and confidently so.
teeth "a health score that scores a missing component as zero is caught" \
  "$HEALTH" scripts/check-hod-dashboard.ts \
  "import io; p=r'$HEALTH'; s=io.open(p,encoding='utf-8').read(); s=s.replace('const scored = components.filter((c) => c.value !== null && c.value !== undefined);', 'const scored = components.map((c) => ({ id: c.id, value: c.value ?? 0 }));'); io.open(p,'w',encoding='utf-8').write(s)"

# ── 10. The weakest component going unnamed ─────────────────────────────────
# A single number a HOD cannot act on is a decoration.
teeth "a health score that stops naming the weakest component is caught" \
  "$HEALTH" scripts/check-hod-dashboard.ts \
  "import io; p=r'$HEALTH'; s=io.open(p,encoding='utf-8').read(); s=s.replace('weakest,', 'weakest: null,'); io.open(p,'w',encoding='utf-8').write(s)"

# ── 11. THE FIRST TENANCY BUG — the leave scope ─────────────────────────────
# The leave queries were filtered by `institutionId` alone, so an HOD could list — and through
# `decideLeave`, APPROVE — every other department's leave requests.
#
# The edit breaks EVERY use of the scope, not just the one with a `status:` beside it, because
# the suite asserts on both the LIST and the DECISION.
teeth "a leave query that is institution-scoped is caught" \
  "$SVC" scripts/check-hod-dashboard.ts \
  "import io; p=r'$SVC'; s=io.open(p,encoding='utf-8').read(); s=s.replace('...leaveScope(institutionId, dept.id)', 'institutionId'); s=s.replace('leaveScope(institutionId, dept.id),', 'institutionId,'); io.open(p,'w',encoding='utf-8').write(s)"

# ── 12. THE SECOND TENANCY BUG — the workload scope ────────────────────────
# The workload query was filtered by `teacherUserId` alone, so a teacher who also taught in
# another department inflated this department's utilisation and could raise a false "overloaded"
# alert.
teeth "a workload query that is teacher-scoped is caught" \
  "$SVC" scripts/check-hod-dashboard.ts \
  "import io; p=r'$SVC'; s=io.open(p,encoding='utf-8').read(); s=s.replace('where: { teacherUserId: { in: userIds }, ...offeringScope(dept.id) },', 'where: { teacherUserId: { in: userIds } },'); io.open(p,'w',encoding='utf-8').write(s)"

# ── 13. The attendance threshold ignoring the config ────────────────────────
# `SystemConfig.attendanceThreshold` is named in the schema's own header and was read by nobody.
# A config key a college can change but that nothing reads is worse than no key, because it looks
# like it is being honoured.
teeth "a threshold that ignores the institution config is caught" \
  "$RULES" scripts/check-hod-dashboard.ts \
  "import io; p=r'$RULES'; s=io.open(p,encoding='utf-8').read(); s=s.replace('return Math.round(pct);', 'return ATTENDANCE_RISK_THRESHOLD;'); io.open(p,'w',encoding='utf-8').write(s)"

# ── 14. The section order ───────────────────────────────────────────────────
# What the office must ACT ON is above what they must merely KNOW. The server publishes the
# order and the client follows it.
teeth "a section list that drops one is caught" \
  "$RULES" scripts/check-hod-dashboard.ts \
  "import io,re; p=r'$RULES'; s=io.open(p,encoding='utf-8').read(); s=re.sub(r\"  \{\s*id: 'PERFORMANCE_TRENDS',[\s\S]*?order: 9,\s*\},?\", '', s); io.open(p,'w',encoding='utf-8').write(s)"

# ── 15. The old server route coming back ────────────────────────────────────
# The old route served a flat hero-and-stats shape. A caller holding it must get a 404, not a
# quietly different document — so the edit puts the ROUTE back, not just the function.
teeth "the old flat dashboard route coming back is caught" \
  "$HOD_ROUTES" scripts/verify-hod-dashboard-http.ts \
  "import io; p=r'$HOD_ROUTES'; s=io.open(p,encoding='utf-8').read(); s=s.replace('// HD-02 faculty', 'router.get(' + chr(39) + '/dashboard' + chr(39) + ', wrap(async (req, res) => { res.json({ data: { stats: {} } }); }));'+chr(10)+'// HD-02 faculty'); io.open(p,'w',encoding='utf-8').write(s)"

# ── 16. The quick action's live count going missing ─────────────────────────
# A tile that says "Approve leave" and one that says "Approve leave (2)" are different screens:
# the first asks the HOD to go and look, the second tells them whether it is worth the walk.
teeth "a quick action that stops carrying its live count is caught" \
  "$ACTIONS_SVC" scripts/check-hod-dashboard.ts \
  "import io; p=r'$ACTIONS_SVC'; s=io.open(p,encoding='utf-8').read(); s=s.replace('APPROVE_LEAVE: pendingLeaves,', 'APPROVE_LEAVE: 0,'); io.open(p,'w',encoding='utf-8').write(s)"

echo
echo "  $PASS proved, $FAIL vacuous"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo "  Every HD-01 assertion bites."
