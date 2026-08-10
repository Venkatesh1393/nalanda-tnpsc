# layouts/

Route-group shell components — the persistent chrome (nav/sidebar/top bar)
that wraps a set of pages, per the four navigational shells in
`docs/InformationArchitecture.md` §2:

Intended contents once pages exist:

- `website-layout.tsx` — public Navbar (`docs/Landing_Page_Design.md` §1-2)
- `dashboard-layout.tsx` — sidebar + top bar + exam-goal switcher
  (`docs/InformationArchitecture.md` §4)
- `admin-layout.tsx` — role-aware sidebar (`docs/InformationArchitecture.md` §5)
- `auth-layout.tsx` — the minimal, chrome-free shell used by
  Registration/OTP (`docs/Registration_Flow.md`, `docs/OTP_Flow.md`)

A layout renders `<Outlet />` (React Router) for its child route's page
content — it owns navigation chrome only, never page-specific content.

Empty at this stage: a layout only makes sense once `routes/` has a real
route table and `pages/` has real pages to nest inside it.
