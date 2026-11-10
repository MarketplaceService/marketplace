"use client";

import { roleLabel } from "@/lib/user-role";
import { cn } from "@/lib/utils";
import { User } from "@/types/api.types";
import { ArrowLeftRight, LayoutDashboard, Loader2, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { buttonVariants } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface UserMenuProps {
  user: User | null;
  loading: boolean;
  isSigningOut: boolean;
  onSignOut: () => void;
  signInHref: string;
  accountHref: string;
}

export function UserMenu({
  user,
  loading,
  isSigningOut,
  onSignOut,
  signInHref,
  accountHref,
}: UserMenuProps) {
  const pathname = usePathname();
  const isDashboardArea = pathname.startsWith("/admin") || pathname.startsWith("/provider");
  if (loading) {
    return <div className="h-[38px] w-24 animate-pulse rounded-full bg-muted" />;
  }

  if (!user) {
    return (
      <Link
        href={signInHref}
        className={cn(buttonVariants(), "h-9 px-4")}
      >
        Đăng nhập
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu tài khoản"
        className="group flex cursor-pointer items-center gap-2.5 rounded-full pl-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar className="size-[38px] shadow-xs">
          {user.image && (
            <AvatarImage
              src={user.image}
              alt={user.name}
            />
          )}
          <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <span className="hidden flex-col text-left sm:flex">
          <span className="max-w-32 truncate text-[13px] leading-tight font-semibold text-foreground transition-colors group-hover:text-primary">
            {user.name}
          </span>
          {user.role && (
            <span className="text-[11px] font-medium text-muted-foreground">
              {roleLabel(user.role)}
            </span>
          )}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 p-1.5"
      >
        <div className="px-1.5 py-2">
          <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
        </div>

        <DropdownMenuSeparator />

        {isDashboardArea && (
          <DropdownMenuItem render={<Link href="/" />}>
            <ArrowLeftRight />
            Về trang Khách hàng
          </DropdownMenuItem>
        )}

        {!pathname.startsWith("/provider") && user.role === "provider" && (
          <DropdownMenuItem render={<Link href="/provider" />}>
            <LayoutDashboard />
            Kênh Nhà cung cấp
          </DropdownMenuItem>
        )}

        {!pathname.startsWith("/admin") && user.role === "admin" && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <LayoutDashboard />
            Quản trị hệ thống
          </DropdownMenuItem>
        )}

        <DropdownMenuItem render={<Link href={accountHref} />}>
          <UserRound />
          Tài khoản
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isSigningOut}
          onClick={onSignOut}
        >
          {isSigningOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
