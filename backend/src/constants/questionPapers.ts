/** Previous Year Question Papers — the number of distinct papers any given
 * user may free-access before `services/questionPaper.service.ts#getDownloadUrl`
 * starts requiring the one-time unlock purchase below. */
export const QUESTION_PAPER_FREE_LIMIT = 5

/** The flat, one-time "unlock all previous year question papers" price, in
 * paise (Razorpay's smallest-unit convention) — ₹29. Deliberately not in
 * `config/plans.config.ts`: this is a standalone flat purchase, not a
 * subscription-tier feature. */
export const QUESTION_PAPER_UNLOCK_PRICE_PAISE = 2900

export const QUESTION_PAPER_FILE_FOLDER = 'nalanda/question-papers'
