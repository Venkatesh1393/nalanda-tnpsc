/** Derives a URL-safe kebab-case slug from a display name — mirrors
 * `frontend/src/utils/slugify.ts`'s intent so a name like "General Science"
 * produces the same `general-science` slug on both sides of the stack. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
