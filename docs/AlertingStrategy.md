# Nalanda TNPSC — Alerting Strategy

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 74 — Production Monitoring |
| **Last Updated** | 2026-08-11 |
| **Depends on** | `docs/MonitoringStrategy.md` (what's measured), `docs/Deployment.md` §3 (health/readiness) |

`docs/MonitoringStrategy.md` answers "what can be observed today" — every
signal there is **queryable on demand**. This document answers the
different question: **what should actually generate a notification**, at
what threshold, and how urgently someone should respond. Honest up front:
**no alerting is wired up yet** — no email, Slack, PagerDuty, or SMS
integration exists in this codebase. This document is the concrete
specification for wiring one up, not a description of one that already
runs. Every rule below names the exact data source it reads.

---

## 1. Severity Levels

Two tiers, matching what `SystemEvent.severity` already encodes
(`models/SystemEvent.model.ts`) plus the uptime-monitor convention
`docs/MonitoringStrategy.md` §1 already established:

| Level | Meaning | Response |
|---|---|---|
| **Page** | Users are affected right now, or will be within minutes | Wake someone up, any hour |
| **Alert** | Something is degraded or trending wrong, not yet user-facing | Look at it during working hours, same day |

Nothing here pages on a single occurrence of routine, expected noise (a
lone failed payment, one slow request under load) — thresholds below are
tuned to catch *patterns*, not individual events, the same instinct
`middleware/errorHandler.middleware.ts`'s operational/non-operational split
already applies to which errors even get logged as unusual.

---

## 2. Rules by Signal

### 2.1 Uptime / Availability
*Source: `GET /api/health`, `GET /api/health/ready` — `docs/Deployment.md` §3*

| Condition | Level |
|---|---|
| Liveness fails ≥2 consecutive checks | **Page** — process likely wedged/crashed |
| Readiness fails ≥3 consecutive checks | **Alert** — likely a transient Atlas blip, not an emergency (readiness already pulled the instance from rotation correctly) |
| Readiness stays failed >10 minutes | **Page** — escalate the Alert above; a blip this long is no longer transient |

### 2.2 Errors
*Source: `SystemEvent` where `type: 'error'` — `GET /admin/monitoring/summary?days=1`*

| Condition | Level |
|---|---|
| >20 `critical`-severity error events in 15 minutes | **Page** — a spike this size means something just broke widely, not one user hitting one edge case |
| >5 `critical`-severity error events in 15 minutes | **Alert** |
| Any single error message repeats identically ≥10 times in an hour | **Alert** — one specific bug affecting many requests, worth a look even below the volume threshold above |

### 2.3 Performance / Slow Requests
*Source: `SystemEvent` where `type: 'slow_request'` — same query, `metadata.durationMs`*

| Condition | Level |
|---|---|
| >10 `critical`-severity (>5000ms) slow-request events in 15 minutes | **Page** — the app is meaningfully degraded for real users |
| >30 `warning`-severity (1000–5000ms) slow-request events in 15 minutes | **Alert** — trending slow, not yet critical |

### 2.4 Database — Slow Queries
*Source: `SystemEvent` where `type: 'slow_query'`*

| Condition | Level |
|---|---|
| Same `source` (collection+command) appears ≥15 times in 15 minutes | **Alert** — a specific query pattern is consistently slow; likely a missing index (`npm run audit:indexes` is the first thing to check) |
| Any `critical`-severity (>1000ms) slow query | **Alert** — one very slow query is worth a look even in isolation |

### 2.5 AI — Failures & Latency
*Source: `AIHistory` via `GET /admin/ai-usage`*

| Condition | Level |
|---|---|
| Failure rate (`failed / total`) exceeds 25% over a rolling hour, with ≥10 total requests | **Alert** — the Anthropic integration is degraded; every AI feature already fails gracefully to the user (`isAnthropicConfigured()` gate, standard-explanation fallback), so this is never user-blocking, but it is silently costing quota/UX quality |
| `avgLatencyMs` exceeds 15,000ms (75% of the 20s request timeout) over a rolling hour | **Alert** — approaching the timeout ceiling; requests are likely starting to fail on latency alone |
| Failure rate reaches 100% for 30+ minutes with ≥5 requests | **Page** — the AI provider integration is fully down, not just degraded |

### 2.6 Payments — Failures & Webhook Failures
*Source: `Payment` + `SystemEvent` via `GET /admin/payments/stats`*

| Condition | Level |
|---|---|
| Any `critical`-severity `webhook_failure` event (signature verification failed) | **Alert** on the first occurrence — could be a misconfigured `RAZORPAY_WEBHOOK_SECRET` (checked immediately after any secret rotation) or a spoofing attempt |
| ≥5 `webhook_failure` events in 15 minutes | **Page** — either subscriptions have stopped activating entirely (a misconfigured secret) or an active attack against the webhook endpoint |
| `successRate` (captured / resolved) drops below 70% over a rolling 6 hours, with ≥10 resolved payments | **Page** — checkout is broken for real paying users; this is revenue-critical, the highest-priority rule in this document |
| `successRate` drops below 90% over the same window | **Alert** |

### 2.7 Backups
*Source: `npm run backup:database`'s own exit code / cron job logs — `docs/BackupStrategy.md` §2.1*

| Condition | Level |
|---|---|
| Scheduled backup job fails (non-zero exit) | **Alert** — same day, not urgent in isolation |
| Two consecutive scheduled backup runs fail | **Page** — the backup mechanism itself may be broken, silently, exactly the "discovered the backup was broken during the actual emergency" failure mode `docs/DisasterRecovery.md` §3 exists to prevent |

---

## 3. What Wiring This Up Actually Takes

Every rule above reads from data that already exists and is already
queryable (`docs/MonitoringStrategy.md`) — nothing here requires new
application code, only a **polling/notification layer** on top:

1. A small scheduled job (cron, or a serverless function on whatever host
   is eventually chosen) that calls `GET /admin/monitoring/summary`,
   `GET /admin/ai-usage`, and `GET /admin/payments/stats` on an interval
   (5–15 minutes is reasonable for most rules above) and evaluates the
   thresholds in §2.
2. A notification channel — Slack webhook is the lowest-effort starting
   point (a single `POST` per triggered rule); PagerDuty/Opsgenie for real
   on-call rotation once there's a team large enough to need one.
3. Deduplication/cooldown so a sustained condition doesn't re-page every
   poll interval — even a simple "don't re-fire the same rule within 30
   minutes" in the polling job's own state is enough at this project's
   current scale; a dedicated alerting platform (§4) handles this natively.

**Not built this step** — this is the concrete next-step specification,
same disclosure discipline as every other doc in this set (`docs/BackupStrategy.md`,
`docs/DisasterRecovery.md`): named, scoped, and ready to implement, not
silently assumed done.

---

## 4. Alternative: a Managed Alerting Platform

Instead of the polling job in §3, a managed platform (Better Stack, Datadog,
Grafana Cloud, or a cloud provider's native monitoring) could ingest
`logs/*.log` directly (already structured JSON — `docs/MonitoringStrategy.md`
§2) and derive the same alerts from log queries instead of polling the
admin API. This trades "a small custom polling job to write and maintain"
for "a subscription and an ingestion-config step" — a reasonable choice
once budget allows, not a prerequisite for §3's approach to work first.
