import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { PremiumCard } from '@/components/premium-card'
import { Spinner } from '@/components/spinner'
import { Heading, Text } from '@/components/typography'
import { ROUTES } from '@/constants/routes'
import { ChatPanel } from '@/features/ai-tutor/components/chat-panel'
import { ConversationSidebar } from '@/features/ai-tutor/components/conversation-sidebar'
import { useLanguage } from '@/hooks/use-language'
import {
  createConversation,
  deleteConversation,
  getAiTutorErrorCode,
  getConversation,
  getUsage,
  listConversations,
  pinConversation,
  sendMessage as sendAiTutorMessage,
  unpinConversation,
} from '@/services/aiTutorService'
import { getMySubscription } from '@/services/paymentsService'
import type { AiTutorContextType } from '@/types/aiTutor'

/**
 * Sprint 4 Step 64 — Nalanda AI Tutor. Reuses the exact same
 * `PremiumCard`/chrome-free-header/design-token patterns already
 * established by `AiExplanationPanel`/`NotificationsPage` — no new visual
 * language introduced, per this step's "do not redesign UI" instruction.
 * `requireFeature('ai_tutor')` on the backend is the real Pro/Institutional
 * gate; `isPremiumEntitled` here only decides which UI renders.
 */
export function AiTutorPage() {
  const { t } = useTranslation('aiTutor')
  const { language } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['payments', 'subscription'],
    queryFn: getMySubscription,
  })
  const isPremiumEntitled = subscription?.entitlements.ai_tutor ?? false

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)

  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['aiTutor', 'conversations', search],
    queryFn: () => listConversations(search || undefined),
    enabled: isPremiumEntitled,
  })

  const { data: usage } = useQuery({
    queryKey: ['aiTutor', 'usage'],
    queryFn: getUsage,
    enabled: isPremiumEntitled,
  })

  const { data: conversationDetail, isLoading: isLoadingConversationDetail } = useQuery({
    queryKey: ['aiTutor', 'conversation', activeConversationId],
    queryFn: () => getConversation(activeConversationId as string),
    enabled: Boolean(activeConversationId),
  })

  const createMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (conversation) => {
      setActiveConversationId(conversation.id)
      void queryClient.invalidateQueries({ queryKey: ['aiTutor', 'conversations'] })
    },
    onError: (error) => {
      if (getAiTutorErrorCode(error) === 'AI_TUTOR_CONVERSATION_LIMIT_REACHED') {
        toast.info(t('sidebar.conversationLimitToast'))
      }
    },
  })

  // Practice's "Ask Follow-up" handoff (`ai-explanation-panel.tsx`) arrives
  // here with `?contextType=&contextRefId=` — auto-starts one grounded
  // conversation, once, then clears the params so navigating back never
  // re-triggers it.
  const handoffConsumedRef = useRef(false)
  useEffect(() => {
    if (handoffConsumedRef.current) return
    const contextType = searchParams.get('contextType') as AiTutorContextType | null
    const contextRefId = searchParams.get('contextRefId')
    if (!contextType || !contextRefId || !isPremiumEntitled) return
    handoffConsumedRef.current = true
    setSearchParams({}, { replace: true })
    createMutation.mutate({ language, contextType, contextRefId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremiumEntitled])

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_data, conversationId) => {
      void queryClient.invalidateQueries({ queryKey: ['aiTutor', 'conversations'] })
      if (activeConversationId === conversationId) setActiveConversationId(null)
    },
  })

  const pinMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      next ? pinConversation(id) : unpinConversation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['aiTutor', 'conversations'] })
    },
  })

  const sendMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      sendAiTutorMessage(conversationId, content),
    onMutate: (variables) => setPendingUserMessage(variables.content),
    onSettled: (_data, _error, variables) => {
      setPendingUserMessage(null)
      void queryClient.invalidateQueries({
        queryKey: ['aiTutor', 'conversation', variables.conversationId],
      })
      void queryClient.invalidateQueries({ queryKey: ['aiTutor', 'conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['aiTutor', 'usage'] })
    },
    onError: (error) => {
      const code = getAiTutorErrorCode(error)
      if (code === 'DAILY_AI_TUTOR_LIMIT_REACHED') toast.info(t('chat.dailyLimitToast'))
      else if (code === 'AI_SERVICE_UNAVAILABLE') toast.error(t('chat.unavailableToast'))
    },
  })

  const previewLayout = (
    <div className="flex h-[60vh]">
      <div className="hidden w-64 shrink-0 flex-col gap-2 border-r p-4 sm:flex">
        <div className="bg-primary/20 h-9 w-full rounded-lg" />
        <div className="bg-muted h-8 w-full rounded-lg" />
        <div className="bg-muted h-8 w-4/5 rounded-lg" />
        <div className="bg-muted h-8 w-3/4 rounded-lg" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
        <MessageCircle className="text-ai-teal size-8" aria-hidden="true" />
        <Text variant="body-md" className="text-foreground font-medium">
          {t('page.heading')}
        </Text>
        <Text variant="body-sm" className="max-w-sm text-center">
          {t('page.subtitle')}
        </Text>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to={ROUTES.dashboard}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('page.dashboard')}</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {isLoadingSubscription ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : !isPremiumEntitled ? (
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <PremiumCard
            unlockLabel={t('page.premiumUnlockLabel')}
            onUnlock={() => navigate(ROUTES.subscription)}
          >
            <Card className="p-0">
              <CardHeader>
                <Heading variant="heading-3">{t('page.heading')}</Heading>
              </CardHeader>
              <CardContent>{previewLayout}</CardContent>
            </Card>
          </PremiumCard>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden p-4 sm:p-6">
          <aside className="hidden w-64 shrink-0 overflow-hidden border-r pr-4 sm:flex">
            <ConversationSidebar
              conversations={conversations}
              isLoading={isLoadingConversations}
              activeConversationId={activeConversationId}
              search={search}
              onSearchChange={setSearch}
              onSelect={setActiveConversationId}
              onNewChat={() => createMutation.mutate({ language })}
              isCreating={createMutation.isPending}
              onDelete={(id) => deleteMutation.mutate(id)}
              onTogglePin={(id, next) => pinMutation.mutate({ id, next })}
            />
          </aside>

          <main className="min-w-0 flex-1">
            {activeConversationId ? (
              <ChatPanel
                conversation={conversationDetail}
                isLoadingConversation={isLoadingConversationDetail}
                pendingUserMessage={pendingUserMessage}
                isSending={sendMutation.isPending}
                usage={usage}
                onSendMessage={(content) =>
                  sendMutation.mutate({ conversationId: activeConversationId, content })
                }
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <MessageCircle className="text-ai-teal size-8" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <Heading variant="heading-3">{t('page.heading')}</Heading>
                  <Text variant="body-sm" className="max-w-sm">
                    {t('page.subtitle')}
                  </Text>
                </div>
                <Button onClick={() => createMutation.mutate({ language })}>
                  {t('sidebar.newChat')}
                </Button>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
