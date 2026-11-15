#!/usr/bin/env bash
# LOCATION: scripts/verify-frontend.sh — run on a machine WITH network access and Node 20 or 22 (npm 10).
#
# Honesty rules (same as the backend runner): every step logs to verification-logs/<timestamp>/, an un-runnable step is SKIPPED (never PASS), and the
# script exits non-zero if anything FAILED or SKIPPED.
#
# F10 — the committed package-lock.json does NOT contain vitest / jsdom / @testing-library/*, so `npm ci` fails until the lockfile is regenerated.
#   1) first time only:   LOCK_REGEN=1 bash scripts/verify-frontend.sh      (runs `npm install` to regenerate package-lock.json from package.json —
#      commit the new lockfile; never hand-edit it)
#   2) every time after:  bash scripts/verify-frontend.sh                   (clean `npm ci`, tests, build, render harness)
set -u
cd "$(dirname "$0")/.."
TS="$(date +%Y%m%d-%H%M%S)"; LOG="verification-logs/$TS"; mkdir -p "$LOG"; SUMMARY="$LOG/SUMMARY.txt"; FAILS=0; SKIPS=0
record() { printf '%-4s %-44s %s\n' "$1" "$2" "${3:-}" | tee -a "$SUMMARY"; }
step() { local id="$1" title="$2"; shift 2; echo ">>> $id $title" >&2; if "$@" >"$LOG/$id.log" 2>&1; then record PASS "$id $title" "(log: $LOG/$id.log)"; else record FAIL "$id $title" "(exit $?; see $LOG/$id.log)"; FAILS=$((FAILS+1)); fi; }
{ echo "verify-frontend.sh $TS"; node -v; npm -v; } | tee "$LOG/00-environment.txt" >> "$SUMMARY"
command -v node >/dev/null && command -v npm >/dev/null || { record FAIL "00 node/npm present" "install Node 20/22"; exit 2; }

if [ "${LOCK_REGEN:-0}" = "1" ]; then step 01-regenerate-lockfile "npm install (regenerate package-lock.json)" npm install; else record SKIP "01 regenerate lockfile" "LOCK_REGEN not set (only needed once, until the lockfile includes the test packages)"; SKIPS=$((SKIPS+1)); fi
rm -rf node_modules
step 02-npm-ci "clean npm ci" npm ci
step 03-lock-contains-test-deps "lockfile lists vitest, jsdom, testing-library" bash -c 'for p in vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event; do grep -q "\"node_modules/$p\"" package-lock.json || { echo "MISSING in lockfile: $p"; exit 1; }; done'
step 04-vitest "npm test (vitest run)" npm test
step 05-build "npm run build (vite build)" npm run build
# Server-render the real Approvals inbox / Global Management components with fixtures (no browser needed; uses @babel from node_modules)
step 06-render-harness "approvals inbox + pages render harness" bash scripts/render-harness/run.sh
{ echo; echo "FAILED: $FAILS   SKIPPED: $SKIPS"; } | tee -a "$SUMMARY"
if [ "$FAILS" -gt 0 ]; then echo "RESULT: NOT VERIFIED" | tee -a "$SUMMARY"; exit 1; fi
[ "$SKIPS" -gt 0 ] && echo "RESULT: ran clean, but step 01 was skipped (fine once the lockfile has been regenerated and committed)" | tee -a "$SUMMARY"
echo "RESULT: frontend steps passed. Browser checks remain manual: docs/BROWSER_TEST_SCRIPT.md" | tee -a "$SUMMARY"
