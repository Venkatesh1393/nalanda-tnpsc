# assets/

App-local static assets (images, icons) imported directly into components —
as opposed to `public/`, which serves files verbatim at a fixed URL without
going through the bundler (see `docs/FolderStructure.md` §1).

Emptied of the default Vite template's placeholder assets during project
setup. Real brand assets (the Nalanda logomark described conceptually in
`docs/UI_Design_System.md` §2) belong here once produced — shared brand
assets used across `frontend/`, `admin/`, and `mobile/` belong in the
repo-root `assets/` folder instead.
