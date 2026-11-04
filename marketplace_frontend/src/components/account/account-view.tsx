"use client";

import { useAddresses } from "@/hooks/use-addresses";
import { useProfile } from "@/hooks/use-profile";
import { ChevronRight, Loader2, MapPin, User } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AddressList } from "./address-list";
import { DeleteAccountSection } from "./delete-account-section";
import { ProfileForm } from "./profile-form";
import { ProfileSummary } from "./profile-summary";

const ADDRESS_ROLES = ["customer", "provider"];

export function AccountView() {
  const { data: profile, isLoading, isError } = useProfile();
  const canManageAddresses = !!profile && ADDRESS_ROLES.includes(profile.role);
  const { data: addresses = [], isLoading: isLoadingAddresses } =
    useAddresses(canManageAddresses);
  const [tab, setTab] = useState("personal");

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Tài khoản</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Hồ sơ & Địa chỉ</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Tài khoản của tôi
        </h1>
        <p className="mt-1 text-muted-foreground">
          Quản lý thông tin hồ sơ cá nhân và địa chỉ nhận dịch vụ.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {isError && (
        <p className="py-24 text-center text-muted-foreground">
          Không tải được hồ sơ, vui lòng thử lại sau.
        </p>
      )}

      {profile && (
        <>
          <ProfileSummary
            profile={profile}
            defaultAddress={addresses.find((address) => address.isDefault)}
            showAddress={canManageAddresses}
            onViewAddresses={() => setTab("addresses")}
          />

          <Tabs
            value={tab}
            onValueChange={setTab}
            className="gap-6"
          >
            <TabsList
              variant="line"
              className="w-full justify-start border-b border-border"
            >
              <TabsTrigger
                value="personal"
                className="flex-none px-3"
              >
                <User />
                Thông tin cá nhân
              </TabsTrigger>
              {canManageAddresses && (
                <TabsTrigger
                  value="addresses"
                  className="flex-none px-3"
                >
                  <MapPin />
                  Địa chỉ
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                    {addresses.length}
                  </span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent
              value="personal"
              className="space-y-6"
            >
              <ProfileForm profile={profile} />
              <DeleteAccountSection />
            </TabsContent>

            {canManageAddresses && (
              <TabsContent value="addresses">
                <AddressList
                  addresses={addresses}
                  isLoading={isLoadingAddresses}
                />
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </main>
  );
}
