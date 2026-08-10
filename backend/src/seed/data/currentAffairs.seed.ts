import type {
  CurrentAffairsCategory,
  CurrentAffairsPeriod,
} from '../../constants/currentAffairs'
import type { BilingualText } from '../../models/shared/bilingualText'

/**
 * Small, hand-authored, non-scraped development seed content (this step's
 * explicit "do not scrape external websites, use development seed content
 * for testing only" instruction) — TNPSC-realistic current-affairs items,
 * originally authored for `frontend/src/services/mock/currentAffairsMockService.ts`
 * and adapted here as the real backend's dev seed. `daysAgo` is resolved
 * against seed-run time in `seed/run.ts` (not a hardcoded date), the same
 * "always true regardless of when this runs" convention `liveExams.seed.ts`
 * already established, so "Today"/"This Week" filters always have real
 * matching content.
 */
export interface CurrentAffairQuizOptionSeed {
  optionId: string
  text: BilingualText
}

export interface CurrentAffairQuizQuestionSeed {
  questionId: string
  questionText: BilingualText
  options: CurrentAffairQuizOptionSeed[]
  correctOptionId: string
  explanation: BilingualText
}

export interface CurrentAffairSeedItem {
  daysAgo: number
  period: CurrentAffairsPeriod
  category: CurrentAffairsCategory
  title: BilingualText
  excerpt?: BilingualText
  body: { en: string[] }
  highlights: { en: string[] }
  examRelevanceTags: string[]
  tags: string[]
  isImportant: boolean
  imageUrl?: string
  imageAlt?: string
  /** Resolved against already-seeded `Question.tags` at seed time — never
   * duplicate question content, same pattern `liveExams.seed.ts` uses. */
  relatedQuestionTags?: string[]
  quizQuestions?: CurrentAffairQuizQuestionSeed[]
}

export const currentAffairsSeedData: CurrentAffairSeedItem[] = [
  {
    daysAgo: 0,
    period: 'daily',
    category: 'tamil-nadu',
    title: {
      en: "Tamil Nadu launches 'Naan Mudhalvan' skill-mission expansion for rural youth",
    },
    excerpt: {
      en: 'The scheme adds 200 new training centres across tier-2/3 districts, targeting 5 lakh rural youth this year.',
    },
    body: {
      en: [
        "The Tamil Nadu government announced a major expansion of its flagship 'Naan Mudhalvan' skill-development mission, adding 200 new training centres across tier-2 and tier-3 districts including Villupuram, Dindigul, and Thoothukudi.",
        'The expansion specifically targets rural youth aged 18-30, offering free certification courses in digital literacy, retail operations, and entry-level technical trades, with a stated goal of training 5 lakh candidates within the current financial year.',
        "Officials linked the move to the state's broader employment strategy, noting that placement partnerships have already been signed with over 300 private-sector employers to absorb trained candidates directly.",
      ],
    },
    highlights: {
      en: [
        '200 new training centres across tier-2/3 Tamil Nadu districts',
        'Target: 5 lakh rural youth trained this financial year',
        'Placement tie-ups with 300+ private employers',
      ],
    },
    examRelevanceTags: ['Tamil Nadu Government Schemes', 'Employment', 'General Studies'],
    tags: ['Government Scheme', 'Skill Development'],
    isImportant: true,
    quizQuestions: [
      {
        questionId: 'q1',
        questionText: {
          en: "How many new training centres does the 'Naan Mudhalvan' expansion add?",
        },
        options: [
          { optionId: 'a', text: { en: '100' } },
          { optionId: 'b', text: { en: '200' } },
          { optionId: 'c', text: { en: '350' } },
          { optionId: 'd', text: { en: '500' } },
        ],
        correctOptionId: 'b',
        explanation: {
          en: 'The expansion adds 200 new training centres across tier-2/3 Tamil Nadu districts.',
        },
      },
    ],
  },
  {
    daysAgo: 1,
    period: 'daily',
    category: 'economy',
    title: { en: 'RBI keeps repo rate unchanged at 6.5% in bi-monthly policy review' },
    excerpt: {
      en: 'The Monetary Policy Committee voted 5-1 to hold rates, citing stable inflation and steady GDP growth signals.',
    },
    body: {
      en: [
        "The Reserve Bank of India's Monetary Policy Committee (MPC) voted 5-1 to keep the repo rate unchanged at 6.5% for the third consecutive review, citing retail inflation holding within the RBI's comfort band.",
        'The central bank retained its GDP growth projection for the current fiscal year at 6.8%.',
        'The policy stance was kept at "withdrawal of accommodation," signalling the RBI is not yet ready to shift toward a rate-cut cycle.',
      ],
    },
    highlights: {
      en: [
        'Repo rate held at 6.5% — third straight unchanged review',
        'MPC vote: 5-1 in favour of holding',
        'FY GDP growth projection retained at 6.8%',
      ],
    },
    examRelevanceTags: ['Indian Economy', 'Banking', 'RBI'],
    tags: ['Economy', 'RBI', 'Monetary Policy'],
    isImportant: true,
    quizQuestions: [
      {
        questionId: 'q1',
        questionText: {
          en: 'At what level did the RBI hold the repo rate in this review?',
        },
        options: [
          { optionId: 'a', text: { en: '6.0%' } },
          { optionId: 'b', text: { en: '6.25%' } },
          { optionId: 'c', text: { en: '6.5%' } },
          { optionId: 'd', text: { en: '7.0%' } },
        ],
        correctOptionId: 'c',
        explanation: {
          en: 'The repo rate was held at 6.5% for the third consecutive review.',
        },
      },
    ],
  },
  {
    daysAgo: 2,
    period: 'daily',
    category: 'science-tech',
    title: {
      en: 'ISRO successfully launches next-generation NavIC navigation satellite',
    },
    excerpt: {
      en: 'The NVS-03 satellite strengthens indigenous positioning coverage across the Indian Ocean region.',
    },
    body: {
      en: [
        'The Indian Space Research Organisation (ISRO) successfully launched the NVS-03 satellite aboard a GSLV rocket from the Satish Dhawan Space Centre, Sriharikota, bolstering the NavIC regional positioning system.',
        'NVS-03 carries an indigenous atomic clock, replacing an imported component used in earlier NavIC satellites.',
        'The upgraded constellation extends accurate positioning coverage roughly 1,500 km beyond Indian landmass boundaries.',
      ],
    },
    highlights: {
      en: [
        'NVS-03 launched via GSLV from Sriharikota',
        'First NavIC satellite with a fully indigenous atomic clock',
        'Coverage extended ~1,500 km beyond Indian landmass',
      ],
    },
    examRelevanceTags: ['Science & Technology', 'ISRO', 'Space'],
    tags: ['Space', 'ISRO', 'Technology'],
    isImportant: true,
    quizQuestions: [
      {
        questionId: 'q1',
        questionText: { en: 'Which rocket launched the NVS-03 satellite?' },
        options: [
          { optionId: 'a', text: { en: 'PSLV' } },
          { optionId: 'b', text: { en: 'GSLV' } },
          { optionId: 'c', text: { en: 'SSLV' } },
          { optionId: 'd', text: { en: 'LVM3' } },
        ],
        correctOptionId: 'b',
        explanation: { en: 'NVS-03 was launched aboard a GSLV rocket from Sriharikota.' },
      },
    ],
  },
  {
    daysAgo: 3,
    period: 'daily',
    category: 'polity-governance',
    title: {
      en: "Parliament's Monsoon Session begins; Data Protection Amendment Bill tabled",
    },
    excerpt: {
      en: 'The amendment bill proposes stricter breach-notification timelines for organisations handling personal data.',
    },
    body: {
      en: [
        "Parliament's Monsoon Session opened with the government tabling the Digital Personal Data Protection (Amendment) Bill, which proposes a mandatory 72-hour breach-notification window.",
        'The bill also proposes higher penalty ceilings for repeat data-protection violations.',
        'Opposition parties have sought the bill be referred to a Joint Parliamentary Committee before passage.',
      ],
    },
    highlights: {
      en: [
        '72-hour mandatory breach-notification window proposed',
        'Higher penalties proposed for repeat violations',
        'Opposition seeks Joint Parliamentary Committee referral',
      ],
    },
    examRelevanceTags: ['Polity', 'Parliament', 'Governance'],
    tags: ['Polity', 'Parliament', 'Data Protection'],
    isImportant: false,
    relatedQuestionTags: ['polity', 'preamble'],
    quizQuestions: [
      {
        questionId: 'q1',
        questionText: {
          en: 'What breach-notification window does the Data Protection Amendment Bill propose?',
        },
        options: [
          { optionId: 'a', text: { en: '24 hours' } },
          { optionId: 'b', text: { en: '48 hours' } },
          { optionId: 'c', text: { en: '72 hours' } },
          { optionId: 'd', text: { en: '7 days' } },
        ],
        correctOptionId: 'c',
        explanation: {
          en: 'The bill proposes a mandatory 72-hour breach-notification window.',
        },
      },
    ],
  },
  {
    daysAgo: 6,
    period: 'daily',
    category: 'environment',
    title: {
      en: 'Nilgiris Biosphere Reserve annual report flags shrinking shola forest cover',
    },
    excerpt: {
      en: 'The report attributes a 4% shola-grassland decline over five years to invasive species and encroachment.',
    },
    body: {
      en: [
        'The annual ecological status report for the Nilgiris Biosphere Reserve recorded a 4% decline in shola-grassland ecosystem cover over the past five years.',
        'The report flagged encroachment pressure near reserve boundaries and recommended an accelerated native-species restoration programme.',
      ],
    },
    highlights: {
      en: [
        '4% shola-grassland decline recorded over 5 years',
        'Invasive wattle/eucalyptus spread cited as the primary cause',
      ],
    },
    examRelevanceTags: ['Environment', 'Tamil Nadu Geography', 'Biodiversity'],
    tags: ['Environment', 'Biodiversity', 'Tamil Nadu'],
    isImportant: false,
  },
  {
    daysAgo: 10,
    period: 'daily',
    category: 'tamil-nadu',
    title: {
      en: 'Cauvery Water Management Authority reviews July water release schedule',
    },
    excerpt: {
      en: 'The authority confirmed release volumes remain within the Supreme Court-mandated schedule for the month.',
    },
    body: {
      en: [
        'The Cauvery Water Management Authority (CWMA) held its scheduled monthly review, confirming that water release volumes remain consistent with the Supreme Court-mandated allocation schedule.',
        'Tamil Nadu officials noted storage levels at the Mettur reservoir are at a comfortable 78% of capacity.',
      ],
    },
    highlights: {
      en: [
        'July release volumes confirmed within Supreme Court schedule',
        'Mettur reservoir at 78% capacity',
      ],
    },
    examRelevanceTags: ['Tamil Nadu', 'Cauvery Dispute', 'Water Resources'],
    tags: ['Tamil Nadu', 'Water Resources'],
    isImportant: false,
  },
  {
    daysAgo: 15,
    period: 'daily',
    category: 'international',
    title: { en: 'UN report warns of accelerating Indian Ocean warming trend' },
    excerpt: {
      en: "The UN's latest climate assessment finds Indian Ocean surface temperatures rising faster than the global average.",
    },
    body: {
      en: [
        'A newly released United Nations climate assessment found that Indian Ocean surface temperatures are warming roughly 20% faster than the global ocean average.',
        'The report links the accelerated warming to increased frequency of marine heatwaves.',
      ],
    },
    highlights: {
      en: [
        'Indian Ocean warming ~20% faster than global average',
        'Rising marine heatwave frequency linked to coral bleaching',
      ],
    },
    examRelevanceTags: ['Environment', 'International Relations', 'Climate'],
    tags: ['Environment', 'Climate', 'International'],
    isImportant: false,
    quizQuestions: [
      {
        questionId: 'q1',
        questionText: {
          en: 'How much faster is the Indian Ocean warming versus the global average?',
        },
        options: [
          { optionId: 'a', text: { en: 'About 5% faster' } },
          { optionId: 'b', text: { en: 'About 20% faster' } },
          { optionId: 'c', text: { en: 'About 50% faster' } },
          { optionId: 'd', text: { en: 'About the same rate' } },
        ],
        correctOptionId: 'b',
        explanation: {
          en: 'The report found Indian Ocean surface temperatures warming roughly 20% faster than the global average.',
        },
      },
    ],
  },
  {
    daysAgo: 20,
    period: 'daily',
    category: 'economy',
    title: { en: 'GST Council simplifies return-filing process for small traders' },
    excerpt: {
      en: 'The Council approved a quarterly-filing option for businesses with turnover under ₹1.5 crore.',
    },
    body: {
      en: [
        'The GST Council, at its latest meeting, approved a simplified quarterly-filing scheme for businesses with annual turnover under ₹1.5 crore.',
        'The Council also cleared a proposal to pre-fill a larger share of return fields using e-invoice data.',
      ],
    },
    highlights: {
      en: [
        'Quarterly filing approved for turnover under ₹1.5 crore',
        'Greater e-invoice-based pre-filling to reduce filing errors',
      ],
    },
    examRelevanceTags: ['Indian Economy', 'GST', 'Taxation'],
    tags: ['Economy', 'GST', 'Taxation'],
    isImportant: false,
  },
  {
    daysAgo: 4,
    period: 'weekly',
    category: 'national',
    title: { en: 'Weekly Digest: National Roundup' },
    excerpt: {
      en: "This week's roundup: Monsoon Session preview, a new skill-mission push, and a satellite launch update.",
    },
    body: {
      en: [
        "This week's national roundup: Parliament's Monsoon Session preparations dominated headlines, with the government finalising its legislative agenda.",
        'On the states front, Tamil Nadu confirmed plans for a major skill-mission expansion targeting rural youth.',
        "In science news, ISRO's next NavIC satellite completed final pre-launch checks.",
      ],
    },
    highlights: {
      en: [
        'Monsoon Session legislative agenda finalised',
        'Tamil Nadu skill-mission expansion confirmed',
        'NavIC satellite cleared for launch',
      ],
    },
    examRelevanceTags: ['Current Affairs Roundup', 'General Studies'],
    tags: ['Weekly Digest'],
    isImportant: false,
  },
  {
    daysAgo: 11,
    period: 'weekly',
    category: 'economy',
    title: { en: 'Weekly Digest: Economy & Governance' },
    excerpt: {
      en: "This week's roundup: GST filing reforms, Cauvery review outcomes, and an Indian Ocean climate warning.",
    },
    body: {
      en: [
        "The GST Council's decision to simplify quarterly filing for small traders was the week's headline economic development.",
        "The Cauvery Water Management Authority's monthly review confirmed compliance with the Supreme Court-mandated release schedule.",
      ],
    },
    highlights: {
      en: [
        'GST quarterly-filing simplification for small traders',
        'Cauvery release schedule confirmed on track',
      ],
    },
    examRelevanceTags: ['Current Affairs Roundup', 'General Studies'],
    tags: ['Weekly Digest', 'Economy'],
    isImportant: false,
  },
  {
    daysAgo: 25,
    period: 'weekly',
    category: 'polity-governance',
    title: { en: 'Weekly Digest: Polity & Legislation' },
    excerpt: {
      en: "This week's roundup: pre-session bill drafting, judicial transparency rulings, and state-level policy news.",
    },
    body: {
      en: [
        'Legislative drafting committees finalised the text of the Data Protection Amendment Bill ahead of its tabling.',
        "Legal commentary through the week focused on the Supreme Court's recent electoral-trust disclosure ruling.",
      ],
    },
    highlights: {
      en: [
        'Data Protection Amendment Bill text finalised pre-session',
        'Continued analysis of the electoral-trust disclosure ruling',
      ],
    },
    examRelevanceTags: ['Current Affairs Roundup', 'Polity'],
    tags: ['Weekly Digest', 'Polity'],
    isImportant: false,
    relatedQuestionTags: ['polity', 'fundamental-rights'],
  },
  {
    daysAgo: 32,
    period: 'monthly',
    category: 'national',
    title: { en: 'Monthly Capsule — Previous Month' },
    excerpt: {
      en: "Last month's biggest developments: BRICS chairmanship, Chandrayaan-4 progress, and a Tamil Nadu literacy milestone.",
    },
    body: {
      en: [
        "Last month's defining national story was India assuming the rotating BRICS chairmanship, setting a reformed-multilateralism agenda.",
        'On the science front, ISRO advanced Chandrayaan-4 integration testing.',
        "At the state level, Tamil Nadu's adult-literacy mission crossed a 90% effective literacy milestone.",
      ],
    },
    highlights: {
      en: [
        "India's BRICS chairmanship begins with a reformed-multilateralism theme",
        'Chandrayaan-4 integration testing advances toward launch readiness',
        "Tamil Nadu's literacy mission crosses 90% effective literacy",
      ],
    },
    examRelevanceTags: [
      'Monthly Capsule',
      'General Studies',
      'Mains Ethics & Governance',
    ],
    tags: ['Monthly Capsule'],
    isImportant: true,
  },
  {
    daysAgo: 63,
    period: 'monthly',
    category: 'national',
    title: { en: 'Monthly Capsule — Two Months Ago' },
    excerpt: {
      en: "That month's biggest developments: an electoral-trust transparency ruling and new mangrove protections in Tamil Nadu.",
    },
    body: {
      en: [
        "That month's most consequential governance story was the Supreme Court's ruling tightening disclosure norms for electoral trusts.",
        'On the environment front, Tamil Nadu notified a new mangrove conservation reserve along the Pichavaram coast.',
      ],
    },
    highlights: {
      en: [
        'Supreme Court tightens electoral-trust donor-disclosure norms',
        'New Pichavaram mangrove reserve notified in Tamil Nadu',
      ],
    },
    examRelevanceTags: [
      'Monthly Capsule',
      'General Studies',
      'Mains Ethics & Governance',
    ],
    tags: ['Monthly Capsule', 'Environment'],
    isImportant: false,
    relatedQuestionTags: ['polity', 'fundamental-rights'],
  },
]
