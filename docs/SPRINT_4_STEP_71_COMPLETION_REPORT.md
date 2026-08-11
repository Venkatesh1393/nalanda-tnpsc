# Sprint 4 Step 71 Completion Report — Production Frontend Deployment

| | |
|---|---|
| **Step** | Sprint 4 Step 71 — Production Frontend Deployment |
| **Date** | 2026-08-10 |
| **Scope** | Prepare `frontend/` for real production deployment: Vite/build config review, env-variable/dev-code audit, vendor code-splitting, asset compression, PWA readiness, and a documented, verified production build. No UI redesign. |
| **Result** | **PASS** — see [§6 Final Verdict](#6-final-verdict) |

Immediately after Sprint 4 Step 70 (Final Production Audit). That audit already found `frontend/`'s build/lint/typecheck clean and route-level code-splitting (Step 67) in place — this step is the deployment-hardening pass on top: compression, long-lived vendor caching, PWA installability, and closing one real gap the audit hadn't specifically checked for (a dev-only route with no production gate).

---

## 1. What Was Already True Before This Step

`docs/MASTER_ROADMAP.md` Phase 13/Step 67/Step 68 and `docs/FINAL_AUDIT.md` had already established, and this step re-confirmed rather than redid:

- Every real page is `React.lazy`-loaded behind one `<Suspense>` boundary (`routes/app-routes.tsx`) — no monolithic bundle.
- `lib/env.ts` Zod-validates every `VITE_*` variable at startup; there is exactly one place `import.meta.env` is read directly.
- Zero `console.log`/`console.debug`/`console.info` calls anywhere in `src/` (grepped, confirmed again this step).
- `ReactQueryDevtools` is already gated behind `import.meta.env.DEV` (`providers/app-providers.tsx`), so it's absent from a production bundle by construction.
- `Dockerfile`/`nginx.conf` (Step 68) already build via multi-stage Docker with `VITE_*` supplied as build-args (never baked from a committed file), and already serve the SPA behind gzip + immutable long-term caching for hashed `/assets/`.

## 2. What This Step Found and Fixed

**A real gap: `/dev/preview` had no production gate.** The internal design-system preview screen (`App.tsx`, a `docs/UI_Design_System.md` component catalog with placeholder preview data) was wired into `routes/app-routes.tsx` unconditionally — reachable at a real, predictable URL (`https://app.<domain>/dev/preview`) in a live production deployment, not just locally. Fixed by wrapping the route registration in the same `import.meta.env.DEV` build-time constant already used for `ReactQueryDevtools`, so a production build's router never registers it (a request there now falls through to the ordinary catch-all 404). **Disclosed limitation**: this removes the *route*, not the *chunk* — `App-*.js` still ships as an unlinked file in `dist/assets/` because Rollup can't prove a dynamic `import()` referenced from a conditional JSX branch is unreachable. Fully eliminating the chunk would require restructuring the lazy declaration itself and fighting TypeScript's typing of a conditionally-`null` lazy component for a low real-world payoff (the page has no secrets, only placeholder UI-catalog data) — logged as a minor follow-up, not done here.

**Vendor code was not split from app code.** Before this step, Rollup's default chunking pulled large third-party libraries into whichever page first imported them — e.g. `recharts` (the single largest dependency in the project) landed entirely inside the Analytics page's own chunk. `vite.config.ts` now has an explicit `manualChunks` function that buckets `node_modules` code into 9 named vendor chunks (`vendor-react`, `vendor-router`, `vendor-query`, `vendor-firebase`, `vendor-charts`, `vendor-motion`, `vendor-radix`, `vendor-i18n`, `vendor-forms`, plus a residual `vendor` bucket) by dependency, each with its own content hash independent of app code. **Why this matters in practice**: these libraries change only when a `package.json` dependency is bumped, not on every feature deploy — so a returning visitor's browser cache keeps serving the same vendor chunk across most deploys instead of re-downloading it every time any page's code changes.

**No pre-compression.** `nginx.conf`'s `gzip on` was compressing every response on every request. `vite-plugin-compression2` now writes a pre-built `<file>.gz` for every JS/CSS/HTML/SVG/JSON asset over 1KB at build time; `nginx.conf` now sets `gzip_static on` (a module already compiled into the stock `nginx:alpine` image — no Dockerfile change needed) to serve those directly, falling back to `gzip on` only for the handful of files not pre-compressed. Brotli was deliberately **not** added at the origin: the stock `nginx:alpine` base image has no brotli module, and the CDN this is meant to sit behind (`docs/Deployment.md` §9, `Architecture.md` §6) is the conventional place brotli gets applied at the edge — adding a custom nginx build for it was judged out of scope for this step.

**No PWA manifest, icons, or service worker existed** (`public/` had only `favicon.svg`). Added:
- `public/icons/icon-192.png`, `icon-512.png` (transparent), and `icon-512-maskable.png` (brand-indigo `#4A3FBF` backdrop, logo scaled to a safe zone) — all rasterized directly from the real brand SVG (`public/favicon.svg`), not a placeholder graphic. `apple-touch-icon.png` (180×180) for iOS home-screen add.
- `vite-plugin-pwa` (`vite.config.ts`) generates `manifest.webmanifest` and a Workbox service worker (`generateSW` mode), auto-injecting the manifest `<link>` and SW registration script into `index.html` at build time. `index.html` itself gained the iOS-only meta tags the manifest can't cover (`apple-touch-icon`, `apple-mobile-web-app-*`).
- **Deliberately narrow scope**: the service worker precaches only the static app shell (JS/CSS/fonts/icons) — it does **not** attempt full offline data access. This is a live, data-driven exam-prep platform; caching stale questions/analytics/live-exam state offline would be actively misleading, not helpful, and conflicts directly with `CLAUDE.md`'s "never use dummy data" rule applied to what a user would see. `/api/` requests are explicitly `NetworkOnly` in the Workbox config (defensive — the real API already lives on a separate origin per `docs/Deployment.md`, so the SW never sees those requests regardless). "PWA readiness" here means real installability or add-to-homescreen and fast repeat loads, not a claim of offline functionality that doesn't exist.
- `nginx.conf` updated: `sw.js`/`manifest.webmanifest` are served `no-cache` (must always revalidate, or an app update's new precache list never reaches an already-installed PWA); `workbox-*.js` (content-hashed) and `/icons/` get long-lived caching like `/assets/`.

**No production env-var reference file.** `backend/` has had `.env.production.example` since Step 68; `frontend/` didn't. Added `frontend/.env.production.example`, mirroring the backend file's structure — documents that these are Docker/CI build-args, not a runtime `.env`, and that every value must point at the real production Firebase project/Razorpay live keys/Cloudinary account, never local-dev ones.

**Explicit build-time decisions, now documented in `vite.config.ts` itself**: `build.sourcemap: false` (no source maps ship in the production artifact — nothing to reverse-engineer the original source structure from, re-enable only if a real error-tracking pipeline needs private sourcemap upload later) and an `ANALYZE=true` mode wired to `rollup-plugin-visualizer` for on-demand bundle inspection (writes `stats.html` to the project root, gitignored, never part of `dist/`).

## 3. Verification

- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npm run format:check` — clean on every file this step touched (`vite.config.ts`, `routes/app-routes.tsx`, `index.html`, `nginx.conf`, `.gitignore`, `.env.production.example`). **Note**: the full-repo `format:check` reports pre-existing formatting drift in 43 files this step did not touch (confirmed via `git status` — none were modified this session); that drift predates this step and is out of scope here.
- `npm run build` — clean, zero warnings, three times: once as a baseline check, once explicitly with production-flavored env vars (`VITE_API_BASE_URL=https://api.nalanda-tnpsc.com/...`, `VITE_APP_ENV=production`, etc., set via shell env to simulate the Dockerfile's `--build-arg` mechanism) to positively confirm no `localhost`/development value gets baked in, and once more restoring the normal `.env.local` values so local `npm run preview` keeps working afterward for day-to-day development.
- Grepped the production-flavored `dist/` output directly: zero occurrences of our own dev config (`VITE_API_BASE_URL`/`VITE_APP_ENV` correctly show the injected `https://api.nalanda-tnpsc.com/...` / `production` values). The only remaining `localhost` substrings anywhere in `dist/` are third-party SDK internals — Firebase Auth's reCAPTCHA/emulator-detection code and React Router's own generic `new URL(path, 'http://localhost')` parsing fallback — not application config, confirmed by inspecting each match's surrounding code.
- Confirmed (grep) the built `/dev/preview` string no longer appears in the routes chunk of a production build.
- Manual UI click-testing was **not** performed — no browser automation tool is available in this environment (the same disclosed gap Step 64's report already flagged for AI Tutor's frontend). Verification here is build-level (compiles clean, ships clean, output inspected directly), not a live-clicked confirmation that the PWA installs correctly or that gzip negotiation actually happens end-to-end through nginx. Recommend the user do one real install-prompt check (Chrome DevTools → Application → Manifest, or an actual mobile "Add to Home Screen") and one `curl -H "Accept-Encoding: gzip" -I` against a deployed instance before considering this fully closed.

## 4. Build Size & Largest Bundles

Measured from the production-flavored build (§3). Total `dist/`: **3.5 MB** (includes both the plain and `.gz` copy of every compressible asset — nginx serves only one or the other per request, never both). Raw JS+CSS+HTML: **2.16 MB**; the gzip-compressed payload actually shipped to a browser: **~616 KB** total across all 99 JS chunks + CSS if a single client somehow fetched everything (no real visit does — see the initial-load estimate below).

**10 largest chunks** (raw / gzip):

| Chunk | Raw | Gzip | Contents |
|---|---|---|---|
| `vendor-charts` | 343 KB | 90 KB | `recharts` + its `d3-*` dependencies — loaded only when the Analytics page (or any chart) is actually visited |
| `vendor` (residual) | 328 KB | 110 KB | Everything not matched by a named bucket — largest known contributors: `lucide-react`, `axios`, `sonner` |
| `index` (entry) | 215 KB | 51 KB | App bootstrap + eagerly-loaded layouts (Navbar/Footer aren't lazy — they're needed on every page) |
| `vendor-react` | 171 KB | 53 KB | `react` + `react-dom` |
| `vendor-radix` | 167 KB | 49 KB | `radix-ui` (single umbrella package) + `cmdk`/`vaul`/`input-otp` |
| `index.css` | 114 KB | 18 KB | Full Tailwind output |
| `vendor-firebase` | 112 KB | 33 KB | Firebase Auth SDK |
| `vendor-forms` | 91 KB | 27 KB | `react-hook-form` + `@hookform/resolvers` + `zod` |
| `vendor-query` | 81 KB | 22 KB | `@tanstack/react-query` |
| `vendor-i18n` | 47 KB | 15 KB | `i18next` + `react-i18next` |

**Estimated first-visit payload** (a fresh visitor landing on `/`, everything that's eager rather than route-lazy: entry + CSS + `vendor-react`/`router`/`query`/`i18n`/`radix`/`motion`/residual-`vendor` + the `home-page` chunk) is approximately **360–365 KB gzip**. This is an estimate from chunk composition, not a captured network trace (no browser tooling available this session, see §3) — treat it as directionally correct, not lab-measured.

## 5. Optimization Suggestions (Not Done This Step)

Ranked by likely impact, none blocking:

1. **`radix-ui` is imported as the single umbrella package**, not per-primitive `@radix-ui/react-*` scoped packages. If that umbrella package's build isn't fully tree-shakeable, every page pays for all ~170 KB regardless of which primitives it actually uses, since it's in the eager path via `TooltipProvider`. Worth a real tree-shake audit (or a switch to scoped packages) as a follow-up — not attempted here since it's a dependency-shape change with a real (if probably small) blast radius, and this step's instruction was explicit about not touching UI.
2. **The residual `vendor` chunk (110 KB gzip) is also in the eager path.** `sonner` (Toaster) and `lucide-react` icons are both used by the always-mounted app shell. If any icons currently imported via a barrel (`import { X } from 'lucide-react'`) aren't already per-icon tree-shaken, auditing actual icon usage could trim this further.
3. **Self-host the Google Fonts request** (`index.html`'s `fonts.googleapis.com`/`fonts.gstatic.com` `<link>`s) instead of a runtime fetch to a third-party origin — saves a DNS+TLS round trip on first paint and removes an external dependency, at the cost of manually keeping font files in sync with the two families/weights already declared.
4. **Full chunk elimination for `/dev/preview`** (§2) — currently route-gated but not byte-gated.
5. **Image optimization**: no raster product images exist in `src/assets/` yet (still empty per its own README) — nothing to optimize today, but worth revisiting once real content images are added (Learn thumbnails, Current Affairs images, etc.) — prefer `<img loading="lazy">` + Cloudinary's own `f_auto,q_auto` transformation params (already the storage layer per `docs/Architecture.md` §10) over shipping unoptimized originals.
6. **Brotli at the origin** (§2) — deferred to the CDN layer by design; revisit only if the actual chosen CDN provider turns out not to do edge-side brotli automatically.

## 6. Final Verdict

**PASS.** `npm run build` is clean with zero warnings across three verification runs (baseline, explicit production-env, and dev-restore). No `console.*` calls, no baked-in `localhost`/development values, and no unauthenticated dev-only route exist in a production build (the last of these was a real, now-fixed gap). Code-splitting, vendor-chunk long-term caching, gzip pre-compression, and PWA installability (manifest + real brand icons + scoped service worker) are all in place and verified in the build output. Not independently browser-verified (§3) — the one open item before calling this fully closed end-to-end is a real install-prompt/gzip-negotiation check against an actually-deployed instance, which needs the Docker/nginx pipeline (Step 68/69) running somewhere reachable, not just a local build.
