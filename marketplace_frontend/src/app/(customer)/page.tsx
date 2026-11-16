"use client";

import { CustomerDashboardView } from "@/components/discovery/customer-dashboard-view";
import { GuestLandingView } from "@/components/discovery/guest-landing-view";
import { useCurrentUser } from "@/hooks/use-auth";

export default function HomePage() {
  const { data: user, isLoading } = useCurrentUser();

  // Skeleton nhẹ nhàng khi đang xác thực session ban đầu
  if (isLoading) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-muted rounded-xl" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
        <div className="h-28 bg-muted/60 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted/50 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Khách hàng đã đăng nhập tài khoản thực tế
  if (user) {
    return <CustomerDashboardView user={user} />;
  }

  // Khách vãng lai (Guest) hoặc chưa đăng nhập
  return <GuestLandingView />;
}

