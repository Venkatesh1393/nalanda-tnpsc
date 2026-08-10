import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'

type FaqItem = { question: string; answer: string }
type FaqGroup = { title: string; items: FaqItem[] }

/**
 * Every answer here reflects an actual documented product decision (cited
 * inline) rather than invented copy — the same discipline CLAUDE.md's
 * "never use dummy data" rule applies to real product content, extended to
 * marketing claims about how the product behaves. Built from `t` rather
 * than a module-scope constant — `t` isn't available at module scope.
 */
function buildFaqGroups(t: TFunction<'landing'>): FaqGroup[] {
  return [
    {
      title: t('faq.gettingStarted.title'),
      items: [
        { question: t('faq.gettingStarted.q1'), answer: t('faq.gettingStarted.a1') },
        { question: t('faq.gettingStarted.q2'), answer: t('faq.gettingStarted.a2') },
        { question: t('faq.gettingStarted.q3'), answer: t('faq.gettingStarted.a3') },
      ],
    },
    {
      title: t('faq.pricingPlans.title'),
      items: [
        { question: t('faq.pricingPlans.q1'), answer: t('faq.pricingPlans.a1') },
        { question: t('faq.pricingPlans.q2'), answer: t('faq.pricingPlans.a2') },
        { question: t('faq.pricingPlans.q3'), answer: t('faq.pricingPlans.a3') },
      ],
    },
    {
      title: t('faq.contentLanguage.title'),
      items: [
        { question: t('faq.contentLanguage.q1'), answer: t('faq.contentLanguage.a1') },
        { question: t('faq.contentLanguage.q2'), answer: t('faq.contentLanguage.a2') },
      ],
    },
    {
      title: t('faq.aiFeatures.title'),
      items: [
        { question: t('faq.aiFeatures.q1'), answer: t('faq.aiFeatures.a1') },
        { question: t('faq.aiFeatures.q2'), answer: t('faq.aiFeatures.a2') },
      ],
    },
    {
      title: t('faq.privacyData.title'),
      items: [
        { question: t('faq.privacyData.q1'), answer: t('faq.privacyData.a1') },
        { question: t('faq.privacyData.q2'), answer: t('faq.privacyData.a2') },
      ],
    },
  ]
}

/**
 * FAQ (docs/Landing_Page_Design.md §17) — single accordion, one item open at
 * a time, loosely grouped by theme via subtle dividers rather than hard tabs.
 */
export function FaqSection() {
  const { t } = useTranslation('landing')
  const faqGroups = buildFaqGroups(t)
  return (
    <section
      id="faq"
      className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24"
    >
      <div className="mb-10 text-center">
        <Heading as="h2" variant="heading-1">
          {t('faq.title')}
        </Heading>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {faqGroups.map((group) => (
          <div key={group.title} className="mb-2">
            <Text variant="overline" className="mt-6 mb-1 block first:mt-0">
              {group.title}
            </Text>
            {group.items.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger>
                  <span className="text-heading-4 font-semibold">{item.question}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <Text variant="body-md">{item.answer}</Text>
                </AccordionContent>
              </AccordionItem>
            ))}
          </div>
        ))}
      </Accordion>

      <div className="mt-8 text-center">
        <Text variant="body-sm" className="mb-2">
          {t('faq.stillHaveQuestions')}
        </Text>
        <Button variant="ghost" asChild>
          <Link to={ROUTES.contact}>{t('faq.contactSupport')}</Link>
        </Button>
      </div>
    </section>
  )
}
