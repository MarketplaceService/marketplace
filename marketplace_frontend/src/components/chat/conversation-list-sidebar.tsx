"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatVnd } from "@/lib/travel-fee";
import { cn } from "@/lib/utils";
import { todayInVietnam } from "@/lib/vn-time";
import type { ConversationItem } from "@/types/chat.types";
import { BadgeCheck, MessageSquare, Search, ShieldCheck } from "lucide-react";

function formatShortConversationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const vnDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const today = todayInVietnam();
  if (vnDateStr === today) {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  const yesterdayDate = new Date(`${today}T00:00:00+07:00`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(yesterdayDate);

  if (vnDateStr === yesterday) {
    return "Hôm qua";
  }

  const [, month, day] = vnDateStr.split("-");
  return `${day}/${month}`;
}

export function ConversationListSidebar({
  conversations,
  counts,
  activeConversationId,
  filter,
  search,
  isLoading,
  onFilterChange,
  onSearchChange,
  onSelectConversation,
  className,
}: {
  conversations: ConversationItem[];
  counts: { all: number; unread: number; totalUnreadMessages: number };
  activeConversationId: string | null;
  filter: "all" | "unread";
  search: string;
  isLoading: boolean;
  onFilterChange: (next: "all" | "unread") => void;
  onSearchChange: (next: string) => void;
  onSelectConversation: (conversationId: string) => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex h-full w-full shrink-0 flex-col border-r border-border bg-card shadow-xs md:w-80 lg:w-96",
        className,
      )}
    >
      {/* Header cột trái */}
      <div className="space-y-3 border-b border-border/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl truncate">
              Hộp thư tin nhắn
            </h1>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {counts.totalUnreadMessages > 0
                ? `${counts.totalUnreadMessages} tin mới`
                : "Đã đọc hết"}
            </span>
          </div>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên đối tác, mã đơn #SV-..."
            className="w-full rounded-xl border border-border bg-muted/60 py-2 pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:bg-card focus:outline-none"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={cn(
              "cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Tất cả ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("unread")}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === "unread"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                filter === "unread" ? "bg-primary-foreground" : "bg-primary",
              )}
            />
            <span>Chưa đọc ({counts.unread})</span>
          </button>
        </div>
      </div>

      {/* Danh sách hội thoại */}
      <div className="flex-1 divide-y divide-border/60 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="flex gap-3 p-2">
                <div className="size-11 shrink-0 animate-pulse rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 p-8 text-center text-muted-foreground">
            <MessageSquare className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              {filter === "unread"
                ? "Không có tin nhắn chưa đọc"
                : search.trim()
                  ? "Không tìm thấy cuộc trò chuyện phù hợp"
                  : "Chưa có cuộc trò chuyện nào"}
            </p>
            <p className="max-w-xs text-xs leading-relaxed">
              {search.trim()
                ? "Thử tìm với tên đối tác, mã đơn hàng hoặc tên dịch vụ khác."
                : "Bạn có thể bắt đầu nhắn tin từ trang chi tiết đơn đặt lịch hoặc hồ sơ nhà cung cấp."}
            </p>
          </div>
        ) : (
          conversations.map((item) => {
            const isActive = item.id === activeConversationId;
            const hasUnread = item.unreadCount > 0;
            const previewText = item.lastMessage
              ? item.lastMessage.messageType === "IMAGE"
                ? "[Hình ảnh hiện trường]"
                : item.lastMessage.content
              : "Chưa có tin nhắn. Hãy gửi lời chào để bắt đầu trao đổi.";

            const timestampIso =
              item.lastMessage?.createdAt ?? item.updatedAt;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectConversation(item.id)}
                className={cn(
                  "relative flex w-full cursor-pointer gap-3 border-l-4 p-4 text-left transition",
                  isActive
                    ? "border-primary bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-transparent hover:bg-muted/60",
                )}
              >
                <div className="relative size-11 shrink-0 self-start">
                  <Avatar className="size-11 rounded-xl border border-border shadow-2xs">
                    {item.partner.avatarUrl && (
                      <AvatarImage
                        src={item.partner.avatarUrl}
                        alt={item.partner.displayName}
                        className="rounded-xl object-cover"
                      />
                    )}
                    <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-bold text-primary">
                      {item.partner.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    title={item.partner.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                    className={cn(
                      "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card",
                      item.partner.isOnline
                        ? "bg-emerald-500"
                        : "bg-slate-300 dark:bg-slate-600",
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-serif text-[15px] font-bold text-foreground">
                      {item.partner.displayName}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[11px]",
                        hasUnread
                          ? "font-semibold text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatShortConversationTime(timestampIso)}
                    </span>
                  </div>

                  <p className="mb-1 truncate text-[11px] text-muted-foreground">
                    {item.booking ? (
                      <>
                        <span className="font-mono font-medium text-foreground">
                          #{item.booking.bookingCode}
                        </span>{" "}
                        • {item.booking.serviceTitle} (
                        {formatVnd(item.booking.totalPrice)})
                      </>
                    ) : (
                      <span className="font-medium text-primary">
                        Tư vấn trực tiếp trước khi đặt lịch
                      </span>
                    )}
                  </p>

                  <p
                    className={cn(
                      "mb-1.5 line-clamp-1 text-[13px]",
                      hasUnread
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {previewText}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex max-w-[205px] items-center gap-1 truncate rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <BadgeCheck className="size-3 shrink-0 text-primary" />
                      <span className="truncate">{item.partner.subtitle}</span>
                    </span>

                    {hasUnread && (
                      <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Chân danh sách */}
      <div className="border-t border-border/80 bg-card p-3 text-center">
        <span className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>Hệ thống nhắn tin bảo mật thời gian thực Servigo</span>
        </span>
      </div>
    </aside>
  );
}
