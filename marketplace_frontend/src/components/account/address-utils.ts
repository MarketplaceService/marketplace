import type { ResolvedPlace } from "@/services/geocoding.services";
import { ProfileAddress } from "@/types/api.types";

export const PHONE_PATTERN = /^\+?[0-9\s.-]{8,20}$/;

type AddressParts = {
  addressLine1?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
};

/** Ghép địa chỉ để tra tọa độ, ví dụ "123 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh" */
export function composeAddress({ addressLine1, ward, district, city }: AddressParts) {
  return [addressLine1, ward, district, city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/** Lấy phần số nhà, tên đường từ địa chỉ đầy đủ bằng cách bỏ các đơn vị hành chính */
export function streetFromPlace(place: ResolvedPlace) {
  const adminParts = [place.ward, place.district, place.province, "Việt Nam", "Vietnam"]
    .filter((part): part is string => !!part)
    .map((part) => part.toLowerCase());

  const street = place.formattedAddress
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !adminParts.includes(part.toLowerCase()))
    .join(", ");

  return street || place.formattedAddress;
}

export function formatAddress(address: ProfileAddress): string {
  return [
    address.addressLine1,
    address.addressLine2,
    address.ward,
    address.district,
    address.city,
  ]
    .filter(Boolean)
    .join(", ");
}
