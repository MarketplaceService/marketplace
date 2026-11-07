"use client";

import { useCurrentUser, useSignOut } from "@/hooks/use-auth";
import { Bell, Handshake, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { HeaderMobileNav } from "./header-mobile-nav";
import { BECOME_PROVIDER_ITEM, HEADER_NAV_ITEMS } from "./header-nav-items";
import { HeaderAction, NavLink, notifyComingSoon } from "./header-nav-link";
import { UserMenu } from "./header-user-menu";

export function Header() {
  const { data: user, isLoading: loading } = useCurrentUser();
  const { mutate: signOut, isPending: isSigningOut } = useSignOut({
    success: "Đã đăng xuất",
  });
  const showBecomeProvider = user?.role === "customer";

  return (
    <header className="sticky top-0 z-40 h-16 w-full shrink-0 border-b border-border bg-card/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-1">
          <HeaderMobileNav showBecomeProvider={showBecomeProvider} />
          <Link
            href="/"
            className="group flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition duration-150 ease-in-out group-hover:bg-primary/85">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              <span className="text-foreground">Trust</span>
              <span className="text-primary">Fix</span>
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-8 lg:flex">
          {HEADER_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              item={item}
            />
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          {showBecomeProvider && (
            <HeaderAction
              href={BECOME_PROVIDER_ITEM.href}
              className="hidden items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-primary transition duration-150 ease-in-out hover:bg-primary/10 lg:inline-flex"
            >
              <Handshake className="h-4 w-4" />
              {BECOME_PROVIDER_ITEM.label}
            </HeaderAction>
          )}

          {user && (
            <>
              <button
                type="button"
                aria-label="Thông báo"
                className="rounded-full p-2 text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground"
                onClick={notifyComingSoon}
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="hidden h-6 w-px bg-border sm:block" />
            </>
          )}

          <UserMenu
            user={user}
            loading={loading}
            isSigningOut={isSigningOut}
            onSignOut={() => signOut()}
            signInHref="/auth/signin"
            accountHref="/account"
          />
        </div>
      </div>
    </header>
  );
}
