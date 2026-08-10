# Nalanda TNPSC — Deployment Guide (Ordered Runbook)

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 70 — Final Production Audit |
| **Last Updated** | 2026-08-10 |
| **Purpose** | A single, in-order sequence to actually go live. Explains *what to do*; `docs/Deployment.md` explains *why/how each piece works* — read that alongside this for any step that needs more depth. |

Do not skip §1 — deploying with any of its items unresolved means shipping
one of the launch-blocking issues in `docs/PRODUCTION_READINESS_REPORT.md`.

---

## Phase 0 — Pre-Flight (do this before anything below)

Read `docs/PRODUCTION_READINESS_REPORT.md` in full. Its four
Launch-Blocking items must all be closed before Phase 4 (Go Live):

- [ ] Profile/Settings wired to the real backend (`userService.ts` +
      Cloudinary avatar upload, not `profileService.ts`)
- [ ] `RAZORPAY_WEBHOOK_SECRET` configured and the live webhook registered
- [ ] `git init` + pushed to a real remote
- [ ] `npm audit fix` run in `frontend/` (react-router advisory)

Everything from here on assumes those are either done or explicitly
accepted as a known-shipped gap by whoever is signing off on launch.

---

## Phase 1 — Source Control (do this first, literally everything after depends on it)

```bash
cd c:\Users\venky\Nalanda-TNPSC
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

The moment this is done, `.github/workflows/ci.yml` starts running on every
push/PR automatically — no further action needed to activate it.

---

## Phase 2 — Provision External Services

Follow `docs/Deployment.md` §9 in order, one service at a time — each has
its own checklist there (MongoDB Atlas network access + dedicated user,
Firebase separate prod project, Cloudinary scoped keys, Razorpay live-mode
activation + webhook, Anthropic prod key). Do this **before** filling in
`backend/.env.production.example`, since several of its fields come
directly from this phase's output.

- [ ] MongoDB Atlas production database provisioned, IP-allowlisted or
      VPC-peered, dedicated user created
- [ ] Firebase production project created, providers enabled, Admin SDK
      service account generated
- [ ] Cloudinary production account/cloud ready
- [ ] Razorpay live mode activated, keys generated, webhook URL
      pre-registered (points at a domain from Phase 3 — register it now,
      values are stable even before DNS is live)
- [ ] Anthropic production API key generated

---

## Phase 3 — Configure

1. Copy `backend/.env.production.example` → `backend/.env` on the
   production host, fill every value from Phase 2. **Never copy values
   from the development `.env`.**
2. Fill `frontend`/`admin` `VITE_*` values — either as local
   `--build-arg`s (`docs/Deployment.md` §7.2) or as GitHub Actions
   repository secrets for the CD pipeline (§8.2 below).
3. Replace every `nalanda-tnpsc.com` placeholder in `nginx/gateway.conf`
   and `nginx/snippets/ssl-params.conf` with the real domain.
4. Run through `docs/Deployment.md` §14's Pre-Deploy Checklist in full.

---

## Phase 4 — Build & Verify Locally

```bash
# Each app
cd backend  && npm run lint && npm run typecheck && npm run build
cd frontend && npm run lint && npm run typecheck && npm run build
cd admin    && npm run lint && npm run typecheck && npm run build

# Backend integration suite (live Atlas — see docs/FINAL_AUDIT.md Part 4
# for the full list). Run every one; all 9 must report 0 failed assertions.
cd backend
npm run verify:seed
npm run verify:cloudinary
npm run verify:search
npm run verify:notifications
npm run verify:gamification
npm run verify:adaptive-practice
npm run verify:ai-optimization
npm run verify:ai-tutor
npm run verify:ai-question-generator
```

All twelve commands above must be clean before proceeding. If any
`verify:*` script fails against the *production* database for the first
time (as opposed to development, where it was last confirmed clean in
`docs/FINAL_AUDIT.md`), stop and investigate before going further — do not
assume it's environment noise.

---

## Phase 5 — Provision the Host & Go Live

```bash
# On the production host, with Docker + Docker Compose installed:
git clone <your-repo-url>
cd Nalanda-TNPSC
# (place the real backend/.env here — never commit it)

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# One-time TLS certificate issuance (docs/Deployment.md §7.4 has the exact
# command with your real domain names filled in)
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d app.<your-domain> -d admin.<your-domain> -d api.<your-domain> \
  --email you@<your-domain> --agree-tos --no-eff-email

docker compose -f docker-compose.yml -f docker-compose.prod.yml exec gateway nginx -s reload
```

Point DNS (A records) for `app.`/`admin.`/`api.<your-domain>` at the host's
IP before the Certbot step — HTTP-01 validation needs it resolvable.

---

## Phase 6 — Verify Live

```bash
curl -s https://api.<your-domain>/api/health         # {"status":"OK",...}
curl -s https://api.<your-domain>/api/health/ready    # {"status":"READY","database":"Connected",...}
```

Then manually walk through, against the real production URLs: register a
throwaway account → complete onboarding → view Dashboard → open a Learn
lesson → run a real Topic Quiz Practice session → check the Leaderboard
data appears on the public landing page → log out → log back in. This is
the same golden-path list `docs/FINAL_AUDIT.md` Part 1 verified at the code
level — walking it manually once against production confirms the deployed
build behaves the same way live traffic will experience it.

---

## Phase 7 — Turn On Operations

- [ ] External uptime monitor pointed at both health endpoints
      (`docs/MonitoringStrategy.md` §1)
- [ ] Log aggregator ingesting `logs/*.log` or container stdout
      (`docs/MonitoringStrategy.md` §2)
- [ ] `docs/BackupStrategy.md` §2's MongoDB dump scheduled and one restore
      drill actually performed, not just scripted
- [ ] Atlas/Razorpay/Cloudinary dashboards' own built-in alerting turned on
      (`docs/MonitoringStrategy.md` §4.2)

---

## Ongoing: Releasing New Versions

```bash
git tag v1.0.1
git push --tags
```

This triggers `.github/workflows/cd.yml`, which builds and publishes
tagged images to `ghcr.io`. Pull and redeploy on the host:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

If something's wrong, roll back to the previous tag the same way
(`docs/DisasterRecovery.md` §2.7) — do not debug live in production when a
known-good previous image is one command away.
