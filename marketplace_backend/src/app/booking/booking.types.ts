import { PriceUnit } from 'src/shared/types/price-unit.enum';

export interface BookingAddressSnapshot {
  addressId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  ward: string;
  district: string | null;
  city: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  distanceFee: number;
  basePriceSnapshot: number;
  priceUnitSnapshot: PriceUnit;
  durationMinutesSnapshot: number;
}

export interface InspectionPhoto {
  /**
   * Database lưu path trong bucket riêng tư (bookings/...). API trả URL có chữ ký hạn 1 giờ,
   * hoặc null khi file không còn trong bucket.
   */
  url: string;
  caption?: string;
  capturedAt: string;
}

export interface TechnicalSpecItem {
  label: string;
  value: string;
  status?: string;
}

export interface ExtraMaterialItem {
  name: string;
  quantity: number;
  unitPrice: number;
  reason: string;
}

export interface BookingInspectionData {
  initial?: InspectionPhoto[];
  before?: InspectionPhoto[];
  after?: InspectionPhoto[];
  technicalSpecs?: TechnicalSpecItem[];
  extraMaterials?: ExtraMaterialItem[];
  fieldNote?: string;
  submittedAt?: string;
}
