"use client";

import { useCurrentUser } from "@/hooks/use-auth";
import {
  useChatRealtime,
  useConversationMessages,
  useConversations,
  useMarkConversationRead,
  useSendMessage,
  useUploadChatAttachment,
} from "@/hooks/use-chat";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useVoiceCall } from "@/hooks/use-voice-call";
import type { ChatMessage } from "@/types/chat.types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatImageLightbox } from "./chat-image-lightbox";
import { ChatThreadPanel } from "./chat-thread-panel";
import { ConversationListSidebar } from "./conversation-list-sidebar";
import { VoiceCallDialog } from "./voice-call-dialog";

export function ChatWorkspaceView({
  portal,
  initialConversationId,
}: {
  portal: "customer" | "provider";
  initialConversationId?: string;
}) {
  const { data: currentUser } = useCurrentUser();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [mobileShowThread, setMobileShowThread] = useState<boolean>(
    Boolean(initialConversationId),
  );
  const [lightbox, setLightbox] = useState<{
    url: string;
    caption?: string;
  } | null>(null);

  const isAuthed = Boolean(currentUser && !currentUser.isAnonymous);

  const { data: convData, isLoading: convLoading } = useConversations(
    {
      scope: portal,
      filter,
      search: debouncedSearch.trim() || undefined,
    },
    isAuthed,
  );

  const conversations = useMemo(() => convData?.items ?? [], [convData]);
  const counts = convData?.counts ?? {
    all: 0,
    unread: 0,
    totalUnreadMessages: 0,
  };

  // Nếu initialConversationId có trong URL hoặc chưa chọn hội thoại nào -> chọn hội thoại đầu tiên trên desktop
  const activeConversationId = useMemo(() => {
    if (selectedId && conversations.some((c) => c.id === selectedId)) {
      return selectedId;
    }
    if (initialConversationId && conversations.some((c) => c.id === initialConversationId)) {
      return initialConversationId;
    }
    return conversations[0]?.id ?? null;
  }, [selectedId, initialConversationId, conversations]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const {
    data: messagesData,
    isLoading: messagesLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useConversationMessages(activeConversationId);

  const messages = useMemo<ChatMessage[]>(() => {
    if (!messagesData?.pages?.length) return [];
    // pages[0] là mới nhất, pages[1] cũ hơn -> đảo thứ tự các trang để hiển thị cũ -> mới
    return messagesData.pages
      .slice()
      .reverse()
      .flatMap((page) => page.items);
  }, [messagesData]);

  const partnerLastReadAt =
    messagesData?.pages?.[0]?.partnerLastReadAt ??
    activeConversation?.partnerLastReadAt ??
    null;

  const { mutate: markRead } = useMarkConversationRead();
  const lastMarkedRef = useRef<string | null>(null);

  const triggerMarkRead = useCallback(
    (conversationId: string) => {
      markRead(conversationId);
    },
    [markRead],
  );

  // Đánh dấu đã xem khi mở một hội thoại có tin chưa đọc
  useEffect(() => {
    if (!activeConversation) return;
    if (
      activeConversation.unreadCount > 0 &&
      lastMarkedRef.current !==
        `${activeConversation.id}:${activeConversation.lastMessage?.id ?? ""}`
    ) {
      lastMarkedRef.current = `${activeConversation.id}:${activeConversation.lastMessage?.id ?? ""}`;
      triggerMarkRead(activeConversation.id);
    }
  }, [activeConversation, triggerMarkRead]);

  const handleIncomingActiveMessage = useCallback(
    (msg: ChatMessage) => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        triggerMarkRead(msg.conversationId);
      }
    },
    [triggerMarkRead],
  );

  useChatRealtime({
    enabled: isAuthed,
    currentUserId: currentUser?.id,
    activeConversationId,
    onIncomingActiveMessage: handleIncomingActiveMessage,
  });

  const { mutate: sendMessage, isPending: isSending } =
    useSendMessage(activeConversationId);
  const { mutate: uploadAttachment, isPending: isUploadingImage } =
    useUploadChatAttachment(activeConversationId);

  const voiceCall = useVoiceCall({
    enabled: isAuthed,
    currentUserId: currentUser?.id,
  });

  const handleSelectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setMobileShowThread(true);
    const target = conversations.find((c) => c.id === conversationId);
    if (target && target.unreadCount > 0) {
      lastMarkedRef.current = `${target.id}:${target.lastMessage?.id ?? ""}`;
      triggerMarkRead(conversationId);
    }
  };

  const handleStartCall = () => {
    if (!activeConversation) return;
    void voiceCall.startCall({
      conversationId: activeConversation.id,
      name: activeConversation.partner.displayName,
      avatarUrl: activeConversation.partner.avatarUrl,
      subtitle: activeConversation.booking
        ? `#${activeConversation.booking.bookingCode} • ${activeConversation.booking.serviceTitle}`
        : activeConversation.partner.subtitle,
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      <ConversationListSidebar
        conversations={conversations}
        counts={counts}
        activeConversationId={activeConversationId}
        filter={filter}
        search={search}
        isLoading={convLoading}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onSelectConversation={handleSelectConversation}
        className={mobileShowThread ? "hidden md:flex" : "flex"}
      />

      <ChatThreadPanel
        portal={portal}
        currentUserId={currentUser?.id}
        conversation={activeConversation}
        messages={messages}
        partnerLastReadAt={partnerLastReadAt}
        isLoadingMessages={messagesLoading}
        hasMore={Boolean(hasNextPage)}
        isFetchingMore={isFetchingNextPage}
        isSending={isSending}
        isUploadingImage={isUploadingImage}
        callDisabled={voiceCall.status !== "idle"}
        onBackMobile={() => setMobileShowThread(false)}
        onLoadMore={() => fetchNextPage()}
        onSendMessage={(content) => sendMessage(content)}
        onUploadImage={(file) => uploadAttachment(file)}
        onStartCall={handleStartCall}
        onOpenLightbox={(url, caption) => setLightbox({ url, caption })}
        className={mobileShowThread ? "flex" : "hidden md:flex"}
      />

      <ChatImageLightbox
        imageUrl={lightbox?.url ?? null}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
      />

      <VoiceCallDialog
        status={voiceCall.status}
        peer={voiceCall.peer}
        isMuted={voiceCall.isMuted}
        durationSeconds={voiceCall.durationSeconds}
        remoteAudioRef={voiceCall.remoteAudioRef}
        onAccept={() => void voiceCall.acceptCall()}
        onReject={voiceCall.rejectCall}
        onEnd={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
      />
    </div>
  );
}
