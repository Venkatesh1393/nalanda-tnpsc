# Nalanda TNPSC — Operations Guide

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 75 — Production Go-Live |
| **Last Updated** | 2026-08-11 |
| **Audience** | Whoever keeps the system running day to day — not incident response (`docs/DisasterRecovery.md`) or one-off commands (`docs/RUNBOOK.md`) |

What "normal" looks like, what to check on a routine cadence, and where to
look first when something feels off but isn't yet a declared incident.

---

## 1. What "Normal" Looks Like

| Signal | Healthy baseline (this session's live numbers) |
|---|---|
| `GET /api/health` | `200`, `uptimeSeconds` climbing without resets |
| `GET /api/health/ready` | `200`, `database: "Connected"` |
| MongoDB collections | 37 collections, 136 total indexes |
| Leaderboard (cached) | ~100ms warm, ~1.6s cold |
| Exam-code lookup (cached) | <1ms warm |
| `SystemEvent` volume | Near-zero in a quiet period — a sustained non-zero rate of `type: 'error'` is the first thing to look at |
| AI failure rate (`GET /admin/ai-usage`) | N/A today — `ANTHROPIC_API_KEY` is blank, so `failed` should read 100% of attempted generations until a key is set; this is *expected*, not an incident, while the key is intentionally unset |
| Payment success rate (`GET /admin/payments/stats`) | N/A until `RAZORPAY_WEBHOOK_SECRET` is set — captured stays 0 by design until then |

---

## 2. Daily

- [ ] Skim `GET /admin/monitoring/summary?days=1` — any `critical`-severity
      spike in `error`/`webhook_failure`.
- [ ] Confirm the scheduled `npm run backup:database` cron ran (check
      `logs/backup.log` or the cron system's own log) — once §7 of
      `docs/RUNBOOK.md` is actually scheduled on the production host.

## 3. Weekly

- [ ] `GET /admin/ai-usage?days=7` — cost trend, `avgLatencyMs` trend (a
      rising latency trend is worth investigating before it becomes a
      timeout problem — see `docs/AlertingStrategy.md` §2.5).
- [ ] `GET /admin/payments/stats?days=7` — success rate trend.
- [ ] `npm run audit:indexes` — re-run after any new query pattern ships;
      confirm no collection regressed to zero secondary indexes.
- [ ] Atlas dashboard's own Metrics tab — connection count, disk usage
      trend (`docs/MonitoringStrategy.md` §8.2).
- [ ] Cloudinary dashboard — bandwidth/storage credit usage, especially on
      a free tier with a hard monthly cap.

## 4. Monthly

- [ ] `npm audit` in all three apps — review new advisories, patch what's
      safe (`npm audit fix`), re-run lint/typecheck/build after.
- [ ] Perform an actual restore drill (`npm run restore:database`, dry run
      is enough for a routine check; a full `--confirm` drill against a
      scratch database periodically) — an untested backup is not a backup.
- [ ] Review `SystemEvent` volume trends month-over-month — a slowly
      rising baseline of `slow_query`/`slow_request` events is an early
      signal to revisit `docs/MonitoringStrategy.md` §5's Performance
      Advisor before it becomes a user-facing problem.
- [ ] Rotate any credential due for its annual/on-suspicion rotation
      (`docs/BackupStrategy.md` §5).

## 5. On Every Deploy

- [ ] `docs/DEPLOYMENT_GUIDE.md` Phase 4's full local verification suite,
      clean.
- [ ] `GET /api/health` and `GET /api/health/ready` both `200` immediately
      after the new version is live, before it takes real traffic.
- [ ] If the deploy touches `Question.model.ts` or anything content-workflow
      related, confirm `npm run migrate:question-workflow` isn't needed
      again (it's a no-op if already applied — safe to run defensively).

---

## 6. Where to Look First

| Symptom | Start here |
|---|---|
| "Something feels slow" | `GET /admin/monitoring/events?type=slow_request` then `?type=slow_query` — both are timestamped and named by route/collection |
| "A user says a payment didn't go through" | `GET /admin/payments/stats`, then `GET /admin/payments?userId=...` for their specific history — `docs/PRODUCTION_SUPPORT_GUIDE.md` has the full triage tree |
| "AI features seem broken" | `GET /admin/ai-usage` — check `failed` count and `avgLatencyMs` first; if `ANTHROPIC_API_KEY` is blank this is expected, not new |
| "Is the backup actually running" | `backend/backups/` — newest folder's timestamp should be within the last scheduled interval |
| "Did an admin do something to this account" | `GET /admin/audit-logs?entityId=...` — every privileged action is logged |

---

## 7. Dashboards & Endpoints Reference

All `admin`/`support`/`super_admin`-only, all read-only:

| Endpoint | Shows |
|---|---|
| `GET /admin/dashboard` | High-level platform stats |
| `GET /admin/monitoring/summary` / `/events` | Errors, slow queries/requests, webhook failures |
| `GET /admin/ai-usage` | AI usage, cost, latency, failures by feature/user/question |
| `GET /admin/payments/stats` / `/payments` | Payment success/failure, webhook failures, per-payment detail |
| `GET /admin/audit-logs` | Every privileged admin action, queryable |
| `GET /admin/users` | User search/management |

Provider-native dashboards (no code, just log in): MongoDB Atlas Metrics,
Razorpay Dashboard, Cloudinary Dashboard, Firebase Console.

---

## 8. Known, Accepted Operational Limits (not bugs)

- Single backend instance only, until `CACHE_DRIVER=redis` is implemented
  (`docs/RUNBOOK.md` §7).
- No real-time alerting/paging yet — every signal above is pull, not push
  (`docs/AlertingStrategy.md` §3 is the spec for closing this).
- No unit test suite — correctness signal today comes from strict
  TypeScript, clean lint, and the live `verify:*` integration suite
  (`docs/DEPLOYMENT_GUIDE.md` Phase 4).
