"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HeaderNavItem } from "./header-nav-items";

export function notifyComingSoon() {
  toast.info("Tính năng đang phát triển", { id: "coming-soon" });
}

export function isActivePath(pathname: string, href?: string): boolean {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderAction({
  href,
  active = false,
  className,
  onSelect,
  children,
}: {
  href?: string;
  active?: boolean;
  className?: string;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={className}
        onClick={onSelect}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        notifyComingSoon();
        onSelect?.();
      }}
    >
      {children}
    </button>
  );
}

export function NavLink({
  item,
  badge,
}: {
  item: HeaderNavItem;
  badge?: number;
}) {
  const active = isActivePath(usePathname(), item.href);

  return (
    <HeaderAction
      href={item.href}
      active={active}
      className={cn(
        "inline-flex items-center gap-1.5 border-b-2 py-1 text-sm whitespace-nowrap transition-colors duration-150",
        active
          ? "border-primary font-semibold text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] leading-none font-bold text-primary-foreground tabular-nums">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </HeaderAction>
  );
}
