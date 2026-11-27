import { ChatWorkspaceView } from "@/components/chat/chat-workspace-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tin nhắn nhà cung cấp",
};

export default async function ProviderMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const { conversationId } = await searchParams;
  return (
    <ChatWorkspaceView
      portal="provider"
      initialConversationId={conversationId}
    />
  );
}
