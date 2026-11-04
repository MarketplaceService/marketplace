const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  customer: "Khách hàng",
  provider: "Nhà cung cấp",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
