"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isConflictError,
  useCreateTimeOff,
  useDeleteTimeOff,
  useMyTimeOffs,
} from "@/hooks/use-schedule";
import { getApiErrorMessage } from "@/lib/api/api-error";
import {
  datetimeLocalToVnIso,
  formatVnDateTime,
  nowAsDatetimeLocal,
} from "@/lib/vn-time";
import { CalendarOff, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TimeOffCard() {
  const { data: timeOffs = [], isLoading } = useMyTimeOffs();
  const createTimeOff = useCreateTimeOff();
  const deleteTimeOff = useDeleteTimeOff();

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");

  // Khoảng nghỉ trùng đơn đã xác nhận: hiện lời backend trả về thành khung cảnh báo
  const conflictMessage = isConflictError(createTimeOff.error)
    ? getApiErrorMessage(createTimeOff.error, "Khoảng nghỉ trùng với đơn đặt lịch đã xác nhận")
    : null;

  const clearConflict = () => {
    if (createTimeOff.error) createTimeOff.reset();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!startAt || !endAt) {
      toast.warning("Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc nghỉ");
      return;
    }
    if (endAt <= startAt) {
      toast.warning("Thời điểm kết thúc nghỉ phải sau thời điểm bắt đầu");
      return;
    }
    if (endAt <= nowAsDatetimeLocal()) {
      toast.warning("Khoảng nghỉ phải kết thúc sau thời điểm hiện tại");
      return;
    }
    if (!reason.trim()) {
      toast.warning("Vui lòng nhập lý do nghỉ");
      return;
    }

    createTimeOff.mutate(
      {
        startAt: datetimeLocalToVnIso(startAt),
        endAt: datetimeLocalToVnIso(endAt),
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setStartAt("");
          setEndAt("");
          setReason("");
        },
      },
    );
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <CalendarOff className="size-5 text-primary" />
        Đăng ký lịch nghỉ đột xuất / Nghỉ phép
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Khóa khoảng thời gian tạm ngưng nhận lịch và tự động loại trừ khỏi lưới giờ trống
      </p>

      {/* noValidate: tự kiểm tra để báo lỗi bằng toast tiếng Việt thay vì tooltip của trình duyệt */}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="mt-5 space-y-4 rounded-xl border border-border bg-muted/30 p-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
            Thời gian bắt đầu nghỉ
            <input
              type="datetime-local"
              value={startAt}
              min={nowAsDatetimeLocal()}
              onChange={(event) => {
                setStartAt(event.target.value);
                clearConflict();
              }}
              className={fieldClass}
            />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
            Thời gian kết thúc nghỉ
            <input
              type="datetime-local"
              value={endAt}
              min={startAt || nowAsDatetimeLocal()}
              onChange={(event) => {
                setEndAt(event.target.value);
                clearConflict();
              }}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-xs font-semibold text-muted-foreground">
          Lý do nghỉ
          <Input
            value={reason}
            maxLength={255}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ví dụ: Bảo dưỡng thiết bị định kỳ / Việc gia đình..."
            className="h-9"
          />
        </label>

        {conflictMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Xung đột lịch hẹn đã xác nhận: </strong>
              {conflictMessage}
            </span>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={createTimeOff.isPending}
          >
            {createTimeOff.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Thêm lịch nghỉ
          </Button>
        </div>
      </form>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-foreground">
          Các khoảng nghỉ sắp tới ({timeOffs.length})
        </h3>

        {isLoading ? (
          <div className="mt-3 h-16 animate-pulse rounded-xl bg-muted" />
        ) : timeOffs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Chưa có khoảng nghỉ nào sắp tới.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {timeOffs.map((timeOff) => {
              const isDeleting = deleteTimeOff.isPending && deleteTimeOff.variables === timeOff.id;

              return (
                <li
                  key={timeOff.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CalendarOff className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatVnDateTime(timeOff.startAt)} – {formatVnDateTime(timeOff.endAt)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{timeOff.reason}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isDeleting}
                    onClick={() => deleteTimeOff.mutate(timeOff.id)}
                    title="Xóa lịch nghỉ này"
                    aria-label="Xóa lịch nghỉ này"
                  >
                    {isDeleting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 className="text-destructive" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
