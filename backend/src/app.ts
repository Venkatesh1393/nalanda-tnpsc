import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { corsOrigins, env } from './config/env'
import { morganStream } from './config/logger'
import { errorHandler } from './middleware/errorHandler.middleware'
import { notFound } from './middleware/notFound.middleware'
import { defaultRateLimiter } from './middleware/rateLimiter.middleware'
import healthRoutes from './routes/health.routes'
import routes from './routes'

/**
 * Pure Express app assembly — no `listen()` call here, so the app is
 * importable as-is by integration tests. server.ts owns the process
 * lifecycle (DB connection, listening, graceful shutdown).
 */
export function createApp(): Express {
  const app = express()

  // Security/parsing middleware, in the order Express recommends applying them.
  app.use(helmet())
  app.use(cors({ origin: corsOrigins, credentials: true }))
  app.use(cookieParser())
  app.use(compression())
  app.use(
    express.json({
      limit: '1mb',
      // Captures the exact raw bytes onto `req.rawBody` for every request —
      // cheap, and the only way `routes/payments.routes.ts`'s webhook
      // handler can verify Razorpay's signature correctly (Sprint 4 Step 56;
      // see `types/express.d.ts`'s `rawBody` comment for why a re-serialized
      // body won't do).
      verify: (req: express.Request, _res, buf) => {
        req.rawBody = buf
      },
    }),
  )
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(
    morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', { stream: morganStream }),
  )

  // Mounted before the rate limiter and outside API versioning — infra
  // (load balancers, uptime monitors) should be able to poll this freely
  // and get a stable, unwrapped body regardless of API version changes.
  app.use('/api/health', healthRoutes)

  app.use(defaultRateLimiter)
  app.use(`/api/${env.API_VERSION}`, routes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
