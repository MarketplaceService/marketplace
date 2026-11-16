// Quy tắc phí di chuyển áp dụng chung toàn sàn. Module đặt lịch (#133) dùng lại để tính hóa đơn.
export const FREE_TRAVEL_KM = 3;
export const TRAVEL_FEE_PER_KM = 5000;

/** Phí di chuyển theo khoảng cách: 3 km đầu miễn phí, mỗi km vượt tính 5.000 đ */
export function calculateTravelFee(distanceKm: number) {
  const extraKm = Math.max(0, distanceKm - FREE_TRAVEL_KM);
  return Math.round(extraKm * TRAVEL_FEE_PER_KM);
}

export function formatVnd(amount: number) {
  return `${amount.toLocaleString("vi-VN")} đ`;
}
