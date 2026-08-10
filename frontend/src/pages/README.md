# pages/

Route-level screens, one folder per module from `docs/InformationArchitecture.md`
(e.g. `pages/dashboard/`, `pages/learn/`, `pages/practice/`). Intentionally
empty for now — this project foundation stops short of building real pages.

Each page folder should contain only route-level composition (assembling
components from `components/features` and `components/ui`, wiring hooks from
`hooks/` and `services/`) — a page file should be readable top-to-bottom as
"what does this screen show," not where business logic lives.
