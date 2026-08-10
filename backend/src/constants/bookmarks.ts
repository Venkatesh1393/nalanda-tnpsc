/**
 * `docs/Database.md` §4.4's `contentType` discriminator, with `video`
 * renamed to `lesson` to match this schema's merge of the doc's separate
 * `Videos` collection into `Lesson` (see `models/Lesson.model.ts`).
 * `current_affairs` was declared from Step 42 onward but unwired until the
 * real Current Affairs backend step — now genuinely used.
 */
export const BOOKMARK_CONTENT_TYPES = [
  'question',
  'study_material',
  'current_affairs',
  'lesson',
] as const
export type BookmarkContentType = (typeof BOOKMARK_CONTENT_TYPES)[number]
