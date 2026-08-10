# Nalanda TNPSC — Disaster Recovery Plan

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 69 — Production Deployment |
| **Last Updated** | 2026-08-10 |
| **Depends on** | `docs/BackupStrategy.md`, `docs/MonitoringStrategy.md`, `docs/Deployment.md` |

How this system responds to real failures, and how to bring it back. Read
`docs/BackupStrategy.md` first — the recovery procedures here assume its
backups exist; where they don't yet (its §1/§2.1 gaps), that's called out
explicitly below too, not glossed over.

---

## 1. Recovery Targets (honest, current-state)

| | RPO (max data loss) | RTO (max time to restore) |
|---|---|---|
| **Today**, no automated MongoDB backup yet | Unbounded — a catastrophic data-loss event today has no restore path | Unbounded, same reason |
| **Once `docs/BackupStrategy.md` §2.1's daily `mongodump` is scripted** | Up to 24h (time since last dump) | A few hours (manual `mongorestore` + redeploy) |
| **Once upgraded to Atlas M10+ Continuous Backup** | Minutes (point-in-time recovery) | Under an hour (Atlas-managed restore) |

This table is deliberately not aspirational-only — the "today" row reflects
this project's actual current state (single free/shared-tier Atlas cluster,
no scripted backup yet, single application host, no standby). Every
scenario below inherits this same honesty: what recovery looks like *today*
vs. *once the Backup Strategy gaps are closed*.

---

## 2. Failure Scenarios & Response

### 2.1 MongoDB Atlas — connection lost (transient)
**Symptom**: `GET /api/health/ready` returns 503 (`database: Disconnected`
per `controllers/health.controller.ts`); `/api/health` (liveness) keeps
returning 200 — the process itself is fine.
**Response**: Mongoose's own driver auto-reconnects
(`config/database.ts`'s `attachConnectionListeners`) — no action needed for
a brief blip. If sustained, check the Atlas status page and the cluster's
Metrics tab (`docs/MonitoringStrategy.md` §4.2) for the actual cause
(maintenance window, IP-allowlist change, tier connection-limit hit).
**Do not restart the app** for this alone — restarting doesn't fix an Atlas
issue and readiness already correctly pulled this instance from rotation.

### 2.2 MongoDB Atlas — data loss / corruption
**Symptom**: wrong/missing data, not a connection failure.
**Response**: stop writes immediately (take the backend out of rotation —
`docker compose -f docker-compose.yml -f docker-compose.prod.yml stop
backend`, or scale to zero) before anything else, to avoid the bad state
propagating further. Then follow `docs/BackupStrategy.md` §2's restore path
for whichever tier is in use. **Today, with no scripted backup yet, this
scenario has no restore path** — this is the single most important reason
`docs/BackupStrategy.md` §2.1's daily dump is the top follow-up from this
step, not a nice-to-have.

### 2.3 Backend process crash-loop
**Symptom**: Docker `HEALTHCHECK`/liveness failing repeatedly, container
restarting on a loop.
**Response**: `docker compose logs backend` / `logs/error.log`
(`docs/MonitoringStrategy.md` §2) for the actual exception —
`server.ts`'s `uncaughtException`/`unhandledRejection` handlers
(`docs/Deployment.md` §4) always log the real error before exiting, so the
cause should never be silent. If the crash is triggered by a bad deploy,
see §2.7 (Rollback) below rather than debugging live in production.

### 2.4 Cloudinary outage
**Symptom**: uploads (avatar, question/current-affairs images, study
materials) fail; existing already-uploaded images still load fine (served
directly from Cloudinary's CDN, independent of this backend).
**Response**: no action recoverable on this project's side — Cloudinary is
a third-party dependency with its own SLA/status page. `services/media/cloudinaryUpload.service.ts`
failures surface as a normal 5xx to the specific upload request; every
other feature keeps working (uploads are not on any critical read path).

### 2.5 Razorpay outage
**Symptom**: checkout/order-creation fails; **existing subscriptions are
unaffected** — entitlement checks (`services/entitlement.service.ts`) read
from MongoDB, not Razorpay, on every request.
**Response**: no action recoverable on this project's side. The webhook is
the only path that activates a subscription (`docs/Deployment.md` §2's
warning about a missing webhook secret is the *configuration* version of
this same principle) — if Razorpay's webhook delivery is delayed during an
incident, a payment can genuinely succeed on Razorpay's side before this
app knows about it. Razorpay retries webhook delivery automatically; no
manual replay mechanism exists in this codebase today (a disclosed gap, not
a bug — no support ticket / manual-activation admin endpoint exists per
Sprint 4 Step 55's explicit "no unsafe manual payment manipulation" design).

### 2.6 Firebase outage
**Symptom**: no new logins/signups succeed (`verifyFirebaseToken`
middleware fails); **already-issued Nalanda JWTs keep working** —
`middleware/auth.middleware.ts`'s `authenticate` never calls Firebase, only
verifies the backend's own RS256 tokens. Existing sessions are unaffected
until their refresh token needs Firebase again (it doesn't — refresh only
needs `Session.model.ts`, not Firebase).
**Response**: no action recoverable on this project's side.

### 2.7 Bad deploy / rollback
**Symptom**: a new version is live and visibly broken.
**Response**: `.github/workflows/cd.yml` tags every published image with
both a semver tag and a short commit SHA (`docker/metadata-action`) — roll
back by redeploying the previous known-good tag
(`docker compose pull && docker compose up -d` after pointing the compose
file / deployment config at the prior tag, or the equivalent redeploy step
on whatever orchestrator is eventually chosen). This requires the previous
image to still exist in the registry (GHCR retains images until explicitly
pruned) — no separate rollback tooling exists yet beyond "redeploy an older
tag," which is sufficient for this project's current single-instance scale.

### 2.8 Full host loss (single-VM deployment)
**Symptom**: the machine running `docker-compose.prod.yml` is gone
(hardware failure, provider outage, accidental termination).
**Response, today**: this is a real, currently-unmitigated single point of
failure — there is no standby host, no automated failover. Recovery means
provisioning a new host, restoring `backend/.env` from wherever it's backed
up (`docs/BackupStrategy.md` §5 — not yet standardized), redeploying via
`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
--build` (or pulling published images per §2.7), re-issuing TLS certificates
(`nginx/gateway.conf`'s Certbot flow, `docs/Deployment.md` §7.4), and
pointing DNS at the new host. **MongoDB Atlas, Cloudinary, and Firebase are
all independent of this host already** — none of that data is lost by a
host failure; only the application layer needs re-provisioning. This is the
concrete reason a horizontally-scaled or multi-host deployment
(`docs/Architecture.md`'s target shape) is worth prioritizing before this
project has real, revenue-bearing traffic.

---

## 3. Post-Incident

After any scenario above that involved real user impact: write down what
happened, when, and what fixed it (even briefly) somewhere durable — this
document doesn't currently have an incident log, and starting one the first
time it's actually needed is the right moment to add it, not before.
