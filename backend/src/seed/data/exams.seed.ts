import type { IExam } from '../../models/Exam.model'

/** Identical codes/labels to `frontend/src/constants/exam.ts`'s `EXAM_CATEGORIES`. */
export const examSeedData: IExam[] = [
  { code: 'group-1', name: { en: 'Group 1', ta: 'குரூப் 1' }, order: 1, isActive: true },
  { code: 'group-2', name: { en: 'Group 2', ta: 'குரூப் 2' }, order: 2, isActive: true },
  {
    code: 'group-2a',
    name: { en: 'Group 2A', ta: 'குரூப் 2ஏ' },
    order: 3,
    isActive: true,
  },
  { code: 'group-4', name: { en: 'Group 4', ta: 'குரூப் 4' }, order: 4, isActive: true },
  {
    code: 'vao',
    name: { en: 'VAO', ta: 'கிராம நிர்வாக அலுவலர்' },
    order: 5,
    isActive: true,
  },
  { code: 'police', name: { en: 'Police', ta: 'காவல்துறை' }, order: 6, isActive: true },
  { code: 'forest', name: { en: 'Forest', ta: 'வனத்துறை' }, order: 7, isActive: true },
  {
    code: 'trb',
    name: { en: 'TRB', ta: 'ஆசிரியர் தேர்வு வாரியம்' },
    order: 8,
    isActive: true,
  },
]
