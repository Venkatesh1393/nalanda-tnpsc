# Nalanda TNPSC — Backend

Node.js/Express/TypeScript API server for the Nalanda TNPSC platform. Modular
monolith (Routes → Controllers → Services → Repositories → Models), per
`docs/Architecture.md` §2 and `docs/FolderStructure.md` §2.

## Status

This is the **Sprint 3 foundation scaffold** — the cross-cutting
infrastructure every future domain module (Auth, Learn, Practice, Payments,
...) will build on top of. No domain routes/models/business logic exist yet
beyond an unauthenticated `/api/v1/health` probe used to prove the app boots
and connects to MongoDB. See the repo-root `docs/MASTER_ROADMAP.md` Phase 5
for what's built vs. remaining.

## Stack

Express · TypeScript · MongoDB Atlas (Mongoose) · JWT (RS256, Nalanda-issued
— see `docs/Authentication.md`) · Firebase Admin SDK (Google/OTP identity
verification only, never authorizes API calls directly) · Zod (env +
request validation) · Winston + Morgan (logging) · Helmet, CORS,
Compression, express-rate-limit · Multer + Cloudinary (uploads).

## Folder structure

```
backend/
├── src/
│   ├── config/        env loader (Zod-validated), logger, MongoDB connection,
│   │                   Firebase Admin init, Cloudinary config
│   ├── constants/      HTTP status codes, roles/subscription-tier enums
│   ├── controllers/     thin request/response handlers — no business logic
│   ├── middleware/      auth, rbac, validate, rate limiting, upload,
│   │                     global error handler, 404 handler
│   ├── models/          Mongoose schemas (not yet built — see models/README.md)
│   ├── repositories/    the only layer permitted to query MongoDB (not yet built)
│   ├── routes/          route-to-controller wiring, mounted under /api/{version}
│   ├── services/        business logic, one folder per domain (not yet built)
│   ├── types/            shared TS interfaces/DTOs, Express Request augmentation
│   ├── utils/            ApiError, ApiResponse (response formatter), asyncHandler, jwt
│   ├── validators/       Zod request schemas, mirrors routes/ 1:1 (not yet built)
│   ├── app.ts            Express app assembly (middleware registration, no listen())
│   └── server.ts         process entry point — DB connect, listen, graceful shutdown
├── docs/                backend-specific docs (OpenAPI spec, ADRs — empty for now)
├── tests/               unit/integration/contract convention (no runner installed yet)
├── logs/                Winston file transport output (gitignored, folder kept via .gitkeep)
├── .env.example
├── eslint.config.mjs
├── .prettierrc.json
├── tsconfig.json
└── package.json
```

## Getting started

```bash
cd backend
npm install
cp .env.example .env   # fill in real MongoDB/JWT/Firebase/Cloudinary values
npm run dev             # tsx watch — http://localhost:5000/api/v1/health
```

### Required environment variables

See `.env.example` for the full list and inline comments. Notable ones:

- `MONGODB_URI` — MongoDB Atlas connection string.
- `JWT_*_KEY_BASE64` — RS256 key pairs (access + refresh), base64-encoded PEM.
  Generate a pair with:
  ```bash
  openssl genrsa -out private.pem 2048
  openssl rsa -in private.pem -pubout -out public.pem
  openssl base64 -A -in private.pem   # → JWT_ACCESS_PRIVATE_KEY_BASE64
  openssl base64 -A -in public.pem    # → JWT_ACCESS_PUBLIC_KEY_BASE64
  ```
  Generate a second, distinct pair for the refresh-token variables — access
  and refresh tokens must never share a signing key.
- `FIREBASE_*` — a Firebase service account (Project Settings → Service
  Accounts → Generate new private key). `FIREBASE_PRIVATE_KEY_BASE64` is
  that JSON file's `private_key` field, base64-encoded (avoids `.env`
  newline-escaping issues).
- `CLOUDINARY_*` — from your Cloudinary dashboard.

The server intentionally refuses to start if any required variable is
missing or malformed (`src/config/env.ts`) — this is deliberate, per
`docs/Architecture.md`'s "fail loudly at boot, not silently at first use"
principle already established in `frontend/src/lib/env.ts`.

## Scripts

| Script                            | Purpose                                            |
| --------------------------------- | -------------------------------------------------- |
| `npm run dev`                     | Start the dev server with hot reload (`tsx watch`) |
| `npm run build`                   | Type-check and compile `src/` → `dist/`            |
| `npm start`                       | Run the compiled server (`dist/server.js`)         |
| `npm run typecheck`               | Type-check only, no output                         |
| `npm run lint` / `lint:fix`       | ESLint (flat config, typescript-eslint)            |
| `npm run format` / `format:check` | Prettier                                           |

## Conventions carried over from `docs/FolderStructure.md`

- **Repositories are the only layer that queries MongoDB.** Services call
  repositories; they never construct a Mongoose query themselves.
- **Controllers stay thin** — parse the request, call one service method,
  format the response via `utils/ApiResponse.ts`. Anything more belongs in
  `services/`.
- **One middleware per concern** (`auth`, `rbac`, `validate`, rate limiting,
  errors) — never a single "do everything" middleware.
- **Every third-party SDK gets one adapter** (`config/firebase.ts`,
  `config/cloudinary.ts`) — no controller/service should import
  `firebase-admin`/`cloudinary` directly.
- **Roles and subscription tiers are independent JWT claims** with
  independent authorization middleware (`middleware/rbac.middleware.ts`'s
  `authorizeRoles` vs. `authorizeTiers`) — per `docs/Authentication.md` §6,
  never collapse them into one check.
- **The `{ success, data, error, meta }` response envelope** (`docs/API.md`)
  is built via `utils/ApiResponse.ts`'s `sendSuccess`/`sendError` — never
  hand-rolled per controller.
