"use client";

import { Button } from "@/components/ui/button";
import { useMyProviderProfile, useUpdateServiceArea } from "@/hooks/use-provider";
import { useMyAvailability, useReplaceAvailability } from "@/hooks/use-schedule";
import { toastApiError } from "@/lib/api/api-error";
import type { ProviderServiceAreaItem } from "@/services/provider.services";
import type { AvailabilityBlock } from "@/services/schedule.services";
import { BadgeCheck, Loader2, Save, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  formatKm,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  ServiceAreaCard,
  type ServiceAreaValue,
} from "./service-area-card";
import { TimeOffCard } from "./time-off-card";
import { TravelFeeCard } from "./travel-fee-card";
import {
  isRowInvalid,
  WEEK_ORDER,
  WeeklyScheduleCard,
  type DayRow,
} from "./weekly-schedule-card";

// Tâm mặc định giống form đăng ký thợ khi thợ chưa có vùng phục vụ
const DEFAULT_CENTER = { latitude: 10.776889, longitude: 106.700897 };
const DEFAULT_RADIUS_KM = 10;

const clampRadius = (radiusKm: number) =>
  Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, radiusKm));

// Giao diện cho mỗi ngày một ca như thiết kế. Ngày có nhiều ca (chỉ tạo được qua API)
// thì lấy ca sớm nhất, và nút lưu sẽ thay cả tuần bằng 7 dòng đang thấy.
function rowsFromBlocks(blocks: AvailabilityBlock[]): DayRow[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const block = blocks
      .filter((item) => item.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

    return block
      ? {
          dayOfWeek,
          isActive: block.isActive,
          startTime: block.startTime,
          endTime: block.endTime,
        }
      : { dayOfWeek, isActive: false, startTime: "08:00", endTime: "17:30" };
  });
}

function toAreaValue(area: ProviderServiceAreaItem | undefined): ServiceAreaValue {
  return {
    areaName: area?.areaName ?? "",
    latitude: area ? Number(area.centerLatitude) : DEFAULT_CENTER.latitude,
    longitude: area ? Number(area.centerLongitude) : DEFAULT_CENTER.longitude,
    radiusKm: clampRadius(area ? Number(area.radiusKm) : DEFAULT_RADIUS_KM),
  };
}

export function ProviderScheduleView() {
  const { data: providerData, isLoading: isProfileLoading } = useMyProviderProfile();
  const isApproved = providerData?.status === "APPROVED";
  const { data: blocks, isLoading: isAvailabilityLoading, isError } = useMyAvailability();

  if (isProfileLoading || (isApproved && isAvailabilityLoading)) {
    return (
      <PageShell>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-[520px] animate-pulse rounded-2xl bg-muted lg:col-span-7" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-muted lg:col-span-5" />
        </div>
      </PageShell>
    );
  }

  if (!isApproved) {
    return (
      <PageShell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
          <p className="font-semibold text-foreground">Hồ sơ nhà cung cấp chưa được duyệt</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bạn cần có hồ sơ đã được duyệt trước khi thiết lập lịch làm việc.
          </p>
          <Link
            href="/provider/register"
            className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Xem hồ sơ đăng ký
          </Link>
        </div>
      </PageShell>
    );
  }

  if (isError || !blocks) {
    return (
      <PageShell>
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Không tải được lịch làm việc, bạn hãy tải lại trang.
        </p>
      </PageShell>
    );
  }

  const area =
    providerData.profile?.serviceAreas?.find((item) => item.isActive) ??
    providerData.profile?.serviceAreas?.[0];

  return (
    <ScheduleEditor
      initialRows={rowsFromBlocks(blocks)}
      initialArea={toAreaValue(area)}
      hasSchedule={blocks.length > 0}
    />
  );
}

function ScheduleEditor({
  initialRows,
  initialArea,
  hasSchedule,
}: {
  initialRows: DayRow[];
  initialArea: ServiceAreaValue;
  hasSchedule: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [area, setArea] = useState(initialArea);
  // Mốc đã lưu gần nhất, để biết còn thay đổi nào chưa lưu
  const [saved, setSaved] = useState({ rows: initialRows, area: initialArea });

  const replaceAvailability = useReplaceAvailability();
  const updateServiceArea = useUpdateServiceArea();
  const isSaving = replaceAvailability.isPending || updateServiceArea.isPending;

  const activeCount = rows.filter((row) => row.isActive).length;
  const isDirty = JSON.stringify({ rows, area }) !== JSON.stringify(saved);

  const handleSave = async () => {
    const invalidRow = WEEK_ORDER.map((day) => rows.find((row) => row.dayOfWeek === day)).find(
      (row) => row && isRowInvalid(row),
    );
    if (invalidRow) {
      toast.warning("Vui lòng sửa các khung giờ chưa hợp lệ trước khi lưu");
      document
        .getElementById(`day-row-${invalidRow.dayOfWeek}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const snapshot = { rows, area };
    const [schedule, serviceArea] = await Promise.allSettled([
      replaceAvailability.mutateAsync(rows),
      updateServiceArea.mutateAsync({
        areaName: area.areaName.trim() || undefined,
        centerLatitude: area.latitude,
        centerLongitude: area.longitude,
        radiusKm: area.radiusKm,
      }),
    ]);

    if (schedule.status === "fulfilled" && serviceArea.status === "fulfilled") {
      setSaved(snapshot);
      toast.success("Đã lưu cấu hình lịch làm việc và vùng phục vụ");
      return;
    }

    // Phần nào lưu được thì cập nhật mốc phần đó, phần lỗi thì báo riêng
    setSaved((current) => ({
      rows: schedule.status === "fulfilled" ? snapshot.rows : current.rows,
      area: serviceArea.status === "fulfilled" ? snapshot.area : current.area,
    }));
    if (schedule.status === "rejected") {
      toastApiError(schedule.reason, "Chưa lưu được lịch làm việc, vui lòng thử lại");
    }
    if (serviceArea.status === "rejected") {
      toastApiError(serviceArea.reason, "Chưa lưu được vùng phục vụ, vui lòng thử lại");
    }
  };

  return (
    <>
      <PageShell verified>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <WeeklyScheduleCard
              rows={rows}
              onChange={setRows}
              isEmpty={!hasSchedule}
            />
            <TimeOffCard />
          </div>
          <div className="space-y-6 lg:col-span-5">
            <ServiceAreaCard
              value={area}
              onChange={setArea}
            />
            <TravelFeeCard radiusKm={area.radiusKm} />
          </div>
        </div>
      </PageShell>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={`size-2 rounded-full ${isDirty ? "bg-warning" : "bg-primary"}`}
            />
            <span>
              Đã chọn: <strong className="text-foreground">{activeCount}/7 ngày nhận lịch</strong>{" "}
              • Bán kính{" "}
              <strong className="text-foreground">{formatKm(area.radiusKm)} km</strong>
              {isDirty && <span className="ml-2 text-warning">(chưa lưu)</span>}
            </span>
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="px-4"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            {isSaving ? "Đang lưu..." : "Lưu cấu hình lịch & vùng phục vụ"}
          </Button>
        </div>
      </div>
    </>
  );
}

function PageShell({ children, verified = false }: { children: React.ReactNode; verified?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pt-8 pb-32 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <SlidersHorizontal className="size-3.5" />
            Cấu hình phân hệ đối tác
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Lịch làm việc &amp; Vùng phục vụ
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Thiết lập khung giờ tiếp nhận đơn hàng trong tuần, đăng ký ngày nghỉ và bán kính phục
            vụ khách hàng theo quy chuẩn Servigo.
          </p>
        </div>
        {verified && (
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-success/30 bg-success-subtle px-3 py-1.5 text-xs font-semibold text-success sm:self-auto">
            <BadgeCheck className="size-4" />
            Trạng thái: Đã xác thực hồ sơ
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
