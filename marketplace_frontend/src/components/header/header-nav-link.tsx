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

export function NavLink({ item }: { item: HeaderNavItem }) {
  const active = isActivePath(usePathname(), item.href);

  return (
    <HeaderAction
      href={item.href}
      active={active}
      className={cn(
        "text-sm whitespace-nowrap transition-colors duration-150",
        active
          ? "border-b-2 border-primary pb-1 font-semibold text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {item.label}
    </HeaderAction>
  );
}
