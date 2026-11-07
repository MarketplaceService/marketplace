import { ProfileAddress } from "@/types/api.types";

export const PHONE_PATTERN = /^\+?[0-9\s.-]{8,20}$/;

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
