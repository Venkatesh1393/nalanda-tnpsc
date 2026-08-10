# components/ui/

Generated and managed by the shadcn/ui CLI (`npx shadcn add <component>`) —
domain-agnostic design-system primitives only (Button, Card, Input, Dialog…).
Per `docs/UI_Design_System.md` §13-§22, every primitive here must have zero
knowledge of Nalanda's domain concepts.

This folder is deliberately excluded from ESLint and Prettier
(see `eslint.config.js` / `.prettierignore`) since shadcn generates these
files with its own formatting conventions — treat them as generated code,
not hand-authored source. To customize a primitive's visual style, prefer
editing the design tokens in `src/index.css` over hand-editing the generated
component when possible.
