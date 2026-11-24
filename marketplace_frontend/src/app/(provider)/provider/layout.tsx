"use client";

import {
  DashboardNavItem,
  DashboardShell,
} from "@/components/layout/dashboard-shell";
import { useMyProviderProfile } from "@/hooks/use-provider";
import {
  useProviderBookings,
  useUpdateProviderStatus,
} from "@/hooks/use-provider-bookings";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Wallet,
} from "lucide-react";

function ProviderStatusToggle() {
  const { data: myProfile, isLoading } = useMyProviderProfile();
  const { mutate: updateStatus, isPending } = useUpdateProviderStatus();

  const isAvailable = myProfile?.profile?.isOnline ?? true;
  const busy = isLoading || isPending || !myProfile?.profile;

  const toggleStatus = () => {
    if (busy) return;
    updateStatus(!isAvailable);
  };

  return (
    <button
      type="button"
      onClick={toggleStatus}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition border shadow-xs",
        busy ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        isAvailable
          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          : "border-border bg-muted text-muted-foreground hover:bg-muted/80",
      )}
      title="Trạng thái nhận việc"
    >
      {isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            isAvailable ? "bg-primary animate-pulse" : "bg-muted-foreground",
          )}
        />
      )}
      <span>{isAvailable ? "Sẵn sàng nhận việc" : "Tạm nghỉ nhận việc"}</span>
    </button>
  );
}

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: myProfile } = useMyProviderProfile();
  const isApprovedProvider = myProfile?.status === "APPROVED";
  const { data: pendingBookings } = useProviderBookings(
    { tab: "pending", page: 1, limit: 1 },
    isApprovedProvider,
  );
  const { data: inProgressBookings } = useProviderBookings(
    { tab: "in_progress", page: 1, limit: 1 },
    isApprovedProvider,
  );

  const pendingCount = pendingBookings?.counts?.pending ?? 0;
  const inProgressCount = inProgressBookings?.counts?.inProgress ?? 0;

  const navItems: DashboardNavItem[] = [
    {
      label: "Việc hôm nay",
      href: "/provider",
      exact: true,
      icon: LayoutDashboard,
    },
    {
      label: "Đơn đặt lịch",
      href: "/provider/bookings",
      icon: ClipboardList,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: "Lịch & Vùng phục vụ",
      href: "/provider/schedule",
      icon: Calendar,
    },
    {
      label: "Nghiệm thu công việc",
      href: "/provider/inspections",
      icon: ClipboardCheck,
      badge: inProgressCount > 0 ? inProgressCount : undefined,
      badgeVariant: "primary",
    },
    {
      label: "Ví & Thu nhập",
      href: "/provider/wallet",
      icon: Wallet,
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

  const notificationMessage =
    pendingCount > 0
      ? `Bạn có ${pendingCount} đơn đặt lịch mới cần xác nhận.`
      : "Hiện không có đơn đặt lịch mới đang chờ xác nhận.";

  return (
    <DashboardShell
      portalLabel="Nhà cung cấp"
      portalHomeHref="/provider"
      notificationMessage={notificationMessage}
      navItems={navItems}
      headerExtra={<ProviderStatusToggle />}
    >
      {children}
    </DashboardShell>
  );
}
