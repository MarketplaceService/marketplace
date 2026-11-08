"use client";

import {
  DashboardNavItem,
  DashboardShell,
} from "@/components/layout/dashboard-shell";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function ProviderStatusToggle() {
  const [isAvailable, setIsAvailable] = useState(true);

  const toggleStatus = () => {
    if (isAvailable) {
      setIsAvailable(false);
      toast.warning("Đã chuyển sang chế độ: Tạm nghỉ nhận việc");
    } else {
      setIsAvailable(true);
      toast.success("Đã bật chế độ: Sẵn sàng nhận việc");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleStatus}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-xs border",
        isAvailable
          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          : "border-border bg-muted text-muted-foreground hover:bg-muted/80",
      )}
      title="Trạng thái nhận việc"
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          isAvailable ? "bg-primary animate-pulse" : "bg-muted-foreground",
        )}
      />
      <span>{isAvailable ? "Sẵn sàng nhận việc" : "Tạm nghỉ nhận việc"}</span>
    </button>
  );
}

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems: DashboardNavItem[] = [
    {
      label: "Việc hôm nay",
      href: "/provider",
      exact: true,
      icon: LayoutDashboard,
    },
    {
      label: "Đơn đặt lịch",
      icon: ClipboardList,
      disabled: true,
      badge: 2,
    },
    {
      label: "Lịch & Vùng phục vụ",
      icon: Calendar,
      disabled: true,
    },
    {
      label: "Nghiệm thu công việc",
      icon: ClipboardCheck,
      disabled: true,
    },
    {
      label: "Ví & Thu nhập",
      icon: Wallet,
      disabled: true,
    },
    {
      label: "Tin nhắn",
      icon: MessageSquare,
      disabled: true,
    },
    {
      label: "Hồ sơ & Dịch vụ",
      href: "/account",
      icon: BadgeCheck,
    },
  ];

  return (
    <DashboardShell
      portalLabel="Nhà cung cấp"
      portalHomeHref="/provider"
      notificationMessage="Bạn có 2 đơn đặt lịch cần xác nhận."
      navItems={navItems}
      headerExtra={<ProviderStatusToggle />}
    >
      {children}
    </DashboardShell>
  );
}
