export interface HeaderNavItem {
  label: string;
  // Bỏ trống khi trang chưa có, mục sẽ báo "Tính năng đang phát triển" thay vì ra 404
  href?: string;
}

export const HEADER_NAV_ITEMS: HeaderNavItem[] = [
  { label: "Trang chủ", href: "/" },
  { label: "Bản đồ" },
  { label: "Đơn hàng & Bảo hành" },
  { label: "Tin nhắn" },
];

export const BECOME_PROVIDER_ITEM: HeaderNavItem = {
  label: "Trở thành nhà cung cấp",
  href: "/provider/register",
};
