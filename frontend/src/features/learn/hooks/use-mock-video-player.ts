import { useEffect, useRef, useState } from 'react'

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

const WATCHED_THRESHOLD_PERCENT = 90

type UseMockVideoPlayerOptions = {
  durationSeconds: number
  initialProgressPercent?: number
  onProgressChange?: (percent: number) => void
  onWatchedThresholdReached?: () => void
}

/**
 * A self-contained, data-usage-conscious video player simulation
 * (docs/Learn_Module.md §4) — no real media file or network dependency
 * (this module is mock-data-only per this session's scope), just an
 * interval-driven `currentTime` against the lesson's mock duration. Still
 * implements the doc's real interaction contract: play/pause, scrub,
 * playback speed, and an automatic "mark as watched" once progress crosses
 * 90%, with the manual override left to the caller (a visible button).
 */
export function useMockVideoPlayer({
  durationSeconds,
  initialProgressPercent = 0,
  onProgressChange,
  onWatchedThresholdReached,
}: UseMockVideoPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(
    Math.round((initialProgressPercent / 100) * durationSeconds),
  )
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const thresholdFiredRef = useRef(initialProgressPercent >= WATCHED_THRESHOLD_PERCENT)

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setCurrentTime((time) => {
        const next = time + speed
        if (next >= durationSeconds) {
          setIsPlaying(false)
          return durationSeconds
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, speed, durationSeconds])

  const progressPercent =
    durationSeconds > 0
      ? Math.min(100, Math.round((currentTime / durationSeconds) * 100))
      : 0

  useEffect(() => {
    onProgressChange?.(progressPercent)
    if (progressPercent >= WATCHED_THRESHOLD_PERCENT && !thresholdFiredRef.current) {
      thresholdFiredRef.current = true
      onWatchedThresholdReached?.()
    }
    // onProgressChange/onWatchedThresholdReached intentionally excluded — see
    // components/inputs/search-input.tsx for the same accepted pattern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressPercent])

  function togglePlay() {
    setIsPlaying((playing) => !playing)
  }

  function seekToPercent(percent: number) {
    setCurrentTime(
      Math.round((Math.min(100, Math.max(0, percent)) / 100) * durationSeconds),
    )
  }

  function skipSeconds(delta: number) {
    setCurrentTime((time) => Math.min(durationSeconds, Math.max(0, time + delta)))
  }

  return {
    isPlaying,
    togglePlay,
    currentTime,
    durationSeconds,
    progressPercent,
    speed,
    setSpeed,
    seekToPercent,
    skipSeconds,
  }
}
