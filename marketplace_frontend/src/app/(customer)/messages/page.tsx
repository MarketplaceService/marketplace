import { ChatWorkspaceView } from "@/components/chat/chat-workspace-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hộp thư tin nhắn",
};

export default async function CustomerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const { conversationId } = await searchParams;
  return (
    <ChatWorkspaceView
      portal="customer"
      initialConversationId={conversationId}
    />
  );
}
