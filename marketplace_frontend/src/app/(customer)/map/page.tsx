import { AnonymousSessionProvider } from "@/components/auth/anonymous-session-provider";
import GeoMapView from "@/components/discovery/geo-map-view";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Bản đồ tìm thợ quanh đây | Servigo",
  description:
    "Quét thợ theo bán kính thông minh 2km - 20km, tính phụ phí di chuyển minh bạch chuẩn Servigo.",
};

function MapLoadingSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Đang chuẩn bị bản đồ số...
        </p>
      </div>
    </div>
  );
}

export default function CustomerMapPage() {
  return (
    <AnonymousSessionProvider>
      <Suspense fallback={<MapLoadingSkeleton />}>
        <GeoMapView />
      </Suspense>
    </AnonymousSessionProvider>
  );
}
