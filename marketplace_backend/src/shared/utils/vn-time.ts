// Ứng dụng chỉ phục vụ Việt Nam. Giờ Việt Nam là UTC+7 quanh năm, không đổi giờ mùa hè,
// nên đổi qua lại bằng độ lệch cố định là đủ, không cần thư viện múi giờ.
export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

const VN_OFFSET = '+07:00';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Kiểm tra chuỗi YYYY-MM-DD có phải một ngày có thật hay không */
export function isValidDateOnly(date: string) {
  const match = DATE_PATTERN.exec(date);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD */
export function todayInVietnam(now: Date = new Date()) {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const base = new Date(`${date}T00:00:00Z`).getTime();
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10);
}

/** Thứ của một ngày lịch: 0 là Chủ Nhật, giống Date.getDay() */
export function dayOfWeekOf(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Mốc thời gian của ngày `date` lúc `time` (HH:mm hoặc HH:mm:ss) theo giờ Việt Nam */
export function vnDateTime(date: string, time: string) {
  return new Date(`${date}T${time.slice(0, 5)}:00${VN_OFFSET}`);
}

/** Chuỗi ISO kèm +07:00, ví dụ 2026-11-20T08:00:00+07:00 */
export function toVnIsoString(instant: Date) {
  const shifted = new Date(instant.getTime() + VN_OFFSET_MS);
  return `${shifted.toISOString().slice(0, 19)}${VN_OFFSET}`;
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}
