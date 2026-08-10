import { Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SearchInput } from '@/components/inputs/search-input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/spinner'
import { Text } from '@/components/typography'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/utils/format-date'
import type { AiTutorConversationSummary } from '@/types/aiTutor'

type ConversationSidebarProps = {
  conversations: AiTutorConversationSummary[] | undefined
  isLoading: boolean
  activeConversationId: string | null
  search: string
  onSearchChange: (value: string) => void
  onSelect: (conversationId: string) => void
  onNewChat: () => void
  isCreating: boolean
  onDelete: (conversationId: string) => void
  onTogglePin: (conversationId: string, nextIsPinned: boolean) => void
}

/**
 * Sprint 4 Step 64 — "New Chat / Delete Chat / Pinned Chat / Search Chat /
 * Conversation History." One flat list, split into a Pinned section (only
 * rendered when non-empty) and a History section — same "pinned-first,
 * else newest" ordering the backend's own `findByUser` already returns, so
 * this component never re-sorts, just groups by `isPinned` for the two
 * headings.
 */
export function ConversationSidebar({
  conversations,
  isLoading,
  activeConversationId,
  search,
  onSearchChange,
  onSelect,
  onNewChat,
  isCreating,
  onDelete,
  onTogglePin,
}: ConversationSidebarProps) {
  const { t } = useTranslation('aiTutor')

  const pinned = conversations?.filter((c) => c.isPinned) ?? []
  const unpinned = conversations?.filter((c) => !c.isPinned) ?? []

  function renderItem(conversation: AiTutorConversationSummary) {
    const isActive = conversation.id === activeConversationId
    return (
      <li key={conversation.id}>
        <div
          className={cn(
            'group flex items-center gap-1 rounded-lg px-2 py-2',
            isActive ? 'bg-muted' : 'hover:bg-muted/60',
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(conversation.id)}
            className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
          >
            <Text
              variant="body-sm"
              className={cn(
                'w-full truncate',
                isActive ? 'text-foreground font-medium' : 'text-foreground',
              )}
            >
              {conversation.title}
            </Text>
            <Text variant="caption">
              {conversation.lastMessageAt
                ? formatRelativeTime(conversation.lastMessageAt, conversation.language)
                : formatRelativeTime(conversation.createdAt, conversation.language)}
            </Text>
          </button>
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={conversation.isPinned ? t('sidebar.unpin') : t('sidebar.pin')}
              onClick={() => onTogglePin(conversation.id, !conversation.isPinned)}
            >
              {conversation.isPinned ? (
                <PinOff aria-hidden="true" />
              ) : (
                <Pin aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('sidebar.delete')}
              onClick={() => onDelete(conversation.id)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <Button className="w-full gap-1.5" onClick={onNewChat} loading={isCreating}>
        <Plus aria-hidden="true" />
        {t('sidebar.newChat')}
      </Button>

      <SearchInput
        value={search}
        onChange={onSearchChange}
        onClear={() => onSearchChange('')}
        placeholder={t('sidebar.searchPlaceholder')}
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Spinner size="sm" />
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <Text variant="body-sm">
              {search
                ? t('sidebar.noSearchResults', { query: search })
                : t('sidebar.emptyTitle')}
            </Text>
            {!search && (
              <Text variant="caption" className="mt-1">
                {t('sidebar.emptyDescription')}
              </Text>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pinned.length > 0 && (
              <div className="flex flex-col gap-1">
                <Text variant="overline" className="px-2">
                  {t('sidebar.pinnedHeading')}
                </Text>
                <ul className="flex flex-col gap-0.5">{pinned.map(renderItem)}</ul>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {pinned.length > 0 && (
                <Text variant="overline" className="px-2">
                  {t('sidebar.historyHeading')}
                </Text>
              )}
              <ul className="flex flex-col gap-0.5">{unpinned.map(renderItem)}</ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
