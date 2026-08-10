# features/

A **feature-sliced** layer, one folder per product module from
`docs/InformationArchitecture.md`'s navigation tree — `auth`, `learn`,
`practice`, `live-exams`, `current-affairs`, `analytics`, `community`,
`bookmarks`, `payments`, `notifications`, `settings`.

This is the vertical complement to the horizontal layers elsewhere in `src/`
(`components/`, `hooks/`, `services/`): each feature folder is intended to
hold everything specific to that one feature — its own components, its own
hooks, its own data-fetching — so working on Practice, for example, means
working almost entirely inside `features/practice/`, not hunting across
five unrelated top-level folders.

**What goes where, once a feature is actually built:**

```
features/practice/
├── components/    # Question card, timer, palette — used only within Practice
├── hooks/         # e.g. usePracticeSession — logic specific to this feature
└── index.ts       # the feature's public surface — a page imports FROM here,
                    # never reaches into a feature's internal files directly
```

**What still lives outside `features/`:**

- Truly domain-agnostic UI → `components/ui/`
- Truly cross-feature shared composites → `components/`
- Generic, feature-agnostic hooks → `hooks/`
- The HTTP transport layer → `api/`

Every feature subfolder is empty (README only) at this stage — per this
task's scope, no pages or feature UI are being built yet.
