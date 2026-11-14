import type { LatLngBoundsLiteral } from "leaflet";

// File này không import leaflet hay maplibre lúc chạy, nên dùng được cả ở component render phía server.

// Chỉ cho xem đất liền và đảo gần bờ. Zoom 7 là mức thấp nhất mà bản đồ rộng khoảng 710px
// vẫn nằm trọn trong khung này, nên muốn bản đồ rộng hơn thì phải tăng minZoom.
// Nền OpenFreeMap dùng dữ liệu OSM có tên tiếng Trung ở Hoàng Sa, Trường Sa và Biển Đông;
// nền MapVina ghi đúng tên tiếng Việt nhưng vẫn giữ cùng khung để hai nền hoạt động giống nhau.
export const MAINLAND_BOUNDS: LatLngBoundsLiteral = [
  [8.2, 101.9],
  [23.6, 109.7],
];

export function isInsideMapBounds(latitude: number, longitude: number) {
  const [[south, west], [north, east]] = MAINLAND_BOUNDS;
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
}
