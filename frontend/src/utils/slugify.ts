/**
 * Derives a URL-safe kebab-case slug from a display name (e.g. "General
 * Science" -> "general-science"). Learn module content records use
 * hand-authored slugs as their `id` (docs/Learn_Module.md) — this lets any
 * caller that only has a name string (e.g. Dashboard widgets reading
 * `services/dashboardService.ts`'s mock subject/topic/subtopic names) derive
 * the same slug and deep-link into Learn without a separate name-to-id
 * lookup table.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
