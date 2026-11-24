"use client";

import { getChatSocket } from "@/lib/chat/chat-socket";
import type { VoiceCallPeerInfo, VoiceCallStatus } from "@/types/chat.types";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const RING_TIMEOUT_MS = 30_000;

function playGentleRingTone() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 500);
  } catch {
    // Trình duyệt có thể chặn autoplay âm thanh trước khi người dùng tương tác
  }
}

function getMicErrorMessage(error: unknown): string {
  const err = error as { name?: string };
  if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
    return "Bạn đã từ chối quyền micro. Vui lòng cấp quyền micro trên trình duyệt để gọi thoại.";
  }
  if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
    return "Không tìm thấy thiết bị micro trên máy của bạn.";
  }
  return "Không thể truy cập micro trên trình duyệt hiện tại.";
}

export function useVoiceCall({
  enabled,
  currentUserId,
}: {
  enabled: boolean;
  currentUserId?: string;
}) {
  const [status, setStatus] = useState<VoiceCallStatus>("idle");
  const [peer, setPeer] = useState<VoiceCallPeerInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringToneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const statusRef = useRef<VoiceCallStatus>("idle");
  const peerRef = useRef<VoiceCallPeerInfo | null>(null);

  const updateStatus = useCallback((next: VoiceCallStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const updatePeer = useCallback((next: VoiceCallPeerInfo | null) => {
    peerRef.current = next;
    setPeer(next);
  }, []);

  const stopRingEffects = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (ringToneIntervalRef.current) {
      clearInterval(ringToneIntervalRef.current);
      ringToneIntervalRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    stopRingEffects();
    pendingIceRef.current = [];

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setIsMuted(false);
    setDurationSeconds(0);
    updateStatus("idle");
    updatePeer(null);
  }, [stopRingEffects, updatePeer, updateStatus]);

  const acquireMicrophone = useCallback(async (): Promise<MediaStream> => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error("UNSUPPORTED");
    }
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }, []);

  const createPeerConnection = useCallback(
    (conversationId: string, stream: MediaStream) => {
      const socket = getChatSocket();
      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:signal", {
            conversationId,
            type: "ice",
            payload: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
          void remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          stopRingEffects();
          updateStatus("connected");
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          cleanupMedia();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [cleanupMedia, stopRingEffects, updateStatus],
  );

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription || pendingIceRef.current.length === 0) return;
    const queued = pendingIceRef.current.splice(0, pendingIceRef.current.length);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Bỏ qua ICE candidate lỗi hoặc đã quá hạn
      }
    }
  }, []);

  const startCall = useCallback(
    async (target: VoiceCallPeerInfo) => {
      if (statusRef.current !== "idle") {
        toast.info("Bạn đang trong một cuộc gọi khác.");
        return;
      }

      const socket = getChatSocket();
      if (!socket.connected) {
        toast.error("Chưa kết nối máy chủ thời gian thực, vui lòng thử lại sau.");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await acquireMicrophone();
      } catch (error) {
        toast.error(getMicErrorMessage(error));
        return;
      }

      localStreamRef.current = stream;
      updatePeer(target);
      updateStatus("calling");

      const ack = await new Promise<{
        ok: boolean;
        code?: string;
        message?: string;
      }>((resolve) => {
        socket.timeout(5000).emit(
          "call:invite",
          { conversationId: target.conversationId },
          (
            err: Error | null,
            res?: { ok: boolean; code?: string; message?: string },
          ) => {
            if (err || !res) {
              resolve({ ok: false, message: "Không thể kết nối cuộc gọi" });
              return;
            }
            resolve(res);
          },
        );
      });

      if (!ack.ok) {
        cleanupMedia();
        toast.info(ack.message || "Không thể thực hiện cuộc gọi lúc này");
        return;
      }

      ringTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === "calling" && peerRef.current) {
          socket.emit("call:reject", {
            conversationId: peerRef.current.conversationId,
            reason: "timeout",
          });
          cleanupMedia();
          toast.info("Đối phương không bắt máy.");
        }
      }, RING_TIMEOUT_MS);
    },
    [acquireMicrophone, cleanupMedia, updatePeer, updateStatus],
  );

  const acceptCall = useCallback(async () => {
    const activePeer = peerRef.current;
    if (statusRef.current !== "incoming" || !activePeer) return;

    stopRingEffects();

    let stream: MediaStream;
    try {
      stream = await acquireMicrophone();
    } catch (error) {
      toast.error(getMicErrorMessage(error));
      const socket = getChatSocket();
      socket.emit("call:reject", {
        conversationId: activePeer.conversationId,
        reason: "no_mic",
      });
      cleanupMedia();
      return;
    }

    localStreamRef.current = stream;
    createPeerConnection(activePeer.conversationId, stream);
    updateStatus("connecting");

    const socket = getChatSocket();
    socket.emit("call:accept", { conversationId: activePeer.conversationId });
  }, [
    acquireMicrophone,
    cleanupMedia,
    createPeerConnection,
    stopRingEffects,
    updateStatus,
  ]);

  const rejectCall = useCallback(() => {
    const activePeer = peerRef.current;
    if (!activePeer) {
      cleanupMedia();
      return;
    }

    const socket = getChatSocket();
    socket.emit("call:reject", {
      conversationId: activePeer.conversationId,
      reason: "declined",
    });
    cleanupMedia();
  }, [cleanupMedia]);

  const endCall = useCallback(() => {
    const activePeer = peerRef.current;
    if (!activePeer) {
      cleanupMedia();
      return;
    }

    const socket = getChatSocket();
    if (statusRef.current === "calling" || statusRef.current === "incoming") {
      socket.emit("call:reject", {
        conversationId: activePeer.conversationId,
        reason: "cancelled",
      });
    } else {
      socket.emit("call:end", { conversationId: activePeer.conversationId });
    }
    cleanupMedia();
  }, [cleanupMedia]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  // Bộ đếm thời gian cuộc gọi khi đã kết nối
  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Lắng nghe các sự kiện signaling WebRTC trên namespace /chat
  useEffect(() => {
    if (!enabled || !currentUserId) return;
    const socket = getChatSocket(currentUserId);

    const handleIncoming = (payload: {
      conversationId: string;
      caller: { id: string; name: string; avatarUrl: string | null };
    }) => {
      if (statusRef.current !== "idle") {
        socket.emit("call:reject", {
          conversationId: payload.conversationId,
          reason: "busy",
        });
        return;
      }

      updatePeer({
        conversationId: payload.conversationId,
        name: payload.caller.name,
        avatarUrl: payload.caller.avatarUrl,
      });
      updateStatus("incoming");

      playGentleRingTone();
      ringToneIntervalRef.current = setInterval(playGentleRingTone, 2500);
    };

    const handleAccepted = async (payload: { conversationId: string }) => {
      if (
        statusRef.current !== "calling" ||
        peerRef.current?.conversationId !== payload.conversationId ||
        !localStreamRef.current
      ) {
        return;
      }

      stopRingEffects();
      updateStatus("connecting");

      try {
        const pc = createPeerConnection(
          payload.conversationId,
          localStreamRef.current,
        );
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:signal", {
          conversationId: payload.conversationId,
          type: "offer",
          payload: offer,
        });
      } catch {
        toast.error("Không thể thiết lập kết nối thoại.");
        socket.emit("call:end", { conversationId: payload.conversationId });
        cleanupMedia();
      }
    };

    const handleSignal = async (payload: {
      conversationId: string;
      type: "offer" | "answer" | "ice";
      payload: unknown;
    }) => {
      if (peerRef.current?.conversationId !== payload.conversationId) return;
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (payload.type === "offer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(payload.payload as RTCSessionDescriptionInit),
          );
          await flushPendingIce(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("call:signal", {
            conversationId: payload.conversationId,
            type: "answer",
            payload: answer,
          });
        } else if (payload.type === "answer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(payload.payload as RTCSessionDescriptionInit),
          );
          await flushPendingIce(pc);
        } else if (payload.type === "ice") {
          const candidate = payload.payload as RTCIceCandidateInit;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pendingIceRef.current.push(candidate);
          }
        }
      } catch {
        toast.error("Kết nối thoại gặp sự cố kỹ thuật.");
        cleanupMedia();
      }
    };

    const handleRejected = (payload: {
      conversationId: string;
      reason?: string;
    }) => {
      if (peerRef.current?.conversationId !== payload.conversationId) return;
      cleanupMedia();
      if (payload.reason === "timeout") {
        toast.info("Cuộc gọi nhỡ do không có người trả lời.");
      } else if (payload.reason === "cancelled") {
        toast.info("Người gọi đã hủy cuộc gọi.");
      } else {
        toast.info("Đối phương đã từ chối cuộc gọi.");
      }
    };

    const handleEnded = (payload: { conversationId: string }) => {
      if (peerRef.current?.conversationId !== payload.conversationId) return;
      cleanupMedia();
      toast.info("Cuộc gọi thoại đã kết thúc.");
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:accepted", handleAccepted);
    socket.on("call:signal", handleSignal);
    socket.on("call:rejected", handleRejected);
    socket.on("call:ended", handleEnded);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:accepted", handleAccepted);
      socket.off("call:signal", handleSignal);
      socket.off("call:rejected", handleRejected);
      socket.off("call:ended", handleEnded);
    };
  }, [
    enabled,
    currentUserId,
    cleanupMedia,
    createPeerConnection,
    flushPendingIce,
    stopRingEffects,
    updatePeer,
    updateStatus,
  ]);

  // Đảm bảo luôn tắt micro khi rời trang
  useEffect(() => {
    return () => {
      const activePeer = peerRef.current;
      if (activePeer && statusRef.current !== "idle") {
        const socket = getChatSocket();
        if (socket.connected) {
          socket.emit("call:end", { conversationId: activePeer.conversationId });
        }
      }
      cleanupMedia();
    };
  }, [cleanupMedia]);

  return {
    status,
    peer,
    isMuted,
    durationSeconds,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}
