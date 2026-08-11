# Nalanda TNPSC — Monitoring Strategy

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 74 — Production Monitoring (extends Step 69) |
| **Last Updated** | 2026-08-11 |

What already exists to observe this system's health today, what doesn't yet,
and the concrete next step for each gap. Layered into four levels, cheapest
and most-already-built first.

---

## 1. Uptime / Availability (external, black-box)

`GET /api/health` and `GET /api/health/ready` (`docs/Deployment.md` §3)
already exist and are exactly what an external uptime monitor should poll —
liveness for "is the box up," readiness for "can it actually serve
traffic." **No external monitor is configured yet** — this is a five-minute
follow-up once a domain exists (any of UptimeRobot, Better Stack, Checkly,
or a cloud provider's native uptime check works against these endpoints
unchanged; none is favored over another here since it's an infra choice,
not a code one).

Recommended alert thresholds:
- Liveness fails ≥2 consecutive checks → page on-call (process is likely
  wedged or the container crashed).
- Readiness fails ≥3 consecutive checks (allow a short blip) → alert, not
  page — likely a transient Atlas hiccup, not an emergency, per
  `docs/Deployment.md` §3's liveness/readiness distinction.

---

## 2. Logs

`config/logger.ts` (Winston) already writes structured JSON to
`logs/combined.log`/`logs/error.log` plus stdout, in production — this is
already in the exact shape a log aggregator wants (Datadog, Better Stack
Logs, Grafana Loki, or a cloud provider's native log service all ingest
JSON lines directly). **No aggregator is wired up yet** — today, "checking
the logs" means reading the file on the host or `docker logs`, which
doesn't scale past one instance or survive a container being recreated.
Follow-up: ship `logs/*.log` (or stdout, if the chosen platform captures
container stdout automatically — most do) to whichever aggregator is
chosen; no code change needed, this is purely a shipping/ingestion step.

Confirmed in Sprint 4 Step 66's audit and unchanged since: no request body,
token, password, OTP, or secret is ever logged — safe to ship these logs to
a third party without a redaction step.

---

## 3. Errors

`middleware/errorHandler.middleware.ts` logs every unexpected error's full
message/stack server-side (never to the client — `docs/Deployment.md` §5).

**Sprint 4 Step 74 closed the "invisible until someone goes looking" gap**
without adding a third-party dependency: every unexpected error (a
non-operational `ApiError`, or the generic-500 fallthrough) is now also
written to a queryable `SystemEvent` collection
(`models/SystemEvent.model.ts`) via `utils/systemEvents.ts#recordSystemEvent`
— a self-hosted, minimal alternative to Sentry. Query it via `GET
/admin/monitoring/events?type=error` or the summary at `GET
/admin/monitoring/summary` (both `admin`/`support`/`super_admin`, same
viewer set as Payments/AI Usage). Rows auto-expire after 30 days (ops
noise, not a permanent audit trail — `AuditLog` remains that).

This is deliberately not a replacement for a real error-tracking service —
it has no email/Slack alerting, no issue grouping/deduplication, no
release-tracking. **A real Sentry-or-equivalent integration remains the
higher-value follow-up** once traffic is real enough to justify the
subscription; `SystemEvent` is the "close the gap for free, today" version
of the same idea, and the two aren't mutually exclusive — a future Sentry
SDK call would sit right next to the existing `recordSystemEvent` calls in
`errorHandler.middleware.ts`, not replace them.

---

## 4. Performance & API Monitoring (Sprint 4 Step 74)

- **Every request** already gets a `morgan` access-log line
  (`combined` format in production — method/path/status, no response time).
- **Slow requests** (`middleware/requestMonitoring.middleware.ts`, mounted
  in `app.ts` right after the health-check routes) are additionally flagged
  as a `SystemEvent` (`type: 'slow_request'`) whenever a response takes
  longer than 1000ms — `warning` severity, escalating to `critical` past
  5000ms. Health-check polling is deliberately excluded (mounted after
  `/api/health`) so uptime-monitor traffic never pollutes this signal.
- Query via `GET /admin/monitoring/events?type=slow_request` or
  `GET /admin/monitoring/summary`.

---

## 5. Database — Slow Queries & Indexes (Sprint 4 Step 74)

- **Slow queries**: `config/database.ts#attachSlowQueryMonitoring` listens
  to the MongoDB driver's own command-monitoring events
  (`monitorCommands: true`, `CONNECTION_OPTIONS`) — not a Mongoose schema
  plugin, deliberately, since a plugin only applies to schemas compiled
  *after* it's registered, making correctness depend on file import order
  across this codebase's 20+ models. Command monitoring instead observes
  every `find`/`aggregate`/`update`/`delete`/`insert`/`count`/`distinct`
  the driver actually sends, connection-wide. Anything over 200ms is logged
  and recorded as a `SystemEvent` (`type: 'slow_query'`, collection +
  command name + duration in `metadata`) — `warning`, escalating to
  `critical` past 1000ms. **Live-verified in this step**: a real slow write
  (a 209ms parallel insert against free-tier Atlas) was correctly detected
  and recorded during `npm run verify:monitoring`.
- **Indexes**: `npm run audit:indexes` (`backend/src/scripts/auditIndexes.ts`)
  lists every collection's actual indexes as they exist in Atlas right now
  (not what a `*.model.ts` file declares, which can drift) and flags any
  collection with only the default `_id_` index. **Run in this step against
  the real development database**: all 37 collections, 136 total indexes,
  zero flagged — every collection already has at least one secondary index.
- **Performance** (broader than slow-query logging): MongoDB Atlas's own
  Performance Advisor (§6.2 below) already covers index-suggestion-from-
  slow-queries at the infrastructure level — the two are complementary, not
  redundant: Atlas sees the query shape and suggests an index; `SystemEvent`
  gives an application-side, queryable log of *when* it happened and how
  often, without needing the Atlas console open.

---

## 6. AI — Usage, Cost, Latency, Failures

### 6.1 Already real (Sprint 4 Step 58)
- **Admin AI Usage dashboard** (`GET /admin/ai-usage`) — per-feature
  usage/cost, reading only the `AIHistory` audit log (never the generated
  content itself).

### 6.2 New this step (Sprint 4 Step 74) — Latency
`AIHistory.latencyMs` — wall-clock time of the actual provider call
(including the SDK's own internal retry attempts), measured at all three
call sites (`services/ai/questionExplanation.service.ts`,
`services/ai/aiTutor.service.ts`,
`services/admin/adminAiQuestionGenerator.service.ts`) and recorded on both
success *and* failure rows (left `undefined` only when no provider call was
attempted at all — daily-quota-exceeded, provider-not-configured). The
Admin AI Usage dashboard's summary now includes `avgLatencyMs` alongside
cost/volume. Usage and Failures (`status: 'success' | 'failure'`) were
already tracked since Step 58 — this step only added the missing Latency
dimension the checklist called for explicitly.

---

## 7. Payments — Successful, Failures, Webhook Failures (Sprint 4 Step 74)

`GET /admin/payments/stats?days=7` (new this step,
`services/admin/adminPayments.service.ts#getPaymentStats`) — combines two
sources that intentionally stay separate collections:

- **Payment status counts** (`created`/`captured`/`failed`/`refunded`) and
  a **success rate** (`captured / (captured + failed)`, ignoring
  still-in-progress `created` rows) — from `Payment` (Sprint 4 Step 56).
- **Webhook failures** (signature verification failed, or the body didn't
  parse as JSON — `services/payment.service.ts#processWebhookPayload`) —
  from `SystemEvent` (`type: 'webhook_failure'`), *not* `Payment`, since a
  spoofed/malformed webhook request may not reference any real order at
  all. Signature failures are recorded at `critical` severity — a sustained
  run of these is either a misconfigured `RAZORPAY_WEBHOOK_SECRET` or an
  actual attack against the endpoint, both worth surfacing immediately.
- A **recent-failures list** (last 10 failed `Payment` rows in the window)
  for "what just broke" triage, same shape `listPayments` already returns.

---

## 8. Metrics

### 8.1 Already real, application-level
- **Admin AI Usage dashboard**, **Admin Payments stats**, **Admin
  Monitoring dashboard** (§6/§7/§3–5 above).
- **Admin Audit Log** (`AuditLog.model.ts`, Sprint 4 Step 52) — every
  privileged admin action, queryable by actor/entity/time.
- **`GET /api/health`'s `uptimeSeconds`** — the simplest possible process
  metric, already exposed.

### 8.2 Provider-native, already available without new code
- **MongoDB Atlas's own metrics dashboard** (connections, operation
  latency, disk usage) — available on every tier including free/shared,
  under Atlas's "Metrics" tab; Atlas also supports configuring alerts
  (e.g. connection count approaching the tier's limit) directly, no
  integration work needed.
- **Razorpay Dashboard's** own payment-success-rate/failed-payment views —
  now complemented, not replaced, by §7's app-level view.
- **Cloudinary Dashboard's** usage/bandwidth view (relevant since free-tier
  Cloudinary accounts have a hard monthly credit cap — approaching it is
  worth alerting on before uploads start failing).

### 8.3 Not yet built
- No Node.js process-level metrics (event-loop lag, memory, CPU) are
  exported anywhere (no `/metrics` Prometheus endpoint, no APM agent). At
  today's single-instance scale this is a real but lower-priority gap —
  worth adding once traffic is real enough that "is the process under
  load" becomes a live question.
- No real third-party error-tracking service (§3) — `SystemEvent` is a
  self-hosted stopgap, not a full replacement.
- No alerting/paging is actually wired up anywhere yet — every signal in
  this document is *queryable*, not *pushed*. See `docs/AlertingStrategy.md`
  (new this step) for the concrete thresholds and what closing this gap
  would take.

---

## 9. Summary — what to actually do first

Ranked by effort-to-value, cheapest first:

1. Point an external uptime monitor at `/api/health` and `/api/health/ready`
   (§1) — no code change, five minutes once a domain exists.
2. Ship existing logs to an aggregator (§2) — no code change, an ingestion
   config step.
3. ~~Add error tracking~~ — done this step via `SystemEvent` (§3); a real
   Sentry-or-equivalent SDK remains the next-level follow-up.
4. Turn on Atlas/Razorpay/Cloudinary's own built-in alerting (§8.2) — no
   code change, dashboard configuration only.
5. Wire up real alerting/paging against the signals this document now
   exposes (`docs/AlertingStrategy.md`) — the biggest remaining gap: every
   signal here is queryable on demand, none of them proactively notify
   anyone yet.
6. Process-level metrics (§8.3) — defer until traffic/scale actually
   motivates it.
