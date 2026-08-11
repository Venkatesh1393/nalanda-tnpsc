# Nalanda TNPSC — Production Support Guide

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 75 — Production Go-Live |
| **Last Updated** | 2026-08-11 |
| **Audience** | `support`/`admin`/`super_admin` staff handling real user-reported issues via the Admin Panel |

For engineers debugging the system itself, see `docs/OPERATIONS_GUIDE.md`
and `docs/RUNBOOK.md`. This document is for triaging a specific user's
complaint.

---

## 1. What Support Can and Cannot Do

By deliberate design (Sprint 4 Step 55/56), **support staff cannot
directly**:
- Grant, extend, or manually activate a subscription — only Razorpay's
  webhook does that (`services/payment.service.ts`). No "give this user
  premium" button exists, anywhere.
- Refund a payment — that's a Razorpay Dashboard/Refunds API action, never
  a form in this Admin Panel.
- Edit a user's Profile data on their behalf (no such endpoint exists).
- Restore a specific deleted item outside of a full database restore
  (`docs/RUNBOOK.md` §4.2).

Support **can**:
- View any user's profile, subscription status, payment history, AI usage,
  and audit trail (`GET /admin/users/:id`, `/admin/payments?userId=...`,
  etc.).
- Send/broadcast notifications (`docs/Deployment.md`-adjacent, Sprint 4
  Step 62).
- Change a user's `status` (active/suspended) — `admin`/`super_admin` only.
- Review and approve/reject AI-generated question drafts.
- View — never edit — the operational event log (`SystemEvent`).

If a user's ask requires something not in the list above, it requires an
engineer, not a support action — say so plainly rather than attempting a
workaround.

---

## 2. Common User Reports & Triage

### "I paid but didn't get Premium"
1. `GET /admin/payments?userId=<their id>` — find the order.
2. If `status: 'created'` and it's been more than a few minutes: the
   webhook likely never arrived, or arrived and failed signature
   verification. Check `GET /admin/monitoring/events?type=webhook_failure`
   for the same time window.
3. If `status: 'captured'` but the user still shows `free` tier: check
   `GET /admin/subscriptions?userId=...` — if it's genuinely stuck,
   escalate to an engineer (this is not a support-fixable state; see §1).
4. **Known current-state caveat**: `RAZORPAY_WEBHOOK_SECRET` may be blank
   in this environment (`docs/GO_LIVE_CHECKLIST.md`) — if so, **every**
   checkout today can take money without activating anything. This is a
   platform-wide configuration issue, not a per-user bug — escalate
   immediately, don't triage user-by-user.

### "AI Explanation / AI Tutor isn't working"
1. Confirm their subscription tier actually includes the feature
   (`GET /admin/subscriptions?userId=...` → `entitlements`) — a `free`
   user seeing "upgrade to unlock" is correct behavior, not a bug.
2. If they're entitled and still failing: check
   `GET /admin/ai-usage?days=1` for their user — a `failed` row with
   `errorMessage: "AI provider not configured"` means
   `ANTHROPIC_API_KEY` is blank platform-wide (a known, disclosed
   current-state gap, not specific to them).
3. Otherwise, check `GET /admin/monitoring/events?type=error` around the
   report time for the actual failure.

### "My progress/streak/XP looks wrong"
1. `GET /admin/users/:id` for their current stats.
2. `GET /admin/audit-logs?entityId=<userId>` won't show gameplay activity
   (that's not an admin action) — gameplay history itself isn't
   separately exposed to support today; this requires an engineer with
   direct DB read access if the discrepancy isn't explainable from the
   Dashboard/Analytics numbers alone.

### "I can't log in"
1. Confirm `status: 'active'` on their account (a `suspended` user is
   correctly blocked — check whether that was intentional).
2. Firebase-side issues (wrong provider, locked account) aren't visible
   from this Admin Panel — check the Firebase Console directly, or
   escalate.
3. If they report being logged out unexpectedly platform-wide: check
   whether a JWT key rotation happened recently (`docs/RUNBOOK.md` §6) —
   that invalidates every session by design, not a bug.

### "My uploaded photo/document didn't work"
1. Check `GET /admin/monitoring/events?type=error` filtered to their
   upload window — Cloudinary failures surface there.
2. Confirm the file was within the size/type limits shown in the app —
   `middleware/upload.middleware.ts` enforces these before Cloudinary is
   even called.
3. **If this is a Profile avatar upload**: known current-state gap — the
   frontend Settings page doesn't call the real upload endpoint yet
   (`docs/GO_LIVE_CHECKLIST.md`'s top launch-blocker). This isn't
   fixable per-user; it's a platform gap pending an engineering fix.

### "A question/answer looks wrong"
1. `GET /admin/questions/:id` — check `workflow.status`; only
   `published` questions should be reachable by students. If a student
   saw a `draft`/`pending_review` question, that's a real bug — escalate.
2. Content correctness (a wrong answer key, a typo) is an Admin Panel
   content-editing task (`content_editor`/`moderator` role), not an
   engineering escalation.

---

## 3. Escalation Path

Escalate to an engineer when:
- The issue affects more than one user in the same way (a platform
  issue, not an account issue).
- `GET /admin/monitoring/summary` shows an elevated `critical` count in
  the relevant time window.
- The fix would require a database write outside what the Admin Panel's
  own UI supports (§1's "cannot" list).
- A payment took money without the corresponding product access
  activating, and it isn't the platform-wide webhook-secret gap already
  known (§2) — this is the one category serious enough to treat as
  urgent every time.

When escalating, include: the user's ID/email, the exact endpoint(s)
checked, and what they showed — not just "user says X is broken." A
support ticket with `GET /admin/payments?userId=...`'s actual response
attached is immediately actionable; "user says payment didn't work" is not.
