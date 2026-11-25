"use client";

import { getApiErrorMessage } from "@/lib/api/api-error";
import { getChatSocket } from "@/lib/chat/chat-socket";
import { chatServices } from "@/services/chat.services";
import type {
  ChatMessage,
  ConversationItem,
  ConversationsResponse,
  CreateConversationPayload,
  MessagesPageResponse,
} from "@/types/chat.types";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const chatQueryKeys = {
  all: ["chat"] as const,
  conversations: (params?: {
    filter?: "all" | "unread";
    search?: string;
    scope?: "all" | "customer" | "provider";
  }) => [...chatQueryKeys.all, "conversations", params ?? {}] as const,
  messages: (conversationId: string) =>
    [...chatQueryKeys.all, "messages", conversationId] as const,
};

export function useConversations(
  params?: {
    filter?: "all" | "unread";
    search?: string;
    scope?: "all" | "customer" | "provider";
  },
  enabled = true,
) {
  return useQuery({
    queryKey: chatQueryKeys.conversations(params),
    queryFn: () => chatServices.listConversations(params),
    enabled,
    staleTime: 10 * 1000,
  });
}

export function useConversationMessages(
  conversationId: string | null,
  limit = 30,
) {
  return useInfiniteQuery({
    queryKey: conversationId
      ? chatQueryKeys.messages(conversationId)
      : [...chatQueryKeys.all, "messages", "none"],
    queryFn: ({ pageParam }) =>
      chatServices.getMessages(conversationId!, {
        cursor: pageParam,
        limit,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled: Boolean(conversationId),
    staleTime: 10 * 1000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConversationPayload) =>
      chatServices.createOrGetConversation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...chatQueryKeys.all, "conversations"],
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Không thể mở cuộc trò chuyện"));
    },
  });
}

function appendMessageToCache(
  prev: InfiniteData<MessagesPageResponse> | undefined,
  incoming: ChatMessage,
): InfiniteData<MessagesPageResponse> | undefined {
  if (!prev || prev.pages.length === 0) return prev;

  const alreadyExists = prev.pages.some((page) =>
    page.items.some((item) => item.id === incoming.id),
  );
  if (alreadyExists) return prev;

  const pages = prev.pages.slice();
  // Trang đầu tiên (index 0) luôn chứa các tin nhắn mới nhất
  pages[0] = {
    ...pages[0],
    items: [...pages[0].items, incoming],
  };

  return {
    ...prev,
    pages,
  };
}

export function useSendMessage(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) {
        throw new Error("Chưa chọn cuộc trò chuyện");
      }

      const socket = getChatSocket();
      if (socket.connected) {
        const ack = await new Promise<{
          ok: boolean;
          data?: ChatMessage;
          message?: string;
        }>((resolve) => {
          socket.timeout(5000).emit(
            "chat:send_message",
            { conversationId, content },
            (
              err: Error | null,
              res?: { ok: boolean; data?: ChatMessage; message?: string },
            ) => {
              if (err || !res) {
                resolve({ ok: false });
                return;
              }
              resolve(res);
            },
          );
        });

        if (ack.ok && ack.data) {
          return ack.data;
        }
        if (ack.message) {
          throw new Error(ack.message);
        }
      }

      return chatServices.sendMessage(conversationId, { content });
    },
    onSuccess: (saved) => {
      if (!conversationId) return;
      queryClient.setQueryData<InfiniteData<MessagesPageResponse>>(
        chatQueryKeys.messages(conversationId),
        (prev) => appendMessageToCache(prev, saved),
      );
      queryClient.invalidateQueries({
        queryKey: [...chatQueryKeys.all, "conversations"],
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Không thể gửi tin nhắn"));
    },
  });
}

export function useUploadChatAttachment(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      if (!conversationId) {
        throw new Error("Chưa chọn cuộc trò chuyện");
      }
      return chatServices.uploadAttachment(conversationId, file);
    },
    onSuccess: (saved) => {
      if (!conversationId) return;
      queryClient.setQueryData<InfiniteData<MessagesPageResponse>>(
        chatQueryKeys.messages(conversationId),
        (prev) => appendMessageToCache(prev, saved),
      );
      queryClient.invalidateQueries({
        queryKey: [...chatQueryKeys.all, "conversations"],
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Không thể tải ảnh lên"));
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      chatServices.markAsRead(conversationId),
    onSuccess: (res) => {
      queryClient.setQueriesData<ConversationsResponse>(
        { queryKey: [...chatQueryKeys.all, "conversations"] },
        (prev) => {
          if (!prev) return prev;
          let removedUnread = 0;
          let wasUnread = false;

          const items: ConversationItem[] = prev.items.map((item) => {
            if (item.id !== res.conversationId) return item;
            if (item.unreadCount > 0) {
              wasUnread = true;
              removedUnread = item.unreadCount;
            }
            return {
              ...item,
              unreadCount: 0,
              myLastReadAt: res.lastReadAt,
            };
          });

          if (!wasUnread) return { ...prev, items };

          return {
            counts: {
              all: prev.counts.all,
              unread: Math.max(0, prev.counts.unread - 1),
              totalUnreadMessages: Math.max(
                0,
                prev.counts.totalUnreadMessages - removedUnread,
              ),
            },
            items,
          };
        },
      );
    },
  });
}

/**
 * Kết nối Socket.IO `/chat`, tham gia room `conversation_<id>` đang mở
 * và đồng bộ tin nhắn mới, danh sách hội thoại, trạng thái đã xem theo thời gian thực.
 */
export function useChatRealtime({
  enabled,
  currentUserId,
  activeConversationId,
  onIncomingActiveMessage,
}: {
  enabled: boolean;
  currentUserId?: string;
  activeConversationId: string | null;
  onIncomingActiveMessage?: (message: ChatMessage) => void;
}) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !currentUserId) return;

    const socket = getChatSocket(currentUserId);

    const handleConnect = () => {
      setIsConnected(true);
      if (activeConversationId) {
        socket.emit("chat:join", { conversationId: activeConversationId });
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleNewMessage = (payload: {
      conversationId: string;
      message: ChatMessage;
    }) => {
      queryClient.setQueryData<InfiniteData<MessagesPageResponse>>(
        chatQueryKeys.messages(payload.conversationId),
        (prev) => appendMessageToCache(prev, payload.message),
      );

      if (
        payload.conversationId === activeConversationId &&
        payload.message.senderId !== currentUserId
      ) {
        onIncomingActiveMessage?.(payload.message);
      }
    };

    const handleConversationUpdated = () => {
      queryClient.invalidateQueries({
        queryKey: [...chatQueryKeys.all, "conversations"],
      });
    };

    const handleReadReceipt = (payload: {
      conversationId: string;
      userId: string;
      lastReadAt: string;
    }) => {
      if (payload.userId !== currentUserId) {
        queryClient.setQueryData<InfiniteData<MessagesPageResponse>>(
          chatQueryKeys.messages(payload.conversationId),
          (prev) => {
            if (!prev || prev.pages.length === 0) return prev;
            const pages = prev.pages.map((page, idx) =>
              idx === 0
                ? { ...page, partnerLastReadAt: payload.lastReadAt }
                : page,
            );
            return { ...prev, pages };
          },
        );
      }

      queryClient.invalidateQueries({
        queryKey: [...chatQueryKeys.all, "conversations"],
      });
    };

    const handlePresence = (payload: { userId: string; isOnline: boolean }) => {
      queryClient.setQueriesData<ConversationsResponse>(
        { queryKey: [...chatQueryKeys.all, "conversations"] },
        (prev) => {
          if (!prev) return prev;
          let changed = false;
          const items = prev.items.map((item) => {
            if (item.partner.userId !== payload.userId) return item;
            if (item.partner.isOnline === payload.isOnline) return item;
            changed = true;
            return {
              ...item,
              partner: {
                ...item.partner,
                isOnline: payload.isOnline,
              },
            };
          });
          return changed ? { ...prev, items } : prev;
        },
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("chat:new_message", handleNewMessage);
    socket.on("chat:conversation_updated", handleConversationUpdated);
    socket.on("chat:read_receipt", handleReadReceipt);
    socket.on("chat:presence", handlePresence);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("chat:new_message", handleNewMessage);
      socket.off("chat:conversation_updated", handleConversationUpdated);
      socket.off("chat:read_receipt", handleReadReceipt);
      socket.off("chat:presence", handlePresence);
    };
  }, [
    enabled,
    currentUserId,
    activeConversationId,
    onIncomingActiveMessage,
    queryClient,
  ]);

  useEffect(() => {
    if (!enabled || !currentUserId || !activeConversationId) return;
    const socket = getChatSocket(currentUserId);
    if (socket.connected) {
      socket.emit("chat:join", { conversationId: activeConversationId });
    }
    return () => {
      if (socket.connected) {
        socket.emit("chat:leave", { conversationId: activeConversationId });
      }
    };
  }, [enabled, currentUserId, activeConversationId]);

  return { isConnected };
}

/**
 * Kết nối nhẹ Socket.IO `/chat` ở tầng layout/header để badge số tin chưa đọc
 * cập nhật tức thì ngay cả khi người dùng đang đứng ở trang khác.
 */
export function useChatInboxRealtime(enabled: boolean, currentUserId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !currentUserId) return;

    const socket = getChatSocket(currentUserId);
    const handleInboxChange = () => {
      queryClient.invalidateQueries({
        queryKey: [...chatQueryKeys.all, "conversations"],
      });
    };

    socket.on("chat:conversation_updated", handleInboxChange);
    socket.on("chat:read_receipt", handleInboxChange);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("chat:conversation_updated", handleInboxChange);
      socket.off("chat:read_receipt", handleInboxChange);
    };
  }, [enabled, currentUserId, queryClient]);
}
