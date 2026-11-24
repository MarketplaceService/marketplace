"use client";

import { ExternalLink, Image as ImageIcon, X } from "lucide-react";
import { useEffect } from "react";

export function ChatImageLightbox({
  imageUrl,
  caption,
  onClose,
}: {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!imageUrl) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-4xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Ảnh hiện trường trao đổi
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              Mở gốc
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng xem ảnh"
              className="cursor-pointer rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex max-h-[75vh] items-center justify-center overflow-auto bg-slate-950 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={caption || "Ảnh hiện trường"}
            className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <span>{caption || "Ảnh hiện trường sự cố"}</span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-border bg-muted px-3 py-1 font-medium text-foreground transition hover:bg-muted/80"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
