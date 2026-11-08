import { Home, Map, MessageSquare, ReceiptText, type LucideIcon } from "lucide-react";

export interface HeaderNavItem {
  label: string;
  // Bỏ trống khi trang chưa có, mục sẽ báo "Tính năng đang phát triển" thay vì ra 404
  href?: string;
  icon?: LucideIcon;
}

export const HEADER_NAV_ITEMS: HeaderNavItem[] = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Bản đồ", icon: Map },
  { label: "Đơn hàng & Bảo hành", icon: ReceiptText },
  { label: "Tin nhắn", icon: MessageSquare },
];

export const BECOME_PROVIDER_ITEM: HeaderNavItem = {
  label: "Trở thành nhà cung cấp",
  href: "/provider/register",
};
