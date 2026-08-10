import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ExamsTab } from './exams-tab'
import { LessonsTab } from './lessons-tab'
import { StudyMaterialsTab } from './study-materials-tab'
import { SubjectsTab } from './subjects-tab'
import { SubtopicsTab } from './subtopics-tab'
import { TopicsTab } from './topics-tab'

type Tab = 'exams' | 'subjects' | 'topics' | 'subtopics' | 'lessons' | 'study-materials'

const TABS: { id: Tab; label: string }[] = [
  { id: 'exams', label: 'Exams' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'topics', label: 'Topics' },
  { id: 'subtopics', label: 'Subtopics' },
  { id: 'lessons', label: 'Lessons' },
  { id: 'study-materials', label: 'Study Materials' },
]

/**
 * Exam → Subject → Topic → Subtopic → Lesson (+ Study Materials) content
 * management (Sprint 4 Step 54). One page, six tabs — each tab is a
 * self-contained list+inline-form, matching `questions-list-page.tsx`'s
 * table/filter/pagination conventions. Deletion is never destructive:
 * "Archive" (soft-delete) is blocked server-side whenever active child
 * content still exists under a Subject/Topic/Subtopic, so orphaned content
 * can't happen — the error message names exactly what to deactivate first.
 */
export function ContentManagementPage() {
  const [tab, setTab] = useState<Tab>('exams')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Content</h1>
        <p className="text-muted-foreground text-sm">
          Manage the Exam → Subject → Topic → Subtopic → Lesson hierarchy and Study
          Materials.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'exams' && <ExamsTab />}
      {tab === 'subjects' && <SubjectsTab />}
      {tab === 'topics' && <TopicsTab />}
      {tab === 'subtopics' && <SubtopicsTab />}
      {tab === 'lessons' && <LessonsTab />}
      {tab === 'study-materials' && <StudyMaterialsTab />}
    </div>
  )
}
