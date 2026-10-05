#!/usr/bin/env bash
# F-11 Dashboard — teeth proof.
#
# A test suite that passes proves nothing unless it CAN fail. Each case below
# breaks one specific fix, runs the suite that is supposed to catch it, and
# requires a NON-ZERO exit. The code is restored afterwards and the suite re-run,
# so a case that "broke" the file rather than the fix is caught too.
#
# Usage: bash scripts/prove-dashboard-teeth.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

# ── Helpers ────────────────────────────────────────────────────────────────
# Save a file, apply a python edit, run a command, require it to fail, restore.
teeth() {
  local label="$1" file="$2" script="$3" edit="$4"
  local backup; backup="$(mktemp)"
  cp "$file" "$backup"

  local before_sum after_sum
  before_sum="$(md5sum "$file" | cut -d' ' -f1)"

  PYTHONIOENCODING=utf-8 python -c "$edit" || { echo "  SETUP-FAIL $label (the edit script errored)"; FAIL=$((FAIL+1)); cp "$backup" "$file"; rm -f "$backup"; return; }

  # A checksum, not `git diff`. Most of these files are NEW and therefore
  # untracked, so `git diff` reports nothing for them and every case would be
  # misreported as "the edit changed nothing".
  after_sum="$(md5sum "$file" | cut -d' ' -f1)"
  if [ "$before_sum" = "$after_sum" ]; then
    echo "  SETUP-FAIL $label (the edit did not change the file — the pattern no longer matches)"; FAIL=$((FAIL+1)); rm -f "$backup"; return
  fi

  npx tsx "$script" > /tmp/teeth.log 2>&1
  local code=$?

  cp "$backup" "$file"; rm -f "$backup"

  if [ "$code" -ne 0 ]; then
    echo "  ok  $label -> suite exited $code (it bites)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label -> suite still passed. THE ASSERTION IS VACUOUS."
    FAIL=$((FAIL+1))
  fi
}

echo "F-11 Dashboard — teeth proof"
echo "Each case breaks one fix and REQUIRES the matching suite to fail."

# ── 1. Tenant scope: drop the join from the dues query ──────────────────────
# `FeeDue` has NO institutionId — it reaches its tenant through the student.
# This is the single easiest thing to forget and the most expensive.
teeth "tenant scope dropped from the dues block" \
  src/modules/accounts/dashboard.service.ts \
  scripts/verify-dashboard.ts \
  "import io;p='src/modules/accounts/dashboard.service.ts';s=io.open(p,encoding='utf-8').read();s=s.replace('studentProfile: { user: { institutionId, deletedAt: null } },','studentProfile: { user: { deletedAt: null } },');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 2. The stale counter: read daysOverdue instead of the due date ──────────
# The old screen filtered on this denormalised column, so a bill whose counter
# said 0 was invisible however late it was.
teeth "ageing switched back to the stale daysOverdue column" \
  src/modules/accounts/dashboard.service.ts \
  scripts/verify-dashboard.ts \
  "import io;p='src/modules/accounts/dashboard.service.ts';s=io.open(p,encoding='utf-8').read();s=s.replace('const days = daysPastDue(d.dueDate, today);','const days = d.daysOverdue;');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 3. The clamped budget ──────────────────────────────────────────────────
# `Math.min(..., 100)` is how a line at 180% of plan came to read "100%".
teeth "budget utilisation clamped to 100 again" \
  src/modules/accounts/dashboard.service.ts \
  scripts/verify-dashboard.ts \
  "import io;p='src/modules/accounts/dashboard.service.ts';s=io.open(p,encoding='utf-8').read();s=s.replace('utilisationPercent: plannedMinor > 0 ? Math.round((spentFyMinor / plannedMinor) * 1000) / 10 : null','utilisationPercent: plannedMinor > 0 ? Math.min(Math.round((spentFyMinor / plannedMinor) * 100), 100) : null');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 4. The fiscal-year filter dropped ──────────────────────────────────────
# The old screen summed every Budget row the institution had ever created, so
# last year's exhausted lines were being added to this year's plan.
teeth "budget lines no longer filtered to the current fiscal year" \
  src/modules/accounts/dashboard.service.ts \
  scripts/verify-dashboard.ts \
  "import io;p='src/modules/accounts/dashboard.service.ts';s=io.open(p,encoding='utf-8').read();s=s.replace('where: { institutionId, fiscalYear: fy },','where: { institutionId },');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 5. UNDER_REVIEW counted as approved money ──────────────────────────────
# The old block counted an application nobody had decided on as a promise the
# institution had made.
teeth "UNDER_REVIEW counted as approved scholarship money again" \
  src/modules/accounts/dashboard.service.ts \
  scripts/verify-dashboard.ts \
  "import io;p='src/modules/accounts/dashboard.service.ts';s=io.open(p,encoding='utf-8').read();a=\"if (a.status === 'APPLIED' || a.status === 'UNDER_REVIEW') {\";b=\"} else if (a.status === 'APPROVED') {\";assert a in s and b in s, 'the scholarship loop moved';s=s.replace(a,\"if (a.status === 'APPLIED') {\").replace(b,\"} else if (a.status === 'APPROVED' || a.status === 'UNDER_REVIEW') {\");io.open(p,'w',encoding='utf-8',newline='\\n').write(s)"

# ── 6. A settled bill reported as owing ─────────────────────────────────────
teeth "a fully paid bill counted as outstanding again" \
  src/modules/accounts/dashboard.service.ts \
  scripts/verify-dashboard.ts \
  "import io;p='src/modules/accounts/dashboard.service.ts';s=io.open(p,encoding='utf-8').read();a='const balance = balanceOf(d);';assert a in s, 'the dues loop moved';s=s.replace(a,'const balance = d.amountMinor;',1);io.open(p,'w',encoding='utf-8',newline='\\n').write(s)"

# ── 7. The reconciliation alerts re-implemented, so the two screens diverge ──
teeth "the reconciliation counts replaced with a local re-count" \
  src/modules/accounts/dashboard.service.ts \
  scripts/verify-dashboard.ts \
  "import io;p='src/modules/accounts/dashboard.service.ts';s=io.open(p,encoding='utf-8').read();s=s.replace('PAYROLL_UNFOOTED: { count: unfooted.count, items: unfooted.items },','PAYROLL_UNFOOTED: { count: 0, items: [] },');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 8. Reversed money counted as collection ────────────────────────────────
teeth "reversed payments counted toward collections" \
  src/modules/accounts/dashboard.service.ts \
  scripts/verify-dashboard.ts \
  "import io;p='src/modules/accounts/dashboard.service.ts';s=io.open(p,encoding='utf-8').read();s=s.replace(\"status: 'CLEARED',\\n  reversedAt: null,\", \"status: 'CLEARED',\");io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 9. The quick action that must never be blocked ──────────────────────────
teeth "the reminder tile silently enabled with nobody to remind" \
  src/modules/accounts/dashboard.service.ts \
  scripts/verify-dashboard-http.ts \
  "import io;p='src/modules/accounts/dashboard.service.ts';s=io.open(p,encoding='utf-8').read();s=s.replace('enabled: blockedReason === null,','enabled: true,');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 10. A screen de-registered from FEATURE_MODULES ─────────────────────────
# The silent failure: `openModule('DashboardDues')` to a missing key renders
# NOTHING and lands the user back on the dashboard.
teeth "a dashboard sub-screen de-registered from FEATURE_MODULES" \
  ../learnix/users/accounts_finance/accounts_finance.js \
  scripts/audit-dashboard-ui.ts \
  "import io;p='../learnix/users/accounts_finance/accounts_finance.js';s=io.open(p,encoding='utf-8').read();s=s.replace('  DashboardDues: {','  DashboardDues_DISABLED: {');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 11. A tab routed as a sub-screen ────────────────────────────────────────
# `openModule('Dues')` finds no such key and opens NOTHING, silently.
teeth "a tab routed through openModule instead of switchTab" \
  ../learnix/users/accounts_finance/pages/dashboard/dashboardUi.js \
  scripts/audit-dashboard-ui.ts \
  "import io;p='../learnix/users/accounts_finance/pages/dashboard/dashboardUi.js';s=io.open(p,encoding='utf-8').read();s=s.replace('if (isTab && TAB_ROUTES.includes(route)) navigation.switchTab(route);','if (false) navigation.switchTab(route);');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 12. A block added server-side with no app mirror ───────────────────────
teeth "a block added on the server alone, with no app mirror" \
  src/modules/accounts/dashboard.rules.ts \
  scripts/audit-dashboard-ui.ts \
  "import io;p='src/modules/accounts/dashboard.rules.ts';s=io.open(p,encoding='utf-8').read();s=s.replace(\"  {\n    id: 'ALERTS',\",\"  {\n    id: 'TREASURY',\n    label: 'Treasury',\n    blurb: 'x',\n    icon: 'cash-outline',\n    color: '#111111',\n    route: 'DashboardTreasury',\n    isTab: false,\n    order: 8,\n  },\n  {\n    id: 'ALERTS',\");io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 13. The clamped bar, with the number still honest ──────────────────────
teeth "the bar clamp removed, so an over-budget bar overflows its track" \
  ../learnix/users/accounts_finance/pages/dashboard/dashboardMeta.js \
  scripts/audit-dashboard-ui.ts \
  "import io;p='../learnix/users/accounts_finance/pages/dashboard/dashboardMeta.js';s=io.open(p,encoding='utf-8').read();s=s.replace('return \`\${Math.min(100, n)}%\`;','return \`\${n}%\`;');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 14. A clear alert painted as an alarm ───────────────────────────────────
teeth "a clear alert painted in the alarm colour again" \
  ../learnix/users/accounts_finance/pages/dashboard/dashboardUi.js \
  scripts/audit-dashboard-ui.ts \
  "import io;p='../learnix/users/accounts_finance/pages/dashboard/dashboardUi.js';s=io.open(p,encoding='utf-8').read();s=s.replace(\"const tone = alert.count > 0 ? TONE_COLOR[alert.tone] : TONE_COLOR.clear;\",'const tone = TONE_COLOR[alert.tone] ?? RED;');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 15. The failed request rendered as zero ─────────────────────────────────
# The most dangerous thing a dashboard can do: "₹0 outstanding" and "₹0 because
# the request failed" look identical, and the first one gets read in a meeting.
teeth "a failed dashboard request rendered as empty figures" \
  ../learnix/users/accounts_finance/pages/dashboard/dashboardUi.js \
  scripts/audit-dashboard-ui.ts \
  "import io;p='../learnix/users/accounts_finance/pages/dashboard/dashboardUi.js';s=io.open(p,encoding='utf-8').read();s=s.replace('  if (error) {','  if (false) {');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 16. The superseded endpoint reachable again ─────────────────────────────
teeth "the superseded GET /accounts/dashboard served again" \
  src/modules/accounts/dashboard.routes.ts \
  scripts/verify-dashboard-http.ts \
  "import io;p='src/modules/accounts/dashboard.routes.ts';s=io.open(p,encoding='utf-8').read();s=s.replace(\"router.get(\\n  '/dashboard/catalogue',\",\"router.get('/dashboard', wrap(async (req, res) => { res.json({ data: { hero: {} } }); }));\\n\\nrouter.get(\\n  '/dashboard/catalogue',\");io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 17. Auth removed from the router ────────────────────────────────────────
# This case runs the UI AUDIT, not the HTTP suite, and the reason is a measured
# property of Express rather than a shortcut. `dashboardRoutes` is mounted
# before `accountsRoutes`, and every accounts sibling router calls
# `router.use(auth, requireRole(...))`. Express runs a `use` middleware even for
# a request that router then fails to MATCH, so the FIRST sibling answers
# 401/403 for the whole `/api/v1/accounts` prefix before this router is reached.
# Deleting the line therefore changes nothing an HTTP probe can see — measured,
# not assumed. What it does change is the router's own guarantee: it stops being
# safe on its own and becomes safe only by accident of ordering. The audit
# asserts that at source level (comments stripped, so the line quoted inside the
# explanatory comment cannot satisfy it) plus the mount order itself.
teeth "the dashboard router stops applying its own auth" \
  src/modules/accounts/dashboard.routes.ts \
  scripts/audit-dashboard-ui.ts \
  "import io;p='src/modules/accounts/dashboard.routes.ts';s=io.open(p,encoding='utf-8').read();s=s.replace(\"router.use(auth, requireRole('ACCOUNTS', 'ADMIN'));\",'');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# The mount order is the other half of that guarantee. Reverse it and the
# router is guarded by a sibling's middleware rather than by its own.
teeth "dashboardRoutes mounted AFTER accountsRoutes again" \
  src/app.ts \
  scripts/audit-dashboard-ui.ts \
  "import io;p='src/app.ts';s=io.open(p,encoding='utf-8').read();a=\"app.use('/api/v1/accounts', dashboardRoutes)\";b=\"app.use('/api/v1/accounts', accountsRoutes)\";assert a in s and b in s;s=s.replace(a,'@@D@@').replace(b,a).replace('@@D@@',b);io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

# ── 18. A misspelled alert family silently ignored ─────────────────────────
# A filter the server ignores returns EVERYTHING and looks like it worked.
teeth "a misspelled alert family silently ignored instead of rejected" \
  src/modules/accounts/dashboard.rules.ts \
  scripts/verify-dashboard-http.ts \
  "import io;p='src/modules/accounts/dashboard.rules.ts';s=io.open(p,encoding='utf-8').read();s=s.replace('  const s = String(v ?? \\'\\').toUpperCase();\\n  if (!ALERT_FAMILY_IDS.includes(s as AlertFamily)) {','  const s = String(v ?? \\'\\').toUpperCase();\\n  if (false) {');io.open(p,'w',encoding='utf-8',newline='\n').write(s)"

echo
echo "================================================================"
echo "$PASS cases bite, $FAIL do not"
[ "$FAIL" -eq 0 ] || exit 1
echo "ok prove-dashboard-teeth: every dashboard assertion can fail"
