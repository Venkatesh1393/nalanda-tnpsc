# api/

The HTTP transport layer — and _only_ the transport layer. Nothing here knows
what a "question," "subscription," or "topic" is; that domain knowledge lives
in `services/`.

- `client.ts` — the single shared Axios instance (base URL from the validated
  env config, `withCredentials: true` for the refresh-token cookie per
  `docs/Authentication.md` §5, the in-memory bearer-token request interceptor).
  No other file in the app should call `axios.create()`.
- `endpoints.ts` — every path from `docs/API.md`, centralized as typed
  constants/path-builders, so a route string is never duplicated across
  multiple service files and a backend path change means editing one file.

If you're about to write `axios.get('/some/path', ...)` directly in a
component or a `services/` file, stop — add the path to `endpoints.ts` and
call `apiClient` from here instead.
