import axiosInstance from "@/lib/axios";
import type {
  ChatMessage,
  ConversationItem,
  ConversationsResponse,
  CreateConversationPayload,
  MarkReadResponse,
  MessagesPageResponse,
  SendMessagePayload,
} from "@/types/chat.types";

export const chatServices = {
  createOrGetConversation: async (
    payload: CreateConversationPayload,
  ): Promise<ConversationItem> => {
    const { data } = await axiosInstance.post<ConversationItem>(
      "/conversations",
      payload,
    );
    return data;
  },

  listConversations: async (params?: {
    filter?: "all" | "unread";
    search?: string;
    scope?: "all" | "customer" | "provider";
  }): Promise<ConversationsResponse> => {
    const { data } = await axiosInstance.get<ConversationsResponse>(
      "/conversations",
      { params },
    );
    return data;
  },

  getMessages: async (
    conversationId: string,
    params?: { cursor?: string; limit?: number },
  ): Promise<MessagesPageResponse> => {
    const { data } = await axiosInstance.get<MessagesPageResponse>(
      `/conversations/${conversationId}/messages`,
      { params },
    );
    return data;
  },

  sendMessage: async (
    conversationId: string,
    payload: SendMessagePayload,
  ): Promise<ChatMessage> => {
    const { data } = await axiosInstance.post<ChatMessage>(
      `/conversations/${conversationId}/messages`,
      payload,
    );
    return data;
  },

  markAsRead: async (conversationId: string): Promise<MarkReadResponse> => {
    const { data } = await axiosInstance.patch<MarkReadResponse>(
      `/conversations/${conversationId}/read`,
    );
    return data;
  },

  uploadAttachment: async (
    conversationId: string,
    file: File,
  ): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await axiosInstance.post<ChatMessage>(
      `/conversations/${conversationId}/attachments`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
};
