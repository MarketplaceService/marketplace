"use client";

import { cn } from "@/lib/utils";
import { Handshake, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { BECOME_PROVIDER_ITEM, HEADER_NAV_ITEMS } from "./header-nav-items";
import { HeaderAction, isActivePath } from "./header-nav-link";

const ITEM_CLASS_NAME =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors";

export function HeaderMobileNav({
  showBecomeProvider,
}: {
  showBecomeProvider: boolean;
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
            className="lg:hidden"
          />
        }
      >
        <Menu />
      </SheetTrigger>

      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-2">
          {HEADER_NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <HeaderAction
                key={item.label}
                href={item.href}
                active={active}
                onSelect={close}
                className={cn(
                  ITEM_CLASS_NAME,
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {item.label}
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
