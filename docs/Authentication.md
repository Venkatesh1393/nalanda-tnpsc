# Nalanda TNPSC — Authentication System Design

| | |
|---|---|
| **Document Owner** | Backend / Security Architecture |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-07-28 |
| **Inputs Reviewed** | `CLAUDE.md`, `docs/PRD.md`, `docs/CompetitorAnalysis.md`, `docs/UserPersonas.md`, `docs/UserJourney.md`, `docs/InformationArchitecture.md`, `docs/Architecture.md`, `docs/FolderStructure.md`, `docs/Database.md`, `docs/API.md` |
| **Relationship to other docs** | `docs/Architecture.md` §4 and `docs/API.md` §1 already sketch the authentication flow and its endpoints. This document is the dedicated, deeper specification those two summarize from — the authoritative source for auth behavior. |

### Foundational Design Decision: This Is a Passwordless System

Per the confirmed stack (`CLAUDE.md`), Nalanda supports exactly two sign-in paths — **Google Login** and **Email OTP** — and **no password exists anywhere in this system**. This single fact shapes several sections below in ways worth stating up front:
- There is no "Password Reset" flow, because there is no password to reset (Section 10 addresses what replaces it).
- "Email Verification" is not a separate step bolted onto signup — for the Email OTP path, verification *is* the sign-in mechanism itself (Section 11).
- Account security reduces to **protecting the OTP and refresh-token lifecycle**, since there's no password to be phished, leaked in a breach, or reused across sites — a genuine security advantage of this model, worth preserving rather than working around.

---

## 1. Authentication Model Overview

```
┌──────────────────┐         ┌──────────────────┐
│   Google Login    │         │    Email OTP      │
│  (Firebase-native  │         │  (custom-built,   │
│   OAuth provider)  │         │   backend-owned)  │
└─────────┬─────────┘         └─────────┬─────────┘
          │                              │
          │  Both converge on:           │
          └───────────────┬──────────────┘
                           ▼
              Firebase ID Token (identity proof)
                           │
                           ▼
              Backend verifies via Firebase Admin SDK
                           │
                           ▼
         Find-or-create User + Profile in MongoDB
                           │
                           ▼
        Issue Nalanda Access JWT (short-lived)
        + Refresh Token (rotating, HttpOnly cookie)
                           │
                           ▼
              Client is now authenticated for
                 all Nalanda API calls
```

**Why a backend-issued JWT sits on top of Firebase**, rather than using Firebase ID tokens directly on every API call: Firebase tokens carry identity only, not Nalanda-specific authorization state (`role`, `subscriptionTier`). A Nalanda-owned JWT lets the platform embed that state, control its own expiry/revocation independent of Firebase, and support features like "logout of all devices" that Firebase's client SDK doesn't natively expose at the granularity Nalanda needs.

---

## 2. Email OTP

### The Firebase Nuance (Why This Is Custom-Built)
Firebase Authentication's native passwordless options are **Phone OTP** and **Email Link** (a magic link, not a 6-digit code) — it does not offer a true "6-digit email code" primitive out of the box. Since the product requirement is specifically an **Email OTP** experience (matching user expectation from banking/UPI-style OTP flows familiar to Tamil Nadu users), Nalanda implements OTP generation, delivery, and verification **in its own backend**, then uses the Firebase Admin SDK to create/sign in the corresponding Firebase user record once the OTP is verified — so Firebase remains the system of record for identity, while the OTP mechanic itself is Nalanda's own code.

### Flow
1. User submits `name` + `email` (Registration screen, `docs/UserJourney.md` Screen 2).
2. Backend generates a **6-digit numeric OTP**, cryptographically random (not a weak counter or timestamp-derived value).
3. OTP is **hashed** (never stored in plaintext) and written to **Redis** with a **10-minute TTL**, keyed by email — an ephemeral, high-churn value like this belongs in the cache layer described in `docs/Architecture.md` §8, not a permanent MongoDB collection.
4. OTP is emailed to the user via the transactional email provider.
5. User submits the OTP (OTP screen, Screen 3); backend re-hashes the input and compares against the stored hash.
6. On match: Redis key is deleted immediately (single-use), a Firebase user is created/signed-in via Admin SDK, and the standard JWT-issuance flow (Section 4) proceeds.

### Anti-Abuse Rules
| Rule | Value | Rationale |
|---|---|---|
| OTP validity window | 10 minutes | Long enough for a slow inbox delivery, short enough to limit replay risk |
| Max verification attempts | 5 per OTP | Beyond this, the OTP is invalidated and a new one must be requested — prevents brute-forcing a 6-digit space (1,000,000 combinations) within the validity window |
| Resend cooldown | 60 seconds between requests | Prevents email-bombing a target inbox and reduces provider cost from spam resend loops |
| Max OTP requests per email | 5 per hour | Caps abuse even across the cooldown |
| Max OTP requests per IP | 20 per hour | Catches distributed abuse against many target emails from one source |

---

## 3. Google Login

### Flow
1. Client-side Firebase SDK initiates the Google OAuth popup/redirect.
2. Google authenticates the user and returns credentials to Firebase, which issues a **Firebase ID Token**.
3. Client sends this token to the backend (`POST /auth/google`, per `docs/API.md` §1).
4. Backend verifies the token's signature and expiry via the Firebase Admin SDK, extracting `email`, `email_verified`, `name`, and `photoUrl`.
5. Because Google has already verified the email ownership, **`email_verified: true` is trusted directly — no OTP step is inserted into this path.**
6. Find-or-create User/Profile, then proceed to JWT issuance (Section 4).

### Account Linking
If a user later attempts Google Login with an email address that already has an Email-OTP-registered account (or vice versa), the backend detects the match **by email**, links the new auth provider to the existing `User` document (rather than creating a duplicate account), and signs them into their existing account and history. This directly resolves the duplicate-account edge case flagged in `docs/UserJourney.md` Screen 2.

---

## 4. JWT (Nalanda Access Token)

### Claims Carried
| Claim | Meaning |
|---|---|
| `sub` | User's MongoDB `_id` |
| `role` | `user` \| `moderator` \| `content_editor` \| `admin` \| `support` |
| `subscriptionTier` | `free` \| `plus` \| `pro` \| `institutional` |
| `jti` | Unique token ID — enables per-token revocation tracking if ever needed independent of the broader session |
| `iat` / `exp` | Issued-at / expiry timestamps |

### Lifecycle Properties
- **TTL: 15 minutes.** Short enough that a stolen access token has a small blast-radius window, long enough to avoid excessive refresh traffic during normal use.
- **Signing algorithm: RS256 (asymmetric)** rather than HS256. This lets the *public* verification key be distributed to any future service that needs to verify tokens (e.g., a media/CDN service checking premium-content access) without ever sharing the *private* signing key — a forward-looking choice that costs nothing today and avoids a painful migration later.
- **Storage on client: in-memory only**, never `localStorage` or `sessionStorage`. This is a deliberate XSS-mitigation choice — a successful XSS injection cannot exfiltrate a token that was never written to any JS-accessible persistent storage. The access token is held in application memory (e.g., a store variable) and re-fetched via silent refresh after a full page reload.
- **`subscriptionTier` staleness window:** because the tier is embedded in the JWT at issuance, an upgrade/downgrade (Section on Payments in `docs/API.md`) takes effect on the **next token refresh**, at most 15 minutes later — an accepted, documented trade-off in exchange for not hitting the database on every single request to check tier.

---

## 5. Refresh Tokens

### Properties
- **TTL: up to 30 days** (see Section 9, Remember Me, for how this varies).
- **Storage:** an **HttpOnly, Secure, SameSite=Strict cookie** — never accessible to JavaScript, which is the primary defense against token theft via XSS for this longer-lived credential.
- **Server-side record:** the backend stores only a **hash** of the refresh token (never the raw value) alongside a `sessionId`, `deviceInfo` (user-agent summary, not full fingerprinting), `createdAt`, and `lastUsedAt` — this record is what powers Section 8 (Sessions).

### Rotation and Reuse Detection
Every time a refresh token is used to obtain a new access token, it is **immediately invalidated and replaced with a new refresh token** (rotation) — a refresh token is single-use.

```
Normal flow:
  RefreshToken_A used → validated → RefreshToken_B issued, A invalidated

Theft-detection flow:
  RefreshToken_A used (by attacker, after being stolen)
     → validated → RefreshToken_B issued, A invalidated
  RefreshToken_A used AGAIN (by legitimate user, unaware A is stolen)
     → A is already invalidated → REUSE DETECTED
     → entire session/token family revoked immediately
     → legitimate user is forced to re-authenticate
     → (optionally) a security notification is sent to the user's email
```
This reuse-detection pattern means a stolen-but-not-yet-used refresh token is a ticking clock, not a permanent backdoor — the moment *either* party (attacker or legitimate user) uses an already-rotated token, the whole family is torched.

---

## 6. Roles

| Role | Description | Where It Applies |
|---|---|---|
| `user` | Default role for every registered aspirant | Student Dashboard, Mobile App |
| `moderator` | Reviews/moderates Community content, handles flagged posts | Admin Panel (Moderation section) |
| `content_editor` | Creates/edits Questions, Study Materials, Videos, Current Affairs, Mock Tests | Admin Panel (Content Management section) |
| `admin` | Full platform access: user management, subscriptions/refunds, role changes, audit logs, broadcast notifications | Admin Panel (all sections) |
| `support` | Read access to user accounts and subscription status for troubleshooting; cannot alter roles or issue refunds | Admin Panel (limited: Users, read-only Subscriptions) |

Roles are **orthogonal to `subscriptionTier`** — a `user` role can hold any tier from `free` to `institutional`; roles govern *administrative* capability, tiers govern *product feature* access. This separation is why both are carried as independent JWT claims (Section 4) rather than one combined field.

---

## 7. Permissions

Nalanda combines **Role-Based Access Control (RBAC)** for administrative capability with **tier-based feature gating** for product access — two distinct authorization checks, applied by two distinct, independently testable middleware functions (per `docs/Architecture.md` §4's "authenticate → authorize role → authorize tier" ordering).

### Permission Matrix (Representative)

| Action | `user` (free) | `user` (plus) | `user` (pro) | `moderator` | `content_editor` | `admin` |
|---|---|---|---|---|---|---|
| Take limited daily quizzes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Take unlimited mock tests | ❌ | ✅ | ✅ | — | — | — |
| AI Mains-answer evaluation | ❌ | ❌ | ✅ | — | — | — |
| Deep analytics/trends | ❌ (preview only) | Limited | ✅ | — | — | — |
| Post in Community forum | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Moderate flagged posts | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Create/edit Questions & Content | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Change a user's role | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Issue refunds | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

Every row above corresponds to a concrete middleware check in `backend/src/middleware/rbac.middleware.ts` (role) and a separate tier-check middleware — never combined into one ad hoc `if` statement per endpoint, per the SOLID-principles rule in `CLAUDE.md`.

---

## 8. Sessions

A **session** is defined as one active refresh-token record — one per device/browser a user is logged into, not one per access-token issuance (access tokens are too short-lived and numerous to treat as the session unit).

### Session Record
| Field | Purpose |
|---|---|
| `sessionId` | Primary identifier for this device's login |
| `userId` | Owner |
| `refreshTokenHash` | Never the raw token |
| `deviceInfo` | Coarse user-agent summary (e.g., "Chrome on Windows," "Nalanda Android App") — enough for the user to recognize a session in a list, not detailed enough to constitute intrusive fingerprinting |
| `createdAt`, `lastUsedAt` | Recency signals |
| `revoked` | Boolean — set on logout, reuse-detection, or admin-forced revocation |

### Multi-Device Behavior
A user may be simultaneously logged in on, for example, a phone (Mobile App) and a laptop (Student Dashboard) — each gets its own session record and independently rotating refresh token. This directly supports the realistic usage pattern of personas like Karthik (commute-time mobile study, weekend laptop mock tests).

### Recommended Addition: Session Visibility
Beyond the `POST /auth/logout` and `POST /auth/logout-all` endpoints already specified in `docs/API.md` §1, this document recommends adding a **`GET /profile/sessions`** endpoint (listing active sessions with device/recency info) and a **`DELETE /profile/sessions/{sessionId}`** endpoint (revoke one specific session) — giving a user who suspects unauthorized access (e.g., a shared family device scenario common to the Priya persona) the ability to selectively log out one device without logging themselves out everywhere.

---

## 9. Remember Me

Because Nalanda already issues a 30-day refresh token by default, "Remember Me" is implemented as a control over **how persistent the browser-side cookie is**, not a second parallel token type:

| Remember Me | Refresh Cookie Behavior | Effective Session Length |
|---|---|---|
| **Off** (default on shared/public devices) | Session cookie (no `Max-Age` set) — expires when the browser is fully closed | Access lasts until the browser closes, or up to the refresh token's 30-day server-side validity, whichever is shorter |
| **On** | Persistent cookie with `Max-Age` set to match the refresh token's 30-day server-side TTL | Up to 30 days without re-authentication |

**Mobile App behavior:** the Mobile App has no "Remember Me" toggle in its UI — a personal mobile device is treated as implicitly "remembered" (persistent refresh token) by default, consistent with standard mobile app UX norms and the low-friction expectations of the Priya and Karthik personas, who would find a forced re-login on every app open unacceptable. Explicit logout remains available at any time (`docs/UserJourney.md` Screen 12).

---

## 10. Password Reset → Account Recovery

**There is no password reset flow, because there is no password.** This section documents the actual recovery paths that exist instead, so the *user need* behind "I can't get into my account" is still fully addressed:

| Scenario | Recovery Path |
|---|---|
| User forgets which method they signed up with (Google vs. Email) | The Login screen attempts both silently where possible, and account-linking (Section 3) means signing in with either method against the same email reaches the same account |
| User loses access to their registered email entirely (e.g., an old college email that's been deactivated) | **No self-serve path** — this requires a support-assisted identity-verification process (Admin Panel → Users, `role: support`), since email is the sole anchor of identity in a passwordless system. This is a deliberate, disclosed limitation rather than a gap: weakening this check to be self-serve would reintroduce exactly the account-takeover risk passwordless design is meant to avoid |
| User wants to change their registered email proactively (while they still have access) | Handled via `PATCH /profile` → triggers OTP re-verification on the **new** email before the change takes effect, and a notification is sent to the **old** email announcing the change, so the legitimate owner is alerted if this wasn't their action (`docs/UserJourney.md` Screen 11 edge case) |
| User suspects unauthorized account access | `POST /auth/logout-all` (Section 8) immediately invalidates every session; the user re-authenticates via their normal method afterward |

---

## 11. Email Verification

Email verification is **not a distinct feature bolted onto signup** — it is inherent to how each sign-in path already works:

- **Email OTP path:** successfully entering the OTP *is* the verification event. There is no separate "click the link in your email" step and no unverified-but-logged-in intermediate state — a user cannot complete registration without proving control of the inbox.
- **Google path:** Firebase's `email_verified` claim (sourced from Google, which enforces its own verification at the Google-account level) is trusted directly. Nalanda does not re-verify an already-Google-verified email.
- **Changing an email post-registration:** always re-triggers the OTP flow against the new address (Section 10) — verification status is never "carried over" to a new, unproven address.

---

## 12. Security

| Domain | Measures |
|---|---|
| **Transport** | HTTPS enforced everywhere (HSTS); no auth-related payload (OTP, tokens) is ever sent over plaintext HTTP. |
| **OTP protection** | Hashed at rest (Redis), single-use, 10-minute TTL, attempt-capped, resend-cooldown, per-email and per-IP rate limits (Section 2). |
| **Access token exposure** | In-memory only on the client (Section 4) — never written to `localStorage`, reducing the impact surface of any XSS vulnerability elsewhere in the app. |
| **Refresh token exposure** | HttpOnly + Secure + SameSite=Strict cookie (Section 5) — inaccessible to JavaScript entirely, and not sent on cross-site requests, mitigating both XSS and CSRF against this credential. |
| **Refresh token theft response** | Rotation + reuse detection (Section 5) bounds the damage window of a stolen refresh token to "until next legitimate use," not "until natural expiry." |
| **Account enumeration** | Registration and login error responses are worded to avoid confirming or denying whether a given email is registered (e.g., OTP-verify failures don't distinguish "wrong code" from "email doesn't exist" in a way that leaks account existence) — protects against targeted enumeration attacks against Nalanda's user base. |
| **Brute-force protection** | Rate limiting applied at the endpoint level for `auth/otp/verify`, `auth/otp/resend`, `auth/google`, and `auth/refresh` — distinct thresholds per endpoint, tuned to that endpoint's legitimate-use frequency. |
| **Session revocation propagation** | Because access tokens are short-lived (15 minutes), a revoked session (logout, reuse-detection, admin-forced suspension) reaches full effect platform-wide within one token-expiry window at most — an explicit, bounded worst case rather than an open-ended one. |
| **Secrets management** | JWT signing private key, Firebase service-account credentials, and Redis/DB connection secrets are stored in a secrets manager / environment injection, never committed to source control (per `docs/Architecture.md` §10). |
| **Admin action auditability** | Role changes, account suspensions, and forced logouts performed by `admin`/`support` roles are written to the `AuditLog` collection (`docs/Database.md` §4.1/§9), so every privileged authentication-adjacent action is attributable. |
| **DPDP Act alignment** | Minimal PII is stored for authentication itself (email, name, hashed tokens) — no password, no unnecessary biometric or device-fingerprint data collected; account deletion (`docs/API.md` §11) fully revokes all sessions as part of the deletion flow. |
| **Firebase Admin SDK isolation** | All Firebase Admin SDK calls are confined to `backend/src/integrations/firebaseAdmin/` (per `docs/FolderStructure.md` §2), so the service-account credential's usage surface is small and auditable. |

---

## 13. End-to-End Flow Reference

### Registration (Email OTP) — First-Time User
```
Client → POST /auth/register {name, email}
Backend → creates pending User record, generates OTP, stores hash in Redis (TTL 10m), emails OTP
Client → POST /auth/otp/verify {email, otp}
Backend → validates OTP hash + attempt count → deletes Redis key →
          creates Firebase user via Admin SDK → creates MongoDB User + Profile →
          issues Access JWT + Refresh Token (cookie)
Client → authenticated, proceeds to Choose Exam (docs/UserJourney.md Screen 4)
```

### Google Login — First-Time or Returning User
```
Client → Firebase client SDK Google OAuth → Firebase ID Token
Client → POST /auth/google {firebaseIdToken}
Backend → verifies token via Firebase Admin SDK →
          find-or-create User + Profile (email trusted as verified) →
          issues Access JWT + Refresh Token (cookie)
Client → authenticated (existing user → Dashboard; new user → Choose Exam)
```

### Silent Refresh — Ongoing Session
```
Client → API call with expired Access JWT → 401 Unauthorized
Client → POST /auth/refresh (refresh-token cookie sent automatically)
Backend → validates refresh token, checks rotation/reuse state →
          issues new Access JWT + new Refresh Token (rotates old one out)
Client → retries original API call with new Access JWT
```

### Logout — Single Device vs. All Devices
```
POST /auth/logout        → revokes only this session's refresh-token record
POST /auth/logout-all     → revokes every session record for this userId
```

---

## 14. Recommendations

1. **Build the custom Email OTP layer as a first-class backend module**, not a Firebase-native shortcut — the mismatch between Firebase's native passwordless offerings (Phone/Email Link) and the product's actual requirement (6-digit Email OTP) means this must be engineered deliberately, per Section 2.
2. **Implement refresh-token rotation with reuse detection from day one**, not as a post-launch hardening pass — retrofitting this after real user sessions exist is materially riskier than building it into the initial auth module.
3. **Add the session-visibility endpoints recommended in Section 8** (`GET /profile/sessions`, `DELETE /profile/sessions/{sessionId}`) to the API surface defined in `docs/API.md` — they're a meaningful trust feature for shared-device users (Priya persona) at low implementation cost given the session-record infrastructure already required for rotation/reuse detection.
4. **Treat the "no password reset" limitation as a disclosed product decision, not a support gap** — ensure the Help & Support flow (`docs/InformationArchitecture.md` §7.5) clearly documents the support-assisted recovery path for the "lost access to registered email entirely" scenario, so users and support staff both know what to expect rather than discovering it ad hoc during a real incident.
5. **Keep `role` and `subscriptionTier` as two independent JWT claims and two independent middleware checks permanently** — resist any future temptation to collapse them into a single "permission level" enum, since doing so would reintroduce exactly the coupling this design deliberately avoids (an institutional-tier student is still just a `user` role; a `support` staff member's role has nothing to do with their personal subscription tier, if any).

---

*End of Document.*
