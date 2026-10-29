import { Suspense } from "react";
import { VerifyEmailContent } from "@/app/auth/verify-email/verify-email-content";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
