#!/usr/bin/env bash
# Server-renders the REAL ApprovalsInbox / AdminGlobalManagement components against backend-shaped fixtures. Needs node_modules (react, react-dom,
# react-icons, react-hot-toast, axios, @babel/core). No browser, no network. Run from the frontend root:  bash scripts/render-harness/run.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; H="$ROOT/scripts/render-harness"
rm -rf "$H/build" && mkdir -p "$H/build"
echo '{"type":"module"}' > "$H/build/package.json"
ln -sfn "$ROOT/node_modules" "$H/node_modules"; ln -sfn "$ROOT/node_modules" "$H/build/node_modules"
cp "$ROOT/package.json" "$H/package.json"
node "$H/transform.mjs" "$ROOT/src" "$H/build/src" "$H"
(cd "$H" && node render-inbox.mjs && node render-pages.mjs)
rm -rf "$H/build" "$H/node_modules" "$H/package.json"
