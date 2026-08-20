import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonEn from './locales/en/common.json'
import authEn from './locales/en/auth.json'
import onboardingEn from './locales/en/onboarding.json'
import dashboardEn from './locales/en/dashboard.json'
import learnEn from './locales/en/learn.json'
import practiceEn from './locales/en/practice.json'
import liveExamsEn from './locales/en/liveExams.json'
import currentAffairsEn from './locales/en/currentAffairs.json'
import analyticsEn from './locales/en/analytics.json'
import settingsEn from './locales/en/settings.json'
import notificationsEn from './locales/en/notifications.json'
import landingEn from './locales/en/landing.json'
import paymentsEn from './locales/en/payments.json'
import searchEn from './locales/en/search.json'
import aiTutorEn from './locales/en/aiTutor.json'
import questionPapersEn from './locales/en/questionPapers.json'

import commonTa from './locales/ta/common.json'
import authTa from './locales/ta/auth.json'
import onboardingTa from './locales/ta/onboarding.json'
import dashboardTa from './locales/ta/dashboard.json'
import learnTa from './locales/ta/learn.json'
import practiceTa from './locales/ta/practice.json'
import liveExamsTa from './locales/ta/liveExams.json'
import currentAffairsTa from './locales/ta/currentAffairs.json'
import analyticsTa from './locales/ta/analytics.json'
import settingsTa from './locales/ta/settings.json'
import notificationsTa from './locales/ta/notifications.json'
import landingTa from './locales/ta/landing.json'
import paymentsTa from './locales/ta/payments.json'
import searchTa from './locales/ta/search.json'
import aiTutorTa from './locales/ta/aiTutor.json'
import questionPapersTa from './locales/ta/questionPapers.json'

/**
 * `LanguageProvider` (providers/language-provider.tsx) is the single
 * source of truth for the persisted `'en'|'ta'` preference — this module
 * only ever *reads* `localStorage['nalanda-language']`, at import time, to
 * pick i18next's initial language before any component (including
 * `LanguageProvider` itself) has mounted. Without this, the app would
 * flash English for one frame on every load before `LanguageProvider`'s
 * own effect had a chance to call `i18n.changeLanguage`. Never write to
 * this key from here.
 */
const STORAGE_KEY = 'nalanda-language'
const storedLanguage = localStorage.getItem(STORAGE_KEY)
const initialLanguage = storedLanguage === 'ta' ? 'ta' : 'en'

export const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    onboarding: onboardingEn,
    dashboard: dashboardEn,
    learn: learnEn,
    practice: practiceEn,
    liveExams: liveExamsEn,
    currentAffairs: currentAffairsEn,
    analytics: analyticsEn,
    settings: settingsEn,
    notifications: notificationsEn,
    landing: landingEn,
    payments: paymentsEn,
    search: searchEn,
    aiTutor: aiTutorEn,
    questionPapers: questionPapersEn,
  },
  ta: {
    common: commonTa,
    auth: authTa,
    onboarding: onboardingTa,
    dashboard: dashboardTa,
    learn: learnTa,
    practice: practiceTa,
    liveExams: liveExamsTa,
    currentAffairs: currentAffairsTa,
    analytics: analyticsTa,
    settings: settingsTa,
    notifications: notificationsTa,
    landing: landingTa,
    payments: paymentsTa,
    search: searchTa,
    aiTutor: aiTutorTa,
    questionPapers: questionPapersTa,
  },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: Object.keys(resources.en),
  interpolation: { escapeValue: false }, // React already escapes output
  returnNull: false,
})

export { i18n }
export default i18n
