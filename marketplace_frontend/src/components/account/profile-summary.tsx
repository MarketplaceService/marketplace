import { roleLabel } from "@/lib/user-role";
import { ProfileAddress, UserProfile } from "@/types/api.types";
import { ArrowRight, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { formatAddress } from "./address-utils";

interface ProfileSummaryProps {
  profile: UserProfile;
  defaultAddress?: ProfileAddress;
  showAddress: boolean;
  onViewAddresses: () => void;
}

export function ProfileSummary({
  profile,
  defaultAddress,
  showAddress,
  onViewAddresses,
}: ProfileSummaryProps) {
  return (
    <section className="mb-8 flex flex-col justify-between gap-6 rounded-xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 border-2 border-primary/20">
          {profile.image && (
            <AvatarImage
              src={profile.image}
              alt={profile.name}
            />
          )}
          <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
            {profile.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {roleLabel(profile.role)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              {profile.email}
            </span>
            {profile.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                {profile.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {showAddress ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/60 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Địa chỉ mặc định hiện tại
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {defaultAddress ? formatAddress(defaultAddress) : "Chưa thiết lập"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAddresses}
          >
            Địa chỉ
            <ArrowRight />
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/60 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Tài khoản quản trị hệ thống
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              Toàn quyền vận hành và kiểm duyệt
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
