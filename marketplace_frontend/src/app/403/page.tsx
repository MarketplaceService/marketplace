import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Không có quyền truy cập",
};

export default function ForbiddenPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">
        Bạn không có quyền truy cập trang này
      </h1>
      <p className="max-w-md text-muted-foreground">
        Tài khoản của bạn không có vai trò phù hợp để xem nội dung này.
      </p>
      <Link
        href="/"
        className={buttonVariants()}
      >
        Về trang chủ
      </Link>
    </main>
  );
}
