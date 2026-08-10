import { AlertTriangle, Languages, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/spinner'
import { Text } from '@/components/typography'
import { cn } from '@/lib/utils'
import type {
  AiTutorConversationDetail,
  AiTutorContextType,
  AiTutorUsage,
} from '@/types/aiTutor'

type ChatPanelProps = {
  conversation: AiTutorConversationDetail | undefined
  isLoadingConversation: boolean
  pendingUserMessage: string | null
  onSendMessage: (content: string) => void
  isSending: boolean
  usage: AiTutorUsage | undefined
}

const STARTER_KEYS = [
  'explainLesson',
  'explainTopic',
  'explainQuestion',
  'revisionTips',
  'memoryTricks',
] as const

const CONTEXT_BADGE_KEY: Record<AiTutorContextType, 'chat.contextBadgeLesson' | 'chat.contextBadgeTopic' | 'chat.contextBadgeQuestion'> = {
  lesson: 'chat.contextBadgeLesson',
  topic: 'chat.contextBadgeTopic',
  question: 'chat.contextBadgeQuestion',
}

/**
 * Sprint 4 Step 64 — the message thread + composer. Quick-start chips
 * (shown only on an empty conversation) cover "Explain a lesson/topic/
 * question," "Revision tips," and "Memory tricks" as prefilled sentence
 * starters — the AI Tutor answers these as ordinary in-scope study
 * questions (`prompts/aiTutor.v2.ts` rule 1), no special backend mode
 * needed. "Ask in Tamil"/"Ask in English" append an explicit one-off
 * language request the v2 prompt's rule 7 honors for that reply only.
 */
export function ChatPanel({
  conversation,
  isLoadingConversation,
  pendingUserMessage,
  onSendMessage,
  isSending,
  usage,
}: ChatPanelProps) {
  const { t } = useTranslation('aiTutor')
  const [draft, setDraft] = useState('')

  function appendLanguageRequest(phrase: string) {
    setDraft((current) => (current.trim().length > 0 ? `${current} — ${phrase}` : phrase))
  }

  function handleSend() {
    const content = draft.trim()
    if (content.length === 0 || isSending) return
    onSendMessage(content)
    setDraft('')
  }

  if (isLoadingConversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!conversation) {
    return null
  }

  const messages = conversation.messages
  const showStarters = messages.length === 0

  return (
    <div className="flex h-full flex-col gap-4">
      {conversation.contextType && (
        <div className="flex items-center gap-1.5">
          <Sparkles className="text-ai-teal size-3.5" aria-hidden="true" />
          <Text variant="caption">{t(CONTEXT_BADGE_KEY[conversation.contextType])}</Text>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {showStarters ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex flex-col gap-1">
              <Text variant="body-md" className="text-foreground font-medium">
                {t('chat.emptyTitle')}
              </Text>
              <Text variant="body-sm">{t('chat.emptyDescription')}</Text>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_KEYS.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft(t(`chat.starters.${key}`))}
                >
                  {t(`chat.starters.${key}`)}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  'flex flex-col gap-1',
                  message.role === 'user' ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 sm:max-w-[70%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  <Text
                    variant="body-sm"
                    as="span"
                    className={cn(
                      'whitespace-pre-wrap',
                      message.role === 'user' && 'text-primary-foreground',
                    )}
                  >
                    {message.content}
                  </Text>
                </div>
                {message.role === 'assistant' && message.confidenceFlag === 'low' && (
                  <Text variant="caption" className="flex items-center gap-1">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    {t('chat.confidenceLow')}
                  </Text>
                )}
                {message.role === 'assistant' && message.confidenceFlag === 'escalated' && (
                  <Text variant="caption" className="flex items-center gap-1">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    {t('chat.confidenceEscalated')}
                  </Text>
                )}
              </li>
            ))}
            {pendingUserMessage && (
              <li className="flex flex-col items-end gap-1">
                <div className="bg-primary/60 text-primary-foreground max-w-[85%] rounded-lg px-3 py-2 sm:max-w-[70%]">
                  <Text variant="body-sm" as="span" className="text-primary-foreground whitespace-pre-wrap">
                    {pendingUserMessage}
                  </Text>
                </div>
              </li>
            )}
            {isSending && (
              <li className="flex items-start">
                <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2">
                  <Spinner size="sm" />
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => appendLanguageRequest('explain in Tamil')}
          >
            <Languages className="size-3.5" aria-hidden="true" />
            {t('chat.askInTamil')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => appendLanguageRequest('explain in English')}
          >
            <Languages className="size-3.5" aria-hidden="true" />
            {t('chat.askInEnglish')}
          </Button>
          {usage && (
            <Text variant="caption" className="ml-auto">
              {t('page.usageLabel', {
                used: usage.messagesToday,
                limit: usage.dailyMessageLimit,
              })}
            </Text>
          )}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            placeholder={t('chat.inputPlaceholder')}
            className="max-h-40"
          />
          <Button
            size="icon"
            aria-label={t('chat.send')}
            disabled={draft.trim().length === 0}
            loading={isSending}
            onClick={handleSend}
          >
            <Send aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

