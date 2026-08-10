import { CurrentAffair } from '../models/CurrentAffair.model'
import { Lesson } from '../models/Lesson.model'
import { LiveExam } from '../models/LiveExam.model'
import { PracticeSession } from '../models/PracticeSession.model'
import { Question } from '../models/Question.model'
import { Subject } from '../models/Subject.model'
import { Topic } from '../models/Topic.model'
import { User } from '../models/User.model'

/**
 * Real, live-counted platform totals for the Admin Dashboard (Step 52) —
 * every field is a genuine `countDocuments()` against the same collections
 * the rest of the app writes to, never a fabricated/placeholder number
 * (CLAUDE.md's "never use dummy data" rule). Run in parallel since these are
 * independent reads with no ordering dependency.
 */
export async function getPlatformCounts() {
  const [
    totalStudents,
    activeStudents,
    premiumStudents,
    questions,
    subjects,
    topics,
    lessons,
    practiceSessions,
    weeklyExams,
    currentAffairs,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'user', status: 'active' }),
    User.countDocuments({ role: 'user', subscriptionTier: { $ne: 'free' } }),
    Question.countDocuments(),
    Subject.countDocuments(),
    Topic.countDocuments(),
    Lesson.countDocuments(),
    PracticeSession.countDocuments(),
    LiveExam.countDocuments(),
    CurrentAffair.countDocuments(),
  ])

  return {
    totalStudents,
    activeStudents,
    premiumStudents,
    questions,
    subjects,
    topics,
    lessons,
    practiceSessions,
    weeklyExams,
    currentAffairs,
  }
}
