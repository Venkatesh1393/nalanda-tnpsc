# Nalanda TNPSC — Deployment & Production Readiness

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 69 — Production Deployment (extends Step 68) |
| **Last Updated** | 2026-08-10 |
| **Covers** | `backend/`, `frontend/`, `admin/` — not `mobile/` (unbuilt) |

This document is the operational counterpart to `docs/Architecture.md` — that
doc describes the target system shape; this one describes how to actually
build, configure, and run what exists today, in each of three environments,
plus (from Step 69) how to actually get it in front of real users behind
real TLS, and what to do when something goes wrong. Three companion docs
carry the depth this file only summarizes: `docs/BackupStrategy.md`,
`docs/MonitoringStrategy.md`, `docs/DisasterRecovery.md`.

---

## 1. Environments

Every app is driven by `NODE_ENV` (`development` | `test` | `production`,
`backend/src/config/env.ts`) plus, for the two Vite apps, `VITE_APP_ENV`
(same three values, `frontend/admin` `.env.example`). Nothing infers the
environment from anything else (hostname, port, etc.) — it is always this one
explicit variable.

| | Development | Test | Production |
|---|---|---|---|
| Backend env file | `backend/.env` | `backend/.env.test.example` → copy to `.env` when a test runner exists | `backend/.env.production.example` → copy to `.env` on the host/secret manager |
| Database | `nalanda_tnpsc` (Atlas) | `nalanda_tnpsc_test` (dedicated, disclosed as **not yet exercised** — see §13) | dedicated production database, dedicated Atlas user |
| Cache driver | `memory` | `memory` (a shared Redis would leak state between test runs) | `memory` while single-instance; `redis` once load-balanced (see §6) |
| Log level | `info` | `warn` | `info` |
| CORS origin | `http://localhost:5173,http://localhost:5180` | same as dev | real HTTPS origins only — `config/env.ts` refuses to boot on `CORS_ORIGIN=*` |
| Razorpay | test-mode keys (`rzp_test_...`) | blank (graceful no-op) | live-mode keys (`rzp_live_...`) + webhook secret |
| JWT/Firebase/Cloudinary keys | committed dev keys (`.env`, never used in prod — see its own header comment) | dedicated or shared dev project | **dedicated production credentials, generated fresh, never reused from dev** |

Three template files exist side by side in `backend/`:
`.env.example` (development), `.env.test.example`, `.env.production.example`.
Each documents its own environment's expectations inline — copy the right one
to `.env` for the environment you're running. `frontend/.env.example` and
`admin/.env.example` are environment-agnostic (their only environment knob is
`VITE_APP_ENV`, since Vite bakes config into the build rather than reading it
at runtime — see §7.2).

---

## 2. Environment Variable Validation

`backend/src/config/env.ts` validates every variable through a Zod schema at
module load — a missing or malformed required variable fails loud at boot,
never silently at first use. Beyond shape validation, `validateProductionConfig()`
(same file) runs once, only when `NODE_ENV=production`, and checks the things
Zod can't express because they're about *values*, not types:

- **`CORS_ORIGIN=*` is a hard failure** — refuses to boot. Combined with
  `credentials: true` (`app.ts`), a wildcard origin is both non-functional
  (browsers reject the combination) and, if anything ever honored it
  anyway, a real credential-leak risk.
- A `localhost`/`127.0.0.1`-looking `CORS_ORIGIN` in production logs a
  **warning** (doesn't block boot — could be a legitimate staging box).
- Razorpay keys present without a webhook secret logs a **warning** —
  checkout would create orders that can never activate a subscription,
  since only the webhook grants entitlements (`services/payment.service.ts`).

---

## 3. Health & Readiness Endpoints

Split into two endpoints (`backend/src/controllers/health.controller.ts`),
matching standard container-orchestration convention:

| Endpoint | Checks | Failure means | Correct orchestrator response |
|---|---|---|---|
| `GET /api/health` | Nothing but "the process can respond" | The process itself is wedged | **Restart** the container |
| `GET /api/health/ready` | MongoDB connection + this instance isn't mid-shutdown | This instance can't currently serve traffic | **Stop routing** to it, don't restart |

Both are unauthenticated, outside `/api/{version}`, and return a small
unwrapped JSON body (not the `{success,data,error}` envelope every other
endpoint uses) — deliberately, since monitoring tooling expects a stable,
minimal shape.

Liveness never checks the database on purpose: if it did, a transient Atlas
blip would make an orchestrator restart perfectly healthy processes in a
loop, which fixes nothing. Readiness checks the database because "DB is
down" is exactly the situation where an instance *should* be pulled from
rotation without being killed.

```bash
curl -s http://localhost:5000/api/health        # {"status":"OK","uptimeSeconds":123,...}
curl -s http://localhost:5000/api/health/ready   # {"status":"READY","database":"Connected",...}
```

`docs/MonitoringStrategy.md` §1 covers pointing a real external uptime
monitor at these.

---

## 4. Graceful Shutdown

`backend/src/server.ts`'s `shutdown()` runs on `SIGTERM`/`SIGINT`, plus (bounded,
best-effort) on `unhandledRejection`/`uncaughtException`:

1. **Flip the readiness flag first** (`config/shutdownState.ts`) — `GET
   /api/health/ready` starts returning 503 immediately, before anything else
   happens. A load balancer polling readiness stops routing new traffic
   within one poll interval.
2. **Drain**: `server.close()` stops accepting new connections and waits for
   in-flight requests to finish naturally.
3. **Disconnect** from MongoDB cleanly.
4. **Exit 0.**

A 10-second force-exit timer (`SHUTDOWN_TIMEOUT_MS`) runs alongside steps
2–3 — if a stuck keep-alive connection or a hung DB disconnect would
otherwise wedge the process forever, the timer forces `process.exit(1)`
instead. A re-entrancy guard means a second `SIGTERM` (some orchestrators
send it twice) is a no-op rather than a race.

**Docker/Compose note**: `docker stop` sends `SIGTERM`, waits (10s default,
configurable via `stop_grace_period`), then `SIGKILL`s. `SHUTDOWN_TIMEOUT_MS`
above is intentionally under that default window so the app's own clean exit
always wins the race under normal `docker stop`.

---

## 5. Logging & Error Handling

- **Logging** (`config/logger.ts`, Winston): JSON to `logs/error.log` /
  `logs/combined.log` plus console — human-readable in development, JSON in
  production (for log-aggregator ingestion without a parsing step). No
  request body, token, password, OTP, or secret is ever logged (audited in
  Sprint 4 Step 66). See `docs/MonitoringStrategy.md` §2 for shipping these
  to a real aggregator.
- **Error handling** (`middleware/errorHandler.middleware.ts`): the single
  place an error becomes an HTTP response. Production responses for
  unexpected errors are always the generic *"Something went wrong. Please
  try again later."* — the real message/stack goes to the server-side log
  only, never the client. Known error shapes (Zod validation, Mongoose
  cast/validation/duplicate-key, Multer upload errors) get specific,
  actionable 4xx responses instead of falling through to a generic 500. See
  `docs/MonitoringStrategy.md` §3 for the current gap (no error-tracking
  service wired up yet).

---

## 6. Caching (Sprint 4 Step 67, relevant to scaling this deployment)

`CACHE_DRIVER=memory` (the default everywhere, including production today)
is per-process — correct for a single backend instance, but two instances
behind a load balancer would each cache independently and could briefly
disagree after a write. `config/cache.ts` already accepts
`CACHE_DRIVER=redis` and will use it the moment a `RedisCacheProvider` is
implemented against a real `REDIS_URL` (not built yet, by design — see that
file's header comment). **Before running more than one backend instance,
implement and switch to the Redis driver first.**

---

## 7. Docker

Every app has a production `Dockerfile` + `.dockerignore`. All three are
multi-stage so the shipped image never contains devDependencies or (for the
backend) TypeScript source — only compiled output and production
`node_modules`.

### 7.1 Backend

```bash
cd backend
docker build -t nalanda-backend .
docker run --env-file .env -p 5000:5000 nalanda-backend
```

Runs as a non-root user, exposes `5000`, and declares a Docker `HEALTHCHECK`
against `GET /api/health` (liveness only — see §3 for why not readiness).

### 7.2 Frontend / Admin

Vite inlines every `VITE_*` variable into the built JS **at build time**, not
read from the container at runtime — so real values must be passed as
`--build-arg`s, not an env file:

```bash
cd frontend
docker build \
  --build-arg VITE_API_BASE_URL=https://api.nalanda-tnpsc.com/api/v1 \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=... \
  --build-arg VITE_FIREBASE_PROJECT_ID=... \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=... \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg VITE_FIREBASE_APP_ID=... \
  --build-arg VITE_RAZORPAY_KEY_ID=rzp_live_... \
  --build-arg VITE_CLOUDINARY_CLOUD_NAME=... \
  -t nalanda-frontend .
docker run -p 5173:80 nalanda-frontend
```

(`admin/Dockerfile` is identical, minus the Razorpay arg — the Admin Panel
never takes payments.) Both serve the built SPA via nginx (`nginx.conf` in
each app), with `try_files` falling back to `index.html` for client-side
routing and a 1-year immutable cache on hashed `/assets/` files.

### 7.3 All three together (simple / local / behind a managed load balancer)

```bash
docker compose up --build
```

`docker-compose.yml` (repo root) wires all three services, points the
backend at the real `backend/.env` (MongoDB Atlas — there is no local `mongo`
service; this project has no local-database mode), and reads `VITE_*`
build args from a `.env` file next to the compose file if present. Each
service publishes its port directly to the host (`5000`/`5173`/`5180`) —
appropriate for local use, or for a deployment target where TLS/routing is
already handled upstream (a cloud provider's own load balancer, for
instance).

### 7.4 Production topology — nginx gateway + TLS (Sprint 4 Step 69)

For a real single-host production deployment with your own domain and TLS,
layer `docker-compose.prod.yml` on top instead:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This override removes direct host-port publishing from `backend`/`frontend`/
`admin` (they become reachable only from other containers on the compose
network) and adds a `gateway` service (`nginx/gateway.conf`) that becomes
the *only* container publishing `80`/`443` — it terminates TLS and routes
each subdomain (`app.`/`admin.`/`api.nalanda-tnpsc.com` — replace with your
real domain) to the right internal service by Docker Compose service name.
`nginx/snippets/ssl-params.conf` holds the shared TLS/security-header policy
every subdomain includes.

**One-time certificate setup** (Let's Encrypt via Certbot, webroot method —
run once before the first `gateway` start, and again only if adding a new
subdomain):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d app.nalanda-tnpsc.com -d admin.nalanda-tnpsc.com -d api.nalanda-tnpsc.com \
  --email you@nalanda-tnpsc.com --agree-tos --no-eff-email
```

**Renewal** (certs are 90-day — schedule this on the host, e.g. a weekly
cron/systemd timer; it's a no-op if not yet due):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec gateway nginx -s reload
```

`nginx/gateway.conf` also adds a second layer of request-rate limiting
(`limit_req_zone`) ahead of the backend's own `express-rate-limit`
(`middleware/rateLimiter.middleware.ts`) — a flood is rejected by nginx
before it ever reaches Node.

---

## 8. CI/CD — GitHub Actions

### 8.1 CI (`.github/workflows/ci.yml`, Sprint 4 Step 68)

Runs on every push/PR to `main`: lint → typecheck → build for each of
`backend/`, `frontend/`, `admin/` as independent jobs, then a `docker` job
(gated on all three passing) that builds all three Docker images to catch a
broken `Dockerfile` before it reaches a deploy step. Every job is
secret-free — none of them execute `config/env.ts`'s runtime validation
(that only runs when the compiled server actually starts) or need real
`VITE_*` values (a blank-arg build is exactly what this workflow validates —
the *build*, not a deployable image).

### 8.2 CD (`.github/workflows/cd.yml`, Sprint 4 Step 69)

Triggered by pushing a version tag (`git tag v1.0.0 && git push --tags`) or
publishing a GitHub Release — deliberately not on every push to `main`, so
publishing a production image is always an intentional, named action.
Builds and pushes all three images to **GitHub Container Registry**
(`ghcr.io`), chosen specifically because it authenticates with the
already-built-in `GITHUB_TOKEN` — no separate registry account/credentials
need provisioning first. The frontend/admin builds pull their real `VITE_*`
values from **GitHub Actions repository secrets** (Settings → Secrets and
variables → Actions) — configure those there before the first real release;
this workflow file itself contains no real values, only `secrets.*`
references.

**Stops at "image published."** No step here deploys anywhere — no SSH,
no Kubernetes, no cloud-provider API call — because no target
infrastructure has been chosen yet (§13). Once it is, the deploy step is a
short addition to this same workflow (e.g. `ssh` + `docker compose pull &&
up -d` on a single host, or a provider-specific deploy action), not a
redesign.

**This repository has no `.git` directory yet** (confirmed — no version
control has been initialized anywhere in this project). Both workflow files
are correct and ready to run the moment this repo is pushed to GitHub;
nothing in either needs to change to activate it.

---

## 9. Per-Service Production Setup (Sprint 4 Step 69)

Provisioning notes specific to each external service this app depends on —
what to set up *before* filling in `backend/.env.production.example`.

### 9.1 MongoDB Atlas
- Create a **separate production project/cluster** (or at minimum a
  separate database within the same cluster) from development — never point
  production traffic at the same database a developer's local `.env` also
  writes to.
- **Network Access**: add only the production host's outbound IP(s) to
  Atlas's IP Access List — never `0.0.0.0/0` in production. If the hosting
  provider uses dynamic/rotating egress IPs, use Atlas's VPC
  Peering/PrivateLink instead of a static allowlist.
- Create a **dedicated database user** scoped to `readWrite` on only the
  production database — not the Atlas org's admin credentials.
- See `docs/BackupStrategy.md` §2 for tier-specific backup setup —
  strongly consider M10+ before real launch, specifically for automated
  Continuous Backup.

### 9.2 Firebase
- Use a **separate Firebase project** from development (a fresh project in
  the Firebase Console) — this keeps production user records, and any
  provider quota, isolated from test signups.
- Enable exactly the sign-in providers the app uses (Google, Email/Password
  — `docs/Authentication.md`) and configure the production domain(s) under
  Authentication → Settings → Authorized domains, or Google Sign-In will be
  rejected from the real production origin.
- Generate a fresh Admin SDK service account (Project Settings → Service
  Accounts) for `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY_BASE64` —
  never reuse the development project's key.
- Enable Google Cloud project-deletion protection (`docs/BackupStrategy.md`
  §4).

### 9.3 Cloudinary
- A **production Cloudinary account/cloud**, separate from whatever a
  developer's local testing uploads into.
- Scope the API key's permissions to only what
  `services/media/cloudinaryUpload.service.ts` actually needs (upload/
  destroy on the specific resource types this app uses) rather than a
  full-account key, if Cloudinary's plan supports scoped keys.
- Watch the plan's monthly bandwidth/storage credit — `docs/MonitoringStrategy.md`
  §4.2 covers alerting on it before uploads start failing.

### 9.4 Razorpay
- Complete Razorpay's **KYC/activation** to unlock Live mode — Test mode
  keys (`rzp_test_...`) never process real payments regardless of
  environment config.
- Generate **live-mode** `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (Dashboard,
  Live mode toggle on) and register the **live** webhook URL
  (`https://api.nalanda-tnpsc.com/api/v1/payments/webhook` — adjust to the
  real domain) under Settings → Webhooks, choosing a webhook secret and
  entering the same value in both the Dashboard and
  `RAZORPAY_WEBHOOK_SECRET`. All three must be set together — §2's
  `validateProductionConfig()` warns at boot if they aren't.
- `frontend/.env`'s `VITE_RAZORPAY_KEY_ID` is the **publishable key
  ID only** — never put `RAZORPAY_KEY_SECRET` in any `VITE_*` variable or
  frontend/admin build arg; it would ship straight into the public JS bundle.

### 9.5 AI Provider (Anthropic)
- A production `ANTHROPIC_API_KEY` from console.anthropic.com — separate
  from any key used in development, so usage/cost tracking
  (`docs/MonitoringStrategy.md` §4.1's Admin AI Usage dashboard) reflects
  real production traffic only.
- Blank is still tolerated at boot (the AI Explanation/Tutor/Question
  Generator endpoints fail gracefully per their own established pattern —
  see `config/anthropic.ts`) but every AI feature is effectively off until
  this is set.

---

## 10. Backup Strategy

See `docs/BackupStrategy.md` for the full plan. Headline: **source code has
no backup at all today** (no `.git` anywhere in this project) — that is a
bigger, more urgent gap than MongoDB's, which is itself limited by the
likely free/shared Atlas tier not supporting automated snapshots. Both are
called out with concrete next steps in that document, not silently assumed
solved.

## 11. Monitoring Strategy

See `docs/MonitoringStrategy.md` for the full plan. Headline: health/
readiness endpoints and structured JSON logging already exist and are
ready to point external tooling at; no uptime monitor, log aggregator, or
error-tracking service is actually wired up yet — all three are
configuration/ingestion steps, not code changes, except error tracking
(§3 of that doc), which needs one small `errorHandler.middleware.ts`
addition.

## 12. Disaster Recovery Plan

See `docs/DisasterRecovery.md` for the full plan — per-scenario response
(Atlas outage, Cloudinary/Razorpay/Firebase outage, bad deploy rollback via
`cd.yml`'s tagged images, full host loss) plus honest current-state RTO/RPO
numbers, not aspirational ones.

---

## 13. Known Gaps (disclosed, not silently skipped)

- **No test runner installed** (`backend/tests/README.md`'s own long-standing
  note) — `.env.test.example` and `NODE_ENV=test` support exist and are
  ready, but nothing runs against them yet. Picking Vitest/Jest is an
  explicitly flagged future step requiring the user's input first, not
  something this step decided unilaterally.
- **No actual deploy-to-host step in CD** (§8.2) — `cd.yml` publishes
  images; nothing yet pulls and runs them on a real server, since no target
  host/orchestrator has been chosen.
- **`CACHE_DRIVER=redis` is accepted but not implemented** (§6) — fine at
  today's single-instance scale, a blocker before horizontal scaling.
- **No error-tracking service wired up** (`docs/MonitoringStrategy.md` §3)
  — the single highest-value monitoring gap identified this step.
- **No automated MongoDB backup script exists yet** (`docs/BackupStrategy.md`
  §2.1) — only documented as a plan.
- **Docker/nginx configs were reviewed, not build/run-verified in this
  session** — Docker isn't installed in this development environment.
  `.github/workflows/ci.yml`'s `docker` job build-verifies the three app
  images on the first real push; `nginx/gateway.conf` and
  `docker-compose.prod.yml` have not been exercised against a running
  Docker daemon at all yet (no real domain/certificates exist to test
  against either) — review the config carefully (or test in a disposable
  environment) before relying on it for a real cutover.
- **GHCR images publish as private by default** under a personal GitHub
  account — if a separate deploy host needs to pull them, either make the
  package public or authenticate that host with a token that has
  `read:packages` scope.

---

## 14. Pre-Deploy Checklist

- [ ] `backend/.env` on the production host copied from
      `.env.production.example`, every value filled with **production-only**
      credentials (never copied from `.env`/development) — see §9 for each
      service's specific setup steps
- [ ] `CORS_ORIGIN` set to real HTTPS origins (boot fails loudly if `*`)
- [ ] Razorpay: live-mode keys + webhook secret all set together, webhook
      URL registered in the Razorpay Dashboard's live mode (§9.4)
- [ ] `frontend`/`admin` built with production `--build-arg` values (or CD's
      repository secrets, §8.2), not the development defaults
- [ ] TLS certificates issued (§7.4) and `nginx/gateway.conf`'s domains
      match the real ones in use
- [ ] `GET /api/health` and `GET /api/health/ready` both return 200 after
      deploy, before routing real traffic to the new instance
- [ ] External uptime monitor configured against both endpoints
      (`docs/MonitoringStrategy.md` §1)
- [ ] Log aggregation actually reads `logs/combined.log`/`error.log` (or
      stdout, in production JSON format) from wherever the container runs
- [ ] Confirm single-instance deployment, or switch `CACHE_DRIVER` to
      `redis` first (§6)
- [ ] MongoDB backup mechanism confirmed working — a real restore drill,
      not just "the dump command ran" (`docs/BackupStrategy.md` §2.1)
- [ ] Source code pushed to a real git remote (§10 / `docs/BackupStrategy.md`
      §1) — confirm this before treating anything else here as "backed up"
