import type { PracticeQuestion } from '@/types/practice'

/**
 * Mock implementation of the Questions backend module (docs/API.md §5) —
 * no backend exists yet (Sprint 3), so the question bank is a static,
 * hand-authored set of real TNPSC-style questions (not filler/lorem text)
 * rather than a live `GET /questions` call. Subject/topic names
 * deliberately match `services/mock/subjectsMockService.ts`'s content tree
 * so a Practice session started from "Practice This Topic"
 * (docs/Learn_Module.md §6) has real matching content.
 * `services/practiceService.ts` (session-selection logic) and
 * `services/questionsService.ts` (the raw Questions facade) both read from
 * here.
 */

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const QUESTION_BANK: PracticeQuestion[] = [
  // --- General Science: Physics ---
  {
    id: 'q-newtons-third-law',
    questionText:
      "Which of Newton's Laws of Motion states that for every action there is an equal and opposite reaction?",
    options: [
      { id: 'a', text: 'First Law' },
      { id: 'b', text: 'Second Law' },
      { id: 'c', text: 'Third Law' },
      { id: 'd', text: 'Law of Gravitation' },
    ],
    correctOptionId: 'c',
    explanation:
      "Newton's Third Law states that every action has an equal and opposite reaction. The First Law describes inertia; the Second Law relates force, mass, and acceleration.",
    hint: 'Think about the one law that specifically describes action-reaction pairs.',
    difficulty: 'easy',
    subjectName: 'General Science',
    topicName: 'Physics',
    tags: ['newtons-laws-of-motion'],
    source: 'curated',
  },
  {
    id: 'q-si-unit-current',
    questionText: 'The SI unit of electric current is:',
    options: [
      { id: 'a', text: 'Volt' },
      { id: 'b', text: 'Ampere' },
      { id: 'c', text: 'Ohm' },
      { id: 'd', text: 'Watt' },
    ],
    correctOptionId: 'b',
    explanation:
      'The Ampere (A) is the SI base unit of electric current. Volt measures potential difference, Ohm measures resistance, and Watt measures power.',
    hint: "It's named after the French physicist André-Marie Ampère.",
    difficulty: 'easy',
    subjectName: 'General Science',
    topicName: 'Physics',
    tags: ['units-and-measurements'],
    source: 'pyq',
    pyqYear: 2023,
  },
  // --- General Science: Chemistry ---
  {
    id: 'q-common-salt-formula',
    questionText: 'The chemical formula of common salt (table salt) is:',
    options: [
      { id: 'a', text: 'NaCl' },
      { id: 'b', text: 'KCl' },
      { id: 'c', text: 'CaCO₃' },
      { id: 'd', text: 'NaHCO₃' },
    ],
    correctOptionId: 'a',
    explanation:
      'Common salt is sodium chloride, NaCl — one sodium ion bonded to one chloride ion.',
    hint: 'Its name literally contains "sodium" and "chloride."',
    difficulty: 'easy',
    subjectName: 'General Science',
    topicName: 'Chemistry',
    tags: ['acids-bases-and-salts'],
    source: 'curated',
  },
  {
    id: 'q-atmosphere-gas',
    questionText: "Which gas is most abundant in the Earth's atmosphere?",
    options: [
      { id: 'a', text: 'Oxygen' },
      { id: 'b', text: 'Carbon Dioxide' },
      { id: 'c', text: 'Nitrogen' },
      { id: 'd', text: 'Argon' },
    ],
    correctOptionId: 'c',
    explanation:
      "Nitrogen makes up about 78% of Earth's atmosphere by volume, far more than oxygen (~21%).",
    hint: 'It makes up nearly four-fifths of the air you breathe.',
    difficulty: 'medium',
    subjectName: 'General Science',
    topicName: 'Chemistry',
    tags: ['modern-periodic-table'],
    source: 'ai_generated',
  },
  // --- General Science: Biology ---
  {
    id: 'q-insulin-organ',
    questionText: 'Which organ in the human body produces insulin?',
    options: [
      { id: 'a', text: 'Liver' },
      { id: 'b', text: 'Pancreas' },
      { id: 'c', text: 'Kidney' },
      { id: 'd', text: 'Stomach' },
    ],
    correctOptionId: 'b',
    explanation:
      'The pancreas produces insulin, the hormone that regulates blood sugar levels.',
    hint: 'This organ also produces digestive enzymes.',
    difficulty: 'easy',
    subjectName: 'General Science',
    topicName: 'Biology',
    tags: ['human-digestive-system'],
    source: 'curated',
  },
  {
    id: 'q-blood-filtering-organ',
    questionText:
      'Which organ is primarily responsible for filtering waste from the blood?',
    options: [
      { id: 'a', text: 'Liver' },
      { id: 'b', text: 'Kidney' },
      { id: 'c', text: 'Heart' },
      { id: 'd', text: 'Lungs' },
    ],
    correctOptionId: 'b',
    explanation:
      'The kidneys filter waste products and excess water from the blood to form urine.',
    hint: 'You have a pair of these, one on each side of your spine.',
    difficulty: 'easy',
    subjectName: 'General Science',
    topicName: 'Biology',
    tags: ['human-digestive-system'],
    source: 'curated',
  },
  // --- General Studies: Tamil Nadu History ---
  {
    id: 'q-sangam-age-region',
    questionText: 'The Sangam Age is primarily associated with which region?',
    options: [
      { id: 'a', text: 'North India' },
      { id: 'b', text: 'Tamil Nadu' },
      { id: 'c', text: 'Bengal' },
      { id: 'd', text: 'Punjab' },
    ],
    correctOptionId: 'b',
    explanation:
      'The Sangam Age refers to the early historical period of Tamil Nadu, named after the Sangam academies of poets.',
    hint: 'The literature from this age is written in Tamil.',
    difficulty: 'easy',
    subjectName: 'General Studies',
    topicName: 'Tamil Nadu History',
    tags: ['sangam-age'],
    source: 'pyq',
    pyqYear: 2022,
  },
  // --- General Studies: Indian Polity ---
  {
    id: 'q-article-14-equality',
    questionText:
      'Which Article of the Indian Constitution guarantees "equality before the law"?',
    options: [
      { id: 'a', text: 'Article 14' },
      { id: 'b', text: 'Article 19' },
      { id: 'c', text: 'Article 21' },
      { id: 'd', text: 'Article 32' },
    ],
    correctOptionId: 'a',
    explanation:
      'Article 14 guarantees equality before the law and equal protection of the laws to all persons. Article 19 covers freedoms, Article 21 covers the right to life, and Article 32 covers constitutional remedies.',
    hint: "It comes right after the Preamble's fundamental rights section begins.",
    difficulty: 'medium',
    subjectName: 'General Studies',
    topicName: 'Indian Polity',
    tags: ['fundamental-rights'],
    source: 'pyq',
    pyqYear: 2021,
  },
  {
    id: 'q-dpsp-part',
    questionText:
      'The Directive Principles of State Policy are enshrined in which Part of the Indian Constitution?',
    options: [
      { id: 'a', text: 'Part III' },
      { id: 'b', text: 'Part IV' },
      { id: 'c', text: 'Part V' },
      { id: 'd', text: 'Part VI' },
    ],
    correctOptionId: 'b',
    explanation:
      'Part IV (Articles 36-51) contains the Directive Principles of State Policy. Part III covers Fundamental Rights.',
    hint: 'Fundamental Rights are Part III — this comes right after.',
    difficulty: 'medium',
    subjectName: 'General Studies',
    topicName: 'Indian Polity',
    tags: ['directive-principles'],
    source: 'curated',
  },
  {
    id: 'q-tn-assembly-house',
    questionText: 'The Tamil Nadu Legislature is a:',
    options: [
      { id: 'a', text: 'Unicameral House' },
      { id: 'b', text: 'Bicameral House' },
      { id: 'c', text: 'Neither' },
      { id: 'd', text: 'Tricameral House' },
    ],
    correctOptionId: 'a',
    explanation:
      'Tamil Nadu has a Unicameral Legislature (only a Legislative Assembly) — its Legislative Council was abolished in 1986.',
    hint: 'Tamil Nadu abolished its upper house decades ago.',
    difficulty: 'hard',
    subjectName: 'General Studies',
    topicName: 'Indian Polity',
    tags: ['union-and-state-legislature'],
    source: 'curated',
  },
  // --- General Studies: Geography ---
  {
    id: 'q-ganga-of-the-south',
    questionText: "Which river is often referred to as the 'Ganga of the South'?",
    options: [
      { id: 'a', text: 'Kaveri' },
      { id: 'b', text: 'Vaigai' },
      { id: 'c', text: 'Tamiraparani' },
      { id: 'd', text: 'Palar' },
    ],
    correctOptionId: 'a',
    explanation:
      "The Kaveri (Cauvery) river is revered in Tamil Nadu and is often called the 'Ganga of the South' (Dakshin Ganga).",
    hint: "This river's basin is central to Tamil Nadu's agriculture.",
    difficulty: 'medium',
    subjectName: 'General Studies',
    topicName: 'Geography',
    tags: ['rivers-and-irrigation'],
    source: 'curated',
  },
  // --- General Studies: Indian Economy ---
  {
    id: 'q-five-year-plans-model',
    questionText:
      "India's Five Year Plans were originally modeled on the planning system of:",
    options: [
      { id: 'a', text: 'USA' },
      { id: 'b', text: 'USSR' },
      { id: 'c', text: 'UK' },
      { id: 'd', text: 'Japan' },
    ],
    correctOptionId: 'b',
    explanation:
      "India's Five Year Plans were inspired by the centralized planning model of the erstwhile Soviet Union (USSR).",
    hint: 'Think of the country famous for its own Five Year Plans first.',
    difficulty: 'medium',
    subjectName: 'General Studies',
    topicName: 'Indian Economy',
    tags: ['five-year-plans'],
    source: 'curated',
  },
  {
    id: 'q-rbi-established-year',
    questionText: 'The Reserve Bank of India was established in the year:',
    options: [
      { id: 'a', text: '1935' },
      { id: 'b', text: '1947' },
      { id: 'c', text: '1950' },
      { id: 'd', text: '1969' },
    ],
    correctOptionId: 'a',
    explanation:
      'The RBI was established on 1 April 1935 under the Reserve Bank of India Act, 1934 — well before Independence.',
    hint: "It's older than India's independence.",
    difficulty: 'medium',
    subjectName: 'General Studies',
    topicName: 'Indian Economy',
    tags: ['banking-and-rbi'],
    source: 'ai_generated',
  },
  // --- Aptitude: Arithmetic ---
  {
    id: 'q-time-and-work-together',
    questionText:
      'A can complete a work in 10 days and B can complete the same work in 15 days. Working together, how many days will they take?',
    options: [
      { id: 'a', text: '5 days' },
      { id: 'b', text: '6 days' },
      { id: 'c', text: '8 days' },
      { id: 'd', text: '12 days' },
    ],
    correctOptionId: 'b',
    explanation:
      "A's rate is 1/10 of the work per day, B's is 1/15. Together: 1/10 + 1/15 = 1/6 of the work per day, so they finish in 6 days.",
    hint: 'Add their individual work-per-day rates, then take the reciprocal.',
    difficulty: 'medium',
    subjectName: 'Aptitude',
    topicName: 'Arithmetic',
    tags: ['time-and-work'],
    source: 'pyq',
    pyqYear: 2023,
  },
  {
    id: 'q-profit-percent-markup-discount',
    questionText:
      'A shopkeeper marks an item 20% above cost price and then gives a 10% discount on the marked price. What is his profit percentage?',
    options: [
      { id: 'a', text: '8%' },
      { id: 'b', text: '10%' },
      { id: 'c', text: '12%' },
      { id: 'd', text: '20%' },
    ],
    correctOptionId: 'a',
    explanation:
      'Selling price = Cost × 1.20 × 0.90 = Cost × 1.08, so profit is 8% of cost price.',
    hint: 'Multiply the markup and discount factors together rather than subtracting the percentages directly.',
    difficulty: 'hard',
    subjectName: 'Aptitude',
    topicName: 'Arithmetic',
    tags: ['profit-and-loss'],
    source: 'curated',
  },
  {
    id: 'q-40-percent-of-250',
    questionText: 'What is 40% of 250?',
    options: [
      { id: 'a', text: '90' },
      { id: 'b', text: '100' },
      { id: 'c', text: '110' },
      { id: 'd', text: '120' },
    ],
    correctOptionId: 'b',
    explanation: '40% of 250 = 0.40 × 250 = 100.',
    hint: '10% of 250 is 25 — multiply by 4.',
    difficulty: 'easy',
    subjectName: 'Aptitude',
    topicName: 'Arithmetic',
    tags: ['percentage'],
    source: 'pyq',
    pyqYear: 2022,
  },
  // --- Aptitude: Reasoning ---
  {
    id: 'q-number-series-quadratic',
    questionText: 'Find the next number in the series: 2, 6, 12, 20, 30, ?',
    options: [
      { id: 'a', text: '36' },
      { id: 'b', text: '40' },
      { id: 'c', text: '42' },
      { id: 'd', text: '44' },
    ],
    correctOptionId: 'c',
    explanation:
      'The differences between consecutive terms are 4, 6, 8, 10, 12 — each increasing by 2. 30 + 12 = 42.',
    hint: 'Look at the differences between consecutive terms, not the terms themselves.',
    difficulty: 'medium',
    subjectName: 'Aptitude',
    topicName: 'Reasoning',
    tags: ['number-series'],
    source: 'curated',
  },
  {
    id: 'q-blood-relation-brother',
    questionText: 'P is the brother of Q. Q is the sister of R. How is P related to R?',
    options: [
      { id: 'a', text: 'Brother' },
      { id: 'b', text: 'Sister' },
      { id: 'c', text: 'Cannot be determined' },
      { id: 'd', text: 'Father' },
    ],
    correctOptionId: 'a',
    explanation:
      'P is male (stated as "brother"). P and R are siblings through Q, so regardless of R\'s gender, P is R\'s brother.',
    hint: "Focus on P's gender, which is already given directly.",
    difficulty: 'medium',
    subjectName: 'Aptitude',
    topicName: 'Reasoning',
    tags: ['blood-relations'],
    source: 'ai_generated',
  },
  // --- Tamil ---
  {
    id: 'q-mahakavi-bharathiyar',
    questionText:
      "Who is known as 'Mahakavi' in modern Tamil literature, celebrated for his patriotic poems?",
    options: [
      { id: 'a', text: 'Bharathiyar' },
      { id: 'b', text: 'Kambar' },
      { id: 'c', text: 'Thiruvalluvar' },
      { id: 'd', text: 'Ilango Adigal' },
    ],
    correctOptionId: 'a',
    explanation:
      "Subramania Bharati, popularly known as 'Bharathiyar,' is celebrated as the great modern Tamil poet of patriotism and social reform.",
    hint: 'This poet also wrote extensively about Indian independence.',
    difficulty: 'easy',
    subjectName: 'Tamil',
    topicName: "Bharathiyar's Poems",
    tags: [],
    source: 'curated',
  },
  {
    id: 'q-tirukkural-author',
    questionText:
      'The Tirukkural, a classic Tamil text on ethics and virtue, was authored by:',
    options: [
      { id: 'a', text: 'Thiruvalluvar' },
      { id: 'b', text: 'Kambar' },
      { id: 'c', text: 'Bharathiyar' },
      { id: 'd', text: 'Avvaiyar' },
    ],
    correctOptionId: 'a',
    explanation:
      'The Tirukkural was composed by Thiruvalluvar, covering virtue (aram), wealth (porul), and love (inbam).',
    hint: 'The text and its author share a similar-sounding name.',
    difficulty: 'easy',
    subjectName: 'Tamil',
    topicName: 'Literature',
    tags: [],
    source: 'curated',
  },
  {
    id: 'q-sangam-anthologies-count',
    questionText:
      'Sangam literature is broadly classified into how many major anthology groups?',
    options: [
      { id: 'a', text: 'Two' },
      { id: 'b', text: 'Three' },
      { id: 'c', text: 'Four' },
      { id: 'd', text: 'Five' },
    ],
    correctOptionId: 'a',
    explanation:
      'Sangam literature is broadly grouped into two major anthology collections: the Ettuthokai (Eight Anthologies) and the Pattuppattu (Ten Idylls).',
    hint: 'One collection has eight parts, the other has ten — but how many collections is that?',
    difficulty: 'hard',
    subjectName: 'Tamil',
    topicName: 'Literature',
    tags: ['sangam-literature-basics'],
    source: 'ai_generated',
  },
  // --- General English ---
  {
    id: 'q-passive-voice-chef',
    questionText: "Choose the correct passive voice for: 'The chef cooks the meal.'",
    options: [
      { id: 'a', text: 'The meal is cooked by the chef.' },
      { id: 'b', text: 'The meal was cooked by the chef.' },
      { id: 'c', text: 'The meal cooks by the chef.' },
      { id: 'd', text: 'The meal is cooking by the chef.' },
    ],
    correctOptionId: 'a',
    explanation:
      'Present simple active ("cooks") becomes present simple passive: "is/are + past participle" — "The meal is cooked by the chef."',
    hint: 'Keep the tense the same — present simple — just flip subject and object.',
    difficulty: 'easy',
    subjectName: 'General English',
    topicName: 'Grammar',
    tags: ['active-and-passive-voice'],
    source: 'pyq',
    pyqYear: 2021,
  },
  {
    id: 'q-synonym-abundant',
    questionText: "Choose the synonym of 'Abundant':",
    options: [
      { id: 'a', text: 'Scarce' },
      { id: 'b', text: 'Plentiful' },
      { id: 'c', text: 'Empty' },
      { id: 'd', text: 'Rare' },
    ],
    correctOptionId: 'b',
    explanation:
      "'Abundant' means existing in large quantities — 'plentiful' is its closest synonym.",
    hint: 'The other three options all suggest a lack of something.',
    difficulty: 'easy',
    subjectName: 'General English',
    topicName: 'Vocabulary',
    tags: ['synonyms-and-antonyms'],
    source: 'curated',
  },
  {
    id: 'q-correct-punctuation',
    questionText: 'Identify the correctly punctuated sentence:',
    options: [
      { id: 'a', text: 'Its a beautiful day.' },
      { id: 'b', text: "It's a beautiful day." },
      { id: 'c', text: "Its' a beautiful day." },
      { id: 'd', text: 'It is a beautiful, day.' },
    ],
    correctOptionId: 'b',
    explanation:
      '"It\'s" is the correct contraction of "it is." "Its" (no apostrophe) is the possessive form, used differently.',
    hint: "You're looking for the correct contraction of 'it is'.",
    difficulty: 'medium',
    subjectName: 'General English',
    topicName: 'Grammar',
    tags: ['direct-and-indirect-speech'],
    source: 'curated',
  },
]

export async function getQuestionBank(): Promise<PracticeQuestion[]> {
  return delay(QUESTION_BANK, 300)
}

export function getQuestionById(questionId: string): PracticeQuestion | undefined {
  return QUESTION_BANK.find((q) => q.id === questionId)
}

/** Years with at least one PYQ-tagged question — powers the PYQ mode's year
 * picker (docs/Smart_Practice.md §7). */
export function getPyqYears(): number[] {
  const years = QUESTION_BANK.filter(
    (q) => q.source === 'pyq' && q.pyqYear !== undefined,
  ).map((q) => q.pyqYear as number)
  return Array.from(new Set(years)).sort((a, b) => b - a)
}
