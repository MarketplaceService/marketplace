"use client";

import {
  DashboardNavItem,
  DashboardShell,
} from "@/components/layout/dashboard-shell";
import { useAdminProviders } from "@/hooks/use-provider";
import {
  Flag,
  Gavel,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: adminData } = useAdminProviders();
  const pendingCount = adminData?.stats?.pending ?? 0;

  const navItems: DashboardNavItem[] = [
    {
      label: "Tổng quan",
      icon: TrendingUp,
      disabled: true,
    },
    {
      label: "Duyệt nhà cung cấp",
      href: "/admin/providers",
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: "Xử lý tranh chấp",
      icon: Gavel,
      disabled: true,
    },
    {
      label: "Duyệt dịch vụ",
      icon: ShieldCheck,
      disabled: true,
    },
    {
      label: "Báo cáo vi phạm",
      icon: Flag,
      disabled: true,
    },
    {
      label: "Tài khoản",
      href: "/account",
      icon: Users,
    },
  ];

  return (
    <DashboardShell
      portalLabel="Quản trị"
      portalHomeHref="/admin"
      logoBadge="Admin"
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}