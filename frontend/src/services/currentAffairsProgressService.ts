/**
 * The stateful half of the mocked Current Affairs module — read-progress
 * tracking, held in `localStorage` exactly like
 * `services/learnProgressService.ts`'s `videoProgress`/`notesProgress`
 * (same auto-complete-at-90%-threshold convention). Bookmarking is
 * deliberately **not** duplicated here — Current Affairs bookmarks reuse
 * `learnProgressService.ts`'s bookmark store directly
 * (`contentType: 'current-affairs'`), the same "identical underlying
 * system" precedent Smart Practice already established for question
 * bookmarks (docs/Smart_Practice.md §9), so the Bookmarks page has exactly
 * one source of truth regardless of which module a saved item came from.
 */

const STORAGE_KEY = 'nalanda-current-affairs-progress'
const AUTO_READ_THRESHOLD = 90

type StoredProgress = {
  readProgress: Record<string, number>
}

function emptyState(): StoredProgress {
  return { readProgress: {} }
}

function readState(): StoredProgress {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyState()
  try {
    return { ...emptyState(), ...(JSON.parse(raw) as Partial<StoredProgress>) }
  } catch {
    return emptyState()
  }
}

function writeState(state: StoredProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

// ---- Synchronous reader (used by currentAffairsService to decorate mock content) ----

export function getReadProgressPercent(articleId: string): number {
  return readState().readProgress[articleId] ?? 0
}

export function isArticleRead(articleId: string): boolean {
  return getReadProgressPercent(articleId) >= AUTO_READ_THRESHOLD
}

// ---- Mutations ----

export async function updateReadProgress(
  articleId: string,
  percent: number,
): Promise<void> {
  const state = readState()
  // Progress only ever moves forward for a given article (scrolling back up
  // to re-check something earlier shouldn't erase "how far I've actually
  // read" — the same one-directional guarantee a real reading-position
  // tracker needs).
  const current = state.readProgress[articleId] ?? 0
  if (percent > current) {
    state.readProgress[articleId] = percent
    writeState(state)
  }
}

export async function markAsRead(articleId: string): Promise<void> {
  const state = readState()
  state.readProgress[articleId] = 100
  writeState(state)
  await delay(undefined, 200)
}
