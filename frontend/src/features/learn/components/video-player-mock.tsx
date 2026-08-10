import { Check, Maximize, Minimize, Pause, Play, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Text } from '@/components/typography'
import {
  PLAYBACK_SPEEDS,
  useMockVideoPlayer,
  type PlaybackSpeed,
} from '@/features/learn/hooks/use-mock-video-player'
import { cn } from '@/lib/utils'

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

type VideoPlayerMockProps = {
  title: string
  durationSeconds: number
  initialProgressPercent: number
  onProgressChange: (percent: number) => void
  onWatchedThresholdReached: () => void
}

/**
 * The Video screen's player (docs/Learn_Module.md §4) — data-usage-conscious
 * by design (this project has no real media backend yet, so the player is a
 * self-contained simulation, `use-mock-video-player.ts`, rather than a
 * network-dependent `<video>` embed): play/pause, scrub bar, playback speed,
 * fullscreen toggle, and the "Ask AI to explain this differently" handoff
 * into the (not-yet-built) AI Doubt Chat.
 */
export function VideoPlayerMock({
  title,
  durationSeconds,
  initialProgressPercent,
  onProgressChange,
  onWatchedThresholdReached,
}: VideoPlayerMockProps) {
  const { t } = useTranslation('learn')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const player = useMockVideoPlayer({
    durationSeconds,
    initialProgressPercent,
    onProgressChange,
    onWatchedThresholdReached,
  })

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        isFullscreen && 'bg-background fixed inset-0 z-50 justify-center p-4',
      )}
    >
      <div
        className={cn(
          'bg-foreground text-background relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl',
          isFullscreen && 'aspect-auto h-[70vh]',
        )}
      >
        <button
          type="button"
          onClick={player.togglePlay}
          aria-label={player.isPlaying ? t('videoPlayerMock.pause') : t('videoPlayerMock.play')}
          className="bg-background/15 hover:bg-background/25 flex size-16 items-center justify-center rounded-full backdrop-blur transition"
        >
          {player.isPlaying ? (
            <Pause className="size-7" aria-hidden="true" />
          ) : (
            <Play className="size-7 translate-x-0.5" aria-hidden="true" />
          )}
        </button>

        {player.progressPercent >= 90 && (
          <span className="bg-success absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white">
            <Check className="size-3" aria-hidden="true" />
            {t('videoPlayerMock.watchedBadge')}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Slider
          value={[player.progressPercent]}
          max={100}
          step={1}
          aria-label={t('videoPlayerMock.seekAriaLabel', { title })}
          onValueChange={([percent]) => player.seekToPercent(percent)}
        />
        <div className="text-muted-foreground flex items-center justify-between text-xs tabular-nums">
          <span>{formatTime(player.currentTime)}</span>
          <span>{formatTime(player.durationSeconds)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={player.togglePlay}
            aria-label={player.isPlaying ? t('videoPlayerMock.pause') : t('videoPlayerMock.play')}
          >
            {player.isPlaying ? <Pause /> : <Play />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => player.skipSeconds(-10)}>
            {t('videoPlayerMock.skipBack')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => player.skipSeconds(10)}>
            {t('videoPlayerMock.skipForward')}
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Select
            value={String(player.speed)}
            onValueChange={(value) => player.setSpeed(Number(value) as PlaybackSpeed)}
          >
            <SelectTrigger size="sm" aria-label={t('videoPlayerMock.playbackSpeedAriaLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBACK_SPEEDS.map((speed) => (
                <SelectItem key={speed} value={String(speed)}>
                  {speed}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setIsFullscreen((value) => !value)}
            aria-label={
              isFullscreen ? t('videoPlayerMock.exitFullscreen') : t('videoPlayerMock.fullscreen')
            }
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>

      <Button
        variant="ai"
        className="w-fit"
        onClick={() => toast.info(t('videoPlayerMock.askAiToast'))}
      >
        <Sparkles />
        {t('videoPlayerMock.askAi')}
      </Button>

      {player.progressPercent < 90 && (
        <div className="flex items-center justify-between gap-2">
          <Text variant="caption">{t('videoPlayerMock.autoWatchedNote')}</Text>
          <Button variant="ghost" size="sm" onClick={onWatchedThresholdReached}>
            <Check />
            {t('videoPlayerMock.markWatched')}
          </Button>
        </div>
      )}
    </div>
  )
}
