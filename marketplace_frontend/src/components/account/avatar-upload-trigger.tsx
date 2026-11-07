"use client";

import { useUploadAvatar } from "@/hooks/use-profile";
import { Loader2 } from "lucide-react";
import { ChangeEvent, ReactNode, useRef } from "react";
import { toast } from "sonner";

const ACTION_LABEL = "Thay đổi ảnh đại diện";
const AVATAR_TYPES = ["image/jpeg", "image/png"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

interface AvatarUploadTriggerProps {
  className?: string;
  icon?: ReactNode;
  showLabel?: boolean;
}

export function AvatarUploadTrigger({
  className,
  icon,
  showLabel = false,
}: AvatarUploadTriggerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error("Ảnh đại diện phải là file JPG hoặc PNG");
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("Ảnh đại diện tối đa 2MB");
      return;
    }

    uploadAvatar.mutate(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        title={ACTION_LABEL}
        aria-label={ACTION_LABEL}
        disabled={uploadAvatar.isPending}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        {uploadAvatar.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          icon
        )}
        {showLabel && ACTION_LABEL}
      </button>
    </>
  );
}
