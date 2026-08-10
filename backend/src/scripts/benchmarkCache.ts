import { connectDatabase, disconnectDatabase } from '../config/database'
import { getCache } from '../config/cache'
import { logger } from '../config/logger'
import * as leaderboardService from '../services/leaderboard.service'
import * as learnService from '../services/learn.service'
import * as examRepository from '../repositories/exam.repository'

/**
 * Sprint 4 Step 67 — Performance Optimization. Real before/after timing
 * against live Atlas data (`npm run benchmark:cache`), same
 * connect/disconnect/manual-script shape as `verify*.ts` (no test runner
 * installed — see `backend/tests/README.md`). Not a correctness check
 * (nothing here can fail) — it prints cold (cache miss, real DB round trip)
 * vs. warm (cache hit, no DB round trip) timings for the three read paths
 * this step wired into the new cache abstraction, so the win is measured,
 * not asserted.
 */

async function benchmark(
  name: string,
  run: () => Promise<unknown>,
): Promise<{ cold: number; warm: number }> {
  logger.info(`\n${name}`)
  await getCache().delByPrefix('') // start every benchmark section from a clean cache
  const start1 = performance.now()
  await run()
  const cold = performance.now() - start1

  const start2 = performance.now()
  await run()
  const warm = performance.now() - start2

  logger.info(`  cold (cache miss): ${cold.toFixed(2)}ms`)
  logger.info(`  warm (cache hit):  ${warm.toFixed(2)}ms`)
  logger.info(`  speedup: ${cold > 0 ? (cold / Math.max(warm, 0.001)).toFixed(1) : '?'}x`)
  return { cold, warm }
}

async function main(): Promise<void> {
  await connectDatabase()

  logger.info('Sprint 4 Step 67 — cache benchmark (live Atlas data)')

  const results: Record<string, { cold: number; warm: number }> = {}

  results.leaderboard = await benchmark('Leaderboard — getLeaderboard("overall", 20)', () =>
    leaderboardService.getLeaderboard('overall', 20),
  )

  results.topRankers = await benchmark('Leaderboard — getPublicTopRankers(10)', () =>
    leaderboardService.getPublicTopRankers(10),
  )

  const anyExam = await examRepository.findAllActive()
  if (anyExam[0]) {
    results.examCode = await benchmark('Exam code resolution — resolveExamCode(id)', () =>
      learnService.resolveExamCode(anyExam[0]!._id),
    )
  } else {
    logger.warn('No active Exam documents found — skipping the exam-code benchmark')
  }

  logger.info('\n---- Summary ----')
  for (const [key, { cold, warm }] of Object.entries(results)) {
    logger.info(
      `${key}: cold ${cold.toFixed(1)}ms -> warm ${warm.toFixed(1)}ms (${(cold / Math.max(warm, 0.001)).toFixed(1)}x)`,
    )
  }

  await disconnectDatabase()
}

main().catch((error) => {
  logger.error('Benchmark failed', { error })
  process.exit(1)
})
