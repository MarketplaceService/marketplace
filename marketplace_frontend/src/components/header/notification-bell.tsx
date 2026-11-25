"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useNotificationSocket,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { formatVnDateTime } from "@/lib/vn-time";
import type { NotificationItem } from "@/types/notification.types";
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  Loader2,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

const ALLOWED_NOTIFICATION_ROLES = new Set(["customer", "provider", "admin"]);

function formatRelativeOrVnTime(iso: string): string {
  const createdMs = new Date(iso).getTime();
  if (Number.isNaN(createdMs)) return "";

  const diffSec = Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return formatVnDateTime(iso);
}

function getNotificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "BOOKING":
      return {
        Icon: CalendarCheck,
        bg: "bg-primary/10 text-primary",
      };
    case "MESSAGE":
      return {
        Icon: MessageSquare,
        bg: "bg-sky-500/10 text-sky-600",
      };
    case "SYSTEM":
    default:
      return {
        Icon: ShieldCheck,
        bg: "bg-amber-500/10 text-amber-600",
      };
  }
}

function resolveNotificationHref(
  notification: NotificationItem,
  userRole: string | undefined,
  pathname: string,
): string | null {
  const { referenceType, referenceId, title } = notification;
  if (!referenceType || !referenceId) return null;

  switch (referenceType) {
    case "BOOKING": {
      if (userRole === "provider") {
        const isCustomerSideNotice =
          title.includes("đã được xác nhận") ||
          title.includes("bị từ chối") ||
          title.includes("đang thực hiện") ||
          title.includes("Thợ đã hủy");
        if (!isCustomerSideNotice && pathname.startsWith("/provider")) {
          return `/provider/bookings/${referenceId}`;
        }
        if (!isCustomerSideNotice) {
          return `/provider/bookings/${referenceId}`;
        }
      }
      return `/bookings/${referenceId}`;
    }

    case "PROVIDER_PROFILE": {
      if (userRole === "admin") {
        return `/admin/providers/${referenceId}`;
      }
      if (title.includes("chưa đạt") || title.includes("từ chối")) {
        return "/provider/register";
      }
      return "/provider";
    }

    case "CONVERSATION":
      return "/bookings";

    case "REPORT":
      return userRole === "admin" ? "/admin" : "/bookings";

    default:
      return null;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  const canReceiveNotifications = Boolean(
    user?.id && user.role && ALLOWED_NOTIFICATION_ROLES.has(user.role),
  );

  useNotificationSocket(user?.id, canReceiveNotifications);

  const { data, isLoading } = useNotifications(
    { page: 1, limit: 15 },
    canReceiveNotifications,
  );
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } =
    useMarkAllNotificationsAsRead();

  if (!canReceiveNotifications) {
    return null;
  }

  const notifications = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleSelectNotification = (item: NotificationItem) => {
    if (!item.readAt) {
      markAsRead(item.id);
    }

    const href = resolveNotificationHref(item, user?.role, pathname);
    if (href) {
      router.push(href);
      return;
    }

    if (item.referenceType === "CONVERSATION") {
      toast.info(item.title, { description: item.body });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Thông báo"
        className="relative inline-flex cursor-pointer items-center justify-center rounded-full p-2 text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} thông báo chưa đọc`}
            className="absolute -top-0.5 -right-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground tabular-nums shadow-xs ring-2 ring-card"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Thông báo
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                {unreadCount} mới
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={unreadCount === 0 || isMarkingAll}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              markAllAsRead();
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
          >
            {isMarkingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            <span>Đọc tất cả</span>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang tải thông báo...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Chưa có thông báo nào
              </p>
              <p className="text-xs text-muted-foreground">
                Thông báo đơn đặt lịch, tin nhắn và trạng thái hồ sơ sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.readAt;
              const { Icon, bg } = getNotificationIcon(item.type);

              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => handleSelectNotification(item)}
                  className={cn(
                    "flex items-start gap-3 rounded-none px-3.5 py-3 cursor-pointer focus:bg-muted/70",
                    isUnread ? "bg-primary/[0.04]" : "bg-transparent",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      bg,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs leading-snug line-clamp-2",
                          isUnread
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/80",
                        )}
                      >
                        {item.title}
                      </p>
                      {isUnread && (
                        <span
                          aria-label="Chưa đọc"
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      {formatRelativeOrVnTime(item.createdAt)}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="my-0" />
        <div className="bg-muted/30 px-3.5 py-2 text-center text-[11px] text-muted-foreground">
          Cập nhật tự động theo thời gian thực
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
