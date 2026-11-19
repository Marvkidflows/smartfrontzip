# Frontend performance remediation — bundle splitting & lazy loading

Status: **code changes made and statically checked; `npm test` / `npm run build` were NOT run** (the authoring sandbox had no npm registry access, so Vite/Vitest could not be installed). Run the commands in "Deploy" on a machine with network access and compare with the table below before publishing. Nothing here has been deployed.

## Root cause (verified from source)
`src/App.jsx` imported **every** page and layout statically (≈90 modules: Investor, Admin, Financial, MarvFlow, Registration Team). With no `React.lazy`/dynamic imports anywhere, Vite put all of it — plus recharts, react-quill and react-phone-number-input — into one entry bundle that every visitor (even on `/login`) had to download before anything rendered. Also:
- `index.html` loaded Google Fonts as a **render-blocking** stylesheet (a slow/unreachable fonts.googleapis.com stalls first paint).
- `public/logo-mark.png` was 210 KB (498×479) but is displayed at ≤64 px; it is fetched on the splash screen and on every public/auth page.
- `public/.htaccess` had no compression rule, so JS/CSS may be sent uncompressed if the host does not compress by default.
- No third-party analytics/tracking/payment scripts exist in the frontend source (only Google Fonts), so none were removed or changed.

## What changed
| File | Change |
|---|---|
| `src/App.jsx` | All pages and role layouts → `lazyPage(() => import(...))`; only `PublicLayout` + `HomePage` stay eager. Guards (`GuestRoute`, `InvestorRoute`, `AdminRoute`, `FinancialRoute`, `MarvflowRoute`, `RegistrationRoute`) are unchanged and wrap the lazy layouts, so unauthorised users are redirected before a protected chunk is requested. Route table is identical (checked by diff). Suspense fallbacks everywhere; error boundary around routes. |
| `src/utils/lazyWithRetry.js` (+test) | NEW. Retries a failed chunk fetch once; after a deploy (stale `index.html`) reloads the page once (sessionStorage flag, cannot loop). |
| `src/components/RouteFallback.jsx`, `ChunkErrorBoundary.jsx` | NEW. Dependency-free loading spinners; "Reload page" screen instead of a blank page. |
| `src/main.jsx` | Handles Vite's `vite:preloadError` with the same one-time reload. |
| `vite.config.js` | `vendor-react` manual chunk (React + router cached separately across deploys). Everything else splits automatically by route. |
| `index.html` | Google Fonts made non-blocking (`preload` + `media=print` swap, `<noscript>` fallback). Same fonts/weights. |
| `public/logo-mark.png` | 498×479 / 210 KB → 128×123 / 7 KB (2× its largest display size). Same filename. |
| `public/.htaccess` | Added `mod_deflate` text compression inside `<IfModule>`. Existing rewrite/cache rules untouched. |
| `src/App.registrationAccess.test.jsx` | Updated for async lazy rendering (`findBy*`, module warm-up, longer async timeout). Same assertions. |
| `src/App.codeSplitting.test.js` | NEW regression guard: fails if a dashboard page/layout is imported eagerly again or a lazy element lacks a fallback. |
| `scripts/bundle-report.mjs`, `package.json` | NEW `npm run report:bundle` (raw/gzip/brotli per chunk + initial JS from `dist/index.html`). Only a script entry was added; `package-lock.json` is unchanged. |

No backend, API, Railway, DNS, hosting, database, balance, ROI, rank or referral code was touched.

## Measurements so far (honest scope)
Measured with esbuild on the **application source only** (react, react-router, axios, zustand, recharts, react-quill, react-phone-number-input were left external because they could not be installed). These are NOT the Vite production numbers.

| | Before | After |
|---|---|---|
| App code in the single entry bundle (raw, minified) | 899 KB | — |
| App code, landing page `/` (entry + its static chunks) | 899 KB raw / 217 KB gzip | **88 KB raw / 19.6 KB gzip** |
| `/login` | same 899 / 217 | 92 KB raw / 21 KB gzip |
| `/register` (adds react-phone-number-input) | same | 123 KB raw / 31 KB gzip |
| `/admin/dashboard` (adds recharts) | same | 103 KB raw / 25 KB gzip |
| `/investor/dashboard` (adds recharts) | same | 127 KB raw / 31 KB gzip |

Vendor libraries: before, recharts + react-quill + react-phone-number-input were all in the first download; after, recharts is only pulled by Admin/Investor dashboard + analytics + market charts, react-quill only by the rich-editor/messaging pages, react-phone-number-input only by Register and Investor Profile (confirmed from the import graph). Their sizes are **not measured** here.

The 727 KB figure from the incident report could not be reproduced (no `dist` available); the app-only 899 KB above does not include vendors, so the two numbers measure different things. Use `npm run report:bundle` on a real build for the authoritative before/after.

## Deploy (needs your approval — nothing has been deployed)
1. Unzip this delta over the frontend project root (same folder as `package.json`), replacing files.
2. `npm ci` (lockfile is unchanged; if it complains, run `npm install` and review the lock diff).
3. `npm test` — record passed/failed/skipped.
4. `npm run build && npm run report:bundle` — record initial JS (target < 250 KB gzip) and confirm `dist/assets` contains many route chunks and a `vendor-react-*.js`.
5. `npm run preview`; open `/`, `/login`, `/register`, `/forgot-password`, then Investor, Admin, Financial, MarvFlow and Registration dashboards (direct URL + refresh), on desktop and a phone-width window; check the console and Network tab for failed requests.
6. Upload the **entire** `dist/` (including `.htaccess`, and delete old `dist/assets` files on the host) to Hostinger. `index.html` must be replaced together with the new `assets/`.
7. Purge the CDN/browser cache once more after upload.

## Remaining concerns
- A visitor whose connection takes minutes for a ~700 KB file may still have DNS/route/ISP problems unrelated to bundle size. Time the HTML document and the JS file separately from an affected device/network (browser DevTools → Network → Timing) before declaring the incident closed.
- "Works on one device but not another" points to caching (old `index.html`), IPv6/DNS or ISP issues as much as bundle size; the reload-once handling covers the stale-deploy case only.
- Google Fonts is still a third-party request (now non-blocking). Self-hosting Inter/Playfair would remove it entirely.
- `react-phone-number-input` by default fetches country flag images from a third-party host at runtime; consider `flags` override if Register is slow.
- `logo-full.png` (289 KB) is unused by `src/` — left alone; delete or shrink if unused elsewhere.
- Large page chunks remain (e.g. `AdminRanks` ≈ 66 KB raw) but load only for admins.
