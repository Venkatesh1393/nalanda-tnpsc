import { Schema } from 'mongoose'

/** A bilingual string field — Tamil-first is a structural requirement
 * (`docs/UI_Design_System.md`), so every user-facing text field is `{ en, ta }`
 * rather than a single localized string. `ta` is optional at the schema
 * level ("Tamil text where applicable") since content authoring may lag
 * translation; `requireAtLeastOne` adds a validator so a field can't be
 * saved with both languages empty. */
export interface BilingualText {
  en?: string
  ta?: string
}

/**
 * Returns `{ type: <sub-schema> }` rather than a plain `{ en, ta }` object —
 * a plain object with a sibling `validate` key next to `en`/`ta` is
 * ambiguous to Mongoose (it can't tell a field-level validator from a
 * subpath literally named "validate") and throws at schema-construction
 * time. A real `Schema` instance, used as the field's `type`, is the
 * correct way to attach a whole-object validator to a nested path.
 */
export function bilingualField(
  options: { required?: boolean; requireAtLeastOne?: boolean } = {},
) {
  const { required = false, requireAtLeastOne = true } = options

  const subSchema = new Schema<BilingualText>(
    {
      en: { type: String, required, trim: true },
      ta: { type: String, trim: true },
    },
    { _id: false },
  )

  if (requireAtLeastOne) {
    subSchema.pre('validate', function (next) {
      if (!this.en?.trim() && !this.ta?.trim()) {
        this.invalidate('en', 'At least one of en/ta must be provided.')
      }
      next()
    })
  }

  return { type: subSchema, required }
}

export interface BilingualParagraphs {
  en: string[]
  ta: string[]
}

/** A bilingual array-of-paragraphs field, for longer-form content
 * (StudyMaterial notes, Current Affairs body) — matches
 * `frontend/src/types/learn.ts`'s `StudyNote.paragraphs: string[]` shape
 * rather than a single blob string per language. */
export function bilingualParagraphsField() {
  return {
    en: { type: [String], default: [] },
    ta: { type: [String], default: [] },
  }
}
