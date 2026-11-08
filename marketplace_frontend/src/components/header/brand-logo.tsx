import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  href?: string;
  badge?: string;
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
}

export function BrandLogo({
  href = "/",
  badge,
  size = "md",
  className,
  onClick,
}: BrandLogoProps) {
  const isSm = size === "sm";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("group flex items-center gap-2.5 select-none", className)}
    >
      <div
        className={cn(
          "flex items-center justify-center bg-primary text-primary-foreground shadow-sm transition duration-150 ease-in-out group-hover:bg-primary/85 shrink-0",
          isSm ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl",
        )}
      >
        <ShieldCheck className={isSm ? "h-[18px] w-[18px]" : "h-5 w-5"} />
      </div>
      <span
        className={cn(
          "font-display font-bold tracking-tight flex items-baseline",
          isSm ? "text-lg" : "text-xl",
        )}
      >
        <span className="text-foreground">Servi</span>
        <span className="text-primary">go</span>
        {badge && (
          <span className="ml-1 text-[11px] font-bold text-muted-foreground uppercase">
            {badge}
          </span>
        )}
      </span>
    </Link>
  );
}
