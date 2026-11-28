"use client";

import { cn } from "@/lib/utils";
import { Handshake, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { BECOME_PROVIDER_ITEM, HEADER_NAV_ITEMS } from "./header-nav-items";
import { HeaderAction, isActivePath } from "./header-nav-link";
import { BrandLogo } from "./brand-logo";

const ITEM_CLASS_NAME =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors";

export function HeaderMobileNav({
  showBecomeProvider,
  unreadChatCount = 0,
}: {
  showBecomeProvider: boolean;
  unreadChatCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
    >
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Mở menu"
            className="relative lg:hidden"
          />
        }
      >
        <Menu />
        {unreadChatCount > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        )}
      </SheetTrigger>

      <SheetContent side="left">
        <SheetHeader className="border-b border-border pb-3">
          <SheetTitle>
            <BrandLogo size="sm" onClick={close} />
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-2">
          {HEADER_NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            const showBadge =
              item.href === "/messages" && unreadChatCount > 0;

            return (
              <HeaderAction
                key={item.label}
                href={item.href}
                active={active}
                onSelect={close}
                className={cn(
                  ITEM_CLASS_NAME,
                  "justify-between",
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {item.label}
                </span>
                {showBadge && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs leading-none font-bold text-primary-foreground tabular-nums">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </HeaderAction>
            );
          })}

          {showBecomeProvider && (
            <HeaderAction
              href={BECOME_PROVIDER_ITEM.href}
              onSelect={close}
              className={cn(ITEM_CLASS_NAME, "mt-2 text-primary hover:bg-primary/10")}
            >
              <Handshake className="h-4 w-4" />
              {BECOME_PROVIDER_ITEM.label}
            </HeaderAction>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
