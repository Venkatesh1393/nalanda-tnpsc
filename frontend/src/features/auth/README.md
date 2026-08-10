# features/auth/

Registration, OTP verification, Google/Email login, session/logout UI and
logic — per `docs/Registration_Flow.md`, `docs/OTP_Flow.md`, and
`docs/Authentication.md`.

- `components/google-login-button.tsx` — real Firebase Google OAuth popup,
  verified by the real backend (`POST /auth/google`).
- `components/otp-verification-form.tsx` — the Email OTP entry screen.
  Still mocked (`services/authService.ts`'s OTP functions) — the custom
  backend OTP module (docs/Authentication.md §2) hasn't been built yet.
- `components/register-path-selector.tsx` — the "Choose Your Path" step.
- Email/Password (real, added alongside Google + OTP — see
  `docs/PROJECT_CONTEXT.md` §14's Firebase Authentication entry) lives
  directly in `pages/auth/login-page.tsx`/`register-page.tsx` as a second
  tab next to the Email-code flow, not as its own `features/auth/`
  component — small enough to not warrant extraction yet.

`providers/auth-provider.tsx` holds the real session (in-memory access
token, HttpOnly refresh cookie, silent refresh on mount) for the Google and
Email/Password paths; the OTP path's session doesn't survive a page reload
since it has no real backend/cookie behind it yet.
