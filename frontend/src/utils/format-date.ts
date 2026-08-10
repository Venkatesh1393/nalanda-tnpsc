/**
 * Formats a date for display, respecting the app's Tamil/English language
 * preference (docs/UI_Design_System.md — bilingual dignity: Tamil dates are
 * formatted with the same care as English ones, not left as raw ISO strings).
 */
export function formatDate(
  date: Date | string,
  language: 'ta' | 'en' = 'en',
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string {
  const parsed = typeof date === 'string' ? new Date(date) : date
  const locale = language === 'ta' ? 'ta-IN' : 'en-IN'
  return new Intl.DateTimeFormat(locale, options).format(parsed)
}

/**
 * Relative "time ago" formatting (e.g. "2 hours ago") for Notifications
 * and Community reply timestamps (docs/InformationArchitecture.md §7.6-§7.7).
 */
export function formatRelativeTime(
  date: Date | string,
  language: 'ta' | 'en' = 'en',
): string {
  const parsed = typeof date === 'string' ? new Date(date) : date
  const diffSeconds = Math.round((parsed.getTime() - Date.now()) / 1000)
  const locale = language === 'ta' ? 'ta-IN' : 'en-IN'
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  const divisions: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]

  for (const [unit, secondsInUnit] of divisions) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return formatter.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }
  return formatter.format(diffSeconds, 'second')
}

/**
 * Locale-aware number formatting (grouping separators etc.), same
 * `ta-IN`/`en-IN` branch as `formatDate`/`formatRelativeTime` above — used
 * anywhere a raw `.toLocaleString('en-IN')` call would otherwise ignore the
 * active language preference.
 */
export function formatNumber(
  value: number,
  language: 'ta' | 'en' = 'en',
  options?: Intl.NumberFormatOptions,
): string {
  const locale = language === 'ta' ? 'ta-IN' : 'en-IN'
  return new Intl.NumberFormat(locale, options).format(value)
}
