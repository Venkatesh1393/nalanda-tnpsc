# Nalanda TNPSC — Monitoring Strategy

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 69 — Production Deployment |
| **Last Updated** | 2026-08-10 |

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
**No dedicated error-tracking service (Sentry or similar) is integrated** —
today, an error is only visible by reading logs after the fact, not
proactively surfaced. This is the single highest-value monitoring gap to
close next: a Sentry (or equivalent) SDK call inside the `error instanceof
ApiError && !error.isOperational` / generic-500 branches of
`errorHandler.middleware.ts` would surface unexpected errors in real time
with zero change to the response shape sent to clients.

---

## 4. Metrics

### 4.1 Already real, application-level
- **Admin AI Usage dashboard** (`GET /admin/ai-usage`, Sprint 4 Step 58) —
  per-model AI cost/volume, reading only the `AIHistory` audit log.
- **Admin Audit Log** (`AuditLog.model.ts`, Sprint 4 Step 52) — every
  privileged admin action, queryable by actor/entity/time.
- **`GET /api/health`'s `uptimeSeconds`** — the simplest possible process
  metric, already exposed.

### 4.2 Provider-native, already available without new code
- **MongoDB Atlas's own metrics dashboard** (connections, operation
  latency, disk usage) — available on every tier including free/shared,
  under Atlas's "Metrics" tab; Atlas also supports configuring alerts
  (e.g. connection count approaching the tier's limit) directly, no
  integration work needed.
- **Razorpay Dashboard's** own payment-success-rate/failed-payment views.
- **Cloudinary Dashboard's** usage/bandwidth view (relevant since free-tier
  Cloudinary accounts have a hard monthly credit cap — approaching it is
  worth alerting on before uploads start failing).

### 4.3 Not yet built
- No Node.js process-level metrics (event-loop lag, memory, CPU) are
  exported anywhere (no `/metrics` Prometheus endpoint, no APM agent). At
  today's single-instance scale this is a real but lower-priority gap than
  §3 (error tracking) — worth adding once traffic is real enough that
  "is the process under load" becomes a live question.

---

## 5. Summary — what to actually do first

Ranked by effort-to-value, cheapest first:

1. Point an external uptime monitor at `/api/health` and `/api/health/ready`
   (§1) — no code change, five minutes once a domain exists.
2. Ship existing logs to an aggregator (§2) — no code change, an ingestion
   config step.
3. Add error tracking (§3) — the one item here that's a real (small) code
   change, and the highest-value one: today, an unexpected production error
   is genuinely invisible until someone goes looking.
4. Turn on Atlas/Razorpay/Cloudinary's own built-in alerting (§4.2) — no
   code change, dashboard configuration only.
5. Process-level metrics (§4.3) — defer until traffic/scale actually
   motivates it.
