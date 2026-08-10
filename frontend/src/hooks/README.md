# hooks/

App-specific React hooks only — one concern per hook (e.g. a future
`useDashboardSummary`, `useExamGoal`). Generic, domain-agnostic hooks that
would also make sense in the `admin/` or `mobile/` apps belong in the shared
`shared/hooks/` package (per `docs/FolderStructure.md` §7), not here.

`use-theme.ts` is the one hook already present — it exposes the dark/light
theme context set up in `components/theme-provider.tsx`.
