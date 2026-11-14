"use client";

import { useCurrentLocation } from "@/hooks/use-current-location";
import { cn } from "@/lib/utils";
import { Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { isInsideMapBounds } from "./map-bounds";

interface LocateButtonProps {
  onLocated: (latitude: number, longitude: number) => void;
  className?: string;
}

/** Nút nổi ở góc bản đồ để đưa ghim tới vị trí hiện tại */
export function LocateButton({ onLocated, className }: LocateButtonProps) {
  const { locate, isLocating } = useCurrentLocation();

  const handleClick = () =>
    locate((latitude, longitude) => {
      if (!isInsideMapBounds(latitude, longitude)) {
        toast.warning("Vị trí hiện tại nằm ngoài vùng bản đồ hỗ trợ");
        return;
      }
      onLocated(latitude, longitude);
    });

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLocating}
      title="Đến vị trí hiện tại"
      aria-label="Đến vị trí hiện tại"
      className={cn(
        "flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-md transition hover:bg-muted disabled:cursor-wait",
        className,
      )}
    >
      {isLocating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LocateFixed className="size-4 text-primary" />
      )}
    </button>
  );
}
