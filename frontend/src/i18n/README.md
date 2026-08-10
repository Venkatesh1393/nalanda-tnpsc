# i18n/

Tamil/English translation resources and locale-switching logic (per
`docs/UI_Design_System.md`'s bilingual-dignity principle — Tamil is a
first-class citizen everywhere, never a smaller/secondary translation).

Real, implemented as of Sprint 3's i18n build (`docs/MASTER_ROADMAP.md`
Phase 14):

- `index.ts` — the `react-i18next`/`i18next` instance, statically importing
  every namespace's `en`/`ta` JSON pair and initializing with the language
  already persisted in `localStorage['nalanda-language']` (read directly
  here, not via `useLanguage()`, since this module initializes before any
  component mounts — see its own header comment).
- `i18next.d.ts` — TypeScript module augmentation typing every `t()` call
  against the real `en/` key tree, so a typo'd key is a compile error.
- `locales/en/*.json`, `locales/ta/*.json` — one namespace per feature
  module (`common`, `auth`, `onboarding`, `dashboard`, `learn`, `practice`,
  `liveExams`, `currentAffairs`, `analytics`, `settings`, `notifications`,
  `landing`), mirroring `frontend/src/features/`'s own folder split. Every
  `ta/*.json` file must stay a structural match of its `en/*.json`
  counterpart (same nesting, same `{{placeholder}}` names) — a missing
  Tamil key falls back to English silently at runtime (`fallbackLng: 'en'`)
  rather than erroring, so there's no compiler safety net for that specific
  gap; check parity manually when editing either tree.

The actual language *preference* (`'en'|'ta'`, persisted, toggled from the
Navbar/Settings) still lives in `providers/language-provider.tsx` +
`hooks/use-language.ts` — this folder's `i18n` instance is a downstream
consumer of that state (`LanguageProvider` calls `i18n.changeLanguage()` on
every change), never the source of truth for it.
