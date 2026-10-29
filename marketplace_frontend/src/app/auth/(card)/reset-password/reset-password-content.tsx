"use client";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="bg-card rounded-lg p-6 md:p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Lỗi</h1>
        <p className="text-muted-foreground mb-4">
          Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
        </p>
        <Link
          href="/auth/forgot-password"
          className="font-medium text-primary hover:underline"
        >
          Yêu cầu link đặt lại mật khẩu mới
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
