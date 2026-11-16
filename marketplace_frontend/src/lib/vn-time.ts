// Ứng dụng chỉ phục vụ Việt Nam (UTC+7 quanh năm, không đổi giờ mùa hè), nên mọi giờ hiển thị
// và mọi giờ người dùng nhập đều tính theo giờ Việt Nam, bất kể máy đang đặt múi giờ nào.
export const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const VN_OFFSET = "+07:00";
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Thứ trong tuần, 0 là Chủ Nhật giống Date.getDay() */
export const DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];
export const DAY_SHORT_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD */
export function todayInVietnam(now: Date = new Date()) {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const base = new Date(`${date}T00:00:00Z`).getTime();
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10);
}

export function dayOfWeekOf(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** "2026-11-20" thành "20/11/2026" */
export function formatDateOnly(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/** Giá trị của ô datetime-local, hiểu theo giờ Việt Nam, đổi ra chuỗi ISO kèm +07:00 */
export function datetimeLocalToVnIso(value: string) {
  return `${value.slice(0, 16)}:00${VN_OFFSET}`;
}

/** Thời điểm hiện tại theo giờ Việt Nam, đúng định dạng của ô datetime-local */
export function nowAsDatetimeLocal(now: Date = new Date()) {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 16);
}

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Chuỗi ISO thành "20/11/2026 08:00" theo giờ Việt Nam */
export function formatVnDateTime(iso: string) {
  const parts = Object.fromEntries(
    dateTimeFormatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}
