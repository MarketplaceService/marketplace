"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { VoiceCallPeerInfo, VoiceCallStatus } from "@/types/chat.types";
import {
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  ShieldCheck,
} from "lucide-react";
import type { RefObject } from "react";

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function VoiceCallDialog({
  status,
  peer,
  isMuted,
  durationSeconds,
  remoteAudioRef,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
}: {
  status: VoiceCallStatus;
  peer: VoiceCallPeerInfo | null;
  isMuted: boolean;
  durationSeconds: number;
  remoteAudioRef: RefObject<HTMLAudioElement | null>;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
}) {
  const isOpen = status !== "idle" && peer !== null;

  return (
    <>
      {/* Thẻ audio luôn gắn trong DOM để nhận luồng âm thanh WebRTC ngay khi kết nối */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-2xl space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              <ShieldCheck className="size-3.5" />
              <span>Gọi thoại trực tuyến Servigo</span>
            </div>

            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                {(status === "calling" || status === "incoming") && (
                  <span className="absolute -inset-2 rounded-full bg-primary/20 animate-ping" />
                )}
                <Avatar className="relative size-20 ring-4 ring-primary/20 shadow-md">
                  {peer.avatarUrl && (
                    <AvatarImage src={peer.avatarUrl} alt={peer.name} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                    {peer.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-foreground">
                  {peer.name}
                </h3>
                {peer.subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {peer.subtitle}
                  </p>
                )}
              </div>

              <div className="text-sm font-medium">
                {status === "calling" && (
                  <span className="text-primary">Đang đổ chuông...</span>
                )}
                {status === "incoming" && (
                  <span className="text-primary">Cuộc gọi thoại đến...</span>
                )}
                {status === "connecting" && (
                  <span className="text-muted-foreground">
                    Đang kết nối âm thanh...
                  </span>
                )}
                {status === "connected" && (
                  <span className="inline-flex items-center gap-2 font-mono text-base font-semibold text-primary tabular-nums">
                    <PhoneCall className="size-4 animate-pulse" />
                    {formatTimer(durationSeconds)}
                  </span>
                )}
              </div>
            </div>

            {/* Cụm nút điều khiển cuộc gọi */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {status === "incoming" ? (
                <>
                  <button
                    type="button"
                    onClick={onReject}
                    className="flex cursor-pointer flex-col items-center gap-1.5"
                  >
                    <span className="flex size-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition hover:bg-destructive/90 active:scale-95">
                      <PhoneOff className="size-6" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Từ chối
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onAccept}
                    className="flex cursor-pointer flex-col items-center gap-1.5"
                  >
                    <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-95">
                      <Phone className="size-6" />
                    </span>
                    <span className="text-xs font-medium text-primary">
                      Nghe máy
                    </span>
                  </button>
                </>
              ) : (
                <>
                  {(status === "connected" || status === "connecting") && (
                    <button
                      type="button"
                      onClick={onToggleMute}
                      className="flex cursor-pointer flex-col items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "flex size-13 items-center justify-center rounded-full border transition active:scale-95",
                          isMuted
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-muted text-foreground hover:bg-muted/80",
                        )}
                      >
                        {isMuted ? (
                          <MicOff className="size-5" />
                        ) : (
                          <Mic className="size-5" />
                        )}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {isMuted ? "Đã tắt mic" : "Tắt mic"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onEnd}
                    className="flex cursor-pointer flex-col items-center gap-1.5"
                  >
                    <span className="flex size-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition hover:bg-destructive/90 active:scale-95">
                      <PhoneOff className="size-6" />
                    </span>
                    <span className="text-xs font-medium text-destructive">
                      {status === "calling" ? "Hủy cuộc gọi" : "Kết thúc"}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
