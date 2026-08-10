/**
 * A coarse "Chrome on Windows"-style summary from a User-Agent header —
 * deliberately not a full device-fingerprinting library (docs/Authentication.md
 * §8: "enough for the user to recognize a session in a list, not detailed
 * enough to constitute intrusive fingerprinting"). Best-effort only; an
 * unrecognized UA just falls back to "Unknown device."
 */
export function summarizeDeviceInfo(userAgent: string | undefined): string {
  if (!userAgent) return 'Unknown device'

  const browser = /edg\//i.test(userAgent)
    ? 'Edge'
    : /chrome\//i.test(userAgent)
      ? 'Chrome'
      : /firefox\//i.test(userAgent)
        ? 'Firefox'
        : /safari\//i.test(userAgent)
          ? 'Safari'
          : 'a browser'

  const os = /windows/i.test(userAgent)
    ? 'Windows'
    : /mac os/i.test(userAgent)
      ? 'macOS'
      : /android/i.test(userAgent)
        ? 'Android'
        : /iphone|ipad/i.test(userAgent)
          ? 'iOS'
          : /linux/i.test(userAgent)
            ? 'Linux'
            : 'an unknown OS'

  return `${browser} on ${os}`
}
