# store/

Global, cross-page state only — who's logged in, which exam goal is active,
current language preference, current subscription tier (per
`docs/FolderStructure.md` §2's "deliberately minimal" principle). Page-local
state stays in the page/component that owns it.

React Query (`lib/query-client.ts`) already owns all _server_ state (cached
API responses) — this folder is exclusively for _client_ state that has no
server-side source of truth of its own (e.g. "is the sidebar collapsed").
Keeping that boundary clear avoids the common mistake of duplicating server
data into a separate client store.
