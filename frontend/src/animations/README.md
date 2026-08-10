# animations/

Reusable Framer Motion variant/transition presets, implementing the motion
tokens and principles from `docs/UI_Design_System.md` §19 and §32 — import
these instead of hand-writing `transition={{ duration: 0.26 }}` inline in
every component, so the whole app shares one motion vocabulary.

- `variants.ts` — the four duration/easing tokens (`motionInstant`,
  `motionFast`, `motionBase`, `motionCelebratory`) as ready-to-use Framer
  Motion variant objects, plus the shared `fadeInUp` entrance variant used
  throughout the product for card/section reveals.

Per `docs/UI_Design_System.md` §32: `motionCelebratory` is reserved for
genuine, earned milestones (a streak, a completed mock test, an unlocked
Achievement) — never for routine UI transitions. Reach for `motionBase` or
`motionFast` by default.
