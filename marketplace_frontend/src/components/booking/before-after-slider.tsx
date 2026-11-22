"use client";

import { cn } from "@/lib/utils";
import type { InspectionPhoto } from "@/types/booking.types";
import { MoveHorizontal } from "lucide-react";
import { useRef, useState } from "react";

export function BeforeAfterSlider({
  before,
  after,
}: {
  before: InspectionPhoto[];
  after: InspectionPhoto[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [percent, setPercent] = useState(50);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const pairCount = Math.max(before.length, after.length);
  if (pairCount === 0) return null;

  const safeIndex = Math.min(activeIndex, pairCount - 1);
  const currentBefore = before[Math.min(safeIndex, before.length - 1)];
  const currentAfter = after[Math.min(safeIndex, after.length - 1)];

  const updatePercentFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const raw = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, Math.round(raw)));
    setPercent(clamped);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updatePercentFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePercentFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 15 : 5;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPercent((prev) => Math.max(0, prev - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPercent((prev) => Math.min(100, prev + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPercent(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPercent(100);
    }
  };

  return (
    <div className="space-y-4">
      {/* 3 nút chuyển nhanh chế độ xem */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap gap-1.5 rounded-xl border border-border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setPercent(100)}
            className={cn(
              "min-h-[36px] cursor-pointer rounded-lg px-3 text-xs font-semibold transition-colors",
              percent === 100
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Chỉ xem ảnh Trước
          </button>
          <button
            type="button"
            onClick={() => setPercent(50)}
            className={cn(
              "min-h-[36px] cursor-pointer rounded-lg px-3 text-xs font-semibold transition-colors",
              percent > 0 && percent < 100
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            So sánh trực tiếp
          </button>
          <button
            type="button"
            onClick={() => setPercent(0)}
            className={cn(
              "min-h-[36px] cursor-pointer rounded-lg px-3 text-xs font-semibold transition-colors",
              percent === 0
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Chỉ xem ảnh Sau
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          Kéo thanh trượt hoặc dùng phím ← / → để đối chiếu
        </span>
      </div>

      {/* Khung đối chiếu ảnh Before / After */}
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label="Thanh trượt đối chiếu ảnh trước và sau khi sửa"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="relative aspect-[16/10] w-full select-none touch-none overflow-hidden rounded-2xl border border-border bg-slate-950 cursor-ew-resize focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        {/* Lớp dưới: Ảnh SAU */}
        {currentAfter && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentAfter.url}
            alt="Ảnh sau khi hoàn thiện"
            draggable={false}
            className="absolute inset-0 size-full object-cover pointer-events-none"
          />
        )}

        {/* Lớp trên: Ảnh TRƯỚC được cắt theo % */}
        {currentBefore && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentBefore.url}
              alt="Ảnh trước khi sửa"
              draggable={false}
              className="size-full object-cover"
            />
          </div>
        )}

        {/* Nhãn góc */}
        {percent > 12 && (
          <span className="pointer-events-none absolute top-3 left-3 rounded-lg bg-slate-900/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
            TRƯỚC KHI SỬA
          </span>
        )}
        {percent < 88 && (
          <span className="pointer-events-none absolute top-3 right-3 rounded-lg bg-primary/90 px-2.5 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-xs">
            SAU KHI SỬA
          </span>
        )}

        {/* Đường chia & tay cầm */}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]"
          style={{ left: `${percent}%` }}
        >
          <div className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md">
            <MoveHorizontal className="size-4" />
          </div>
        </div>
      </div>

      {/* Bộ chọn cặp ảnh nếu có nhiều hơn 1 cặp */}
      {pairCount > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Cặp ảnh ({safeIndex + 1}/{pairCount}):
          </span>
          {Array.from({ length: pairCount }, (_, index) => {
            const thumbUrl =
              after[Math.min(index, after.length - 1)]?.url ??
              before[Math.min(index, before.length - 1)]?.url;
            const isSelected = index === safeIndex;
            return (
              <button
                key={`${index}-${thumbUrl}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Xem cặp ảnh số ${index + 1}`}
                aria-pressed={isSelected}
                className={cn(
                  "relative size-14 overflow-hidden rounded-xl border-2 transition-all cursor-pointer",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border opacity-75 hover:opacity-100",
                )}
              >
                {thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl}
                    alt={`Cặp ảnh ${index + 1}`}
                    className="size-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
