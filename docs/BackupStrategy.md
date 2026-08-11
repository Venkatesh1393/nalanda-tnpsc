# Nalanda TNPSC — Backup Strategy

| | |
|---|---|
| **Document Owner** | Backend/Platform |
| **Status** | Sprint 4 Step 73 — Production Cloud Services (extends Step 69) |
| **Last Updated** | 2026-08-11 |

What gets backed up, how often, where to, and — just as important — what is
**not yet** backed up today. Contains no credentials; every command below
takes them from the environment, never inline.

---

## 1. Source Code — the most urgent gap, not MongoDB

**This repository has no `.git` directory anywhere** (confirmed repeatedly
across prior steps). Today, every line of this codebase exists in exactly
one place: this filesystem. There is currently zero backup, zero history,
and zero recoverability if this machine is lost — this is a bigger real risk
right now than anything below it on this page.

**Action, before anything else in this document**: `git init`, push to a
remote (GitHub — also what `.github/workflows/ci.yml`/`cd.yml` already
assume), and treat that remote as the actual backup of the codebase. This is
a decision for the user, not something to do unilaterally (see
`docs/Deployment.md`).

---

## 2. MongoDB Atlas — the primary datastore

The connection string's cluster name (`backend/.env`'s `MONGODB_URI` host)
indicates a **free/shared (M0/M2/M5) tier cluster**. This materially changes
the backup story, so this section gives both paths honestly rather than
assuming either:

### 2.1 On a free/shared tier (M0/M2/M5) — today's likely reality
Atlas's automated **Continuous Backup / Cloud Backup snapshots are not
available** on these tiers — there is no built-in point-in-time recovery.
The practical mitigation, **built and live-verified in Sprint 4 Step 73**:

- **`npm run backup:database`** (`backend/src/scripts/backupDatabase.ts`) —
  connects via the driver already in `node_modules` (no separate MongoDB
  Database Tools install required, unlike `mongodump`) and streams every
  collection to `backend/backups/<timestamp>-<db>/` as gzip-compressed,
  newline-delimited Extended JSON (`EJSON` — the same lossless, BSON-safe
  text format `mongoexport --jsonFormat=canonical` produces; ObjectIds/Dates
  round-trip exactly). A `manifest.json` per run records each collection's
  document count and index definitions. Not run against a schedule yet —
  see the automation gap below.
- **Retention**: the script keeps the newest **7** backup runs and deletes
  older ones automatically (`RETENTION_COUNT` in the script) — verified in
  this step's live run.
- **Restore drill — actually performed**, not just scripted: `npm run
  restore:database -- --archive <path>` (dry run by default; `--confirm` to
  write) was run against this step's own live backup, targeted at a single
  collection, into the *same* database it came from — the expected "restore
  into a non-empty database" case. It correctly reported `0 inserted / N
  skipped (duplicate _id)` for every document and left the collection's
  count unchanged, confirming both the read path (EJSON round-trips
  correctly) and the duplicate-safe write path work.
- **Prefer `mongodump`/`mongorestore` instead?** Still a valid, arguably
  more standard alternative if MongoDB Database Tools are already on the
  ops host: `mongodump --uri="$MONGODB_URI" --gzip
  --archive=backup-$(date +%F).gz` / `mongorestore --uri="$SCRATCH_URI"
  --gzip --archive=...`. Documented here as an option, not built, since the
  tool isn't installed in this project's dev environment and its BSON
  archive format can't be verified from here the way the script above was.
- **Automation gap, disclosed**: neither approach runs on a schedule yet —
  `npm run backup:database` must currently be triggered manually or wired
  into a cron job / Windows Task Scheduler entry / scheduled CI workflow on
  whichever host ends up owning this. The command itself is done and
  tested; only "runs automatically, unattended, on a timer" remains.
  Suggested cron line once a production host exists: `0 3 * * *
  cd /path/to/backend && npm run backup:database >> logs/backup.log 2>&1`.
  `docs/AlertingStrategy.md` §2.7 (Sprint 4 Step 74) specifies exactly when
  a failed/missing scheduled run should page vs. alert — worth wiring up
  the moment this cron job exists, not after the first missed backup goes
  unnoticed.
- **Off-host storage still not wired up**: today's backups land on the same
  host running the app — real durability needs them shipped to external
  storage (S3, GCS, or similar) so a full host loss doesn't take the
  backups with it. Not built this step; the local script is the foundation
  that off-host shipping would upload from.

### 2.2 Once upgraded to M10+ (recommended before real production launch)
Atlas's **Continuous Backup** becomes available: automatic, incremental,
point-in-time snapshots with a configurable retention policy, restorable
through the Atlas UI/API with no custom scripting needed. **This is the
recommended target state** — the M0/M2/M5 `mongodump` approach above is a
stopgap, not a permanent design.

### 2.3 What's already safe regardless of tier
Atlas itself replicates data across a 3-node replica set by default (even on
shared tiers) — this protects against a single node failing, but is **not**
a backup (it doesn't protect against a bad write, an accidental
`deleteMany`, or application-level data corruption propagating to all
replicas instantly). Backups above protect against exactly those cases.

---

## 3. Cloudinary — media assets

Cloudinary's own infrastructure is durable/replicated — assets are not at
meaningful risk of infrastructure-level loss. The real risk here is
**accidental deletion via the app or Admin API** (e.g., a bug in
`services/media/cloudinaryUpload.service.ts`'s delete path, or a
mis-scoped API key). Mitigations:

- Cloudinary's Media Library has an account-level **backup/versioning
  add-on** on paid plans — worth enabling once on a paid Cloudinary plan.
- Periodically export a manifest (public IDs + URLs + the MongoDB documents
  that reference them — `Profile.photoUrl`, `Question.imageUrl`,
  `CurrentAffair.imageUrl`, `StudyMaterial` file fields) alongside the
  MongoDB backup above — MongoDB already stores every Cloudinary reference
  (§2), so a Mongo restore always tells you exactly which assets *should*
  exist, even if this manifest step isn't built yet.
- `CLOUDINARY_API_SECRET` should be scoped to the minimum permissions the
  app actually needs and rotated on the same schedule as other secrets
  (§5).

---

## 4. Firebase — identity

Firebase Authentication user records are Google-managed and durable; there
is no user-facing "restore" concern under normal operation. What's worth
doing periodically:

- Export the user list (`firebase auth:export`, or the Admin SDK's
  `listUsers`) for portability/audit purposes — not a restore mechanism,
  since Firebase doesn't need one, but useful if ever migrating identity
  providers.
- Enable Google Cloud project-deletion protection on the production
  Firebase project so it can't be deleted by a single accidental console
  action.

---

## 5. Secrets & Configuration

Every credential in `backend/.env.production.example` (filled in on the
real production host, never committed — see `docs/Deployment.md` §1) should
itself live in a proper secret manager once one is chosen (cloud
provider's native secret manager, or at minimum an encrypted password
manager entry), not just a bare file on a single host with no backup of its
own. Rotate JWT signing keys, the Cloudinary API secret, and the Razorpay
key secret on a regular cadence (e.g. annually, or immediately on any
suspected exposure) — rotating invalidates all existing refresh-token
sessions (`Session.model.ts`'s hash is keyed to the JWT keypair in use),
which is expected, not a bug.

---

## 6. Summary Table

| Data | Backed up today? | Mechanism | Frequency |
|---|---|---|---|
| Source code | **No** | none — §1 is the fix | n/a |
| MongoDB (production data) | **Script built + restore-drill verified; not yet scheduled** | `npm run backup:database` (EJSON/gzip, 7-run retention) | manual today — recommend daily via cron once a host exists |
| Cloudinary assets | Durable at the provider level; no app-side backup | Cloudinary's own replication | continuous (provider-side) |
| Firebase users | Durable at the provider level | Google-managed | continuous (provider-side) |
| Secrets/config | Depends entirely on where the user stores `.env` today | none standardized yet | n/a |

This table is intentionally blunt about what's real vs. aspirational. §1
(no git) remains the single biggest gap. §2's MongoDB backup moved from
"not scripted" to "scripted and restore-tested" this step — what's left
there is purely operational (schedule it, ship copies off-host), not
missing code.
