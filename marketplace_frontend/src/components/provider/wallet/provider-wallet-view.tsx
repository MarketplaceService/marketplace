"use client";

import { PaymentStatusBadge } from "@/components/booking/booking-status-badge";
import { Button } from "@/components/ui/button";
import { useProviderWallet } from "@/hooks/use-provider-bookings";
import { formatVnd } from "@/lib/travel-fee";
import { cn } from "@/lib/utils";
import { formatVnDateTime, todayInVietnam } from "@/lib/vn-time";
import { bookingServices } from "@/services/booking.services";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function getRecentMonths(count: number): { value: string; label: string }[] {
  const current = todayInVietnam().slice(0, 7);
  const [yStr, mStr] = current.split("-");
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  const list: { value: string; label: string }[] = [];

  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(year, monthIdx - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    list.push({
      value: `${y}-${m}`,
      label: `Tháng ${m}/${y}`,
    });
  }
  return list;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ProviderWalletView() {
  const monthOptions = useMemo(() => getRecentMonths(12), []);
  const [selectedMonth, setSelectedMonth] = useState(
    () => monthOptions[0]?.value ?? todayInVietnam().slice(0, 7),
  );
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useProviderWallet({
    month: selectedMonth,
    page,
    limit: 10,
  });

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const fullData = await bookingServices.getProviderWallet({
        month: selectedMonth,
        page: 1,
        limit: 100,
      });

      const rows = fullData.transactions.items;
      if (rows.length === 0) {
        toast.info(`Không có giao dịch đã hoàn thành trong tháng ${selectedMonth}`);
        return;
      }

      const headers = [
        "Mã đơn",
        "Dịch vụ",
        "Khách hàng",
        "Thời gian hẹn",
        "Hoàn tất lúc",
        "Phí di chuyển (VND)",
        "Tổng doanh thu (VND)",
        "Thanh toán",
      ];

      const csvLines = [
        headers.map(escapeCsvCell).join(","),
        ...rows.map((tx) =>
          [
            tx.bookingCode,
            tx.serviceTitle,
            tx.customerName,
            formatVnDateTime(tx.scheduledStartAt),
            formatVnDateTime(tx.completedAt),
            tx.distanceFee,
            tx.totalPrice,
            tx.paymentMethod
              ? `${tx.paymentMethod.toUpperCase()} (${tx.paymentStatus ?? ""})`
              : "Hoàn tất nghiệm thu",
          ]
            .map(escapeCsvCell)
            .join(","),
        ),
      ];

      const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sao-ke-servigo-${selectedMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Đã xuất sao kê tháng ${selectedMonth}`);
    } catch {
      toast.error("Không thể xuất file sao kê CSV lúc này");
    } finally {
      setIsExporting(false);
    }
  };

  const chart = data?.monthlyChart ?? [];
  const maxRevenue = Math.max(
    1,
    ...chart.map((item) => item.revenue),
  );
  const transactions = data?.transactions.items ?? [];
  const totalPages = data?.transactions.totalPages ?? 1;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Ví &amp; Thống kê Thu nhập
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi doanh thu từ các đơn đã khách hàng nghiệm thu và sao kê thu nhập hàng tháng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Chọn tháng xem sao kê"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            disabled={isExporting || isLoading}
            onClick={() => void handleExportCsv()}
            className="min-h-[44px] px-4"
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Xuất sao kê tháng (CSV)
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="h-32 animate-pulse rounded-2xl bg-muted md:col-span-5" />
            <div className="h-32 animate-pulse rounded-2xl bg-muted md:col-span-3" />
            <div className="h-32 animate-pulse rounded-2xl bg-muted md:col-span-4" />
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center space-y-3">
          <p className="text-sm font-medium text-destructive">
            Không tải được dữ liệu ví thu nhập.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            className="min-h-[44px]"
          >
            <RefreshCw className="size-4" />
            Thử lại
          </Button>
        </div>
      ) : (
        <>
          {/* 3 KPI Cards với phân cấp chính/phụ */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-xs md:col-span-5 space-y-2">
              <div className="flex items-center justify-between text-primary">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Doanh thu đã hoàn thành ({selectedMonth})
                </span>
                <CircleDollarSign className="size-5" />
              </div>
              <div className="text-3xl font-bold text-primary">
                {formatVnd(data.summary.completedThisMonth)}
              </div>
              <p className="text-xs text-muted-foreground">
                Từ {data.summary.completedCountThisMonth} đơn đã được khách nghiệm thu trong tháng
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:col-span-3 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Đang xử lý
                </span>
                <Clock className="size-5 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatVnd(data.summary.inProgressRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.summary.inProgressCount} đơn đang chờ / đang làm
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:col-span-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Tổng thu nhập tích lũy
                </span>
                <TrendingUp className="size-5 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatVnd(data.summary.totalLifetimeRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tổng cộng {data.summary.totalCompletedCount} đơn hoàn thành trên Servigo
              </p>
            </div>
          </div>

          {/* Biểu đồ cột 6 tháng gần nhất (SVG/Tailwind thuần) */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Doanh thu 6 tháng gần nhất
                </h2>
                <p className="text-xs text-muted-foreground">
                  Di chuột vào từng cột để xem chi tiết số đơn và tổng doanh thu từng tháng
                </p>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-56 pt-8 pb-2 border-b border-border">
              {chart.map((bar) => {
                const heightPct =
                  bar.revenue > 0
                    ? Math.max(8, Math.round((bar.revenue / maxRevenue) * 100))
                    : 3;
                const isSelectedMonth = bar.month === selectedMonth;
                return (
                  <div
                    key={bar.month}
                    tabIndex={0}
                    className="group relative flex h-full flex-col items-center justify-end gap-2 focus:outline-none"
                  >
                    {/* Tooltip khi hover/focus */}
                    <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-md group-hover:block group-focus:block">
                      {formatVnd(bar.revenue)} ({bar.completedCount} đơn)
                    </div>

                    <span className="hidden sm:block text-[11px] font-semibold text-muted-foreground">
                      {bar.revenue > 0 ? formatVnd(bar.revenue) : "0 đ"}
                    </span>

                    <div
                      className={cn(
                        "w-full max-w-[52px] rounded-t-xl transition-all duration-200",
                        bar.revenue === 0
                          ? "bg-muted"
                          : isSelectedMonth
                            ? "bg-primary shadow-xs"
                            : "bg-primary/65 group-hover:bg-primary",
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-6 gap-3 sm:gap-6 text-center">
              {chart.map((bar) => (
                <button
                  key={bar.month}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(bar.month);
                    setPage(1);
                  }}
                  className={cn(
                    "cursor-pointer rounded-lg py-1 text-xs font-semibold transition-colors",
                    bar.month === selectedMonth
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {bar.label}
                </button>
              ))}
            </div>
          </section>

          {/* Bảng sao kê giao dịch */}
          <section className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-6">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  Sao kê giao dịch tháng {selectedMonth}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Tổng {data.transactions.total} đơn hoàn thành
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Chưa có giao dịch hoàn thành trong tháng {selectedMonth}
                </p>
                <p className="text-xs text-muted-foreground">
                  Khi khách hàng xác nhận nghiệm thu hoàn tất đơn hàng, doanh thu sẽ được ghi nhận ngay tại đây.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Mã đơn</th>
                      <th className="px-6 py-3 font-semibold">Dịch vụ &amp; Khách hàng</th>
                      <th className="px-6 py-3 font-semibold">Hoàn tất lúc</th>
                      <th className="px-6 py-3 font-semibold">Thanh toán</th>
                      <th className="px-6 py-3 font-semibold text-right">
                        Tổng tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                          #{tx.bookingCode}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-foreground">
                            {tx.serviceTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Khách: {tx.customerName}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {formatVnDateTime(tx.completedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {tx.latestPayment ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase text-foreground">
                                {tx.latestPayment.paymentMethod}
                              </span>
                              <PaymentStatusBadge
                                status={tx.latestPayment.status}
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Hoàn tất nghiệm thu
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-primary whitespace-nowrap">
                          {formatVnd(tx.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Trang <strong className="text-foreground">{page}</strong> / {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-[44px]"
                  >
                    <ChevronLeft className="size-4" />
                    Trước
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="min-h-[44px]"
                  >
                    Sau
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
