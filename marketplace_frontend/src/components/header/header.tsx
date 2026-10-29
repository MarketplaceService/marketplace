"use client";

import { useCurrentUser, useSignOut } from "@/hooks/use-auth";
import { UserMenu } from "./header-user-menu";
import { NavLink } from "./header-nav-link";
import Link from "next/link";

export function Header() {
  const { data: user, isLoading: loading } = useCurrentUser();

  const { mutate: signOut, isPending: isSigningOut } = useSignOut({
    success: "Đã đăng xuất",
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur-md transition-all duration-150 ease-out">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 w-full items-center justify-between gap-4 lg:h-[72px]">
          <div className="flex shrink-0 items-center justify-start lg:flex-1">
            <Link
              href="/"
              className="flex items-center gap-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                <span className="text-sm font-bold text-background">S</span>
              </div>
              <span className="text-base font-bold text-foreground">Shytech</span>
            </Link>
          </div>

          <nav className="hidden items-center justify-center gap-8 lg:flex">
            <NavLink
              href="/"
              active={false}
              isAnchor
            >
              Trang chủ
            </NavLink>
            <NavLink
              href="/product/catalog"
              active={false}
              isAnchor
            >
              Sản phẩm
            </NavLink>
          </nav>

          <UserMenu
            user={user ?? null}
            loading={loading}
            isSigningOut={isSigningOut}
            onSignOut={() => signOut()}
            signInHref="/auth/signin"
            shopCatalogHref="/product/catalog"
          />
        </div>
      </div>
    </header>
  );
}
