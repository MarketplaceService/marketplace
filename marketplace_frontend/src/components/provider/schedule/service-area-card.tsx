"use client";

import { AddressAutocomplete } from "@/components/map/address-autocomplete";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useServiceAreaCenter } from "@/hooks/use-service-area-center";
import { Layers, MapPin, Radar } from "lucide-react";
import dynamic from "next/dynamic";
import type { Dispatch, SetStateAction } from "react";

const ServiceAreaMapPicker = dynamic(() => import("../service-area-map-picker"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-xl bg-muted" />,
});

export const MIN_RADIUS_KM = 2;
export const MAX_RADIUS_KM = 20;

export interface ServiceAreaValue {
  areaName: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export const formatKm = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

interface ServiceAreaCardProps {
  value: ServiceAreaValue;
  // Nhận cả hàm cập nhật để tìm địa chỉ đổi được tâm và tên khu vực trong cùng một lần
  onChange: Dispatch<SetStateAction<ServiceAreaValue>>;
}

export function ServiceAreaCard({ value, onChange }: ServiceAreaCardProps) {
  const centerSearch = useServiceAreaCenter({
    onCenterChange: (latitude, longitude) =>
      onChange((current) => ({ ...current, latitude, longitude })),
    onAreaNameChange: (areaName) => onChange((current) => ({ ...current, areaName })),
  });

  const coverageKm2 = Math.PI * value.radiusKm * value.radiusKm;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Radar className="size-5 text-primary" />
            Bán kính nhận việc
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Phạm vi phủ sóng quét đơn của khách hàng
          </p>
        </div>
        <p className="text-right">
          <span className="font-display text-3xl font-bold text-primary">
            {formatKm(value.radiusKm)}
          </span>
          <span className="ml-1 text-sm font-semibold text-muted-foreground">km</span>
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="min-w-0">
            <span className="text-muted-foreground">Tâm phục vụ hiện tại: </span>
            <span className="font-medium text-foreground">
              {value.areaName.trim() || "Chưa đặt tên khu vực"}
            </span>
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="schedule-center-search"
            className="text-xs font-semibold text-muted-foreground"
          >
            Tìm địa chỉ trung tâm phục vụ
          </label>
          <AddressAutocomplete
            id="schedule-center-search"
            value={centerSearch.searchText}
            onValueChange={centerSearch.setSearchText}
            onPlaceSelect={centerSearch.selectPlace}
            near={{ latitude: value.latitude, longitude: value.longitude }}
            placeholder="VD: 142 Hoàng Quốc Việt, Cầu Giấy, Hà Nội"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="schedule-area-name"
            className="text-xs font-semibold text-muted-foreground"
          >
            Tên khu vực hiển thị
          </label>
          <Input
            id="schedule-area-name"
            value={value.areaName}
            maxLength={255}
            onChange={(event) =>
              onChange((current) => ({ ...current, areaName: event.target.value }))
            }
            placeholder="VD: Cầu Giấy, Hà Nội"
            className="h-9"
          />
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">Bán kính quét:</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {formatKm(value.radiusKm)} km
            </span>
          </div>
          <Slider
            min={MIN_RADIUS_KM}
            max={MAX_RADIUS_KM}
            step={0.5}
            value={[value.radiusKm]}
            onValueChange={(next) => {
              const radiusKm = Array.isArray(next) ? next[0] : next;
              onChange((current) => ({ ...current, radiusKm }));
            }}
            aria-label="Bán kính nhận việc"
          />
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>2 km (Gần)</span>
            <span>10 km (Tiêu chuẩn)</span>
            <span>20 km (Tối đa)</span>
          </div>
        </div>

        <ServiceAreaMapPicker
          latitude={value.latitude}
          longitude={value.longitude}
          radiusKm={value.radiusKm}
          onChangeCenter={(latitude, longitude) =>
            onChange((current) => ({ ...current, latitude, longitude }))
          }
          onLocated={(latitude, longitude) =>
            void centerSearch.describeLocation(latitude, longitude)
          }
        />

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-primary" />
            Vùng phủ:{" "}
            <strong className="text-foreground">{coverageKm2.toFixed(1)} km²</strong>
          </p>
          <p>Kéo ghim, nhấp trên bản đồ hoặc bấm nút định vị ở góc bản đồ để đổi tâm.</p>
        </div>
      </div>
    </section>
  );
}
