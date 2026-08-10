# routes/

Reserved for the central route table and route guards (auth-required routes,
tier-gated routes, role checks) once real pages exist — per
`docs/FolderStructure.md` §2 and the navigation structure in
`docs/InformationArchitecture.md` §4.

Deliberately empty at this stage: `React Router` itself is wired up in
`main.tsx` (a single root route rendering `App.tsx`, proving the dependency
works), but a real route _table_ only makes sense once there are real pages
(`pages/`) for it to point to — this folder is where that table and its
guards will live when that work starts.
