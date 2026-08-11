// Sprint 4 Step 72 — Production Backend Deployment.
//
// PM2 process-manager config — the bare-metal/VPS alternative deployment
// path alongside Docker (`Dockerfile`, `../docker-compose*.yml`). Docker's
// `CMD ["node", "dist/server.js"]` intentionally runs a single foreground
// process and leaves restart/supervision to the container runtime; this
// file is for the other common target — a plain Ubuntu/Debian VPS with no
// container runtime at all — where PM2 IS the supervisor (auto-restart on
// crash, log capture, boot-time startup via `pm2 startup`).
//
// Only ever run ONE of these two supervisors against a given deployment,
// never both — PM2 wrapping `node dist/server.js` *inside* a Docker
// container would double up restart/signal handling for no benefit.
//
// Usage (see docs/Deployment.md §7.5 for the full runbook):
//   npm run build
//   npm run pm2:start             # development env (default)
//   npm run pm2:start:test        # test env
//   npm run pm2:start:prod        # production env
//   npm run pm2:reload            # zero-downtime reload (needs wait_ready below)
//   npm run pm2:logs
//   npm run pm2:stop / pm2:delete
//
// `env`/`env_test`/`env_production` below only ever set NODE_ENV — every
// other value (PORT, MONGODB_URI, JWT keys, ...) still comes from
// `backend/.env` via `config/env.ts`'s `dotenv.config()`, exactly like
// `docker-compose.yml`'s own "pin NODE_ENV, read everything else from
// env_file" pattern. Copy the right template (`.env.example` /
// `.env.test.example` / `.env.production.example`) to `.env` for whichever
// environment you're starting — PM2 does not read `.env` itself.
module.exports = {
  apps: [
    {
      name: 'nalanda-backend',
      script: './dist/server.js',
      cwd: __dirname,

      // --- Process model ---
      // Deliberately single-instance/fork-mode by default, even in
      // production, though this machine may have more CPU cores available.
      // `express-rate-limit`'s default in-memory store and `CACHE_DRIVER=memory`
      // (config/cache.ts) are both per-process — PM2 cluster mode with
      // instances > 1 silently turns those into *per-worker* limiters/caches
      // (a client could round-robin across workers and never trip the rate
      // limit; two workers could briefly disagree on cached data), the exact
      // scaling gate docs/Deployment.md §6 already documents for running more
      // than one backend instance. Do not raise `instances` past 1 or switch
      // `exec_mode` to 'cluster' until `CACHE_DRIVER=redis` is actually wired
      // up — at that point, change the two lines below to:
      //   exec_mode: 'cluster', instances: 'max',
      exec_mode: 'fork',
      instances: 1,
      watch: false, // dist/ only changes via `npm run build`, never at runtime

      // --- Graceful start ---
      // Matches server.ts's `process.send?.('ready')`, sent only after
      // `connectDatabase()` resolves and `app.listen()`'s callback fires —
      // `pm2 reload` waits for that signal (up to listen_timeout) before
      // treating the new process as up and killing the old one, so a reload
      // never has a window where traffic reaches a process whose DB
      // connection isn't ready yet.
      wait_ready: true,
      listen_timeout: 15_000,

      // --- Graceful stop --- PM2's default kill_timeout (1600ms) is far
      // shorter than server.ts's own SHUTDOWN_TIMEOUT_MS (10s) bounded
      // drain — without raising this, PM2 would SIGKILL mid-drain and cut
      // off in-flight requests exactly like the Dockerfile/Deployment.md §4
      // note about docker's stop_grace_period. kill_timeout must stay
      // slightly ABOVE 10s so the app's own clean exit always wins.
      kill_timeout: 10_500,

      // --- Crash-loop protection ---
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s', // below this, a "restart" counts as a crash-loop attempt
      restart_delay: 2_000,
      exp_backoff_restart_delay: 200, // widening backoff on repeated crashes

      max_memory_restart: '512M',

      // --- Logging --- separate from Winston's own logs/error.log and
      // logs/combined.log (config/logger.ts) — these capture PM2's view of
      // the process (restarts, uncaught startup failures before Winston
      // itself is even loaded), Winston's files capture the app's own
      // structured request/error logs. Both are useful, neither replaces
      // the other. `time: true` prefixes each line with a timestamp since
      // these files (unlike Winston's) hold raw stdout/stderr.
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      time: true,

      // --- Environments (Sprint 4 Step 72 config separation) ---
      // Base `env` = development (PM2's default when no --env flag is
      // passed), matching `npm run dev`'s default and backend/.env.example.
      env: {
        NODE_ENV: 'development',
      },
      env_test: {
        NODE_ENV: 'test',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}
