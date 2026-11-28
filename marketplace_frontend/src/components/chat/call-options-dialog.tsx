"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ConversationItem } from "@/types/chat.types";
import {
  AlertCircle,
  Check,
  Copy,
  Globe,
  Phone,
  PhoneCall,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

export function CallOptionsDialog({
  open,
  conversation,
  fallbackNotice,
  callBusy,
  onClose,
  onStartWebCall,
}: {
  open: boolean;
  conversation: ConversationItem | null;
  fallbackNotice: string | null;
  callBusy: boolean;
  onClose: () => void;
  onStartWebCall: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !conversation) return null;

  const { partner } = conversation;
  const cleanPhone = partner.phone?.trim() || null;
  const canWebCall = partner.isOnline && !callBusy;

  const handleCopyPhone = async () => {
    if (!cleanPhone) return;
    try {
      await navigator.clipboard.writeText(cleanPhone);
      setCopied(true);
      toast.success("Đã sao chép số điện thoại");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép số điện thoại");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative size-11 shrink-0">
              <Avatar className="size-11 rounded-xl ring-2 ring-primary/20">
                {partner.avatarUrl && (
                  <AvatarImage
                    src={partner.avatarUrl}
                    alt={partner.displayName}
                    className="rounded-xl object-cover"
                  />
                )}
                <AvatarFallback className="rounded-xl bg-primary/10 text-base font-bold text-primary">
                  {partner.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card",
                  partner.isOnline
                    ? "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-600",
                )}
              />
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-serif text-base font-bold text-foreground">
                Liên hệ {partner.displayName}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {partner.isOnline ? "Đang hoạt động" : "Đang ngoại tuyến"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 p-5">
          {fallbackNotice && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-50/80 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{fallbackNotice}</span>
            </div>
          )}

          {/* Phương án 1: Gọi trực tuyến qua Web (WebRTC) */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Globe className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    Gọi trực tuyến qua web (Miễn phí)
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {partner.isOnline
                      ? "Kết nối thoại trực tiếp trên trình duyệt khi cả hai cùng đang hoạt động."
                      : "Đối phương đang ngoại tuyến nên chưa thể nhận cuộc gọi trực tuyến trên web."}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canWebCall}
              onClick={() => {
                onClose();
                onStartWebCall();
              }}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                canWebCall
                  ? "cursor-pointer bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.99]"
                  : "cursor-not-allowed border border-border bg-muted text-muted-foreground opacity-70",
              )}
            >
              <PhoneCall className="size-4" />
              <span>
                {partner.isOnline
                  ? "Gọi qua web ngay"
                  : "Không khả dụng (Ngoại tuyến)"}
              </span>
            </button>
          </div>

          {/* Phương án 2: Gọi qua số điện thoại / Sao chép số */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Phone className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Gọi qua số điện thoại
                </p>
                {cleanPhone ? (
                  <p className="font-mono text-base font-bold tracking-wide text-primary">
                    {formatPhoneDisplay(cleanPhone)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Đối phương chưa cập nhật số điện thoại công khai.
                  </p>
                )}
              </div>
            </div>

            {cleanPhone && (
              <button
                type="button"
                onClick={() => void handleCopyPhone()}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99]",
                  !partner.isOnline
                    ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                    : "border border-border bg-muted/60 text-foreground hover:border-primary/40 hover:bg-muted",
                )}
              >
                {copied ? (
                  <>
                    <Check
                      className={cn(
                        "size-4",
                        !partner.isOnline
                          ? "text-primary-foreground"
                          : "text-primary",
                      )}
                    />
                    <span>Đã sao chép số điện thoại</span>
                  </>
                ) : (
                  <>
                    <Copy
                      className={cn(
                        "size-4",
                        !partner.isOnline
                          ? "text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    />
                    <span>Sao chép số</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
