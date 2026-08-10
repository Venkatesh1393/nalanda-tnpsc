/**
 * Generic debounce — delays invoking `fn` until `delayMs` have elapsed since
 * the last call. Used, e.g., by the Search overlay (docs/Navigation.md §7)
 * to avoid firing a request on every keystroke.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: Args) => {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delayMs)
  }
}
