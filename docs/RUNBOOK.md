# Nalanda TNPSC — Runbook

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 75 — Production Go-Live |
| **Last Updated** | 2026-08-11 |
| **Audience** | Whoever operates the production host — deploy, restart, roll back, scale |
| **Companion docs** | `docs/Deployment.md` (why each piece works), `docs/DisasterRecovery.md` (scenario-based response), `docs/OPERATIONS_GUIDE.md` (routine, non-emergency operations) |

Command-first reference — "I need to do X, what do I run." Scenario-based
troubleshooting (what's broken, why) lives in `docs/DisasterRecovery.md`;
this document is the procedures those scenarios point back to.

---

## 1. Deploy

### 1.1 Docker (primary path)
```bash
# Local / behind an existing load balancer
docker compose up --build

# Production, own domain + TLS (nginx gateway, Sprint 4 Step 69)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
Full detail: `docs/Deployment.md` §7, `docs/DEPLOYMENT_GUIDE.md` Phase 5.

### 1.2 PM2 (bare-metal / no container runtime — Sprint 4 Step 72)
```bash
cd backend
npm install && npm run build
npm run pm2:start:prod      # builds, then `pm2 start ecosystem.config.js --env production`
pm2 startup && pm2 save     # survive a host reboot
```
Never run both supervisors on the same process — see
`docs/Deployment.md` §7.5.

### 1.3 Releasing a new version (CD)
```bash
git tag v1.0.1 && git push --tags
```
Triggers `.github/workflows/cd.yml` → builds/publishes tagged images to
`ghcr.io`. On the host:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 2. Restart

```bash
# Docker
docker compose restart backend

# PM2 — zero-downtime (waits for the new process's own readiness signal
# before killing the old one, server.ts's process.send('ready'))
npm run pm2:reload

# PM2 — hard restart
npm run pm2:restart   # (add to package.json if not present; `pm2 restart ecosystem.config.js` directly otherwise)
```

---

## 3. Roll Back a Bad Deploy

```bash
# Point the deployment at the previous known-good tag, then:
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
Requires the previous image still exists in GHCR (retained until pruned).
No separate rollback tooling exists — sufficient at this project's current
single-instance scale. Full detail: `docs/DisasterRecovery.md` §2.7.

---

## 4. Database

### 4.1 Backup (manual or scheduled)
```bash
npm run backup:database
```
Writes to `backend/backups/<timestamp>-<db>/` (gzip EJSON per collection).
Keeps the newest 7 runs automatically. **Not yet on a schedule** — add a
cron entry:
```
0 3 * * * cd /path/to/backend && npm run backup:database >> logs/backup.log 2>&1
```

### 4.2 Restore
```bash
# Dry run first — always
npm run restore:database -- --archive backups/<folder>

# Actually write
npm run restore:database -- --archive backups/<folder> --confirm

# Restrict to one collection (targeted recovery)
npm run restore:database -- --archive backups/<folder> --confirm --collection users
```
Restoring writes into whatever database `backend/.env`'s `MONGODB_URI`
currently points at — point `.env` at the intended target first.

### 4.3 Question-workflow migration (one-time, Sprint 4 Step 71.5)
```bash
npm run migrate:question-workflow
```
Required before or immediately after any deploy that predates the Content
Management Pipeline — backfills `workflow.status: 'published'` onto legacy
questions. Safe to re-run (no-op if already migrated).

### 4.4 Index audit
```bash
npm run audit:indexes
```
Lists every collection's actual indexes and flags any with only the
default `_id_` index.

---

## 5. Cloud Services Health

```bash
npm run verify:cloud-services   # MongoDB/Firebase/Cloudinary/Razorpay/AI credentials, one shot
npm run verify:cloudinary       # full upload/delete round trip
npm run verify:monitoring       # SystemEvent write/read/aggregate round trip
```
All three are read-only or self-cleaning — safe to run against production
at any time, including while the app is live.

---

## 6. Secrets Rotation

1. Generate the new credential at the provider (Atlas user, Firebase
   service account, Cloudinary API key, Razorpay key pair, Anthropic key,
   or a fresh JWT RS256 keypair — `docs/Deployment.md` §9 has the exact
   per-provider steps).
2. Update `backend/.env` on the production host (or the secret manager, if
   one is wired up — `docs/BackupStrategy.md` §5).
3. Restart the backend (§2 above) — env vars are read once at boot.
4. **JWT key rotation specifically invalidates every existing refresh
   token** (`Session.model.ts`'s hash is keyed to the signing keypair) —
   expected, not a bug; every logged-in user is signed out.
5. Confirm via `GET /api/health/ready` and one real login.

---

## 7. Scaling (before this is needed)

Today: single backend instance, `CACHE_DRIVER=memory` (per-process),
`express-rate-limit`'s default in-memory store (per-process). **Do not run
more than one backend instance** (PM2 cluster mode, multiple Docker
replicas, etc.) until `CACHE_DRIVER=redis` is actually implemented — two
instances would each rate-limit and cache independently and could briefly
disagree. See `docs/MonitoringStrategy.md` §5, `docs/Deployment.md` §7.5.

---

## 8. Common Commands Quick Reference

| Task | Command |
|---|---|
| Full local integration suite | `cd backend && npm run verify:seed && npm run verify:cloudinary && npm run verify:search && npm run verify:notifications && npm run verify:gamification && npm run verify:adaptive-practice && npm run verify:ai-optimization && npm run verify:ai-tutor && npm run verify:ai-question-generator && npm run verify:content-pipeline && npm run verify:cloud-services && npm run verify:monitoring` |
| Build all 3 apps | `for d in backend frontend admin; do (cd $d && npm run lint && npm run typecheck && npm run build); done` |
| Tail production logs | `docker compose logs -f backend` (Docker) / `npm run pm2:logs` (PM2) |
| Promote a user to super_admin | `cd backend && npm run promote:super-admin` |
| Cache benchmark | `cd backend && npm run benchmark:cache` |
