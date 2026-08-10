/** Sprint 4 Step 57 — Premium AI Explanation. Mirrors the backend's
 * `QuestionExplanationResultDTO` (`backend/src/services/ai/
 * questionExplanation.service.ts`) exactly. */
export type AiExplanationResult = {
  whyCorrectIsCorrect: string
  whyYourAnswerIsWrong: string | null
  keyConcept: string
  memoryTrick: string | null
  examRelevance: string | null
  source: 'generated' | 'cached'
  promptVersion: string
}

/** The backend error `code`s this feature can return, per
 * `docs/API.md` §16's illustrative error set — used to show a distinct
 * message for "you're out of AI calls today" vs. "the provider is down"
 * vs. any other failure, without ever blocking Standard Explanation. */
export type AiExplanationErrorCode = 'DAILY_AI_LIMIT_REACHED' | 'AI_SERVICE_UNAVAILABLE'
