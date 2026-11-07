"use client";

import { useCurrentUser, useSignOut } from "@/hooks/use-auth";
import { useAdminProviders } from "@/hooks/use-provider";
import {
  Bell,
  CheckCircle2,
  FileCheck,
  FolderCheck,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const { mutate: signOut } = useSignOut({ success: "Đã đăng xuất" });
  const { data: adminData } = useAdminProviders();
  const pendingCount = adminData?.stats?.pending ?? 0;

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  interface AdminNavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
    badge?: number;
  }

  const navItems: AdminNavItem[] = [
    {
      label: "Tổng quan",
      href: "/admin",
      icon: LayoutDashboard,
      disabled: true,
    },
    {
      label: "Duyệt nhà cung cấp",
      href: "/admin/providers",
      icon: FolderCheck,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: "Xử lý tranh chấp",
      href: "/admin/disputes",
      icon: Gavel,
      disabled: true,
    },
    {
      label: "Duyệt dịch vụ",
      href: "/admin/services",
      icon: FileCheck,
      disabled: true,
    },
    {
      label: "Báo cáo vi phạm",
      href: "/admin/reports",
      icon: ShieldAlert,
      disabled: true,
    },
    {
      label: "Tài khoản",
      href: "/account",
      icon: User,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 1. LEFT SIDEBAR (Desktop) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card z-40 select-none">
        <div className="flex items-center gap-2.5 px-6 pt-6 pb-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition group-hover:bg-primary/90">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex items-baseline tracking-tight">
              <span className="font-display text-xl font-bold text-foreground">Trust</span>
              <span className="font-display text-xl font-bold text-primary">Fix</span>
              <span className="ml-1 text-[11px] font-bold text-muted-foreground uppercase">Admin</span>
            </div>
          </Link>
        </div>

        {/* Vertical Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            if (item.disabled) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => toast.info(`Tính năng ${item.label} đang được phát triển`)}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground tabular-nums">
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
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground tabular-nums">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Quản trị</span>
              <span>/</span>
              <span className="font-semibold text-foreground">Duyệt nhà cung cấp</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => toast.info("Không có thông báo mới")}
              className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            </button>

            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Admin user dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 rounded-full pl-1 outline-none group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm ring-1 ring-border shadow-2xs">
                  {user?.name ? user.name[0].toUpperCase() : "A"}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="max-w-32 truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {user?.name || "Quản trị viên"}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Quản trị viên
                  </span>
                </div>
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-1.5 text-foreground shadow-lg z-50 animate-in fade-in-80"
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <div className="px-2 py-2">
                    <p className="truncate text-xs font-bold text-foreground">{user?.name || "Admin"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <Link
                    href="/account"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Tài khoản của tôi</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-card p-4 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span className="font-display font-bold text-foreground">TrustFix Admin</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
