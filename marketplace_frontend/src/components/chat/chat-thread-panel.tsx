"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatVnd } from "@/lib/travel-fee";
import { cn } from "@/lib/utils";
import { todayInVietnam } from "@/lib/vn-time";
import type { ChatMessage, ConversationItem } from "@/types/chat.types";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Check,
  CheckCheck,
  FileText,
  Info,
  Loader2,
  Lock,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const QUICK_REPLIES_BY_PORTAL: Record<"customer" | "provider", string[]> = {
  customer: [
    "Tôi đang ở nhà, anh ghé bấm chuông nhé",
    "Nhờ anh mang theo dụng cụ kiểm tra giúp mình",
    "Cảm ơn anh, hẹn gặp đúng giờ nhé",
  ],
  provider: [
    "Tôi đang trên đường di chuyển đến vị trí của bạn",
    "Vui lòng gửi thêm ảnh vị trí thiết bị gặp sự cố",
    "Tôi đã chuẩn bị đủ dụng cụ, hẹn gặp đúng giờ nhé",
  ],
};

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getVnDateKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateSeparatorLabel(vnDateKey: string): string {
  const today = todayInVietnam();
  if (vnDateKey === today) {
    const [, m, d] = vnDateKey.split("-");
    return `Hôm nay, ${Number(d)} Tháng ${Number(m)}`;
  }

  const yesterdayDate = new Date(`${today}T00:00:00+07:00`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(yesterdayDate);

  if (vnDateKey === yesterday) return "Hôm qua";

  const [y, m, d] = vnDateKey.split("-");
  return `${d}/${m}/${y}`;
}

export function ChatThreadPanel({
  portal,
  currentUserId,
  conversation,
  messages,
  partnerLastReadAt,
  isLoadingMessages,
  hasMore,
  isFetchingMore,
  isSending,
  isUploadingImage,
  callDisabled,
  onBackMobile,
  onLoadMore,
  onSendMessage,
  onUploadImage,
  onStartCall,
  onOpenLightbox,
  className,
}: {
  portal: "customer" | "provider";
  currentUserId?: string;
  conversation: ConversationItem | null;
  messages: ChatMessage[];
  partnerLastReadAt: string | null;
  isLoadingMessages: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  isSending: boolean;
  isUploadingImage: boolean;
  callDisabled: boolean;
  onBackMobile: () => void;
  onLoadMore: () => Promise<unknown>;
  onSendMessage: (content: string) => void;
  onUploadImage: (file: File) => void;
  onStartCall: () => void;
  onOpenLightbox: (url: string, caption?: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const prevConvIdRef = useRef<string | null>(null);
  const loadingOlderRef = useRef(false);

  const partnerReadTimestamp = useMemo(() => {
    if (!partnerLastReadAt) return null;
    const ms = new Date(partnerLastReadAt).getTime();
    return Number.isNaN(ms) ? null : ms;
  }, [partnerLastReadAt]);

  // Cuộn xuống cuối khi đổi hội thoại hoặc có tin nhắn mới nhất ở đáy
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !conversation) return;

    const newestId = messages[messages.length - 1]?.id ?? null;
    const switchedConversation = prevConvIdRef.current !== conversation.id;
    const gotNewTailMessage =
      newestId !== null && newestId !== lastMessageIdRef.current;

    if (switchedConversation) {
      prevConvIdRef.current = conversation.id;
      lastMessageIdRef.current = newestId;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
      return;
    }

    if (gotNewTailMessage && !loadingOlderRef.current) {
      lastMessageIdRef.current = newestId;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [conversation, messages]);

  const handleLoadOlder = async () => {
    const container = scrollRef.current;
    if (!container || !hasMore || isFetchingMore) return;

    loadingOlderRef.current = true;
    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    try {
      await onLoadMore();
      requestAnimationFrame(() => {
        const nextScrollHeight = container.scrollHeight;
        container.scrollTop =
          nextScrollHeight - prevScrollHeight + prevScrollTop;
        loadingOlderRef.current = false;
      });
    } catch {
      loadingOlderRef.current = false;
    }
  };

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.`);
      return;
    }
    onSendMessage(trimmed);
    setDraft("");
    inputRef.current?.focus();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME.has(file.type)) {
      toast.error("Chỉ hỗ trợ ảnh định dạng JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Kích thước ảnh không được vượt quá 5MB.");
      return;
    }
    onUploadImage(file);
  };

  const insertQuickReply = (text: string) => {
    setDraft(text);
    inputRef.current?.focus();
  };

  if (!conversation) {
    return (
      <section
        className={cn(
          "relative flex h-full min-w-0 flex-1 flex-col items-center justify-center bg-background p-8 text-center",
          className,
        )}
      >
        <div className="max-w-sm space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquare className="size-7" />
          </div>
          <h2 className="font-serif text-xl font-bold text-foreground">
            Trung tâm trao đổi Servigo
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Chọn một cuộc trò chuyện ở danh sách bên trái để xem lịch sử tin
            nhắn, gửi ảnh hiện trường sự cố hoặc gọi thoại trực tiếp.
          </p>
        </div>
      </section>
    );
  }

  const orderDetailHref = conversation.booking
    ? portal === "provider"
      ? `/provider/bookings/${conversation.booking.id}`
      : `/bookings/${conversation.booking.id}`
    : null;

  const quickReplies = QUICK_REPLIES_BY_PORTAL[portal];

  return (
    <section
      className={cn(
        "relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      {/* Header cuộc trò chuyện */}
      <div className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-xs sm:h-20 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBackMobile}
            aria-label="Quay lại danh sách hội thoại"
            className="-ml-1 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="relative size-10 shrink-0 sm:size-12">
            <Avatar className="size-10 rounded-xl ring-2 ring-primary/20 shadow-xs sm:size-12">
              {conversation.partner.avatarUrl && (
                <AvatarImage
                  src={conversation.partner.avatarUrl}
                  alt={conversation.partner.displayName}
                  className="rounded-xl object-cover"
                />
              )}
              <AvatarFallback className="rounded-xl bg-primary/10 text-base font-bold text-primary">
                {conversation.partner.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              title={
                conversation.partner.isOnline ? "Đang hoạt động" : "Ngoại tuyến"
              }
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card",
                conversation.partner.isOnline
                  ? "bg-emerald-500"
                  : "bg-slate-300 dark:bg-slate-600",
              )}
            />
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-serif text-base font-bold text-foreground sm:text-lg">
                {conversation.partner.displayName}
              </h2>
              {conversation.partner.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <BadgeCheck className="size-3.5" />
                  <span>Đã xác minh</span>
                </span>
              )}
            </div>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              {conversation.booking ? (
                <>
                  <span className="font-mono font-medium text-foreground">
                    #{conversation.booking.bookingCode}
                  </span>
                  <span>•</span>
                  <span className="truncate">
                    {conversation.booking.serviceTitle} (
                    {formatVnd(conversation.booking.totalPrice)})
                  </span>
                </>
              ) : (
                <span className="truncate">
                  Trao đổi trực tiếp • {conversation.partner.subtitle}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Cụm nút tác vụ đầu header */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={callDisabled}
            onClick={onStartCall}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition",
              callDisabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:border-primary hover:text-primary",
            )}
            title="Gọi thoại trực tuyến miễn phí qua trình duyệt"
          >
            <Phone className="size-4 text-primary" />
            <span className="hidden sm:inline">Gọi thoại (Miễn phí)</span>
          </button>

          {orderDetailHref && (
            <Link
              href={orderDetailHref}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition hover:border-primary/40 hover:bg-muted"
            >
              <FileText className="size-4 text-muted-foreground" />
              <span className="hidden sm:inline">Chi tiết đơn</span>
            </Link>
          )}
        </div>
      </div>

      {/* Banner Bảo vệ giao dịch Servigo */}
      <div className="flex shrink-0 items-center justify-between border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary sm:px-6">
        <div className="flex items-center gap-2 truncate">
          <ShieldCheck className="size-4 shrink-0 text-primary" />
          <span className="truncate">
            <strong className="font-semibold">Bảo vệ giao dịch Servigo:</strong>{" "}
            Đơn hàng thanh toán đảm bảo và lưu trữ tiến trình nghiệm thu tự động.
          </span>
        </div>
        <div className="hidden shrink-0 items-center gap-2 text-[11px] text-muted-foreground sm:flex">
          <span>Mã bảo mật:</span>
          <span className="rounded border border-border bg-card px-2 py-0.5 font-mono font-semibold text-foreground">
            #SV-SECURE
          </span>
        </div>
      </div>

      {/* Luồng tin nhắn */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          if (e.currentTarget.scrollTop < 48 && hasMore && !isFetchingMore) {
            void handleLoadOlder();
          }
        }}
        className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
      >
        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              disabled={isFetchingMore}
              onClick={() => void handleLoadOlder()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs transition hover:border-primary/40 hover:text-primary disabled:opacity-60"
            >
              {isFetchingMore && <Loader2 className="size-3.5 animate-spin" />}
              <span>
                {isFetchingMore
                  ? "Đang tải tin nhắn cũ..."
                  : "Tải tin nhắn cũ hơn"}
              </span>
            </button>
          </div>
        )}

        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
            <MessageSquare className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              Bắt đầu cuộc trò chuyện với {conversation.partner.displayName}
            </p>
            <p className="max-w-sm text-xs">
              Hãy mô tả tình trạng thiết bị hoặc gửi ảnh hiện trường để trao đổi
              nhanh chóng và rõ ràng hơn.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const currentDateKey = getVnDateKey(msg.createdAt);
            const prevDateKey =
              index > 0 ? getVnDateKey(messages[index - 1].createdAt) : null;
            const showDateDivider = currentDateKey !== prevDateKey;

            const isMine = msg.senderId === currentUserId;
            const msgMs = new Date(msg.createdAt).getTime();
            const isReadByPartner =
              isMine &&
              partnerReadTimestamp !== null &&
              !Number.isNaN(msgMs) &&
              msgMs <= partnerReadTimestamp;

            return (
              <div key={msg.id} className="space-y-4">
                {showDateDivider && currentDateKey && (
                  <div className="my-2 flex items-center justify-center">
                    <div className="rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
                      {formatDateSeparatorLabel(currentDateKey)}
                    </div>
                  </div>
                )}

                {msg.messageType === "SYSTEM" ? (
                  <div className="my-2 flex items-center justify-center">
                    <div className="flex max-w-lg items-center gap-2 rounded-xl border border-border/80 bg-muted px-4 py-2 text-center text-xs font-medium text-muted-foreground shadow-2xs">
                      <Info className="size-4 shrink-0 text-primary" />
                      <span>{msg.content}</span>
                    </div>
                  </div>
                ) : msg.messageType === "IMAGE" ? (
                  isMine ? (
                    <div className="flex flex-col items-end">
                      <div className="max-w-md overflow-hidden rounded-2xl rounded-tr-xs border border-border bg-card p-2 shadow-xs">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenLightbox(
                              msg.content,
                              `Ảnh hiện trường gửi bởi ${msg.senderName}`,
                            )
                          }
                          className="group relative block cursor-pointer overflow-hidden rounded-xl bg-slate-900"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.content}
                            alt="Ảnh hiện trường"
                            className="h-56 w-full min-w-[220px] object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                            <ZoomIn className="size-3.5" />
                            <span>Xem ảnh lớn</span>
                          </div>
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 pr-1 text-[11px] text-muted-foreground">
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {isReadByPartner ? (
                          <span
                            className="inline-flex items-center gap-0.5 text-primary"
                            title="Đã xem"
                          >
                            <CheckCheck className="size-3.5" />
                          </span>
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex max-w-2xl gap-3">
                      <Avatar className="mt-1 size-8 shrink-0 shadow-2xs">
                        {(msg.senderAvatarUrl ||
                          conversation.partner.avatarUrl) && (
                          <AvatarImage
                            src={
                              msg.senderAvatarUrl ||
                              conversation.partner.avatarUrl ||
                              undefined
                            }
                            alt={msg.senderName}
                          />
                        )}
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {msg.senderName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="max-w-md overflow-hidden rounded-2xl rounded-tl-xs border border-border bg-card p-2 shadow-xs">
                          <div className="mb-1.5 px-1 text-xs font-semibold text-muted-foreground">
                            {msg.senderName}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenLightbox(
                                msg.content,
                                `Ảnh hiện trường gửi bởi ${msg.senderName}`,
                              )
                            }
                            className="group relative block cursor-pointer overflow-hidden rounded-xl bg-slate-900"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.content}
                              alt="Ảnh hiện trường"
                              className="h-56 w-full min-w-[220px] object-cover transition duration-300 group-hover:scale-105"
                            />
                            <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                              <ZoomIn className="size-3.5" />
                              <span>Xem ảnh lớn</span>
                            </div>
                          </button>
                        </div>
                        <div className="mt-1 pl-1 text-[11px] text-muted-foreground">
                          {formatMessageTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  )
                ) : isMine ? (
                  <div className="flex flex-col items-end">
                    <div className="max-w-lg rounded-2xl rounded-tr-xs bg-primary p-3.5 text-sm leading-relaxed text-primary-foreground shadow-xs sm:p-4">
                      <p className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 pr-1 text-[11px] text-muted-foreground">
                      <span>{formatMessageTime(msg.createdAt)}</span>
                      {isReadByPartner ? (
                        <span
                          className="inline-flex items-center gap-0.5 text-primary"
                          title="Đã xem"
                        >
                          <CheckCheck className="size-3.5" />
                        </span>
                      ) : (
                        <Check className="size-3.5" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex max-w-2xl gap-3">
                    <Avatar className="mt-1 size-8 shrink-0 shadow-2xs">
                      {(msg.senderAvatarUrl ||
                        conversation.partner.avatarUrl) && (
                        <AvatarImage
                          src={
                            msg.senderAvatarUrl ||
                            conversation.partner.avatarUrl ||
                            undefined
                          }
                          alt={msg.senderName}
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {msg.senderName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="rounded-2xl rounded-tl-xs border border-border bg-card p-3.5 text-sm leading-relaxed text-foreground shadow-xs sm:p-4">
                        <div className="mb-1 text-xs font-semibold text-muted-foreground">
                          {msg.senderName}
                        </div>
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      </div>
                      <div className="mt-1 pl-1 text-[11px] text-muted-foreground">
                        {formatMessageTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Thanh soạn thảo tin nhắn sát đáy */}
      <div className="z-20 flex shrink-0 flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:px-6">
        {/* Gợi ý trả lời nhanh */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Gợi ý:
          </span>
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => insertQuickReply(reply)}
              className="cursor-pointer whitespace-nowrap rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              &ldquo;{reply}&rdquo;
            </button>
          ))}
        </div>

        {/* Khung nhập & nút gửi */}
        <div className="flex items-center gap-2 sm:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            type="button"
            disabled={isUploadingImage}
            onClick={() => fileInputRef.current?.click()}
            title="Đính kèm ảnh hiện trường sự cố (JPG/PNG/WebP, tối đa 5MB)"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:bg-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploadingImage ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Camera className="size-5" />
            )}
          </button>

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Nhập tin nhắn trao đổi..."
              className="w-full rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:bg-card focus:outline-none"
            />
            {draft.length > 1700 && (
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums">
                {draft.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!draft.trim() || isSending}
            onClick={handleSubmit}
            aria-label="Gửi tin nhắn"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>

        {/* Chú thích bảo mật */}
        <p className="flex items-center justify-center gap-1 pt-0.5 text-center text-[11px] text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          <span>
            Trò chuyện được mã hóa bảo mật. Mọi thỏa thuận dịch vụ tuân thủ quy
            chuẩn bảo vệ người dùng Servigo.
          </span>
        </p>
      </div>
    </section>
  );
}
