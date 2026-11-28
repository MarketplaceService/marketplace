import type { PriceUnit } from "./discovery.types";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export interface BookingPaymentSummary {
  id: string;
  bookingId: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: string;
  transactionId: string | null;
  paymentLinkUrl: string | null;
  paymentDetails: Record<string, unknown> | null;
  expiresAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
}

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

export interface BookingPriceBreakdown {
  basePrice: number;
  priceUnit: PriceUnit;
  durationMinutes: number;
  serviceSubtotal: number;
  distanceKm: number;
  distanceFee: number;
  isFreeShipping: boolean;
  totalPrice: number;
}

export interface BookingPreviewPayload {
  serviceId: string;
  addressId: string;
  scheduledStartAt: string;
}

export interface BookingPreviewResponse {
  canBook: boolean;
  unavailableReason: string | null;
  isSelfBooking: boolean;
  providerIsOnline: boolean;
  inServiceArea: boolean;
  slotStatus: "AVAILABLE" | "HELD" | "BOOKED" | "UNAVAILABLE";
  scheduledStartAt: string;
  scheduledEndAt: string;
  service: {
    id: string;
    title: string;
    basePrice: number;
    priceUnit: PriceUnit;
    durationMinutes: number;
    categoryName: string | null;
  };
  provider: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
    areaName: string | null;
    radiusKm: number | null;
  };
  address: {
    id: string;
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
  };
  pricing: BookingPriceBreakdown;
}

export interface CreateBookingPayload extends BookingPreviewPayload {
  customerNote?: string;
  initialImages?: InspectionPhoto[];
  paymentMethod?: string;
}

export interface BookingSummaryItem {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  scheduledStartAt: string;
  scheduledEndAt: string;
  totalPrice: number;
  serviceTitleSnapshot: string;
  addressSummary: {
    fullName: string;
    phone: string;
    addressLine1: string;
    ward: string;
    district: string | null;
    city: string;
    distanceKm: number;
    distanceFee: number;
    basePriceSnapshot: number;
    priceUnitSnapshot: PriceUnit;
    durationMinutesSnapshot: number;
  };
  hasInspectionReport: boolean;
  inspectionSubmittedAt: string | null;
  hasReview?: boolean;
  service: {
    id: string;
    title: string;
    categoryName: string | null;
  };
  provider: {
    id: string;
    userId: string;
    displayName: string;
    phone: string | null;
    avatarUrl: string | null;
    isOnline: boolean;
  } | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  latestPayment: BookingPaymentSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingStatusHistoryItem {
  id: string;
  oldStatus: BookingStatus | null;
  newStatus: BookingStatus;
  changedBy: string | null;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface BookingReviewItem {
  id: string;
  bookingId: string;
  rating: number;
  priceMatched: boolean;
  comment: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateReviewPayload {
  rating: number;
  priceMatched: boolean;
  comment?: string;
}

export type UpdateReviewPayload = CreateReviewPayload;

export interface BookingDetail extends BookingSummaryItem {
  customerNote: string | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  cancelledByUser: {
    id: string;
    name: string;
    role: string;
  } | null;
  serviceAddressSnapshot: BookingAddressSnapshot;
  inspectionImages: BookingInspectionData | null;
  hasRequiredInspection: boolean;
  canReview: boolean;
  review: BookingReviewItem | null;
  payments: BookingPaymentSummary[];
  statusHistories: BookingStatusHistoryItem[];
}

export type CustomerBookingTab =
  | "all"
  | "pending"
  | "active"
  | "completed"
  | "cancelled"
  | "unreviewed";

export interface MyBookingsResponse {
  counts: Record<CustomerBookingTab, number>;
  items: BookingSummaryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProviderBookingTab =
  | "all"
  | "today"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "active"
  | "completed"
  | "cancelled";

export interface ProviderBookingsResponse {
  counts: {
    all: number;
    today: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  items: BookingSummaryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubmitInspectionPayload {
  before: InspectionPhoto[];
  after: InspectionPhoto[];
  technicalSpecs?: TechnicalSpecItem[];
  extraMaterials?: ExtraMaterialItem[];
  fieldNote?: string;
}

export interface ProviderWalletTransaction {
  id: string;
  bookingCode: string;
  serviceTitle: string;
  customerName: string;
  scheduledStartAt: string;
  completedAt: string;
  totalPrice: number;
  distanceFee: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  latestPayment: BookingPaymentSummary | null;
}

export interface ProviderWalletResponse {
  month: string;
  summary: {
    completedThisMonth: number;
    completedCountThisMonth: number;
    inProgressRevenue: number;
    inProgressCount: number;
    totalLifetimeRevenue: number;
    totalCompletedCount: number;
  };
  monthlyChart: {
    month: string;
    label: string;
    revenue: number;
    completedCount: number;
  }[];
  transactions: {
    items: ProviderWalletTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
