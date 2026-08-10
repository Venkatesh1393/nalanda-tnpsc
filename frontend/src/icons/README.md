# icons/

Custom, Nalanda-specific icon components — distinct from `lucide-react`
(the general-purpose outline icon set used everywhere else, per
`docs/UI_Design_System.md` §23). This folder exists specifically for the
icons Lucide doesn't and shouldn't provide: the restrained streak-flame
glyph, and the exam-category pictogram set (Group 1/2/2A/4, VAO, Police,
Forest, TRB).

Every icon here follows the same conventions as the Lucide set it sits
alongside: 24×24 viewBox, ~1.5-2px stroke weight, `currentColor` fill/stroke
so it inherits text color and theme automatically (never a hardcoded color
baked into the SVG).

`streak-flame-icon.tsx` is included as a working example of the pattern.
The full 8-icon exam-category pictogram set is real design/illustration
work, not foundation scaffolding — left for when that asset work happens.
