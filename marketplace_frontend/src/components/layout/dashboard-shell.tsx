"use client";

import { BrandLogo } from "@/components/header/brand-logo";
import { UserMenu } from "@/components/header/header-user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCurrentUser, useSignOut } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Bell, ChevronRight, Menu, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export interface DashboardNavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: number;
  badgeVariant?: "primary" | "destructive";
  exact?: boolean;
}

export interface DashboardShellProps {
  portalLabel: string;
  portalHomeHref: string;
  logoBadge?: string;
  navItems: DashboardNavItem[];
  headerExtra?: React.ReactNode;
  notificationMessage?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  portalLabel,
  portalHomeHref,
  logoBadge,
  navItems,
  headerExtra,
  notificationMessage,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: user, isLoading: loading } = useCurrentUser();
  const { mutate: signOut, isPending: isSigningOut } = useSignOut({
    success: "Đã đăng xuất",
  });

  const isItemActive = (item: DashboardNavItem) => {
    if (item.disabled || !item.href) return false;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const activeItem = navItems.find(isItemActive);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 1. Desktop Left Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card select-none">
        <div className="px-6 py-4 border-b border-border">
          <BrandLogo href={portalHomeHref} size="sm" badge={logoBadge} />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            if (item.disabled || !item.href) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    toast.info(`Tính năng ${item.label} đang được phát triển`)
                  }
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                        item.badgeVariant === "destructive"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                      item.badgeVariant === "destructive"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 2. Topbar & Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-md sm:px-8">
          {/* Cánh trái: Mobile drawer & Breadcrumb */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mở menu"
                    className="lg:hidden"
                  />
                }
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 flex flex-col w-72">
                <SheetHeader className="px-6 py-4 border-b border-border text-left">
                  <SheetTitle>
                    <BrandLogo
                      href={portalHomeHref}
                      size="sm"
                      badge={logoBadge}
                      onClick={() => setMobileOpen(false)}
                    />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(item);

                    if (item.disabled || !item.href) {
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setMobileOpen(false);
                            toast.info(
                              `Tính năng ${item.label} đang được phát triển`,
                            );
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                                item.badgeVariant === "destructive"
                                  ? "bg-destructive text-destructive-foreground"
                                  : "bg-primary text-primary-foreground",
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              "h-5 w-5 shrink-0",
                              active ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                              item.badgeVariant === "destructive"
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-primary text-primary-foreground",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <span className="font-semibold text-foreground">{portalLabel}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {activeItem?.label ?? "Tổng quan vận hành"}
              </span>
            </nav>
          </div>

          {/* Cánh phải: extra, chuông, user */}
          <div className="flex items-center gap-2 sm:gap-4">
            {headerExtra}
            <button
              type="button"
              onClick={() =>
                toast.info(notificationMessage || "Không có thông báo mới")
              }
              className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Thông báo"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            </button>

            <div className="hidden sm:block h-6 w-px bg-border" />

            <UserMenu
              user={user ?? null}
              loading={loading}
              isSigningOut={isSigningOut}
              onSignOut={() => signOut()}
              signInHref="/auth/signin"
              accountHref="/account"
            />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
