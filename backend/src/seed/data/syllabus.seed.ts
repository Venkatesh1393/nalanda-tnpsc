import type { BilingualText } from '../../models/shared/bilingualText'

/**
 * A small, representative dev/testing hierarchy — 2 subjects, 4 topics, 8
 * subtopics — not the full TNPSC syllabus. Deliberately reuses names
 * already present in the frontend's mocks (e.g. "Newton's Laws of Motion",
 * `services/mock/subjectsMockService.ts`) so a future session wiring the
 * frontend to this real backend has matching content to point at, rather
 * than inventing a second, inconsistent taxonomy.
 */

export interface QuestionSeed {
  questionText: BilingualText
  options: { optionId: string; text: BilingualText; isCorrect: boolean }[]
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: BilingualText
  source: 'pyq' | 'curated'
  isPreviousYear: boolean
  pyqYear?: number
  tnpscExamType?: 'prelims' | 'mains'
  tags: string[]
}

export interface SubtopicSeed {
  slug: string
  name: BilingualText
  order: number
  estimatedMinutes: number
  lesson: {
    title: BilingualText
    durationSeconds: number
  }
  studyMaterial: {
    title: BilingualText
    body: { en: string[]; ta: string[] }
  }
  questions?: QuestionSeed[]
}

export interface TopicSeed {
  slug: string
  name: BilingualText
  order: number
  subtopics: SubtopicSeed[]
}

export interface SubjectSeed {
  slug: string
  name: BilingualText
  examCodes: string[]
  order: number
  /** `frontend/src/features/learn/lib/subject-icons.ts`'s `iconKey` —
   * kept identical so the existing icon mapping needs no changes. */
  icon: string
  topics: TopicSeed[]
}

export const syllabusSeedData: SubjectSeed[] = [
  {
    slug: 'general-science',
    name: { en: 'General Science', ta: 'பொது அறிவியல்' },
    examCodes: ['group-4', 'vao', 'group-2'],
    order: 1,
    icon: 'flask-conical',
    topics: [
      {
        slug: 'physics',
        name: { en: 'Physics', ta: 'இயற்பியல்' },
        order: 1,
        subtopics: [
          {
            slug: 'newtons-laws-of-motion',
            name: { en: "Newton's Laws of Motion", ta: 'நியூட்டனின் இயக்க விதிகள்' },
            order: 1,
            estimatedMinutes: 25,
            lesson: {
              title: { en: "Newton's Laws of Motion", ta: 'நியூட்டனின் இயக்க விதிகள்' },
              durationSeconds: 480,
            },
            studyMaterial: {
              title: { en: "Newton's Laws of Motion — Notes", ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'First Law (Inertia): An object stays at rest or in uniform motion unless acted upon by an external force.',
                  'Second Law: Force equals mass times acceleration (F = ma).',
                  'Third Law: For every action, there is an equal and opposite reaction.',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: "Newton's First Law of Motion is also known as the Law of:",
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Inertia' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Momentum' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Gravitation' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Acceleration' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: {
                  en: "Newton's First Law states that an object remains at rest or in uniform motion unless acted upon by an external force — this resistance to a change in motion is called inertia.",
                },
                source: 'pyq',
                isPreviousYear: true,
                pyqYear: 2019,
                tnpscExamType: 'prelims',
                tags: ['physics', 'laws-of-motion'],
              },
              {
                questionText: {
                  en: 'A force of 10 N acts on a mass of 2 kg. What is the resulting acceleration?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: '2 m/s²' }, isCorrect: false },
                  { optionId: 'b', text: { en: '5 m/s²' }, isCorrect: true },
                  { optionId: 'c', text: { en: '10 m/s²' }, isCorrect: false },
                  { optionId: 'd', text: { en: '20 m/s²' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: "By Newton's Second Law, F = ma, so a = F/m = 10/2 = 5 m/s².",
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['physics', 'laws-of-motion', 'numerical'],
              },
              {
                questionText: {
                  en: "Newton's Second Law states that force is directly proportional to the:",
                  ta: '',
                },
                options: [
                  {
                    optionId: 'a',
                    text: { en: 'Rate of change of momentum' },
                    isCorrect: true,
                  },
                  {
                    optionId: 'b',
                    text: { en: 'Mass of the object alone' },
                    isCorrect: false,
                  },
                  {
                    optionId: 'c',
                    text: { en: 'Velocity of the object alone' },
                    isCorrect: false,
                  },
                  { optionId: 'd', text: { en: 'Distance travelled' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: "Newton's Second Law is most precisely stated as F = dp/dt — force equals the rate of change of momentum, which reduces to F = ma for constant mass.",
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['physics', 'laws-of-motion'],
              },
              {
                questionText: {
                  en: 'A bus passenger jerks forward when the bus suddenly stops. This is best explained by:',
                  ta: '',
                },
                options: [
                  {
                    optionId: 'a',
                    text: { en: "Newton's First Law (Inertia)" },
                    isCorrect: true,
                  },
                  {
                    optionId: 'b',
                    text: { en: "Newton's Second Law" },
                    isCorrect: false,
                  },
                  { optionId: 'c', text: { en: "Newton's Third Law" }, isCorrect: false },
                  {
                    optionId: 'd',
                    text: { en: 'The Law of Gravitation' },
                    isCorrect: false,
                  },
                ],
                difficulty: 'easy',
                explanation: {
                  en: "The passenger's body continues moving forward due to inertia even as the bus stops — a direct, everyday application of Newton's First Law.",
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['physics', 'laws-of-motion', 'inertia'],
              },
              {
                questionText: { en: 'The SI unit of force is the:', ta: '' },
                options: [
                  { optionId: 'a', text: { en: 'Newton' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Joule' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Watt' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Pascal' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: {
                  en: 'The Newton (N), named after Isaac Newton, is the SI derived unit of force: 1 N = 1 kg·m/s².',
                },
                source: 'pyq',
                isPreviousYear: true,
                pyqYear: 2022,
                tnpscExamType: 'prelims',
                tags: ['physics', 'units', 'force'],
              },
            ],
          },
          {
            slug: 'units-and-measurements',
            name: { en: 'Units and Measurements', ta: 'அலகுகள் மற்றும் அளவீடுகள்' },
            order: 2,
            estimatedMinutes: 20,
            lesson: {
              title: { en: 'Units and Measurements', ta: 'அலகுகள் மற்றும் அளவீடுகள்' },
              durationSeconds: 420,
            },
            studyMaterial: {
              title: { en: 'Units and Measurements — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'The SI system defines 7 base units: metre, kilogram, second, ampere, kelvin, mole, candela.',
                  'Derived units (e.g. speed, force) are combinations of base units.',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: { en: 'The SI unit of length is the:', ta: '' },
                options: [
                  { optionId: 'a', text: { en: 'Metre' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Foot' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Inch' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Yard' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: { en: 'The metre (m) is the SI base unit of length.' },
                source: 'curated',
                isPreviousYear: false,
                tags: ['physics', 'units', 'measurements'],
              },
              {
                questionText: {
                  en: 'Which of the following is an example of a derived unit?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Speed (m/s)' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Metre' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Second' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Kilogram' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: 'Speed is a derived unit — a combination of the base units length (metre) and time (second).',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['physics', 'units', 'measurements'],
              },
              {
                questionText: { en: '1 kilometre is equal to how many metres?', ta: '' },
                options: [
                  { optionId: 'a', text: { en: '1000' }, isCorrect: true },
                  { optionId: 'b', text: { en: '100' }, isCorrect: false },
                  { optionId: 'c', text: { en: '10,000' }, isCorrect: false },
                  { optionId: 'd', text: { en: '500' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: { en: 'The prefix "kilo-" means 1000, so 1 km = 1000 m.' },
                source: 'curated',
                isPreviousYear: false,
                tags: ['physics', 'units', 'measurements'],
              },
              {
                questionText: { en: 'The SI unit of temperature is the:', ta: '' },
                options: [
                  { optionId: 'a', text: { en: 'Kelvin' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Celsius' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Fahrenheit' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Joule' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: {
                  en: 'The Kelvin (K) is the SI base unit of thermodynamic temperature; Celsius and Fahrenheit are common but non-SI scales.',
                },
                source: 'pyq',
                isPreviousYear: true,
                pyqYear: 2021,
                tnpscExamType: 'prelims',
                tags: ['physics', 'units', 'measurements'],
              },
              {
                questionText: {
                  en: 'Which instrument is used to measure atmospheric pressure?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Barometer' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Thermometer' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Hygrometer' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Anemometer' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: 'A barometer measures atmospheric pressure; a hygrometer measures humidity and an anemometer measures wind speed.',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['physics', 'measurements', 'instruments'],
              },
            ],
          },
        ],
      },
      {
        slug: 'biology',
        name: { en: 'Biology', ta: 'உயிரியல்' },
        order: 2,
        subtopics: [
          {
            slug: 'human-digestive-system',
            name: { en: 'Human Digestive System', ta: 'மனித செரிமான மண்டலம்' },
            order: 1,
            estimatedMinutes: 30,
            lesson: {
              title: { en: 'Human Digestive System', ta: 'மனித செரிமான மண்டலம்' },
              durationSeconds: 600,
            },
            studyMaterial: {
              title: { en: 'Human Digestive System — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'The digestive system converts food into absorbable nutrients: mouth → oesophagus → stomach → small intestine → large intestine.',
                  'The liver and pancreas are accessory organs that aid digestion.',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: 'Which organ produces bile to aid in the digestion of fats?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Liver' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Pancreas' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Stomach' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Kidney' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: {
                  en: 'The liver produces bile, which is stored in the gallbladder and released to emulsify fats in the small intestine.',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['biology', 'digestive-system'],
              },
              {
                questionText: {
                  en: 'The absorption of digested food mainly occurs in the:',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Small intestine' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Large intestine' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Stomach' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Oesophagus' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: "The small intestine's large, villi-covered surface area makes it the primary site of nutrient absorption.",
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['biology', 'digestive-system'],
              },
            ],
          },
          {
            slug: 'cell-structure-and-function',
            name: {
              en: 'Cell Structure and Function',
              ta: 'செல் அமைப்பு மற்றும் செயல்பாடு',
            },
            order: 2,
            estimatedMinutes: 25,
            lesson: {
              title: {
                en: 'Cell Structure and Function',
                ta: 'செல் அமைப்பு மற்றும் செயல்பாடு',
              },
              durationSeconds: 540,
            },
            studyMaterial: {
              title: { en: 'Cell Structure and Function — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'The cell is the basic structural and functional unit of life.',
                  'Mitochondria are the "powerhouse of the cell," producing ATP through respiration.',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: "Which cell organelle is known as the 'powerhouse of the cell'?",
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Mitochondria' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Nucleus' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Ribosome' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Golgi body' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: {
                  en: 'Mitochondria generate ATP (the cell\'s energy currency) through cellular respiration, earning the nickname "powerhouse of the cell."',
                },
                source: 'pyq',
                isPreviousYear: true,
                pyqYear: 2020,
                tnpscExamType: 'prelims',
                tags: ['biology', 'cell-structure'],
              },
              {
                questionText: {
                  en: 'The control centre of a cell that contains its genetic material is the:',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Nucleus' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Cytoplasm' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Cell membrane' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Vacuole' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: {
                  en: 'The nucleus houses the cell\'s DNA and controls its activities — hence its role as the "control centre."',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['biology', 'cell-structure'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'aptitude-and-mental-ability',
    name: { en: 'Aptitude & Mental Ability', ta: 'திறன் மற்றும் மனத்திறன்' },
    examCodes: ['group-4', 'vao', 'group-2', 'group-2a'],
    order: 2,
    icon: 'calculator',
    topics: [
      {
        slug: 'numerical-ability',
        name: { en: 'Numerical Ability', ta: 'எண் திறன்' },
        order: 1,
        subtopics: [
          {
            slug: 'simplification',
            name: { en: 'Simplification', ta: 'எளிமைப்படுத்துதல்' },
            order: 1,
            estimatedMinutes: 20,
            lesson: {
              title: { en: 'Simplification', ta: 'எளிமைப்படுத்துதல்' },
              durationSeconds: 360,
            },
            studyMaterial: {
              title: { en: 'Simplification — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'Follow the BODMAS/VBODMAS order of operations: Brackets, Of, Division, Multiplication, Addition, Subtraction.',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: { en: 'Simplify: 12 + 8 ÷ 4 × 2 − 3', ta: '' },
                options: [
                  { optionId: 'a', text: { en: '13' }, isCorrect: true },
                  { optionId: 'b', text: { en: '17' }, isCorrect: false },
                  { optionId: 'c', text: { en: '9' }, isCorrect: false },
                  { optionId: 'd', text: { en: '21' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: {
                  en: 'By BODMAS: 8 ÷ 4 = 2, then 2 × 2 = 4. So 12 + 4 − 3 = 13.',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['aptitude', 'simplification'],
              },
              {
                questionText: {
                  en: 'If 3x + 5 = 20, what is the value of x?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: '3' }, isCorrect: false },
                  { optionId: 'b', text: { en: '5' }, isCorrect: true },
                  { optionId: 'c', text: { en: '15' }, isCorrect: false },
                  { optionId: 'd', text: { en: '25' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: { en: '3x = 20 − 5 = 15, so x = 15 ÷ 3 = 5.' },
                source: 'pyq',
                isPreviousYear: true,
                pyqYear: 2021,
                tnpscExamType: 'prelims',
                tags: ['aptitude', 'simplification', 'algebra'],
              },
              {
                questionText: { en: 'Simplify: (15 × 4) ÷ 2 + 6', ta: '' },
                options: [
                  { optionId: 'a', text: { en: '36' }, isCorrect: true },
                  { optionId: 'b', text: { en: '42' }, isCorrect: false },
                  { optionId: 'c', text: { en: '30' }, isCorrect: false },
                  { optionId: 'd', text: { en: '24' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: 'By BODMAS: 15 × 4 = 60, then 60 ÷ 2 = 30, then 30 + 6 = 36.',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['aptitude', 'simplification'],
              },
              {
                questionText: { en: 'What is 25% of 240?', ta: '' },
                options: [
                  { optionId: 'a', text: { en: '60' }, isCorrect: true },
                  { optionId: 'b', text: { en: '50' }, isCorrect: false },
                  { optionId: 'c', text: { en: '70' }, isCorrect: false },
                  { optionId: 'd', text: { en: '48' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: { en: '25% of 240 = (25/100) × 240 = 60.' },
                source: 'curated',
                isPreviousYear: false,
                tags: ['aptitude', 'simplification', 'percentage'],
              },
            ],
          },
          {
            slug: 'percentage',
            name: { en: 'Percentage', ta: 'சதவீதம்' },
            order: 2,
            estimatedMinutes: 20,
            lesson: {
              title: { en: 'Percentage', ta: 'சதவீதம்' },
              durationSeconds: 360,
            },
            studyMaterial: {
              title: { en: 'Percentage — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: ['Percentage means "per hundred." To find x% of y: (x/100) × y.'],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: 'If a number is increased by 20% and becomes 120, what was the original number?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: '100' }, isCorrect: true },
                  { optionId: 'b', text: { en: '96' }, isCorrect: false },
                  { optionId: 'c', text: { en: '110' }, isCorrect: false },
                  { optionId: 'd', text: { en: '90' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: 'Let the original number be x. x × 1.2 = 120, so x = 120 ÷ 1.2 = 100.',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['aptitude', 'percentage'],
              },
              {
                questionText: {
                  en: 'A student scored 450 out of 600 marks. What percentage did the student score?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: '75%' }, isCorrect: true },
                  { optionId: 'b', text: { en: '70%' }, isCorrect: false },
                  { optionId: 'c', text: { en: '80%' }, isCorrect: false },
                  { optionId: 'd', text: { en: '65%' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: { en: '(450 ÷ 600) × 100 = 75%.' },
                source: 'pyq',
                isPreviousYear: true,
                pyqYear: 2022,
                tnpscExamType: 'prelims',
                tags: ['aptitude', 'percentage'],
              },
            ],
          },
        ],
      },
      {
        slug: 'reasoning',
        name: { en: 'Reasoning', ta: 'நியாயவாதம்' },
        order: 2,
        subtopics: [
          {
            slug: 'blood-relations',
            name: { en: 'Blood Relations', ta: 'இரத்த உறவுகள்' },
            order: 1,
            estimatedMinutes: 20,
            lesson: {
              title: { en: 'Blood Relations', ta: 'இரத்த உறவுகள்' },
              durationSeconds: 360,
            },
            studyMaterial: {
              title: { en: 'Blood Relations — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'Draw a family tree diagram to track generations and relationships mentioned in the question.',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: "Pointing to a man, a woman said, 'His mother is the only daughter of my mother.' How is the woman related to the man?",
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Mother' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Sister' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Aunt' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Grandmother' }, isCorrect: false },
                ],
                difficulty: 'hard',
                explanation: {
                  en: "'The only daughter of my mother' is the woman herself. So 'his mother' is the woman — meaning the woman is the man's mother.",
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['reasoning', 'blood-relations'],
              },
              {
                questionText: {
                  en: 'If A is the brother of B, and B is the sister of C, how is A related to C?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Brother' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Sister' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Cousin' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Father' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: 'A and B are siblings, and B and C are siblings, so A and C are also siblings. Since A is male, A is the brother of C.',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['reasoning', 'blood-relations'],
              },
            ],
          },
          {
            slug: 'series-completion',
            name: { en: 'Series Completion', ta: 'தொடர் நிறைவு' },
            order: 2,
            estimatedMinutes: 20,
            lesson: {
              title: { en: 'Series Completion', ta: 'தொடர் நிறைவு' },
              durationSeconds: 360,
            },
            studyMaterial: {
              title: { en: 'Series Completion — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'Look for a consistent pattern: arithmetic difference, ratio, or an alternating rule.',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: 'Find the next number in the series: 2, 6, 12, 20, 30, ?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: '42' }, isCorrect: true },
                  { optionId: 'b', text: { en: '40' }, isCorrect: false },
                  { optionId: 'c', text: { en: '36' }, isCorrect: false },
                  { optionId: 'd', text: { en: '45' }, isCorrect: false },
                ],
                difficulty: 'hard',
                explanation: {
                  en: 'Each term follows n(n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, so the next term is 6×7=42.',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['reasoning', 'series-completion'],
              },
              {
                questionText: { en: 'Find the missing number: 3, 9, 27, 81, ?', ta: '' },
                options: [
                  { optionId: 'a', text: { en: '243' }, isCorrect: true },
                  { optionId: 'b', text: { en: '162' }, isCorrect: false },
                  { optionId: 'c', text: { en: '216' }, isCorrect: false },
                  { optionId: 'd', text: { en: '324' }, isCorrect: false },
                ],
                difficulty: 'easy',
                explanation: {
                  en: 'Each term is a power of 3: 3¹=3, 3²=9, 3³=27, 3⁴=81, so the next term is 3⁵=243.',
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['reasoning', 'series-completion'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'tamil',
    name: { en: 'Tamil', ta: 'தமிழ்' },
    examCodes: ['group-1', 'group-2', 'group-2a', 'group-4', 'vao'],
    order: 3,
    icon: 'languages',
    topics: [
      {
        slug: 'grammar',
        name: { en: 'Grammar', ta: 'இலக்கணம்' },
        order: 1,
        subtopics: [
          {
            slug: 'noun-and-pronoun',
            name: {
              en: 'Noun and Pronoun',
              ta: 'பெயர்ச்சொல் மற்றும் பிரதிப்பெயர்ச்சொல்',
            },
            order: 1,
            estimatedMinutes: 20,
            lesson: {
              title: {
                en: 'Noun and Pronoun',
                ta: 'பெயர்ச்சொல் மற்றும் பிரதிப்பெயர்ச்சொல்',
              },
              durationSeconds: 360,
            },
            studyMaterial: {
              title: { en: 'Noun and Pronoun — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'பெயர்ச்சொல் (noun) names a person, place, or thing; பிரதிப்பெயர்ச்சொல் (pronoun) stands in place of a noun already mentioned.',
                  'Tamil pronouns inflect for person (தன்மை/முன்னிலை/படர்க்கை) and number (ஒருமை/பன்மை).',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: "In Tamil grammar, the pronoun 'அவன்' (avan) is an example of which person?",
                  ta: '',
                },
                options: [
                  {
                    optionId: 'a',
                    text: { en: 'படர்க்கை (Third person)' },
                    isCorrect: true,
                  },
                  {
                    optionId: 'b',
                    text: { en: 'தன்மை (First person)' },
                    isCorrect: false,
                  },
                  {
                    optionId: 'c',
                    text: { en: 'முன்னிலை (Second person)' },
                    isCorrect: false,
                  },
                  {
                    optionId: 'd',
                    text: { en: 'பன்மை (Plural marker)' },
                    isCorrect: false,
                  },
                ],
                difficulty: 'easy',
                explanation: {
                  en: "'அவன்' (he) refers to a third party being spoken about, making it படர்க்கை (third person) singular masculine.",
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['tamil', 'grammar', 'pronoun'],
              },
            ],
          },
          {
            slug: 'tense-forms',
            name: { en: 'Tense Forms', ta: 'காலங்கள்' },
            order: 2,
            estimatedMinutes: 20,
            lesson: {
              title: { en: 'Tense Forms', ta: 'காலங்கள்' },
              durationSeconds: 360,
            },
            studyMaterial: {
              title: { en: 'Tense Forms — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'Tamil verbs mark three basic tenses: past (இறந்த காலம்), present (நிகழ் காலம்), and future (எதிர் காலம்), each with its own suffix pattern.',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: "The Tamil verb suffix '-கிறான்' (e.g. படிக்கிறான்) typically indicates which tense?",
                  ta: '',
                },
                options: [
                  {
                    optionId: 'a',
                    text: { en: 'நிகழ் காலம் (Present tense)' },
                    isCorrect: true,
                  },
                  {
                    optionId: 'b',
                    text: { en: 'இறந்த காலம் (Past tense)' },
                    isCorrect: false,
                  },
                  {
                    optionId: 'c',
                    text: { en: 'எதிர் காலம் (Future tense)' },
                    isCorrect: false,
                  },
                  {
                    optionId: 'd',
                    text: { en: 'ஏவல் வினை (Imperative)' },
                    isCorrect: false,
                  },
                ],
                difficulty: 'easy',
                explanation: {
                  en: "The suffix '-கிறான்' marks the present tense, third-person-singular-masculine form — 'படிக்கிறான்' means 'he is reading'.",
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['tamil', 'grammar', 'tense'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'indian-polity',
    name: { en: 'Indian Polity', ta: 'இந்திய அரசியலமைப்பு' },
    examCodes: [
      'group-1',
      'group-2',
      'group-2a',
      'group-4',
      'vao',
      'police',
      'forest',
      'trb',
    ],
    order: 4,
    icon: 'landmark',
    topics: [
      {
        slug: 'constitution-basics',
        name: { en: 'Constitution Basics', ta: 'அரசியலமைப்பு அடிப்படைகள்' },
        order: 1,
        subtopics: [
          {
            slug: 'preamble',
            name: { en: 'Preamble', ta: 'முகவுரை' },
            order: 1,
            estimatedMinutes: 15,
            lesson: {
              title: { en: 'Preamble', ta: 'முகவுரை' },
              durationSeconds: 300,
            },
            studyMaterial: {
              title: { en: 'Preamble — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'The Preamble declares India a Sovereign, Socialist, Secular, Democratic Republic, securing Justice, Liberty, Equality, and Fraternity to all citizens.',
                  'The words "Socialist" and "Secular" were added by the 42nd Constitutional Amendment (1976).',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: 'The words "Socialist" and "Secular" were added to the Preamble by which Constitutional Amendment?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: '24th Amendment' }, isCorrect: false },
                  { optionId: 'b', text: { en: '42nd Amendment' }, isCorrect: true },
                  { optionId: 'c', text: { en: '44th Amendment' }, isCorrect: false },
                  { optionId: 'd', text: { en: '52nd Amendment' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: 'The 42nd Constitutional Amendment Act, 1976 (also called the "Mini-Constitution") added "Socialist" and "Secular" to the Preamble.',
                },
                source: 'pyq',
                isPreviousYear: true,
                pyqYear: 2020,
                tnpscExamType: 'prelims',
                tags: ['polity', 'preamble', 'amendments'],
              },
              {
                questionText: {
                  en: "The term 'Republic' in the Preamble signifies that:",
                  ta: '',
                },
                options: [
                  {
                    optionId: 'a',
                    text: { en: 'The head of state is elected, not hereditary' },
                    isCorrect: true,
                  },
                  {
                    optionId: 'b',
                    text: { en: 'India follows a presidential system' },
                    isCorrect: false,
                  },
                  {
                    optionId: 'c',
                    text: { en: 'India has a written constitution' },
                    isCorrect: false,
                  },
                  {
                    optionId: 'd',
                    text: { en: 'India is a federal state' },
                    isCorrect: false,
                  },
                ],
                difficulty: 'medium',
                explanation: {
                  en: "'Republic' means the head of state (the President) is elected, directly or indirectly, for a fixed term — never a hereditary monarch.",
                },
                source: 'curated',
                isPreviousYear: false,
                tags: ['polity', 'preamble'],
              },
            ],
          },
          {
            slug: 'fundamental-rights',
            name: { en: 'Fundamental Rights', ta: 'அடிப்படை உரிமைகள்' },
            order: 2,
            estimatedMinutes: 25,
            lesson: {
              title: { en: 'Fundamental Rights', ta: 'அடிப்படை உரிமைகள்' },
              durationSeconds: 480,
            },
            studyMaterial: {
              title: { en: 'Fundamental Rights — Notes', ta: 'குறிப்புகள்' },
              body: {
                en: [
                  'Part III of the Constitution (Articles 12-35) guarantees six Fundamental Rights: Equality, Freedom, against Exploitation, Freedom of Religion, Cultural and Educational Rights, and Constitutional Remedies.',
                  'The Right to Property was removed from the list of Fundamental Rights by the 44th Amendment (1978) and made a legal right under Article 300-A.',
                ],
                ta: [],
              },
            },
            questions: [
              {
                questionText: {
                  en: 'Which Article of the Indian Constitution abolishes untouchability?',
                  ta: '',
                },
                options: [
                  { optionId: 'a', text: { en: 'Article 17' }, isCorrect: true },
                  { optionId: 'b', text: { en: 'Article 14' }, isCorrect: false },
                  { optionId: 'c', text: { en: 'Article 19' }, isCorrect: false },
                  { optionId: 'd', text: { en: 'Article 21' }, isCorrect: false },
                ],
                difficulty: 'medium',
                explanation: {
                  en: 'Article 17 abolishes "untouchability" and forbids its practice in any form, making its enforcement an offence punishable by law.',
                },
                source: 'pyq',
                isPreviousYear: true,
                pyqYear: 2019,
                tnpscExamType: 'prelims',
                tags: ['polity', 'fundamental-rights'],
              },
            ],
          },
        ],
      },
    ],
  },
]
